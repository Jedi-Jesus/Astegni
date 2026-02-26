/**
 * Co-Parent Portal Manager for Parent Profile
 *
 * Handles:
 * - User search for inviting co-parents (can be any user in the system)
 * - Adding co-parents to share parental responsibilities
 * - Managing linked co-parents
 *
 * Note: This provides the same interface as parentPortalManager so the
 * invite-parent-modal.html can be reused for inviting co-parents.
 */

const COPARENT_PORTAL_API_URL = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL :
                              (window.API_BASE_URL || 'http://localhost:8000');

class CoparentPortalManager {
    constructor() {
        this.searchTimeout = null;
        this.selectedUser = null;
    }

    /**
     * Get auth token from localStorage
     */
    getToken() {
        return localStorage.getItem('token');
    }

    /**
     * Search for users (debounced)
     */
    searchUsers(query) {
        console.log('CoparentPortalManager: searchUsers called with query:', query);

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        if (query.length < 2) {
            console.log('CoparentPortalManager: Query too short, showing placeholder');
            this.renderSearchPlaceholder();
            return;
        }

        // Show loading
        const loadingEl = document.getElementById('search-loading');
        if (loadingEl) {
            loadingEl.classList.remove('hidden');
            console.log('CoparentPortalManager: Showing loading spinner');
        }

        this.searchTimeout = setTimeout(async () => {
            console.log('CoparentPortalManager: Debounce timeout reached, performing search');
            await this.performSearch(query);
        }, 300);
    }

