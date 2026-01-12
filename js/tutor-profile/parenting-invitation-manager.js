/**
 * Parenting Invitation Manager for Tutor Profile
 *
 * Handles displaying parenting invitations in tutor-profile:
 * - Received invitations (students/parents inviting the tutor as a parent/co-parent)
 * - Sent invitations (if the tutor invited others - less common)
 *
 * Uses /api/parent/pending-invitations endpoint which works for ANY user
 */

const PARENTING_API_URL = window.API_BASE_URL || 'http://localhost:8000';

class ParentingInvitationManager {
    constructor() {
        this.receivedInvitations = [];
        this.sentInvitations = [];
    }

    /**
     * Load parenting invitations (received - students/parents inviting you)
     */
    async loadParentingInvitations() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('[ParentingInvitationManager] ⚠️ No auth token found');
            this.showPlaceholder('Please log in to view invitations');
            return;
        }

        console.log('[ParentingInvitationManager] 🔄 Loading parenting invitations (received)...');
        console.log('[ParentingInvitationManager] API URL:', `${PARENTING_API_URL}/api/parent/pending-invitations`);

        try {
            // Fetch received invitations (where you are invited as parent/co-parent)
            const response = await fetch(`${PARENTING_API_URL}/api/parent/pending-invitations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('[ParentingInvitationManager] API response status:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                console.log('[ParentingInvitationManager] ✅ API response data:', data);
                console.log('[ParentingInvitationManager] Total invitations received:', (data.invitations || []).length);

                this.receivedInvitations = data.invitations || [];
                console.log('[ParentingInvitationManager] Received invitations stored:', this.receivedInvitations.length);
                console.log('[ParentingInvitationManager] Invitation details:', this.receivedInvitations);

                this.renderReceivedInvitations();
                this.updateInvitationCount();
            } else {
                const errorText = await response.text();
                console.error('[ParentingInvitationManager] ❌ API error response:', errorText);
                console.error('[ParentingInvitationManager] Status:', response.status, response.statusText);
                this.showPlaceholder('Unable to load invitations');
            }
        } catch (error) {
            console.error('[ParentingInvitationManager] ❌ Error loading invitations:', error);
            console.error('[ParentingInvitationManager] Error details:', error.message, error.stack);
            this.showPlaceholder('Error loading invitations');
        }
    }

    /**
     * Load sent invitations (where you invited others - rare for tutors)
     */
    async loadSentInvitations() {
        const token = localStorage.getItem('token');
        if (!token) {
            this.showPlaceholder('Please log in to view sent invitations');
            return;
        }

        try {
            // Fetch sent invitations (using student endpoint if tutor also has student role)
            const response = await fetch(`${PARENTING_API_URL}/api/student/my-parent-invitations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.sentInvitations = data.sent || [];
                this.renderSentInvitations();
                this.updateInvitationCount();
            } else {
                this.showPlaceholder('No sent invitations');
            }
        } catch (error) {
            console.error('[ParentingInvitationManager] Error loading sent invitations:', error);
            this.showPlaceholder('Error loading sent invitations');
        }
    }

    /**
     * Render received invitations (students/parents inviting you)
     */
    renderReceivedInvitations() {
        const container = document.getElementById('tutor-requests-list');
        if (!container) return;

        if (this.receivedInvitations.length === 0) {
            container.innerHTML = `
                <div class="card p-8 text-center text-gray-500">
                    <div class="text-5xl mb-4 opacity-50">📬</div>
                    <h3 class="text-lg font-semibold mb-2">No Pending Invitations</h3>
                    <p class="text-sm">When students or parents invite you to be their parent/co-parent, you'll see the invitations here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="space-y-4">
                ${this.receivedInvitations.map(inv => this.createReceivedInvitationCard(inv)).join('')}
            </div>
        `;
    }

    /**
     * Create card for received invitation
     * UPDATED: Now uses inviter_name, inviter_username, inviter_type, inviter_user_id (USER-ID SYSTEM)
     */
    createReceivedInvitationCard(invitation) {
        // NEW SYSTEM: Use inviter_name and inviter_username
        const inviterName = invitation.inviter_name || 'Unknown User';
        const inviterUsername = invitation.inviter_username || null;
        const inviterType = invitation.inviter_type || 'student';
        // Use inviter_profile_picture first, then student_profile_picture for backwards compatibility
        const profilePicture = invitation.inviter_profile_picture || invitation.student_profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(inviterName)}&background=6366F1&color=fff&size=80`;
        const relationshipType = invitation.relationship_type || 'Parent';
        const gradeLevel = invitation.grade_level || '';
        const studyingAt = invitation.studying_at || '';
        const createdAt = invitation.created_at ? new Date(invitation.created_at).toLocaleDateString() : 'Recently';

        // Determine inviter type badge
        const inviterTypeBadge = inviterType === 'student' ? '👨‍🎓 Student' :
                                 inviterType === 'parent' ? '👨‍👩‍👧 Parent' :
                                 inviterType === 'tutor' ? '👨‍🏫 Tutor' : inviterType;

        return `
            <div class="card p-6 border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-500 transition-all">
                <div class="flex items-start gap-4">
                    <!-- Inviter Profile Picture -->
                    <img src="${profilePicture}"
                         alt="${inviterName}"
                         onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(inviterName)}&background=6366F1&color=fff&size=80'"
                         class="w-16 h-16 rounded-full object-cover border-3 border-purple-400">

                    <!-- Invitation Details -->
                    <div class="flex-1">
                        <div class="flex items-start justify-between mb-3">
                            <div>
                                <h3 class="text-lg font-bold text-gray-800 dark:text-gray-200">${inviterName}</h3>
                                ${inviterUsername ? `<p class="text-sm text-gray-500 dark:text-gray-400 mb-1">@${inviterUsername}</p>` : ''}
                                <p class="text-sm text-gray-600 dark:text-gray-400">
                                    <span class="px-2 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 mr-2">${inviterTypeBadge}</span>
                                    wants you to be their <strong>${relationshipType}</strong>
                                </p>
                            </div>
                            <span class="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                <i class="fas fa-clock mr-1"></i> Pending
                            </span>
                        </div>

                        <!-- Inviter Info -->
                        <div class="grid grid-cols-2 gap-3 mb-4">
                            ${gradeLevel ? `
                                <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <i class="fas fa-graduation-cap text-purple-500"></i>
                                    <span>${gradeLevel}</span>
                                </div>
                            ` : ''}
                            ${studyingAt ? `
                                <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <i class="fas fa-school text-purple-500"></i>
                                    <span>${studyingAt}</span>
                                </div>
                            ` : ''}
                            <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <i class="fas fa-calendar-alt text-purple-500"></i>
                                <span>Sent ${createdAt}</span>
                            </div>
                            ${invitation.inviter_email ? `
                                <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <i class="fas fa-envelope text-purple-500"></i>
                                    <span class="truncate">${invitation.inviter_email}</span>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex gap-3">
                            <button onclick="ParentingInvitationManager.acceptInvitation(${invitation.id})"
                                    class="flex-1 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold transition-all flex items-center justify-center gap-2">
                                <i class="fas fa-check"></i> Accept
                            </button>
                            <button onclick="ParentingInvitationManager.rejectInvitation(${invitation.id})"
                                    class="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-all flex items-center justify-center gap-2">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render sent invitations
     */
    renderSentInvitations() {
        const container = document.getElementById('tutor-requests-list');
        if (!container) return;

        if (this.sentInvitations.length === 0) {
            container.innerHTML = `
                <div class="card p-8 text-center text-gray-500">
                    <div class="text-5xl mb-4 opacity-50">📤</div>
                    <h3 class="text-lg font-semibold mb-2">No Sent Invitations</h3>
                    <p class="text-sm">You haven't invited anyone to be a parent yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="space-y-4">
                ${this.sentInvitations.map(inv => this.createSentInvitationCard(inv)).join('')}
            </div>
        `;
    }

    /**
     * Create card for sent invitation
     */
    createSentInvitationCard(invitation) {
        const parentName = invitation.parent_name || 'Unknown';
        const relationshipType = invitation.relationship_type || 'Parent';
        const status = invitation.status || 'pending';
        const createdAt = invitation.created_at ? new Date(invitation.created_at).toLocaleDateString() : 'Recently';

        let statusBadge = '';
        if (status === 'pending') {
            statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700"><i class="fas fa-clock mr-1"></i> Pending</span>';
        } else if (status === 'accepted') {
            statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700"><i class="fas fa-check mr-1"></i> Accepted</span>';
        } else if (status === 'rejected') {
            statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700"><i class="fas fa-times mr-1"></i> Rejected</span>';
        }

        return `
            <div class="card p-6">
                <div class="flex items-center justify-between mb-3">
                    <div>
                        <h3 class="text-lg font-bold">${parentName}</h3>
                        <p class="text-sm text-gray-600">Invited as <strong>${relationshipType}</strong></p>
                    </div>
                    ${statusBadge}
                </div>
                <p class="text-sm text-gray-500">Sent ${createdAt}</p>
            </div>
        `;
    }

    /**
     * Accept invitation
     */
    async acceptInvitation(invitationId) {
        const token = localStorage.getItem('token');
        if (!token) {
            this.showNotification('Please log in to accept invitations', 'error');
            return;
        }

        if (!confirm('Are you sure you want to accept this parenting invitation?')) {
            return;
        }

        try {
            const response = await fetch(`${PARENTING_API_URL}/api/parent/accept-invitation/${invitationId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                this.showNotification('Invitation accepted successfully!', 'success');
                this.loadParentingInvitations(); // Reload
            } else {
                const data = await response.json();
                this.showNotification(data.detail || 'Failed to accept invitation', 'error');
            }
        } catch (error) {
            console.error('[ParentingInvitationManager] Error accepting invitation:', error);
            this.showNotification('Error accepting invitation', 'error');
        }
    }

    /**
     * Reject invitation
     */
    async rejectInvitation(invitationId) {
        const token = localStorage.getItem('token');
        if (!token) {
            this.showNotification('Please log in to reject invitations', 'error');
            return;
        }

        if (!confirm('Are you sure you want to reject this parenting invitation?')) {
            return;
        }

        try {
            const response = await fetch(`${PARENTING_API_URL}/api/parent/reject-invitation/${invitationId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                this.showNotification('Invitation rejected', 'info');
                this.loadParentingInvitations(); // Reload
            } else {
                const data = await response.json();
                this.showNotification(data.detail || 'Failed to reject invitation', 'error');
            }
        } catch (error) {
            console.error('[ParentingInvitationManager] Error rejecting invitation:', error);
            this.showNotification('Error rejecting invitation', 'error');
        }
    }

    /**
     * Update invitation count badges
     */
    async updateInvitationCount() {
        // Update "Invited (Received)" tab badge
        const invitedBadge = document.getElementById('parenting-invited-count');
        if (invitedBadge) {
            const pendingCount = this.receivedInvitations.filter(inv => inv.status === 'pending').length;
            if (pendingCount > 0) {
                invitedBadge.textContent = pendingCount;
                invitedBadge.classList.remove('hidden');
            } else {
                invitedBadge.classList.add('hidden');
            }
        }

        // Update "Invites (Sent)" tab badge
        const invitesBadge = document.getElementById('parenting-invites-count');
        if (invitesBadge) {
            const sentPendingCount = this.sentInvitations.filter(inv => inv.status === 'pending').length;
            if (sentPendingCount > 0) {
                invitesBadge.textContent = sentPendingCount;
                invitesBadge.classList.remove('hidden');
            } else {
                invitesBadge.classList.add('hidden');
            }
        }

        // Update main card badge
        const mainBadge = document.getElementById('parenting-invitation-count');
        if (mainBadge) {
            const totalPending = this.receivedInvitations.filter(inv => inv.status === 'pending').length;
            if (totalPending > 0) {
                mainBadge.textContent = totalPending;
                mainBadge.classList.remove('hidden');
            } else {
                mainBadge.classList.add('hidden');
            }
        }
    }

    /**
     * Show placeholder message
     */
    showPlaceholder(message) {
        const container = document.getElementById('tutor-requests-list');
        if (!container) return;

        container.innerHTML = `
            <div class="card p-8 text-center text-gray-500">
                <i class="fas fa-info-circle text-3xl mb-3"></i>
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Create global instance
window.ParentingInvitationManager = new ParentingInvitationManager();

console.log('✅ Parenting Invitation Manager initialized for tutor-profile');
