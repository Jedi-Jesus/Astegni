/**
 * Parent Portal Manager for Student Profile
 *
 * Handles:
 * - User search for inviting parents
 * - Sending invitations to existing users
 * - Creating new parent accounts
 * - Managing linked parents
 * - Tracking pending invitations
 */

// Use existing API_BASE_URL or window.API_BASE_URL, don't redeclare
const PARENT_PORTAL_API_URL = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL :
                              (window.API_BASE_URL || 'https://api.astegni.com');

class ParentPortalManager {
    constructor() {
        this.searchTimeout = null;
        this.selectedUser = null;
        this.linkedParents = [];
        this.pendingInvitations = [];
    }

    /**
     * Initialize the parent portal
     */
    async init() {
        console.log('ParentPortalManager: Initializing...');
        await this.loadLinkedParents();
        await this.loadPendingInvitations();
    }

    /**
     * Get auth token from localStorage
     */
    getToken() {
        return localStorage.getItem('token');
    }

    /**
     * Load linked parents from API
     */
    async loadLinkedParents() {
        const token = this.getToken();
        if (!token) return;

        try {
            const response = await fetch(`${PARENT_PORTAL_API_URL}/api/student/linked-parents`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.linkedParents = data.parents || [];
                this.renderLinkedParents();
            }
        } catch (error) {
            console.error('Error loading linked parents:', error);
        }
    }