    /**
     * Perform the actual search - searches ALL users, not just parents
     */
    async performSearch(query) {
        const token = this.getToken();
        console.log('CoparentPortalManager: performSearch called with query:', query);

        if (!token) {
            this.showToast('Please log in to search for users', 'error');
            return;
        }

        try {
            // Search all users - a co-parent could be anyone in the system
            const url = `${COPARENT_PORTAL_API_URL}/api/users/search?q=${encodeURIComponent(query)}&limit=10`;
            console.log('CoparentPortalManager: Fetching URL:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            document.getElementById('search-loading')?.classList.add('hidden');

            console.log('CoparentPortalManager: Response status:', response.status);

            if (response.ok) {
                const users = await response.json();
                console.log('CoparentPortalManager: Users found:', users.length, users);
                this.renderSearchResults(users);
            } else {
                const errorText = await response.text();
                console.error('CoparentPortalManager: Search failed:', response.status, errorText);
                this.renderNoResults();
            }
        } catch (error) {
            console.error('CoparentPortalManager: Search error:', error);
            document.getElementById('search-loading')?.classList.add('hidden');
            this.renderNoResults();
        }
    }

    /**
     * Render search placeholder
     */
    renderSearchPlaceholder() {
        const container = document.getElementById('parent-search-results');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <p>Search for your co-parent by name, email, or phone</p>
                <p class="text-sm mt-1 text-gray-500">They can be a student, tutor, or any existing user</p>
            </div>
        `;
    }

    /**
     * Render no results message
     */
    renderNoResults() {
        const container = document.getElementById('parent-search-results');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>No users found</p>
                <p class="text-sm mt-1">Try a different search or add them as a new user</p>
            </div>
        `;
    }

    /**
     * Render search results
     */
    renderSearchResults(users) {
        // Only show verified users
        users = (users || []).filter(u => u.is_verified);
        console.log('CoparentPortalManager: renderSearchResults called with', users?.length, 'users');
        const container = document.getElementById('parent-search-results');
        if (!container) {
            console.error('CoparentPortalManager: parent-search-results container not found!');
            return;
        }

        if (!users || users.length === 0) {
            console.log('CoparentPortalManager: No users to display, showing no results');
            this.renderNoResults();
            return;
        }

        const self = this;

        container.innerHTML = users.map(user => {
            const userJson = JSON.stringify(user).replace(/"/g, '&quot;');
            const firstInitial = (user.first_name || user.name || 'U').charAt(0).toUpperCase();
            const displayName = user.first_name || user.name || 'User';

            return `
            <div class="user-search-card flex items-center gap-4 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 bg-white dark:bg-gray-700 cursor-pointer transition-all"
                 onclick="window.parentPortalManager.selectUser(${userJson})">
                <div class="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-lg border-2 border-gray-200 dark:border-gray-600">
                    ${firstInitial}
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-medium text-gray-800 dark:text-gray-200 truncate">
                        ${displayName}
                    </h4>
                    <div class="flex items-center gap-2 mt-1">
                        ${user.email ? `<span class="text-xs text-gray-500 dark:text-gray-400 truncate">${user.email}</span>` : ''}
                        ${user.phone ? `<span class="text-xs text-gray-500 dark:text-gray-400">${user.phone}</span>` : ''}
                    </div>
                    <div class="flex gap-1 mt-1">
                        ${(user.roles || []).map(role => `
                            <span class="px-1.5 py-0.5 text-xs rounded ${self.getRoleBadgeClass(role)}">${role}</span>
                        `).join('')}
                    </div>
                </div>
                <button class="px-4 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium text-sm hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors">
                    Add
                </button>
            </div>
        `}).join('');

        console.log('CoparentPortalManager: Search results rendered successfully');
    }

    /**
     * Get role badge class
     */
    getRoleBadgeClass(role) {
        const classes = {
            'student': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            'tutor': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            'parent': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            'admin': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            'advertiser': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        };
        return classes[role] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }

    /**
     * Select a user to add as co-parent
     */
    selectUser(user) {
        this.selectedUser = user;

        // Update hidden field
        document.getElementById('selected-user-id').value = user.user_id || user.id;

        // Update selected user card
        const card = document.getElementById('selected-user-card');
        if (card) {
            const initial = (user.first_name || user.name || 'U').charAt(0).toUpperCase();
            const displayName = user.first_name || user.name || 'User';
            card.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-2xl border-2 border-purple-300">
                        ${initial}
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-800 dark:text-gray-200">
                            ${displayName}
                        </h4>
                        ${user.email ? `<p class="text-sm text-gray-500 dark:text-gray-400">${user.email}</p>` : ''}
                        ${user.phone ? `<p class="text-sm text-gray-500 dark:text-gray-400">${user.phone}</p>` : ''}
                        <div class="flex gap-1 mt-1">
                            ${(user.roles || []).map(role => `
                                <span class="px-1.5 py-0.5 text-xs rounded ${this.getRoleBadgeClass(role)}">${role}</span>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        // Show step 2
        this.showStep(2);
    }

    /**
     * Show add new parent form
     */
    showAddNewParentForm() {
        this.showStep(3);
    }

    /**
     * Go back to search
     */
    backToSearch() {
        this.selectedUser = null;
        this.showStep(1);
    }

    /**
     * Show a specific step
     */
    showStep(stepNumber) {
        // Clear any error messages when switching steps
        this.clearInvitationError();

        // Hide all steps
        document.querySelectorAll('.invite-step').forEach(step => {
            step.classList.add('hidden');
            step.style.display = 'none';
        });

        // Show selected step
        const step = document.getElementById(`invite-step-${stepNumber}`);
        if (step) {
            step.classList.remove('hidden');
            step.style.display = 'flex';
        }
    }

    /**
     * Submit adding existing user as co-parent
     * Note: For co-parents, we don't require security verification
     */
    async submitExistingUserInvitation(event) {
        event.preventDefault();

        const token = this.getToken();
        if (!token) {
            this.showToast('Please log in to add co-parents', 'error');
            return;
        }

        const userId = document.getElementById('selected-user-id').value;
        const relationshipType = document.getElementById('invite-relationship-type').value;

        if (!userId || !relationshipType) {
            this.showToast('Please select a relationship type', 'error');
            return;
        }

        // Get the selected user's info
        const user = this.selectedUser;
        if (!user) {
            this.showToast('No user selected', 'error');
            return;
        }

        try {
            // Build the form data for add-coparent endpoint
            const formData = new URLSearchParams();
            formData.append('first_name', user.first_name || user.name?.split(' ')[0] || 'Unknown');
            formData.append('father_name', user.father_name || user.name?.split(' ')[1] || 'Unknown');
            formData.append('grandfather_name', user.grandfather_name || user.name?.split(' ')[2] || 'Unknown');
            if (user.email) formData.append('email', user.email);
            if (user.phone) formData.append('phone', user.phone);
            if (user.gender) formData.append('gender', user.gender);
            formData.append('relationship_type', relationshipType);

            const response = await fetch(`${COPARENT_PORTAL_API_URL}/api/parent/add-coparent?${formData.toString()}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('Co-parent added successfully!', 'success');
                closeInviteParentModal();
                // Refresh co-parents list
                if (typeof CoparentsManager !== 'undefined' && CoparentsManager.loadCoparents) {
                    CoparentsManager.loadCoparents();
                }
            } else {
                // Display error message in modal instead of just toast
                const errorMessage = data.detail || 'Failed to add co-parent';
                this.showInvitationError(errorMessage);
                this.showToast(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Error adding co-parent:', error);
            this.showToast('An error occurred. Please try again.', 'error');
        }
    }

    /**
     * Submit new co-parent (create new user)
     */
    async submitNewUserInvitation(event) {
        event.preventDefault();

        const token = this.getToken();
        if (!token) {
            this.showToast('Please log in to add co-parents', 'error');
            return;
        }

        const firstName = document.getElementById('new-parent-first-name').value;
        const fatherName = document.getElementById('new-parent-father-name').value;
        const grandfatherName = document.getElementById('new-parent-grandfather-name').value;
        const gender = document.getElementById('new-parent-gender').value;
        const email = document.getElementById('new-parent-email').value;
        const phone = document.getElementById('new-parent-phone').value;
        const relationshipType = document.getElementById('new-parent-relationship-type').value;

        if (!firstName || !fatherName || !grandfatherName || !relationshipType) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (!email && !phone) {
            this.showToast('Please provide either email or phone', 'error');
            return;
        }

        try {
            const formData = new URLSearchParams();
            formData.append('first_name', firstName);
            formData.append('father_name', fatherName);
            formData.append('grandfather_name', grandfatherName);
            if (gender) formData.append('gender', gender);
            if (email) formData.append('email', email);
            if (phone) formData.append('phone', phone);
            formData.append('relationship_type', relationshipType);

            const response = await fetch(`${COPARENT_PORTAL_API_URL}/api/parent/add-coparent?${formData.toString()}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                // Show success with temp password (for development - remove in production)
                if (data.temp_password && !data.existing) {
                    console.log('Temp password for new co-parent:', data.temp_password);
                    this.showToast('Co-parent account created! Credentials sent via email/SMS.', 'success');
                } else {
                    this.showToast(data.existing ? 'Existing user linked as co-parent!' : 'Co-parent added successfully!', 'success');
                }
                closeInviteParentModal();
                // Refresh co-parents list
                if (typeof CoparentsManager !== 'undefined' && CoparentsManager.loadCoparents) {
                    CoparentsManager.loadCoparents();
                }
            } else {
                // Display error message in modal instead of just toast
                const errorMessage = data.detail || 'Failed to add co-parent';
                this.showInvitationError(errorMessage);
                this.showToast(errorMessage, 'error');
            }
        } catch (error) {
            console.error('Error adding co-parent:', error);
            this.showToast('An error occurred. Please try again.', 'error');
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        // Check if there's a global toast function
        if (typeof showNotification === 'function') {
            showNotification(message, type);
            return;
        }

        // Simple fallback toast
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all transform translate-y-0 ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            'bg-blue-500'
        } text-white font-medium`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Show error message in the invite parent modal
     * @param {string} message - Error message to display
     */
    showInvitationError(message) {
        // Remove any existing error message
        this.clearInvitationError();

        // Find the current visible step
        const visibleStep = document.querySelector('.invite-step:not(.hidden)');
        if (!visibleStep) return;

        // Find the modal body within the visible step
        const modalBody = visibleStep.querySelector('.modal-body');
        if (!modalBody) return;

        // Create error alert element
        const errorAlert = document.createElement('div');
        errorAlert.id = 'invitation-error-alert';
        errorAlert.className = 'mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50';
        errorAlert.innerHTML = `
            <div class="flex items-start gap-3">
                <div class="flex-shrink-0">
                    <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <div class="flex-1">
                    <h4 class="font-semibold text-red-700 dark:text-red-400 mb-1">Unable to Add Co-Parent</h4>
                    <p class="text-sm text-red-600 dark:text-red-500">${message}</p>
                </div>
                <button onclick="parentPortalManager.clearInvitationError()" class="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;

        // Insert at the top of modal body
        modalBody.insertBefore(errorAlert, modalBody.firstChild);

        // Scroll to top of modal body to show error
        modalBody.scrollTop = 0;
    }

    /**
     * Clear error message from invite parent modal
     */
    clearInvitationError() {
        const existingError = document.getElementById('invitation-error-alert');
        if (existingError) {
            existingError.remove();
        }
    }
}

// Create global instance - use parentPortalManager name so the modal works
window.parentPortalManager = new CoparentPortalManager();

// Open/close modal functions
window.openInviteParentModal = function() {
    const modal = document.getElementById('inviteParentModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        // Reset to step 1
        window.parentPortalManager.showStep(1);
        // Clear search
        const searchInput = document.getElementById('parent-search-input');
        if (searchInput) searchInput.value = '';
        window.parentPortalManager.renderSearchPlaceholder();
    } else {
        console.error('Invite Parent Modal not found!');
    }
};

window.closeInviteParentModal = function() {
    const modal = document.getElementById('inviteParentModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        // Reset forms
        document.getElementById('inviteExistingParentForm')?.reset();
        document.getElementById('inviteNewParentForm')?.reset();
    }
};

// Wrapper function for co-parent specific naming
window.openInviteCoparentModal = function() {
    // Guard: user must be verified
    // Merge both storage keys — currentUser may lack verified fields if profile-system rebuilt it
    const cu = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const u  = JSON.parse(localStorage.getItem('user') || 'null');
    const currentUser = cu || u;
    const isVerified = (cu?.is_verified || cu?.kyc_verified || cu?.verified) ||
                       (u?.is_verified  || u?.kyc_verified  || u?.verified);
    if (!currentUser || !isVerified) {
        if (typeof openAccessRestrictedModal === 'function') {
            openAccessRestrictedModal({ reason: 'kyc_not_verified', featureName: 'Invite Co-Parent' });
        }
        return;
    }
    window.openInviteParentModal();
};

window.closeInviteCoparentModal = function() {
    window.closeInviteParentModal();
};

console.log('Co-Parent Portal Manager initialized');
