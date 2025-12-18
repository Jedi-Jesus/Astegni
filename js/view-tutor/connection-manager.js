/**
 * Connection Manager for View Tutor Profile (UPDATED for Simplified Schema)
 *
 * Handles connection functionality using Astegni's "Connect" terminology:
 * - Send connection requests
 * - Check connection status
 * - Update connection UI
 *
 * NEW Connection Statuses (Simplified):
 * - null: No connection exists
 * - 'pending': Connection request sent, awaiting response
 * - 'accepted': Connection established and active
 * - 'rejected': Connection request was rejected
 * - 'blocked': User has blocked another user
 */

class ConnectionManager {
    constructor() {
        this.API_BASE_URL = 'http://localhost:8000';
        this.currentConnectionStatus = null;
        this.currentConnectionId = null;
    }

    /**
     * Get authentication token from localStorage
     */
    getToken() {
        return localStorage.getItem('token') || localStorage.getItem('access_token');
    }

    /**
     * Get current user from localStorage
     */
    getCurrentUser() {
        const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    /**
     * Get current user's active role from authManager
     * Returns the role the user is currently accessing the page as
     */
    getActiveRole() {
        // Check if global authManager exists
        if (typeof authManager !== 'undefined' && authManager.getUserRole) {
            return authManager.getUserRole();
        }

        // Fallback: try to get from localStorage
        const storedRole = localStorage.getItem('userRole');
        if (storedRole) {
            return storedRole;
        }

        // Last resort: try to get from user object
        const user = this.getCurrentUser();
        if (user && user.active_role) {
            return user.active_role;
        }

        console.warn('[ConnectionManager] Could not determine active role');
        return null;
    }

    /**
     * Get the recipient role type based on the current page
     * Determines what role the person being viewed has based on page context
     * @returns {string} The role type: 'tutor', 'student', 'parent', 'advertiser'
     */
    getRecipientRoleFromPage() {
        const currentPage = window.location.pathname;

        // Determine role based on which view page we're on
        if (currentPage.includes('view-tutor.html')) {
            return 'tutor';
        } else if (currentPage.includes('view-student.html')) {
            return 'student';
        } else if (currentPage.includes('view-parent.html')) {
            return 'parent';
        } else if (currentPage.includes('view-advertiser.html')) {
            return 'advertiser';
        }

        // Default to tutor for view-tutor page
        console.warn('[ConnectionManager] Could not determine page type, defaulting to tutor');
        return 'tutor';
    }

    /**
     * Check connection status with a specific tutor
     * @param {number} tutorUserId - The user ID of the tutor
     * @returns {Promise<Object>} Connection status object
     */
    async checkConnectionStatus(tutorUserId) {
        const token = this.getToken();

        if (!token) {
            console.log('No authentication token found');
            return {
                is_connected: false,
                status: null,
                connection_type: null,
                direction: null
            };
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/connections/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ target_user_id: tutorUserId })
            });

            if (response.status === 401) {
                console.log('Authentication required');
                return {
                    is_connected: false,
                    status: null,
                    connection_type: null,
                    direction: null
                };
            }

            if (!response.ok) {
                throw new Error(`Failed to check connection status: ${response.statusText}`);
            }

            const data = await response.json();

            // Store current connection status
            this.currentConnectionStatus = data.status;
            this.currentConnectionId = data.connection_id || null;

            return data;
        } catch (error) {
            // Check if it's a CORS error
            if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
                console.error('❌ CORS Error: Please open the page through http://localhost:8080, not directly from file system!');
                console.error('Run: python -m http.server 8080');
            } else {
                console.error('Error checking connection status:', error);
            }
            return {
                is_connected: false,
                status: null,
                connection_type: null,
                direction: null
            };
        }
    }

    /**
     * Send a connection request to a tutor (UPDATED for new schema)
     * Automatically uses the active role the user is currently accessing the page as
     * @param {number} tutorUserId - The user ID of the tutor
     * @returns {Promise<Object>} Connection response
     */
    async sendConnectionRequest(tutorUserId) {
        const token = this.getToken();

        if (!token) {
            throw new Error('You must be logged in to send a connection request');
        }

        // Prevent self-connection
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === tutorUserId) {
            throw new Error('You cannot connect with yourself');
        }

        // Get the active role the user is currently accessing the page as
        const activeRole = this.getActiveRole();
        if (!activeRole) {
            throw new Error('Could not determine your active role. Please refresh and try again.');
        }

        // Get the recipient role based on the page we're on
        const recipientRole = this.getRecipientRoleFromPage();

        console.log(`[ConnectionManager] Sending connection request as: ${activeRole} → to ${recipientRole}`);

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/connections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    recipient_id: tutorUserId,
                    recipient_type: recipientRole,  // Determined from page context
                    requester_type: activeRole  // User's active role
                })
            });

            if (response.status === 401) {
                throw new Error('Authentication required. Please log in.');
            }

            if (response.status === 400) {
                const error = await response.json();
                throw new Error(error.detail || 'Connection already exists or invalid request');
            }

            if (!response.ok) {
                throw new Error(`Failed to send connection request: ${response.statusText}`);
            }

            const data = await response.json();

            // Update local status
            this.currentConnectionStatus = data.status;
            this.currentConnectionId = data.id;

            return data;
        } catch (error) {
            console.error('Error sending connection request:', error);
            throw error;
        }
    }

    /**
     * Cancel/withdraw a connection request
     * @param {number} connectionId - The connection ID to cancel
     * @returns {Promise<boolean>} Success status
     */
    async cancelConnectionRequest(connectionId) {
        const token = this.getToken();

        if (!token) {
            throw new Error('You must be logged in to cancel a connection request');
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/connections/${connectionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to cancel connection request: ${response.statusText}`);
            }

            // Clear local status
            this.currentConnectionStatus = null;
            this.currentConnectionId = null;

            return true;
        } catch (error) {
            console.error('Error canceling connection request:', error);
            throw error;
        }
    }

    /**
     * Disconnect from a tutor (delete the connection)
     * @param {number} connectionId - The connection ID to disconnect
     * @returns {Promise<boolean>} Success status
     */
    async disconnectFromTutor(connectionId) {
        const token = this.getToken();

        if (!token) {
            throw new Error('You must be logged in to disconnect');
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/connections/${connectionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to disconnect: ${response.statusText}`);
            }

            // Clear local status
            this.currentConnectionStatus = null;
            this.currentConnectionId = null;

            return true;
        } catch (error) {
            console.error('Error disconnecting:', error);
            throw error;
        }
    }

    /**
     * Update connection button UI based on connection status (UPDATED for new statuses)
     * @param {HTMLElement} button - The connect button element
     * @param {Object} connectionStatus - The connection status object
     */
    updateConnectionButtonUI(button, connectionStatus) {
        // Check if there's a dropdown wrapper instead of a button
        const existingDropdown = document.querySelector('.connection-dropdown-wrapper');

        // If status is not 'pending' and there's a dropdown, replace it with button
        if (connectionStatus.status !== 'pending' && existingDropdown) {
            button = this.createNewConnectButton();
        }

        if (!button) return;

        const status = connectionStatus.status;

        // Reset button classes
        button.className = 'btn-secondary';
        button.style.cssText = 'flex: 1; min-width: 160px; padding: 0.875rem 1.5rem; font-weight: 600; border-radius: 12px; transition: all 0.3s ease;';

        switch (status) {
            case null:
                // No connection - show Connect button
                button.innerHTML = '🔗 Connect';
                button.style.background = 'transparent';
                button.style.color = 'var(--text)';
                button.style.border = '2px solid rgba(var(--border-rgb), 0.3)';
                button.style.cursor = 'pointer';
                button.disabled = false;
                break;

            case 'pending':
                // Pending connection request
                if (connectionStatus.direction === 'outgoing') {
                    // User sent the request - show dropdown with cancel option
                    const dropdownWrapper = this.createPendingDropdown();

                    // Replace button with dropdown
                    if (button.parentElement) {
                        const parent = button.parentElement;
                        const buttonIndex = Array.from(parent.children).indexOf(button);

                        button.remove();

                        if (buttonIndex < parent.children.length) {
                            parent.insertBefore(dropdownWrapper, parent.children[buttonIndex]);
                        } else {
                            parent.appendChild(dropdownWrapper);
                        }
                    }

                    return; // Exit early since we replaced the button
                } else {
                    // Tutor sent request to user - show accept button
                    button.innerHTML = '📨 Accept Request';
                    button.style.background = 'rgba(76, 175, 80, 0.1)';
                    button.style.color = '#4CAF50';
                    button.style.border = '2px solid #4CAF50';
                    button.style.cursor = 'pointer';
                    button.disabled = false;
                }
                break;

            case 'accepted':
                // Connected - show dropdown with disconnect option
                const connectedDropdown = this.createConnectedDropdown();

                // Replace button with dropdown
                if (button.parentElement) {
                    const parent = button.parentElement;
                    const buttonIndex = Array.from(parent.children).indexOf(button);

                    button.remove();

                    if (buttonIndex < parent.children.length) {
                        parent.insertBefore(connectedDropdown, parent.children[buttonIndex]);
                    } else {
                        parent.appendChild(connectedDropdown);
                    }
                }

                return; // Exit early since we replaced the button
                break;

            case 'rejected':
                // Request rejected
                button.innerHTML = '✗ Request Declined';
                button.style.background = 'rgba(244, 67, 54, 0.1)';
                button.style.color = '#F44336';
                button.style.border = '2px solid #F44336';
                button.style.cursor = 'not-allowed';
                button.disabled = true;
                break;

            case 'blocked':
                // Blocked
                button.innerHTML = '🚫 Blocked';
                button.style.background = 'rgba(244, 67, 54, 0.1)';
                button.style.color = '#F44336';
                button.style.border = '2px solid #F44336';
                button.style.cursor = 'not-allowed';
                button.disabled = true;
                break;

            default:
                // Default state
                button.innerHTML = '🔗 Connect';
                button.style.background = 'transparent';
                button.style.color = 'var(--text)';
                button.style.border = '2px solid rgba(var(--border-rgb), 0.3)';
                button.style.cursor = 'pointer';
                button.disabled = false;
        }
    }

    /**
     * Create a dropdown for the "Pending..." state with cancel option
     * @returns {HTMLElement} Dropdown wrapper element
     */
    createPendingDropdown() {
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'connection-dropdown-wrapper';
        wrapper.style.cssText = 'flex: 1; min-width: 160px; position: relative;';

        // Create main button
        const mainButton = document.createElement('button');
        mainButton.className = 'connection-dropdown-btn';
        mainButton.style.cssText = `
            width: 100%;
            padding: 0.875rem 1.5rem;
            font-weight: 600;
            border-radius: 12px;
            background: rgba(255, 193, 7, 0.1);
            color: #FFC107;
            border: 2px solid #FFC107;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
        `;
        mainButton.innerHTML = `
            <span>⏳ Request Pending</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="transition: transform 0.2s;">
                <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;

        // Create dropdown menu
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'connection-dropdown-menu';
        dropdownMenu.style.cssText = `
            position: absolute;
            top: calc(100% + 0.5rem);
            left: 0;
            right: 0;
            background: var(--card-bg);
            border: 2px solid #FFC107;
            border-radius: 12px;
            padding: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.3s ease;
        `;

        // Create cancel option
        const cancelOption = document.createElement('button');
        cancelOption.className = 'connection-dropdown-option';
        cancelOption.style.cssText = `
            width: 100%;
            padding: 0.75rem 1rem;
            background: transparent;
            color: #F44336;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            text-align: left;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;
        cancelOption.innerHTML = '✗ Cancel Connection';

        // Add hover effect
        cancelOption.addEventListener('mouseenter', () => {
            cancelOption.style.background = 'rgba(244, 67, 54, 0.1)';
        });
        cancelOption.addEventListener('mouseleave', () => {
            cancelOption.style.background = 'transparent';
        });

        // Add click handler for cancel
        cancelOption.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.handleCancelConnection();
            // Close dropdown
            dropdownMenu.style.opacity = '0';
            dropdownMenu.style.visibility = 'hidden';
            dropdownMenu.style.transform = 'translateY(-10px)';
        });

        // Toggle dropdown on main button click
        let isOpen = false;
        mainButton.addEventListener('click', (e) => {
            e.stopPropagation();
            isOpen = !isOpen;

            if (isOpen) {
                dropdownMenu.style.opacity = '1';
                dropdownMenu.style.visibility = 'visible';
                dropdownMenu.style.transform = 'translateY(0)';
                mainButton.querySelector('svg').style.transform = 'rotate(180deg)';
            } else {
                dropdownMenu.style.opacity = '0';
                dropdownMenu.style.visibility = 'hidden';
                dropdownMenu.style.transform = 'translateY(-10px)';
                mainButton.querySelector('svg').style.transform = 'rotate(0deg)';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target) && isOpen) {
                isOpen = false;
                dropdownMenu.style.opacity = '0';
                dropdownMenu.style.visibility = 'hidden';
                dropdownMenu.style.transform = 'translateY(-10px)';
                mainButton.querySelector('svg').style.transform = 'rotate(0deg)';
            }
        });

        // Assemble dropdown
        dropdownMenu.appendChild(cancelOption);
        wrapper.appendChild(mainButton);
        wrapper.appendChild(dropdownMenu);

        return wrapper;
    }

    /**
     * Create a dropdown for the "Connected" state with disconnect option
     * @returns {HTMLElement} Dropdown wrapper element
     */
    createConnectedDropdown() {
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'connection-dropdown-wrapper connected-dropdown';
        wrapper.style.cssText = 'flex: 1; min-width: 160px; position: relative;';

        // Create main button
        const mainButton = document.createElement('button');
        mainButton.className = 'connection-dropdown-btn';
        mainButton.style.cssText = `
            width: 100%;
            padding: 0.875rem 1.5rem;
            font-weight: 600;
            border-radius: 12px;
            background: rgba(76, 175, 80, 0.1);
            color: #4CAF50;
            border: 2px solid #4CAF50;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
        `;
        mainButton.innerHTML = `
            <span>✓ Connected</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="transition: transform 0.2s;">
                <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
        `;

        // Create dropdown menu
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'connection-dropdown-menu';
        dropdownMenu.style.cssText = `
            position: absolute;
            top: calc(100% + 0.5rem);
            left: 0;
            right: 0;
            background: var(--card-bg);
            border: 2px solid #4CAF50;
            border-radius: 12px;
            padding: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.3s ease;
        `;

        // Create disconnect option
        const disconnectOption = document.createElement('button');
        disconnectOption.className = 'connection-dropdown-option';
        disconnectOption.style.cssText = `
            width: 100%;
            padding: 0.75rem 1rem;
            background: transparent;
            color: #F44336;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            text-align: left;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;
        disconnectOption.innerHTML = '🔌 Disconnect';

        // Add hover effect
        disconnectOption.addEventListener('mouseenter', () => {
            disconnectOption.style.background = 'rgba(244, 67, 54, 0.1)';
        });
        disconnectOption.addEventListener('mouseleave', () => {
            disconnectOption.style.background = 'transparent';
        });

        // Add click handler for disconnect
        disconnectOption.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.handleDisconnect();
            // Close dropdown
            dropdownMenu.style.opacity = '0';
            dropdownMenu.style.visibility = 'hidden';
            dropdownMenu.style.transform = 'translateY(-10px)';
        });

        // Toggle dropdown on main button click
        let isOpen = false;
        mainButton.addEventListener('click', (e) => {
            e.stopPropagation();
            isOpen = !isOpen;

            if (isOpen) {
                dropdownMenu.style.opacity = '1';
                dropdownMenu.style.visibility = 'visible';
                dropdownMenu.style.transform = 'translateY(0)';
                mainButton.querySelector('svg').style.transform = 'rotate(180deg)';
            } else {
                dropdownMenu.style.opacity = '0';
                dropdownMenu.style.visibility = 'hidden';
                dropdownMenu.style.transform = 'translateY(-10px)';
                mainButton.querySelector('svg').style.transform = 'rotate(0deg)';
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target) && isOpen) {
                isOpen = false;
                dropdownMenu.style.opacity = '0';
                dropdownMenu.style.visibility = 'hidden';
                dropdownMenu.style.transform = 'translateY(-10px)';
                mainButton.querySelector('svg').style.transform = 'rotate(0deg)';
            }
        });

        // Assemble dropdown
        dropdownMenu.appendChild(disconnectOption);
        wrapper.appendChild(mainButton);
        wrapper.appendChild(dropdownMenu);

        return wrapper;
    }

    /**
     * Handle disconnecting from a tutor
     */
    async handleDisconnect() {
        try {
            if (!this.currentConnectionId) {
                this.showNotification('No connection to disconnect', 'error');
                return;
            }

            // Confirm disconnect
            if (!confirm('Are you sure you want to disconnect? You can reconnect anytime.')) {
                return;
            }

            // Show loading state
            const wrapper = document.querySelector('.connected-dropdown');
            if (wrapper) {
                const btn = wrapper.querySelector('.connection-dropdown-btn span');
                if (btn) btn.textContent = '⏳ Disconnecting...';
            }

            console.log('🔄 Disconnecting from tutor...');
            await this.disconnectFromTutor(this.currentConnectionId);
            console.log('✅ Disconnected successfully');

            this.showNotification('Disconnected successfully', 'success');

            // Create new connect button
            console.log('🔄 Creating new connect button...');
            const newButton = this.createNewConnectButton();
            console.log('✅ New button created:', newButton);

            // Set to default Connect state
            if (newButton) {
                newButton.innerHTML = '🔗 Connect';
                newButton.style.background = 'transparent';
                newButton.style.color = 'var(--text)';
                newButton.style.border = '2px solid rgba(var(--border-rgb), 0.3)';
                newButton.style.cursor = 'pointer';
                newButton.disabled = false;

                console.log('✅ Button updated to Connect state');
            }
        } catch (error) {
            console.error('Error disconnecting:', error);
            this.showNotification(error.message || 'Failed to disconnect', 'error');

            // On error, still try to replace dropdown with button
            const wrapper = document.querySelector('.connected-dropdown');
            if (wrapper) {
                const button = this.createNewConnectButton();
                if (button) {
                    button.innerHTML = '🔗 Connect';
                    button.style.background = 'transparent';
                    button.style.color = 'var(--text)';
                    button.style.border = '2px solid rgba(var(--border-rgb), 0.3)';
                }
            }
        }
    }

    /**
     * Handle canceling a connection request
     */
    async handleCancelConnection() {
        try {
            if (!this.currentConnectionId) {
                this.showNotification('No connection to cancel', 'error');
                return;
            }

            // Show loading state
            const wrapper = document.querySelector('.connection-dropdown-wrapper');
            if (wrapper) {
                const btn = wrapper.querySelector('.connection-dropdown-btn span');
                if (btn) btn.textContent = '⏳ Cancelling...';
            }

            console.log('🔄 Cancelling connection request...');
            await this.cancelConnectionRequest(this.currentConnectionId);
            console.log('✅ Connection request cancelled successfully');

            this.showNotification('Connection request cancelled', 'info');

            // First, create a new button to replace the dropdown
            console.log('🔄 Creating new connect button...');
            const newButton = this.createNewConnectButton();
            console.log('✅ New button created:', newButton);

            // Set to default Connect state immediately
            if (newButton) {
                newButton.innerHTML = '🔗 Connect';
                newButton.style.background = 'transparent';
                newButton.style.color = 'var(--text)';
                newButton.style.border = '2px solid rgba(var(--border-rgb), 0.3)';
                newButton.style.cursor = 'pointer';
                newButton.disabled = false;

                console.log('✅ Button updated to Connect state');
            }
        } catch (error) {
            console.error('Error cancelling connection:', error);
            this.showNotification(error.message || 'Failed to cancel connection', 'error');

            // On error, still try to replace dropdown with button
            const wrapper = document.querySelector('.connection-dropdown-wrapper');
            if (wrapper) {
                const button = this.createNewConnectButton();
                if (button) {
                    button.innerHTML = '🔗 Connect';
                    button.style.background = 'transparent';
                    button.style.color = 'var(--text)';
                    button.style.border = '2px solid rgba(var(--border-rgb), 0.3)';
                }
            }
        }
    }

    /**
     * Create a new connect button (used when replacing dropdown)
     */
    createNewConnectButton() {
        const button = document.createElement('button');
        button.className = 'btn-secondary';

        // Set onclick attribute (needed for querySelector to find it)
        button.setAttribute('onclick', 'connectTutor()');

        button.style.cssText = 'flex: 1; min-width: 160px; padding: 0.875rem 1.5rem; font-weight: 600; border-radius: 12px; transition: all 0.3s ease;';

        // Find the dropdown wrapper and replace it (check for both types)
        const wrapper = document.querySelector('.connection-dropdown-wrapper') ||
                       document.querySelector('.connected-dropdown');
        if (wrapper && wrapper.parentElement) {
            wrapper.parentElement.replaceChild(button, wrapper);
            console.log('✅ Dropdown replaced with button');
        }

        return button;
    }

    /**
     * Show notification message
     * @param {string} message - The message to display
     * @param {string} type - The type of notification (success, error, info)
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 90px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
            color: white;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Export for use in view-tutor.html
window.ConnectionManager = ConnectionManager;
