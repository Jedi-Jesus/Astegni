/**
 * Child Invitation Manager
 *
 * Handles displaying child invitations (parents inviting users as children) across all profiles:
 * - parent-profile
 * - student-profile
 * - tutor-profile
 *
 * Uses /api/child-invitations/received endpoint to get received invitations
 */

const CHILD_INV_API_URL = window.API_BASE_URL || 'http://localhost:8000';

class ChildInvitationManager {
    constructor() {
        this.receivedInvitations = [];
        this.currentStatus = 'all';
    }

    /**
     * Load received child invitations (parents inviting you as their child)
     */
    async loadChildInvitations() {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            console.warn('[ChildInvitationManager] No auth token found');
            return;
        }

        console.log('[ChildInvitationManager] Loading received child invitations...');

        try {
            const response = await fetch(`${CHILD_INV_API_URL}/api/child-invitations/received`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[ChildInvitationManager] Loaded invitations:', data);
                this.receivedInvitations = data.invitations || [];
                this.updateBadgeCounts();
                return this.receivedInvitations;
            } else {
                console.error('[ChildInvitationManager] Failed to load invitations:', response.status);
                return [];
            }
        } catch (error) {
            console.error('[ChildInvitationManager] Error loading invitations:', error);
            return [];
        }
    }

    /**
     * Update badge counts across all profiles
     */
    updateBadgeCounts() {
        const pendingCount = this.receivedInvitations.filter(inv => inv.status === 'pending').length;

        // Update all possible badge elements
        const badgeIds = [
            'parent-child-invitation-count',
            'student-child-invitation-count',
            'tutor-child-invitation-count'
        ];

        badgeIds.forEach(id => {
            const badge = document.getElementById(id);
            if (badge) {
                if (pendingCount > 0) {
                    badge.textContent = pendingCount;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        });
    }

    /**
     * Render child invitations in the requests list container
     * @param {string} containerId - The ID of the container element
     * @param {string} statusFilter - Filter by status: 'all', 'pending', 'accepted', 'rejected'
     */
    renderChildInvitations(containerId, statusFilter = 'all') {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn('[ChildInvitationManager] Container not found:', containerId);
            return;
        }

        this.currentStatus = statusFilter;

        // Filter invitations by status
        let filtered = this.receivedInvitations;
        if (statusFilter !== 'all') {
            filtered = this.receivedInvitations.filter(inv => inv.status === statusFilter);
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="card p-8 text-center text-gray-500">
                    <div class="text-5xl mb-4 opacity-50">👶</div>
                    <h3 class="text-lg font-semibold mb-2">No Child Invitations</h3>
                    <p class="text-sm">When parents invite you to be their child on Astegni, you'll see the invitations here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="space-y-4">
                ${filtered.map(inv => this.createInvitationCard(inv)).join('')}
            </div>
        `;
    }

    /**
     * Create card for a child invitation
     */
    createInvitationCard(invitation) {
        const inviterName = invitation.inviter_name || 'Unknown Parent';
        const profilePicture = invitation.inviter_profile_picture ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(inviterName)}&background=10B981&color=fff&size=80`;
        const createdAt = invitation.created_at ? new Date(invitation.created_at).toLocaleDateString() : 'Recently';
        const status = invitation.status || 'pending';

        // Status badge styling
        const statusStyles = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        };
        const statusBadgeClass = statusStyles[status] || statusStyles.pending;

        // Action buttons only for pending
        const actionButtons = status === 'pending' ? `
            <div class="flex gap-2 mt-4">
                <button onclick="childInvitationManager.acceptInvitation(${invitation.id})"
                        class="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button onclick="childInvitationManager.rejectInvitation(${invitation.id})"
                        class="flex-1 py-2 px-4 rounded-lg border-2 border-red-300 text-red-600 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-2">
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>
        ` : '';

        return `
            <div class="card p-6 border-2 border-green-200 dark:border-green-700 hover:border-green-400 dark:hover:border-green-500 transition-all">
                <div class="flex items-start gap-4">
                    <!-- Inviter Profile Picture -->
                    <img src="${profilePicture}"
                         alt="${inviterName}"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(inviterName)}&background=10B981&color=fff&size=80'"
                         class="w-16 h-16 rounded-full object-cover border-3 border-green-400">

                    <!-- Invitation Details -->
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="font-bold text-lg">${inviterName}</h3>
                            <span class="text-xs px-2 py-0.5 rounded-full ${statusBadgeClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        </div>
                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <span class="inline-flex items-center gap-1">
                                <i class="fas fa-user-friends text-green-500"></i>
                                Wants to add you as their child
                            </span>
                        </p>
                        <p class="text-xs text-gray-500">
                            <i class="fas fa-clock"></i> Sent: ${createdAt}
                        </p>

                        ${actionButtons}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Accept a child invitation
     */
    async acceptInvitation(invitationId) {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            showNotification('Please log in to accept invitations', 'error');
            return;
        }

        try {
            const response = await fetch(`${CHILD_INV_API_URL}/api/child-invitations/${invitationId}/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'accept' })
            });

            const data = await response.json();

            if (response.ok) {
                showNotification('Invitation accepted! You are now linked as a child.', 'success');
                // Reload invitations
                await this.loadChildInvitations();
                // Re-render with current filter
                this.renderChildInvitations(this.getCurrentContainerId(), this.currentStatus);
            } else {
                showNotification(data.detail || 'Failed to accept invitation', 'error');
            }
        } catch (error) {
            console.error('[ChildInvitationManager] Error accepting invitation:', error);
            showNotification('Error accepting invitation', 'error');
        }
    }

    /**
     * Reject a child invitation
     */
    async rejectInvitation(invitationId) {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            showNotification('Please log in to reject invitations', 'error');
            return;
        }

        try {
            const response = await fetch(`${CHILD_INV_API_URL}/api/child-invitations/${invitationId}/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'reject' })
            });

            const data = await response.json();

            if (response.ok) {
                showNotification('Invitation rejected', 'success');
                // Reload invitations
                await this.loadChildInvitations();
                // Re-render with current filter
                this.renderChildInvitations(this.getCurrentContainerId(), this.currentStatus);
            } else {
                showNotification(data.detail || 'Failed to reject invitation', 'error');
            }
        } catch (error) {
            console.error('[ChildInvitationManager] Error rejecting invitation:', error);
            showNotification('Error rejecting invitation', 'error');
        }
    }

    /**
     * Get the current container ID based on which profile page we're on
     */
    getCurrentContainerId() {
        // Check which profile we're on
        if (document.getElementById('parent-requests-list')) {
            return 'parent-requests-list';
        } else if (document.getElementById('student-requests-list')) {
            return 'student-requests-list';
        } else if (document.getElementById('tutor-requests-list')) {
            return 'tutor-requests-list';
        }
        return null;
    }
}

// Create global instance
const childInvitationManager = new ChildInvitationManager();
window.childInvitationManager = childInvitationManager;

// Helper function to filter by child invitations type
function filterChildInvitations(containerId, status = 'all') {
    childInvitationManager.loadChildInvitations().then(() => {
        childInvitationManager.renderChildInvitations(containerId, status);
    });
}

// Make available globally
window.filterChildInvitations = filterChildInvitations;

console.log('[ChildInvitationManager] Module loaded');
