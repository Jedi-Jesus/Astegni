/**
 * Team Manager - Advertiser Team Management
 * Handles inviting, listing, and managing team members
 */

const TeamManager = {
    // State
    members: [],
    currentFilter: 'all',
    stats: {
        total: 0,
        active: 0,
        pending: 0
    },
    // Search state
    searchTimeout: null,
    selectedUser: null,
    isSearching: false,

    // Initialize
    async initialize() {
        console.log('TeamManager initializing...');
        await this.loadTeamMembers();
        await this.loadTeamStats();
        this.setupEventListeners();
    },

    // Setup event listeners
    setupEventListeners() {
        // Close modal on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeInviteModal();
            }
        });

        // Close modal on overlay click
        const overlay = document.getElementById('team-invite-modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeInviteModal();
                }
            });
        }
    },

    // Load team members from API
    async loadTeamMembers() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/advertiser/team`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.members = data.members || [];
                    this.renderMembers();
                }
            } else {
                console.error('Failed to load team members');
                this.members = [];
                this.renderMembers();
            }
        } catch (error) {
            console.error('Error loading team members:', error);
            this.members = [];
            this.renderMembers();
        }
    },

    // Load team stats
    async loadTeamStats() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/advertiser/team/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.stats = data.stats;
                    this.updateStatsDisplay();
                }
            }
        } catch (error) {
            console.error('Error loading team stats:', error);
        }
    },

    // Update stats display
    updateStatsDisplay() {
        document.getElementById('team-total-count').textContent = this.stats.total || 0;
        document.getElementById('team-active-count').textContent = this.stats.active || 0;
        document.getElementById('team-pending-count').textContent = this.stats.pending || 0;
    },

    // Filter members by status
    filterByStatus(status) {
        this.currentFilter = status;

        // Update tab buttons
        document.querySelectorAll('.team-filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        event.target.classList.add('active');

        this.renderMembers();
    },

    // Render team members
    renderMembers() {
        const container = document.getElementById('team-members-grid');
        const emptyState = document.getElementById('team-empty-state');

        if (!container) return;

        // Filter members
        let filtered = this.members;
        if (this.currentFilter !== 'all') {
            filtered = this.members.filter(m => m.status === this.currentFilter);
        }

        // Show/hide empty state
        if (filtered.length === 0) {
            emptyState.style.display = 'flex';
            // Clear existing cards but keep empty state
            const cards = container.querySelectorAll('.team-member-card');
            cards.forEach(card => card.remove());
            return;
        }

        emptyState.style.display = 'none';

        // Render cards
        const cardsHtml = filtered.map(member => this.createMemberCard(member)).join('');

        // Keep empty state in container
        container.innerHTML = cardsHtml + `
            <div class="team-empty-state" id="team-empty-state" style="display: none;">
                <i class="fas fa-user-friends"></i>
                <h4>No team members yet</h4>
                <p>Invite colleagues to help manage your advertising</p>
                <button class="invite-member-btn-small" onclick="TeamManager.openInviteModal()">
                    <i class="fas fa-user-plus"></i>
                    Invite First Member
                </button>
            </div>
        `;
    },

    // Create member card HTML
    createMemberCard(member) {
        const roleIcon = {
            owner: 'fa-crown',
            brand_manager: 'fa-briefcase'
        }[member.role] || 'fa-user';

        const roleClass = `role-${member.role}`;

        // Only owner has special badge
        const isOwner = member.role === 'owner';
        const roleLabel = member.role === 'owner' ? 'Owner' : 'Brand Manager';

        const statusBadge = member.status === 'pending'
            ? '<span class="status-badge status-pending"><i class="fas fa-clock"></i> Pending</span>'
            : '<span class="status-badge status-active"><i class="fas fa-check-circle"></i> Active</span>';

        const avatar = member.profile_picture
            ? `<img src="${member.profile_picture}" alt="${member.full_name || member.email}">`
            : `<div class="member-avatar-placeholder">${(member.full_name || member.email).charAt(0).toUpperCase()}</div>`;

        const lastActive = member.last_active
            ? `Last active: ${this.formatDate(member.last_active)}`
            : member.status === 'pending'
                ? `Invited: ${this.formatDate(member.invited_at)}`
                : member.is_owner
                    ? 'Account Creator'
                    : '';

        // Show can_set_price badge for brand managers
        const canSetPriceBadge = !isOwner && member.can_set_price
            ? '<span class="permission-badge can-set-price"><i class="fas fa-dollar-sign"></i> Can Set Price</span>'
            : '';

        // Owner doesn't have action menu (cannot be modified)
        const showActions = !isOwner && member.status !== 'pending';

        return `
            <div class="team-member-card ${isOwner ? 'owner-card' : ''}" data-member-id="${member.id}">
                <div class="member-card-header">
                    <div class="member-avatar">
                        ${avatar}
                        <div class="member-role-badge ${roleClass}">
                            <i class="fas ${roleIcon}"></i>
                        </div>
                    </div>
                    ${showActions ? `
                        <div class="member-actions">
                            <button class="member-action-btn" onclick="TeamManager.showMemberMenu(${member.id}, event)" title="More options">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="member-card-body">
                    <h4 class="member-name">${member.full_name || 'Unnamed'}${member.is_owner ? ' <span class="owner-tag">You</span>' : ''}</h4>
                    <p class="member-email">${member.email}</p>
                    <div class="member-meta">
                        <span class="member-role ${roleClass}">
                            <i class="fas ${roleIcon}"></i>
                            ${roleLabel}
                        </span>
                        ${statusBadge}
                    </div>
                    ${canSetPriceBadge}
                    ${lastActive ? `<p class="member-last-active">${lastActive}</p>` : ''}
                </div>
                ${member.status === 'pending' ? `
                    <div class="member-card-footer">
                        <button class="resend-invite-btn" onclick="TeamManager.resendInvite(${member.id})">
                            <i class="fas fa-redo"></i>
                            Resend Invite
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // Format date
    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    },

    // Open invite modal
    openInviteModal() {
        const overlay = document.getElementById('team-invite-modal-overlay');
        if (overlay) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            // Focus email input
            setTimeout(() => {
                document.getElementById('invite-email')?.focus();
            }, 100);
        }
    },

    // Close invite modal
    closeInviteModal() {
        const overlay = document.getElementById('team-invite-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            // Reset form
            document.getElementById('team-invite-form')?.reset();
            // Reset search state
            this.clearSelectedUser();
            this.hideSearchResults();
        }
    },

    // ============================================
    // LIVE USER SEARCH FUNCTIONALITY
    // ============================================

    // Search for users (debounced)
    searchUsers(query) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // If user is selected, don't search
        if (this.selectedUser) {
            return;
        }

        const trimmedQuery = query.trim();

        // Hide results if query is too short
        if (trimmedQuery.length < 2) {
            this.hideSearchResults();
            return;
        }

        // Debounce: wait 300ms before searching
        this.searchTimeout = setTimeout(() => {
            this.performUserSearch(trimmedQuery);
        }, 300);
    },

    // Perform the actual search API call
    async performUserSearch(query) {
        if (this.isSearching) return;

        this.isSearching = true;
        const resultsContainer = document.getElementById('user-search-results');

        try {
            // Show loading state
            resultsContainer.innerHTML = `
                <div class="search-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Searching...</span>
                </div>
            `;
            resultsContainer.style.display = 'block';

            const token = localStorage.getItem('token');
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/advertiser/team/search-users?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();

            if (data.success && data.users.length > 0) {
                this.renderSearchResults(data.users, query);
            } else {
                // Show "no results" with option to invite by email
                this.renderNoResults(query);
            }
        } catch (error) {
            console.error('Error searching users:', error);
            this.renderNoResults(query);
        } finally {
            this.isSearching = false;
        }
    },

    // Render search results dropdown
    renderSearchResults(users, query) {
        const resultsContainer = document.getElementById('user-search-results');

        const resultsHtml = users.map(user => {
            const avatar = user.profile_picture
                ? `<img src="${user.profile_picture}" alt="${user.full_name || user.email}">`
                : `<div class="avatar-placeholder">${(user.full_name || user.email).charAt(0).toUpperCase()}</div>`;

            const roles = user.roles || [];
            const roleBadges = roles.map(role => {
                const roleIcons = {
                    student: 'fa-graduation-cap',
                    tutor: 'fa-chalkboard-teacher',
                    parent: 'fa-user-friends',
                    advertiser: 'fa-bullhorn'
                };
                const icon = roleIcons[role] || 'fa-user';
                return `<span class="role-mini-badge role-${role}"><i class="fas ${icon}"></i> ${role}</span>`;
            }).join('');

            // Highlight matching text
            const highlightedName = this.highlightMatch(user.full_name || 'Unnamed', query);
            const highlightedEmail = this.highlightMatch(user.email, query);

            return `
                <div class="search-result-item" onclick="TeamManager.selectUser(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                    <div class="search-result-avatar">
                        ${avatar}
                    </div>
                    <div class="search-result-info">
                        <div class="search-result-name">${highlightedName}</div>
                        <div class="search-result-email">${highlightedEmail}</div>
                        ${roleBadges ? `<div class="search-result-roles">${roleBadges}</div>` : ''}
                    </div>
                    <div class="search-result-action">
                        <i class="fas fa-plus-circle"></i>
                    </div>
                </div>
            `;
        }).join('');

        // Add "Invite by email" option at the bottom if query looks like an email
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);
        const inviteByEmailHtml = isEmail ? `
            <div class="search-result-divider"></div>
            <div class="search-result-item invite-new" onclick="TeamManager.useEmailDirectly('${query}')">
                <div class="search-result-avatar">
                    <div class="avatar-placeholder new-invite"><i class="fas fa-envelope"></i></div>
                </div>
                <div class="search-result-info">
                    <div class="search-result-name">Invite "${query}"</div>
                    <div class="search-result-email">Send invitation to this email</div>
                </div>
                <div class="search-result-action">
                    <i class="fas fa-paper-plane"></i>
                </div>
            </div>
        ` : '';

        resultsContainer.innerHTML = resultsHtml + inviteByEmailHtml;
        resultsContainer.style.display = 'block';
    },

    // Render "no results" with email invite option
    renderNoResults(query) {
        const resultsContainer = document.getElementById('user-search-results');
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query);

        if (isEmail) {
            resultsContainer.innerHTML = `
                <div class="search-no-results">
                    <p>No existing user found</p>
                </div>
                <div class="search-result-item invite-new" onclick="TeamManager.useEmailDirectly('${query}')">
                    <div class="search-result-avatar">
                        <div class="avatar-placeholder new-invite"><i class="fas fa-envelope"></i></div>
                    </div>
                    <div class="search-result-info">
                        <div class="search-result-name">Invite "${query}"</div>
                        <div class="search-result-email">Send invitation to this new email</div>
                    </div>
                    <div class="search-result-action">
                        <i class="fas fa-paper-plane"></i>
                    </div>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search"></i>
                    <p>No users found matching "${query}"</p>
                    <span>Enter a valid email address to invite someone new</span>
                </div>
            `;
        }
        resultsContainer.style.display = 'block';
    },

    // Highlight matching text in search results
    highlightMatch(text, query) {
        if (!text || !query) return text || '';
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    },

    // Hide search results dropdown
    hideSearchResults() {
        const resultsContainer = document.getElementById('user-search-results');
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
            resultsContainer.innerHTML = '';
        }
    },

    // Select a user from search results
    selectUser(user) {
        this.selectedUser = user;

        // Hide search results
        this.hideSearchResults();

        // Update email input
        const emailInput = document.getElementById('invite-email');
        if (emailInput) {
            emailInput.value = user.email;
            emailInput.readOnly = true;
        }

        // Show selected user card
        const card = document.getElementById('selected-user-card');
        const avatarEl = document.getElementById('selected-user-avatar');
        const nameEl = document.getElementById('selected-user-name');
        const emailEl = document.getElementById('selected-user-email');
        const rolesEl = document.getElementById('selected-user-roles');

        if (card) {
            card.style.display = 'flex';

            // Avatar
            if (avatarEl) {
                if (user.profile_picture) {
                    avatarEl.innerHTML = `<img src="${user.profile_picture}" alt="${user.full_name}">`;
                } else {
                    avatarEl.innerHTML = `<span>${(user.full_name || user.email).charAt(0).toUpperCase()}</span>`;
                }
            }

            // Name and email
            if (nameEl) nameEl.textContent = user.full_name || 'Unnamed User';
            if (emailEl) emailEl.textContent = user.email;

            // Roles
            if (rolesEl && user.roles) {
                const roleIcons = {
                    student: 'fa-graduation-cap',
                    tutor: 'fa-chalkboard-teacher',
                    parent: 'fa-user-friends',
                    advertiser: 'fa-bullhorn'
                };
                rolesEl.innerHTML = user.roles.map(role => {
                    const icon = roleIcons[role] || 'fa-user';
                    return `<span class="selected-role-badge"><i class="fas ${icon}"></i> ${role}</span>`;
                }).join('');
            }
        }

        // Hide name fields (we already have user's name)
        const nameFieldsGroup = document.getElementById('name-fields-group');
        if (nameFieldsGroup) {
            nameFieldsGroup.style.display = 'none';
        }

        // Pre-fill name fields with user's individual name fields
        // Backend returns first_name, father_name, grandfather_name
        document.getElementById('invite-first-name').value = user.first_name || '';
        document.getElementById('invite-father-name').value = user.father_name || '';
        document.getElementById('invite-grandfather-name').value = user.grandfather_name || '';
    },

    // Use email directly (for new users not in system)
    useEmailDirectly(email) {
        this.selectedUser = null;

        // Hide search results
        this.hideSearchResults();

        // Update email input
        const emailInput = document.getElementById('invite-email');
        if (emailInput) {
            emailInput.value = email;
        }

        // Hide selected user card
        const card = document.getElementById('selected-user-card');
        if (card) {
            card.style.display = 'none';
        }

        // Show name fields for new user
        const nameFieldsGroup = document.getElementById('name-fields-group');
        if (nameFieldsGroup) {
            nameFieldsGroup.style.display = 'block';
        }

        // Clear name fields
        document.getElementById('invite-first-name').value = '';
        document.getElementById('invite-father-name').value = '';
        document.getElementById('invite-grandfather-name').value = '';

        // Focus on first name
        document.getElementById('invite-first-name')?.focus();
    },

    // Clear selected user
    clearSelectedUser() {
        this.selectedUser = null;

        // Reset email input
        const emailInput = document.getElementById('invite-email');
        if (emailInput) {
            emailInput.value = '';
            emailInput.readOnly = false;
            emailInput.focus();
        }

        // Hide selected user card
        const card = document.getElementById('selected-user-card');
        if (card) {
            card.style.display = 'none';
        }

        // Show name fields
        const nameFieldsGroup = document.getElementById('name-fields-group');
        if (nameFieldsGroup) {
            nameFieldsGroup.style.display = 'block';
        }

        // Clear name fields
        document.getElementById('invite-first-name').value = '';
        document.getElementById('invite-father-name').value = '';
        document.getElementById('invite-grandfather-name').value = '';
    },

    // Submit invite
    async submitInvite(event) {
        event.preventDefault();

        const email = document.getElementById('invite-email').value.trim();

        // Get Ethiopian-style name fields
        const firstName = document.getElementById('invite-first-name')?.value.trim() || '';
        const fatherName = document.getElementById('invite-father-name')?.value.trim() || '';
        const grandfatherName = document.getElementById('invite-grandfather-name')?.value.trim() || '';

        // Combine names (filter out empty parts)
        const nameParts = [firstName, fatherName, grandfatherName].filter(n => n);
        const fullName = nameParts.join(' ');

        // Get date of birth (for security verification)
        const dob = document.getElementById('invite-dob')?.value || null;

        const canSetPriceToggle = document.getElementById('invite-can-set-price');
        const canSetPrice = canSetPriceToggle ? canSetPriceToggle.checked : false;

        if (!email) {
            alert('Please enter an email address');
            return;
        }

        const submitBtn = document.getElementById('team-invite-submit-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/advertiser/team/invite`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    full_name: fullName || null,
                    dob: dob,
                    can_set_price: canSetPrice
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.closeInviteModal();
                await this.loadTeamMembers();
                await this.loadTeamStats();

                if (typeof showNotification === 'function') {
                    showNotification(`Invitation sent to ${email}`, 'success');
                }
            } else {
                throw new Error(data.detail || 'Failed to send invitation');
            }
        } catch (error) {
            console.error('Error sending invite:', error);
            if (typeof showNotification === 'function') {
                showNotification(error.message || 'Failed to send invitation', 'error');
            } else {
                alert(error.message || 'Failed to send invitation');
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    },

    // Show member context menu
    showMemberMenu(memberId, event) {
        event.stopPropagation();

        // Remove any existing menus
        document.querySelectorAll('.member-context-menu').forEach(m => m.remove());

        const member = this.members.find(m => m.id === memberId);
        if (!member) return;

        // Owner cannot be modified
        if (member.role === 'owner') {
            return;
        }

        const menu = document.createElement('div');
        menu.className = 'member-context-menu';

        // Show can_set_price toggle and remove option
        const canSetPrice = member.can_set_price;

        menu.innerHTML = `
            <button onclick="TeamManager.toggleCanSetPrice(${memberId}, ${!canSetPrice})">
                <i class="fas fa-dollar-sign"></i> ${canSetPrice ? 'Remove Price Permission' : 'Allow to Set Price'}
            </button>
            <div class="menu-divider"></div>
            <button class="danger" onclick="TeamManager.removeMember(${memberId})">
                <i class="fas fa-user-minus"></i> Remove from Team
            </button>
        `;

        // Position menu
        const rect = event.target.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.right = `${window.innerWidth - rect.right}px`;

        document.body.appendChild(menu);

        // Close on outside click
        const closeMenu = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 10);
    },

    // Toggle can_set_price permission
    async toggleCanSetPrice(memberId, canSetPrice) {
        // Remove menu
        document.querySelectorAll('.member-context-menu').forEach(m => m.remove());

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/advertiser/team/${memberId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ can_set_price: canSetPrice })
            });

            if (response.ok) {
                await this.loadTeamMembers();
                if (typeof showNotification === 'function') {
                    showNotification(canSetPrice ? 'Can now set prices' : 'Price permission removed', 'success');
                }
            } else {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to update permissions');
            }
        } catch (error) {
            console.error('Error updating permissions:', error);
            if (typeof showNotification === 'function') {
                showNotification(error.message, 'error');
            }
        }
    },

    // Remove member
    async removeMember(memberId) {
        // Remove menu
        document.querySelectorAll('.member-context-menu').forEach(m => m.remove());

        const member = this.members.find(m => m.id === memberId);
        if (!member) return;

        if (!confirm(`Remove ${member.full_name || member.email} from the team?`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/advertiser/team/${memberId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                await this.loadTeamMembers();
                await this.loadTeamStats();
                if (typeof showNotification === 'function') {
                    showNotification('Team member removed', 'success');
                }
            } else {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to remove member');
            }
        } catch (error) {
            console.error('Error removing member:', error);
            if (typeof showNotification === 'function') {
                showNotification(error.message, 'error');
            }
        }
    },

    // Resend invitation
    async resendInvite(memberId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/advertiser/team/${memberId}/resend`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                if (typeof showNotification === 'function') {
                    showNotification('Invitation resent', 'success');
                }
            } else {
                throw new Error(data.detail || 'Failed to resend invitation');
            }
        } catch (error) {
            console.error('Error resending invite:', error);
            if (typeof showNotification === 'function') {
                showNotification(error.message, 'error');
            }
        }
    }
};

// Initialize when team panel is shown
document.addEventListener('DOMContentLoaded', () => {
    // Initialize when team panel becomes active
    const teamPanel = document.getElementById('team-panel');
    if (teamPanel) {
        // Check if already visible
        if (teamPanel.classList.contains('active')) {
            TeamManager.initialize();
        }

        // Watch for panel changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (teamPanel.classList.contains('active')) {
                        TeamManager.initialize();
                    }
                }
            });
        });

        observer.observe(teamPanel, { attributes: true });
    }
});

// Also initialize when switchPanel is called
const originalSwitchPanel = typeof switchPanel === 'function' ? switchPanel : null;
if (originalSwitchPanel) {
    window.switchPanel = function(panelName) {
        originalSwitchPanel(panelName);
        if (panelName === 'team') {
            setTimeout(() => TeamManager.initialize(), 100);
        }
    };
}
