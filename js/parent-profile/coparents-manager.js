/**
 * Co-Parents Manager for Parent Profile
 * Handles co-parent management functionality
 * Reads from parent_profiles table via /api/parent/coparents endpoint
 */

const COPARENT_API_BASE_URL = 'http://localhost:8000';

// ============================================
// COPARENTS MANAGER CLASS
// ============================================

const CoparentsManager = {
    allCoparents: [],
    isLoading: false,
    connectionStatuses: {}, // Cache connection statuses for co-parents

    /**
     * Initialize the coparents manager
     */
    async init() {
        console.log('[CoparentsManager] Initializing...');
        await this.loadCoparents();
    },

    /**
     * Load all co-parents from API
     */
    async loadCoparents() {
        const container = document.getElementById('coparents-grid');
        const emptyState = document.getElementById('coparents-empty-state');
        const loadingState = document.getElementById('coparents-loading-state');

        if (!container) {
            console.log('[CoparentsManager] Container not found');
            return;
        }

        try {
            this.isLoading = true;

            // Show loading state
            if (loadingState) loadingState.classList.remove('hidden');
            if (emptyState) emptyState.classList.add('hidden');

            // Clear existing cards (except loading/empty states)
            Array.from(container.children).forEach(child => {
                if (!child.id?.includes('loading') && !child.id?.includes('empty')) {
                    child.remove();
                }
            });

            const token = localStorage.getItem('token');
            if (!token) {
                console.log('[CoparentsManager] No token found');
                if (loadingState) loadingState.classList.add('hidden');
                if (emptyState) emptyState.classList.remove('hidden');
                return;
            }

            const response = await fetch(`${COPARENT_API_BASE_URL}/api/parent/coparents`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            this.allCoparents = data.coparents || [];

            console.log('[CoparentsManager] Loaded coparents:', this.allCoparents);

            // Hide loading state
            if (loadingState) loadingState.classList.add('hidden');

            // Check for empty
            if (this.allCoparents.length === 0) {
                if (emptyState) emptyState.classList.remove('hidden');
                this.updateCoparentsCount();
                return;
            }

            // Hide empty state
            if (emptyState) emptyState.classList.add('hidden');

            // Render coparent cards
            this.renderCoparents(container);

            // Update count
            this.updateCoparentsCount();

        } catch (error) {
            console.error('[CoparentsManager] Error loading coparents:', error);
            if (loadingState) loadingState.classList.add('hidden');
            this.showError(container, error.message);
        } finally {
            this.isLoading = false;
        }
    },

    /**
     * Render coparent cards
     */
    renderCoparents(container) {
        // Clear container first
        container.innerHTML = '';

        // Re-add empty state (hidden)
        container.innerHTML = `
            <div class="children-empty-state hidden" id="coparents-empty-state">
                <div class="empty-state-icon">👨‍👩‍👧‍👦</div>
                <h3 class="empty-state-title">No Co-Parents Yet</h3>
                <p class="empty-state-text">Add a co-parent (mother/father/guardian) to share parental responsibilities and manage your children together.</p>
                <button class="btn-primary" onclick="openInviteCoparentModal()">+ Add Co-Parent</button>
            </div>
        `;

        // Add coparent cards
        this.allCoparents.forEach(coparent => {
            container.insertAdjacentHTML('beforeend', this.createCoparentCard(coparent));
        });

        // Load connection statuses for all Family co-parents (async, updates buttons when done)
        this.loadConnectionStatuses();
    },

    /**
     * Create a coparent card HTML - Matches children card design exactly
     */
    createCoparentCard(coparent) {
        const name = coparent.name || 'Unknown';
        const profilePicture = coparent.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366F1&color=fff&size=128`;
        const relationshipType = coparent.relationship_type || 'Co-parent';
        const gender = coparent.gender || '';
        const email = coparent.email || 'No email';
        const phone = coparent.phone || 'No phone';
        const status = coparent.status || 'accepted';
        const isPending = status === 'pending';
        const invitationId = coparent.invitation_id || null;

        // Calculate days since joined/invited
        const createdDate = coparent.created_at ? new Date(coparent.created_at) : new Date();
        const daysOnPlatform = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));

        // Profile URL for Family co-parents
        const profileUrl = `../view-profiles/view-parent.html?user_id=${coparent.user_id}`;

        // Card border style based on status
        const borderStyle = isPending
            ? 'border: 2px dashed rgba(245, 158, 11, 0.5);'
            : 'border: 1px solid var(--border-color);';

        return `
            <div class="card" style="padding: 1.5rem; border-radius: 12px; background: var(--card-bg); ${borderStyle} transition: var(--transition); box-shadow: var(--shadow-sm); overflow: visible; position: relative;" data-coparent-id="${coparent.user_id || 'pending-' + invitationId}" data-invitation-id="${invitationId}">
                <!-- Coparent Header -->
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                    <div style="position: relative;">
                        <img src="${profilePicture}"
                            alt="${name}"
                            onerror="if(!this.dataset.fallbackApplied){this.dataset.fallbackApplied='true';this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366F1&color=fff&size=128'}"
                            style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 3px solid ${isPending ? '#F59E0B' : 'var(--primary-color)'}; box-shadow: var(--shadow-sm); ${isPending ? 'opacity: 0.8;' : ''}">
                        ${isPending ? '<div style="position: absolute; bottom: 0; right: 0; width: 20px; height: 20px; background: #F59E0B; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid var(--card-bg);"><i class="fas fa-clock" style="font-size: 10px; color: white;"></i></div>' : ''}
                    </div>
                    <div style="flex: 1;">
                        <h4 style="font-weight: 700; font-size: 1.125rem; margin: 0 0 0.25rem 0; color: var(--heading);">
                            ${isPending
                                ? `<span>${name}</span>`
                                : `<a href="${profileUrl}" style="color: inherit; text-decoration: none; cursor: pointer; transition: var(--transition-fast);"
                                   onmouseover="this.style.color='var(--primary-color)'"
                                   onmouseout="this.style.color='var(--heading)'">
                                    ${name}
                                </a>`}
                        </h4>
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                            <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: var(--text-secondary);">
                                <i class="fas fa-user-friends" style="color: var(--primary-color);"></i>
                                ${relationshipType}
                            </span>
                            <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: var(--text-secondary);">
                                <i class="fas fa-calendar-alt" style="color: var(--primary-color);"></i>
                                ${isPending ? `Invited ${daysOnPlatform} days ago` : `${daysOnPlatform} days`}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Contact Info (like School & Assignments in children card) -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                    <div style="background: var(--activity-bg); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.25rem 0; font-weight: 500;">Email</p>
                        <p style="font-weight: 600; margin: 0; color: var(--text-primary); font-size: 0.875rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${email}</p>
                    </div>
                    <div style="background: var(--activity-bg); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.25rem 0; font-weight: 500;">Phone</p>
                        <p style="font-weight: 600; margin: 0; color: var(--text-primary); font-size: 0.875rem;">${phone}</p>
                    </div>
                </div>

                <!-- Stats Grid (Gender & Status - like Attendance & Improvement in children card) -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1.25rem;">
                    <div style="text-align: center; padding: 0.75rem; background: var(--activity-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 1.5rem; font-weight: 700; color: ${gender === 'Female' ? '#EC4899' : '#3B82F6'}; margin-bottom: 0.25rem;">
                            <i class="fas ${gender === 'Female' ? 'fa-venus' : 'fa-mars'}"></i>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">${gender || 'Not specified'}</div>
                    </div>
                    <div style="text-align: center; padding: 0.75rem; background: var(--activity-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 1.5rem; font-weight: 700; color: ${isPending ? '#F59E0B' : '#8B5CF6'}; margin-bottom: 0.25rem;">
                            <i class="fas ${isPending ? 'fa-clock' : 'fa-heart'}"></i>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">${isPending ? 'Pending' : 'Family'}</div>
                    </div>
                </div>

                <!-- Action Buttons (like View Details + Message in children card) -->
                <div style="display: flex; gap: 0.5rem;">
                    ${isPending ? `
                    <!-- Pending: Resend Invitation button -->
                    <button
                        onclick="CoparentsManager.resendInvitation(${invitationId}, '${email}')"
                        class="btn-primary"
                        style="flex: 1; padding: 0.625rem; font-size: 0.875rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600;">
                        <i class="fas fa-paper-plane"></i> Resend Invitation
                    </button>
                    <button
                        onclick="CoparentsManager.cancelInvitation(${invitationId})"
                        class="btn-secondary"
                        style="padding: 0.625rem 1rem; font-size: 0.875rem; border-radius: 8px;"
                        title="Cancel Invitation">
                        <i class="fas fa-times"></i>
                    </button>
                    ` : `
                    <!-- Family: Connect button with dropdown -->
                    <div style="position: relative; flex: 1;" id="connect-wrapper-${coparent.user_id}">
                        <button id="connect-btn-${coparent.user_id}"
                            onclick="CoparentsManager.handleConnectionClick(${coparent.user_id})"
                            class="btn-primary"
                            style="width: 100%; padding: 0.625rem; font-size: 0.875rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600;"
                            data-user-id="${coparent.user_id}"
                            data-connection-status="loading">
                            <i class="fas fa-user-plus"></i>
                            <span>Connect</span>
                        </button>
                        <!-- Connection Dropdown (for Pending/Connected states) -->
                        <div id="connect-dropdown-${coparent.user_id}" class="connection-dropdown-menu" style="display: none; position: absolute; top: 100%; left: 0; right: 0; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 9999; overflow: hidden; margin-top: 4px;">
                            <!-- Dropdown content will be set dynamically -->
                        </div>
                    </div>
                    <button
                        onclick="CoparentsManager.messageCoparent(${coparent.user_id}, '${name.replace(/'/g, "\\'")}', '${profilePicture.replace(/'/g, "\\'")}')"
                        class="btn-secondary"
                        style="padding: 0.625rem 1rem; font-size: 0.875rem; border-radius: 8px;"
                        title="Message ${name}">
                        <i class="fas fa-envelope"></i>
                    </button>
                    `}
                </div>
            </div>
        `;
    },

    /**
     * Toggle dropdown menu visibility
     */
    toggleDropdown(dropdownId) {
        // Close all other dropdowns first
        document.querySelectorAll('.coparent-dropdown-menu').forEach(menu => {
            if (menu.id !== dropdownId) {
                menu.style.display = 'none';
            }
        });

        // Toggle the clicked dropdown
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        }
    },

    /**
     * Close all dropdowns when clicking outside
     */
    closeAllDropdowns() {
        document.querySelectorAll('.coparent-dropdown-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    },

    /**
     * View coparent profile
     */
    viewCoparentProfile(userId) {
        this.closeAllDropdowns();
        window.location.href = `../view-profiles/view-parent.html?user_id=${userId}`;
    },

    /**
     * Message coparent - opens chat modal with co-parent as target
     * @param {number} userId - Co-parent's user ID
     * @param {string} name - Co-parent's name
     * @param {string} profilePicture - Co-parent's profile picture URL
     */
    messageCoparent(userId, name, profilePicture) {
        this.closeAllDropdowns();

        // Open chat modal with co-parent's data
        if (typeof openChatModal === 'function' || typeof ChatModalManager !== 'undefined') {
            const targetUser = {
                user_id: userId,
                id: userId,
                full_name: name,
                name: name,
                profile_picture: profilePicture,
                avatar: profilePicture,
                profile_type: 'parent',
                role: 'parent'
            };

            console.log('[CoparentsManager] Opening chat with co-parent:', targetUser);

            // Use ChatModalManager if available
            if (typeof ChatModalManager !== 'undefined' && ChatModalManager.open) {
                ChatModalManager.open(targetUser);
            } else if (typeof openChatModal === 'function') {
                openChatModal(targetUser);
            }
        } else {
            console.error('[CoparentsManager] Chat modal not available');
            showNotification('Chat feature is loading. Please try again.', 'info');
        }
    },

    // ============================================
    // CONNECTION SYSTEM INTEGRATION
    // (Uses the separate 'connections' table for social connections)
    // ============================================

    /**
     * Check connection status for a user and update the button
     */
    async checkConnectionStatus(userId) {
        try {
            const token = localStorage.getItem('token');
            if (!token) return null;

            const response = await fetch(`${COPARENT_API_BASE_URL}/api/connections/check`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ target_user_id: userId })
            });

            if (!response.ok) return null;

            const data = await response.json();
            this.connectionStatuses[userId] = data;
            return data;
        } catch (error) {
            console.error('[CoparentsManager] Error checking connection status:', error);
            return null;
        }
    },

    /**
     * Update the connect button UI based on connection status
     */
    updateConnectButton(userId, connectionData) {
        const button = document.getElementById(`connect-btn-${userId}`);
        const dropdown = document.getElementById(`connect-dropdown-${userId}`);
        if (!button) return;

        const iconSpan = button.querySelector('i');
        const textSpan = button.querySelector('span');

        if (!connectionData || connectionData.status === null) {
            // No connection - show "Connect" button (clickable, no dropdown)
            button.dataset.connectionStatus = 'none';
            button.style.background = 'var(--primary-color)';
            button.style.color = 'white';
            button.style.cursor = 'pointer';
            button.disabled = false;
            iconSpan.className = 'fas fa-user-plus';
            textSpan.textContent = 'Connect';
            if (dropdown) dropdown.innerHTML = '';
        } else if (connectionData.status === 'pending') {
            if (connectionData.direction === 'outgoing') {
                // We sent the request - show "Pending" with dropdown for "Cancel Connection"
                button.dataset.connectionStatus = 'pending-outgoing';
                button.style.background = 'rgba(245, 158, 11, 0.15)';
                button.style.color = '#F59E0B';
                button.style.cursor = 'pointer';
                button.disabled = false;
                iconSpan.className = 'fas fa-clock';
                textSpan.textContent = 'Pending';
                // Set up dropdown
                if (dropdown) {
                    dropdown.innerHTML = `
                        <div onclick="CoparentsManager.cancelConnectionRequest(${connectionData.connection_id}, ${userId})"
                            style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.2s;"
                            onmouseover="this.style.background='var(--hover-bg)'"
                            onmouseout="this.style.background='transparent'">
                            <i class="fas fa-times-circle" style="color: #EF4444; width: 16px;"></i>
                            <span style="font-size: 0.875rem; color: #EF4444;">Cancel Request</span>
                        </div>
                    `;
                }
            } else {
                // They sent the request - show "Accept" (clickable)
                button.dataset.connectionStatus = 'pending-incoming';
                button.style.background = 'var(--success-color, #22C55E)';
                button.style.color = 'white';
                button.style.cursor = 'pointer';
                button.disabled = false;
                iconSpan.className = 'fas fa-check';
                textSpan.textContent = 'Accept';
                if (dropdown) dropdown.innerHTML = '';
            }
        } else if (connectionData.status === 'accepted') {
            // Already connected - show "Connected" with dropdown for "Disconnect"
            button.dataset.connectionStatus = 'connected';
            button.style.background = 'rgba(34, 197, 94, 0.15)';
            button.style.color = '#22C55E';
            button.style.cursor = 'pointer';
            button.disabled = false;
            iconSpan.className = 'fas fa-check-circle';
            textSpan.textContent = 'Connected';
            // Set up dropdown
            if (dropdown) {
                dropdown.innerHTML = `
                    <div onclick="CoparentsManager.disconnectConnection(${connectionData.connection_id}, ${userId})"
                        style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.2s;"
                        onmouseover="this.style.background='var(--hover-bg)'"
                        onmouseout="this.style.background='transparent'">
                        <i class="fas fa-user-slash" style="color: #EF4444; width: 16px;"></i>
                        <span style="font-size: 0.875rem; color: #EF4444;">Disconnect</span>
                    </div>
                `;
            }
        } else if (connectionData.status === 'rejected') {
            // Rejected - show "Connect" to try again
            button.dataset.connectionStatus = 'none';
            button.style.background = 'var(--primary-color)';
            button.style.color = 'white';
            button.style.cursor = 'pointer';
            button.disabled = false;
            iconSpan.className = 'fas fa-user-plus';
            textSpan.textContent = 'Connect';
            if (dropdown) dropdown.innerHTML = '';
        }
    },

    /**
     * Handle click on the Connect/Accept/Pending/Connected button
     */
    async handleConnectionClick(userId) {
        const button = document.getElementById(`connect-btn-${userId}`);
        if (!button) return;

        const status = button.dataset.connectionStatus;
        const connectionData = this.connectionStatuses[userId];

        if (status === 'none' || status === 'loading') {
            // Send connection request
            await this.sendConnectionRequest(userId);
        } else if (status === 'pending-incoming' && connectionData?.connection_id) {
            // Accept incoming connection
            await this.acceptConnectionRequest(connectionData.connection_id, userId);
        } else if (status === 'pending-outgoing' || status === 'connected') {
            // Toggle dropdown for pending/connected states
            this.toggleConnectionDropdown(userId);
        }
    },

    /**
     * Toggle the connection dropdown menu
     */
    toggleConnectionDropdown(userId) {
        // Close all other connection dropdowns
        document.querySelectorAll('.connection-dropdown-menu').forEach(menu => {
            if (menu.id !== `connect-dropdown-${userId}`) {
                menu.style.display = 'none';
            }
        });

        const dropdown = document.getElementById(`connect-dropdown-${userId}`);
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        }
    },

    /**
     * Close all connection dropdowns
     */
    closeAllConnectionDropdowns() {
        document.querySelectorAll('.connection-dropdown-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    },

    /**
     * Cancel a pending connection request
     */
    async cancelConnectionRequest(connectionId, userId) {
        this.closeAllConnectionDropdowns();

        if (!connectionId) {
            showNotification('Invalid connection', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification('Please login to continue', 'error');
                return;
            }

            const response = await fetch(`${COPARENT_API_BASE_URL}/api/connections/${connectionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok || response.status === 204) {
                showNotification('Connection request cancelled', 'success');
                // Reset to Connect state
                delete this.connectionStatuses[userId];
                this.updateConnectButton(userId, null);
            } else {
                const data = await response.json();
                showNotification(data.detail || 'Failed to cancel connection request', 'error');
            }
        } catch (error) {
            console.error('[CoparentsManager] Error cancelling connection:', error);
            showNotification('Failed to cancel connection request', 'error');
        }
    },

    /**
     * Disconnect from a connected user
     */
    async disconnectConnection(connectionId, userId) {
        this.closeAllConnectionDropdowns();

        if (!connectionId) {
            showNotification('Invalid connection', 'error');
            return;
        }

        if (!confirm('Are you sure you want to disconnect from this co-parent?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification('Please login to continue', 'error');
                return;
            }

            const response = await fetch(`${COPARENT_API_BASE_URL}/api/connections/${connectionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok || response.status === 204) {
                showNotification('Disconnected successfully', 'success');
                // Reset to Connect state
                delete this.connectionStatuses[userId];
                this.updateConnectButton(userId, null);
            } else {
                const data = await response.json();
                showNotification(data.detail || 'Failed to disconnect', 'error');
            }
        } catch (error) {
            console.error('[CoparentsManager] Error disconnecting:', error);
            showNotification('Failed to disconnect', 'error');
        }
    },

    /**
     * Send a connection request to a co-parent
     */
    async sendConnectionRequest(userId) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification('Please login to continue', 'error');
                return;
            }

            const button = document.getElementById(`connect-btn-${userId}`);
            if (button) {
                button.disabled = true;
                button.querySelector('span').textContent = 'Sending...';
            }

            const response = await fetch(`${COPARENT_API_BASE_URL}/api/connections`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipient_id: userId,
                    recipient_type: 'parent',
                    requester_type: 'parent'
                })
            });

            const data = await response.json();

            if (response.ok) {
                showNotification('Connection request sent!', 'success');
                // Update the button to show pending state
                const newStatus = { status: 'pending', direction: 'outgoing', connection_id: data.id };
                this.connectionStatuses[userId] = newStatus;
                this.updateConnectButton(userId, newStatus);
            } else {
                showNotification(data.detail || 'Failed to send connection request', 'error');
                if (button) {
                    button.disabled = false;
                    button.querySelector('span').textContent = 'Connect';
                }
            }
        } catch (error) {
            console.error('[CoparentsManager] Error sending connection request:', error);
            showNotification('Failed to send connection request', 'error');
            const button = document.getElementById(`connect-btn-${userId}`);
            if (button) {
                button.disabled = false;
                button.querySelector('span').textContent = 'Connect';
            }
        }
    },

    /**
     * Accept an incoming connection request
     */
    async acceptConnectionRequest(connectionId, userId) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification('Please login to continue', 'error');
                return;
            }

            const button = document.getElementById(`connect-btn-${userId}`);
            if (button) {
                button.disabled = true;
                button.querySelector('span').textContent = 'Accepting...';
            }

            const response = await fetch(`${COPARENT_API_BASE_URL}/api/connections/${connectionId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'accepted' })
            });

            const data = await response.json();

            if (response.ok) {
                showNotification('Connection accepted!', 'success');
                // Update the button to show connected state
                const newStatus = { status: 'accepted', direction: 'incoming', connection_id: connectionId, is_connected: true };
                this.connectionStatuses[userId] = newStatus;
                this.updateConnectButton(userId, newStatus);
            } else {
                showNotification(data.detail || 'Failed to accept connection', 'error');
                if (button) {
                    button.disabled = false;
                    button.querySelector('span').textContent = 'Accept';
                }
            }
        } catch (error) {
            console.error('[CoparentsManager] Error accepting connection:', error);
            showNotification('Failed to accept connection', 'error');
            const button = document.getElementById(`connect-btn-${userId}`);
            if (button) {
                button.disabled = false;
                button.querySelector('span').textContent = 'Accept';
            }
        }
    },

    /**
     * Load connection statuses for all rendered co-parents
     */
    async loadConnectionStatuses() {
        // Get all co-parents that are not pending (Family status)
        const familyCoparents = this.allCoparents.filter(cp => cp.status !== 'pending' && cp.user_id);

        // Check connection status for each and update buttons
        for (const coparent of familyCoparents) {
            const connectionData = await this.checkConnectionStatus(coparent.user_id);
            this.updateConnectButton(coparent.user_id, connectionData);
        }
    },

    /**
     * Remove a connected co-parent
     */
    async removeCoparent(userId) {
        this.closeAllDropdowns();

        if (!userId) {
            showNotification('Invalid co-parent', 'error');
            return;
        }

        // Confirm with user
        if (!confirm('Are you sure you want to remove this co-parent? They will no longer have access to your children.')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification('Please login to continue', 'error');
                return;
            }

            const response = await fetch(`${COPARENT_API_BASE_URL}/api/parent/remove-coparent/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                showNotification('Co-parent removed successfully', 'success');
                // Reload co-parents to refresh the list
                await this.loadCoparents();
            } else {
                showNotification(data.detail || 'Failed to remove co-parent', 'error');
            }
        } catch (error) {
            console.error('[CoparentsManager] Error removing co-parent:', error);
            showNotification('Failed to remove co-parent', 'error');
        }
    },

    /**
     * Resend invitation to a pending co-parent
     */
    async resendInvitation(invitationId, email) {
        this.closeAllDropdowns();

        if (!invitationId) {
            showNotification('Invalid invitation', 'error');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification('Please login to continue', 'error');
                return;
            }

            // Show loading state
            showNotification('Resending invitation...', 'info');

            const response = await fetch(`${COPARENT_API_BASE_URL}/api/parent/resend-coparent-invitation/${invitationId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                showNotification(`Invitation resent to ${email}`, 'success');
            } else {
                showNotification(data.detail || 'Failed to resend invitation', 'error');
            }
        } catch (error) {
            console.error('[CoparentsManager] Error resending invitation:', error);
            showNotification('Failed to resend invitation', 'error');
        }
    },

    /**
     * Cancel a pending co-parent invitation
     */
    async cancelInvitation(invitationId) {
        this.closeAllDropdowns();

        if (!invitationId) {
            showNotification('Invalid invitation', 'error');
            return;
        }

        // Confirm with user
        if (!confirm('Are you sure you want to cancel this invitation?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showNotification('Please login to continue', 'error');
                return;
            }

            const response = await fetch(`${COPARENT_API_BASE_URL}/api/parent/cancel-coparent-invitation/${invitationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                showNotification('Invitation cancelled', 'success');
                // Reload co-parents to refresh the list
                await this.loadCoparents();
            } else {
                showNotification(data.detail || 'Failed to cancel invitation', 'error');
            }
        } catch (error) {
            console.error('[CoparentsManager] Error cancelling invitation:', error);
            showNotification('Failed to cancel invitation', 'error');
        }
    },

    /**
     * Update coparents count
     */
    updateCoparentsCount() {
        const count = this.allCoparents.length;

        // Update badge
        const badge = document.getElementById('coparents-count-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = `${count} co-parent${count !== 1 ? 's' : ''}`;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        // Update sidebar count if exists
        const sidebarCount = document.getElementById('coparents-count');
        if (sidebarCount) {
            sidebarCount.textContent = count;
            sidebarCount.style.display = count > 0 ? 'inline-block' : 'none';
        }
    },

    /**
     * Show error state
     */
    showError(container, errorMessage) {
        const emptyState = document.getElementById('coparents-empty-state');
        if (emptyState) emptyState.classList.add('hidden');

        container.innerHTML = `
            <div class="children-error-state">
                <div class="error-icon">⚠️</div>
                <h3 class="error-title">Failed to load co-parents</h3>
                <p class="error-message">${errorMessage || 'An error occurred while loading co-parents'}</p>
                <button class="btn-primary" onclick="CoparentsManager.loadCoparents()">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    },

    /**
     * Search coparents
     */
    searchCoparents(searchTerm) {
        const container = document.getElementById('coparents-grid');
        if (!container) return;

        const term = searchTerm?.toLowerCase().trim() || '';

        if (!term) {
            this.renderCoparents(container);
            return;
        }

        const filtered = this.allCoparents.filter(coparent => {
            const name = (coparent.name || '').toLowerCase();
            const email = (coparent.email || '').toLowerCase();
            const phone = (coparent.phone || '').toLowerCase();
            const relationship = (coparent.relationship_type || '').toLowerCase();

            return name.includes(term) ||
                   email.includes(term) ||
                   phone.includes(term) ||
                   relationship.includes(term);
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="col-span-full card p-6 text-center text-gray-500">
                    <i class="fas fa-search text-3xl mb-3"></i>
                    <p>No co-parents found matching your search</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        filtered.forEach(coparent => {
            container.insertAdjacentHTML('beforeend', this.createCoparentCard(coparent));
        });
    }
};

// Make CoparentsManager available globally
window.CoparentsManager = CoparentsManager;

// ============================================
// LEGACY WRAPPER FUNCTIONS (for backwards compatibility)
// ============================================

// Load Co-Parents - wrapper for CoparentsManager
async function loadCoParents() {
    await CoparentsManager.loadCoparents();
}

// View Co-Parent Profile - wrapper
function viewCoParentProfile(userId) {
    CoparentsManager.viewCoparentProfile(userId);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Load co-parents when navigating to co-parents panel
    const coparentsLink = document.querySelector('[onclick*="co-parents"]');
    if (coparentsLink) {
        coparentsLink.addEventListener('click', () => {
            CoparentsManager.loadCoparents();
        });
    }

    // Initial load if we're on the co-parents panel
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('panel') === 'co-parents') {
        CoparentsManager.loadCoparents();
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        // Check if click is outside coparent dropdown menu and toggle button
        if (!e.target.closest('.coparent-dropdown-menu') && !e.target.closest('[onclick*="toggleDropdown"]')) {
            CoparentsManager.closeAllDropdowns();
        }
        // Check if click is outside connection dropdown menu and connect button
        if (!e.target.closest('.connection-dropdown-menu') && !e.target.closest('[id^="connect-btn-"]')) {
            CoparentsManager.closeAllConnectionDropdowns();
        }
    });

    console.log('✅ Co-Parents Manager initialized');
});