    /**
     * Render linked parents in the grid
     */
    renderLinkedParents() {
        const grid = document.getElementById('linked-parents-grid');
        const countBadge = document.getElementById('linked-parents-count');

        if (!grid) return;

        // Update the count badge
        if (countBadge) {
            countBadge.textContent = this.linkedParents.length;
        }

        if (this.linkedParents.length === 0) {
            grid.innerHTML = `
                <div class="flex items-center justify-center py-8 col-span-full">
                    <div class="text-center">
                        <div class="text-5xl mb-4 opacity-50">👨‍👩‍👧</div>
                        <p class="text-gray-500 dark:text-gray-400">No parents linked yet</p>
                        <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Click "Invite Parent" to connect with your parents</p>
                    </div>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.linkedParents.map(parent => this.createParentCard(parent)).join('');
    }

    /**
     * Create a parent card HTML
     */
    createParentCard(parent) {
        const profilePic = parent.profile_picture || 'https://via.placeholder.com/80?text=' + parent.first_name.charAt(0);
        const relationshipBadge = this.getRelationshipBadge(parent.relationship_type);

        return `
            <div class="parent-card p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
                <div class="flex items-start gap-4">
                    <img src="${profilePic}"
                         alt="${parent.full_name}"
                         class="w-14 h-14 rounded-full object-cover border-2 border-purple-200 dark:border-purple-700"
                         onerror="this.src='https://via.placeholder.com/80?text=${parent.first_name.charAt(0)}'">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-gray-800 dark:text-gray-200 truncate">${parent.full_name}</h4>
                        <span class="inline-block px-2 py-0.5 text-xs font-medium rounded-full ${relationshipBadge.class} mt-1">
                            ${parent.relationship_type || 'Parent'}
                        </span>
                        <div class="mt-2 space-y-1">
                            ${parent.email ? `<p class="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                </svg>
                                ${parent.email}
                            </p>` : ''}
                            ${parent.phone ? `<p class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                </svg>
                                ${parent.phone}
                            </p>` : ''}
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        ${parent.is_verified ? `
                            <span class="text-green-500 text-lg" title="Verified">✓</span>
                        ` : ''}
                        <button onclick="parentPortalManager.unlinkParent(${parent.user_id})"
                                class="text-gray-400 hover:text-red-500 transition-colors"
                                title="Unlink parent">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get relationship badge styling
     */
    getRelationshipBadge(type) {
        const badges = {
            'Father': { class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
            'Mother': { class: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
            'Guardian': { class: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
            'Uncle': { class: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
            'Aunt': { class: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
            'Grandparent': { class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
            'Sibling': { class: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
            'Other': { class: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' }
        };
        return badges[type] || badges['Other'];
    }

    /**
     * Load pending invitations from API
     */
    async loadPendingInvitations() {
        const token = this.getToken();
        if (!token) return;

        try {
            const response = await fetch(`${PARENT_PORTAL_API_URL}/api/student/parent-invitations`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.pendingInvitations = (data.invitations || []).filter(inv => inv.status === 'pending');
                this.renderPendingInvitations();
            }
        } catch (error) {
            console.error('Error loading pending invitations:', error);
        }
    }

    /**
     * Render pending invitations list
     */
    renderPendingInvitations() {
        const list = document.getElementById('pending-invitations-list');
        const countBadge = document.getElementById('pending-invitations-count');

        if (!list) return;

        if (countBadge) {
            if (this.pendingInvitations.length > 0) {
                countBadge.textContent = this.pendingInvitations.length;
                countBadge.classList.remove('hidden');
            } else {
                countBadge.classList.add('hidden');
            }
        }

        if (this.pendingInvitations.length === 0) {
            list.innerHTML = `
                <div class="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
                    No pending invitations
                </div>
            `;
            return;
        }

        list.innerHTML = this.pendingInvitations.map(inv => `
            <div class="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/50">
                <div class="flex items-center gap-3">
                    <img src="${inv.parent_profile_picture || 'https://via.placeholder.com/40?text=' + inv.parent_name.charAt(0)}"
                         alt="${inv.parent_name}"
                         class="w-10 h-10 rounded-full object-cover"
                         onerror="this.src='https://via.placeholder.com/40?text=${inv.parent_name.charAt(0)}'">
                    <div>
                        <p class="font-medium text-gray-800 dark:text-gray-200">${inv.parent_name}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${inv.relationship_type} - Sent ${this.formatDate(inv.created_at)}</p>
                    </div>
                </div>
                <span class="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-800/50 dark:text-yellow-400">
                    Pending
                </span>
            </div>
        `).join('');
    }

    /**
     * Format date for display
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

        return date.toLocaleDateString();
    }

    /**
     * Search for users (debounced)
     */
    searchUsers(query) {
        console.log('ParentPortalManager: searchUsers called with query:', query);

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        if (query.length < 2) {
            console.log('ParentPortalManager: Query too short, showing placeholder');
            this.renderSearchPlaceholder();
            return;
        }

        // Show loading
        const loadingEl = document.getElementById('search-loading');
        if (loadingEl) {
            loadingEl.classList.remove('hidden');
            console.log('ParentPortalManager: Showing loading spinner');
        }

        this.searchTimeout = setTimeout(async () => {
            console.log('ParentPortalManager: Debounce timeout reached, performing search');
            await this.performSearch(query);
        }, 300);
    }

    /**
     * Perform the actual search
     */
    async performSearch(query) {
        const token = this.getToken();
        console.log('ParentPortalManager: performSearch called with query:', query);
        console.log('ParentPortalManager: Token available:', !!token);

        if (!token) {
            this.showToast('Please log in to search for users', 'error');
            return;
        }

        try {
            const url = `${PARENT_PORTAL_API_URL}/api/users/search?q=${encodeURIComponent(query)}&limit=10`;
            console.log('ParentPortalManager: Fetching URL:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            document.getElementById('search-loading')?.classList.add('hidden');

            console.log('ParentPortalManager: Response status:', response.status);

            if (response.ok) {
                const users = await response.json();
                console.log('ParentPortalManager: Users found:', users.length, users);
                this.renderSearchResults(users);
            } else {
                const errorText = await response.text();
                console.error('ParentPortalManager: Search failed:', response.status, errorText);
                this.renderNoResults();
            }
        } catch (error) {
            console.error('ParentPortalManager: Search error:', error);
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
                <p>Start typing to search for your parent</p>
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
        console.log('ParentPortalManager: renderSearchResults called with', users?.length, 'users');
        const container = document.getElementById('parent-search-results');
        if (!container) {
            console.error('ParentPortalManager: parent-search-results container not found!');
            return;
        }

        if (!users || users.length === 0) {
            console.log('ParentPortalManager: No users to display, showing no results');
            this.renderNoResults();
            return;
        }

        // Store reference to this for use in map callback
        const self = this;

        container.innerHTML = users.map(user => {
            const userJson = JSON.stringify(user).replace(/"/g, '&quot;');
            const firstInitial = (user.first_name || 'U').charAt(0).toUpperCase();

            return `
            <div class="user-search-card flex items-center gap-4 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 bg-white dark:bg-gray-700 cursor-pointer transition-all"
                 onclick="window.parentPortalManager.selectUser(${userJson})">
                <div class="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-lg border-2 border-gray-200 dark:border-gray-600">
                    ${firstInitial}
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-medium text-gray-800 dark:text-gray-200 truncate">
                        ${user.first_name || 'User'}
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
                    Invite
                </button>
            </div>
        `}).join('');

        console.log('ParentPortalManager: Search results rendered successfully');
    }

    /**
     * Get role badge class
     */
    getRoleBadgeClass(role) {
        const classes = {
            'student': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            'tutor': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            'parent': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            'admin': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        };
        return classes[role] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }

    /**
     * Select a user to invite
     */
    selectUser(user) {
        this.selectedUser = user;

        // Update hidden field
        document.getElementById('selected-user-id').value = user.user_id;

        // Update selected user card
        const card = document.getElementById('selected-user-card');
        if (card) {
            const initial = (user.first_name || 'U').charAt(0).toUpperCase();
            card.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-bold text-2xl border-2 border-purple-300">
                        ${initial}
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-800 dark:text-gray-200">
                            ${user.first_name || 'User'}
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
     * Submit invitation for existing user
     */
    async submitExistingUserInvitation(event) {
        event.preventDefault();

        const token = this.getToken();
        if (!token) {
            this.showToast('Please log in to send invitations', 'error');
            return;
        }

        const userId = document.getElementById('selected-user-id').value;
        const relationshipType = document.getElementById('invite-relationship-type').value;
        const securityFatherName = document.getElementById('security-father-name').value;
        const securityGrandfatherName = document.getElementById('security-grandfather-name').value;

        if (!userId || !relationshipType || !securityFatherName || !securityGrandfatherName) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        try {
            const response = await fetch(`${PARENT_PORTAL_API_URL}/api/student/invite-parent`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    target_user_id: parseInt(userId),
                    relationship_type: relationshipType,
                    security_father_name: securityFatherName,
                    security_grandfather_name: securityGrandfatherName
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('Invitation sent successfully!', 'success');
                closeInviteParentModal();
                await this.loadPendingInvitations();
            } else {
                this.showToast(data.detail || 'Failed to send invitation', 'error');
            }
        } catch (error) {
            console.error('Error sending invitation:', error);
            this.showToast('An error occurred. Please try again.', 'error');
        }
    }

    /**
     * Submit invitation for new user
     */
    async submitNewUserInvitation(event) {
        event.preventDefault();

        const token = this.getToken();
        if (!token) {
            this.showToast('Please log in to send invitations', 'error');
            return;
        }

        const firstName = document.getElementById('new-parent-first-name').value;
        const fatherName = document.getElementById('new-parent-father-name').value;
        const grandfatherName = document.getElementById('new-parent-grandfather-name').value;
        const gender = document.getElementById('new-parent-gender').value;
        const email = document.getElementById('new-parent-email').value;
        const phone = document.getElementById('new-parent-phone').value;
        const relationshipType = document.getElementById('new-parent-relationship-type').value;
        const securityFatherName = document.getElementById('new-security-father-name').value;
        const securityGrandfatherName = document.getElementById('new-security-grandfather-name').value;

        if (!firstName || !fatherName || !grandfatherName || !relationshipType || !securityFatherName || !securityGrandfatherName) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (!email && !phone) {
            this.showToast('Please provide either email or phone', 'error');
            return;
        }

        try {
            const response = await fetch(`${PARENT_PORTAL_API_URL}/api/student/invite-new-parent`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    first_name: firstName,
                    father_name: fatherName,
                    grandfather_name: grandfatherName,
                    gender: gender || null,
                    email: email || null,
                    phone: phone || null,
                    relationship_type: relationshipType,
                    security_father_name: securityFatherName,
                    security_grandfather_name: securityGrandfatherName
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Show success with temp password (for development - remove in production)
                if (data.temp_password) {
                    this.showToast(`Account created! Temp password: ${data.temp_password}`, 'success');
                } else {
                    this.showToast('Account created and invitation sent!', 'success');
                }
                closeInviteParentModal();
                await this.loadPendingInvitations();
            } else {
                this.showToast(data.detail || 'Failed to create account', 'error');
            }
        } catch (error) {
            console.error('Error creating account:', error);
            this.showToast('An error occurred. Please try again.', 'error');
        }
    }

    /**
     * Unlink a parent
     */
    async unlinkParent(parentUserId) {
        if (!confirm('Are you sure you want to unlink this parent? They will no longer be able to view your progress.')) {
            return;
        }

        const token = this.getToken();
        if (!token) {
            this.showToast('Please log in to unlink parents', 'error');
            return;
        }

        try {
            const response = await fetch(`${PARENT_PORTAL_API_URL}/api/student/unlink-parent/${parentUserId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.showToast('Parent unlinked successfully', 'success');
                await this.loadLinkedParents();
            } else {
                const data = await response.json();
                this.showToast(data.detail || 'Failed to unlink parent', 'error');
            }
        } catch (error) {
            console.error('Error unlinking parent:', error);
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
}

// Create global instance - overwrite the stub from HTML
window.parentPortalManager = new ParentPortalManager();

// Overwrite global functions from HTML stubs
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

/**
 * Switch between Linked Parents and Pending Invitations tabs
 */
window.switchParentPortalTab = function(tabName) {
    const linkedTab = document.getElementById('linked-parents-tab');
    const pendingTab = document.getElementById('pending-parents-tab');
    const linkedContent = document.getElementById('linked-parents-content');
    const pendingContent = document.getElementById('pending-parents-content');

    if (!linkedTab || !pendingTab || !linkedContent || !pendingContent) {
        console.error('Parent portal tab elements not found');
        return;
    }

    // Reset all tabs
    linkedTab.style.color = 'var(--text-muted)';
    linkedTab.style.borderBottomColor = 'transparent';
    pendingTab.style.color = 'var(--text-muted)';
    pendingTab.style.borderBottomColor = 'transparent';

    // Hide all content
    linkedContent.style.display = 'none';
    pendingContent.style.display = 'none';

    // Activate selected tab
    if (tabName === 'linked') {
        linkedTab.style.color = 'var(--button-bg)';
        linkedTab.style.borderBottomColor = 'var(--button-bg)';
        linkedContent.style.display = 'block';
    } else if (tabName === 'pending') {
        pendingTab.style.color = 'var(--button-bg)';
        pendingTab.style.borderBottomColor = 'var(--button-bg)';
        pendingContent.style.display = 'block';
    }
};

// Note: Local const references removed to avoid "already declared" errors
// Use window.parentPortalManager, window.openInviteParentModal, etc. directly

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize if on student profile page with parent portal panel
    if (document.getElementById('parent-portal-panel')) {
        window.parentPortalManager.init();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ParentPortalManager, parentPortalManager: window.parentPortalManager };
}
