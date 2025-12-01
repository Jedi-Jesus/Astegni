// ============================================
// TUTOR COMMUNITY PANEL MANAGER (FIXED VERSION)
// ============================================
// This file manages the community panel for tutor profiles
// - Direct grid population (no more "grid not found" errors)
// - Complete toggle functions for all subsections
// - Proper error handling and loading states
// - Beautiful card rendering
// ============================================

(function() {
    'use strict';

    console.log('🚀 Tutor Community Panel Manager (FIXED) loading...');

    const API_BASE_URL = window.API_BASE_URL || 'https://api.astegni.com';

    // ============================================
    // MAIN TAB SWITCHING (Connections, Requests, Events, Clubs)
    // ============================================

    /**
     * Switch Community Main Tab (triggered by clicking cards in the panel)
     * @param {string} section - Section name ('connections', 'requests', 'events', 'clubs')
     */
    window.switchCommunityMainTab = function(section) {
        console.log(`🔄 [Tutor Panel] Switching to main section: ${section}`);

        // Hide all main tab content sections
        const mainTabContents = document.querySelectorAll('.community-main-tab-content');
        mainTabContents.forEach(content => {
            content.classList.add('hidden');
        });

        // Show the selected section
        const selectedContent = document.getElementById(`${section}-main-tab-content`);
        if (selectedContent) {
            selectedContent.classList.remove('hidden');
            console.log(`✅ [Tutor Panel] Showing ${section}-main-tab-content`);
        } else {
            console.error(`❌ [Tutor Panel] Element ${section}-main-tab-content not found`);
            return;
        }

        // Update active state on cards
        const mainCards = document.querySelectorAll('.community-main-card');
        mainCards.forEach(card => {
            card.classList.remove('active-community-card');
            card.style.transform = '';
            card.style.boxShadow = '';
        });

        // Add active state to clicked card
        const activeCard = document.getElementById(`${section}-main-tab`);
        if (activeCard) {
            activeCard.classList.add('active-community-card');
            activeCard.style.transform = 'scale(1.02)';
            activeCard.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15)';
            console.log(`✅ [Tutor Panel] Activated ${section}-main-tab card`);
        }

        // Load data for the section
        loadDataForSection(section);
    };

    /**
     * Load data for a specific section (FIXED VERSION)
     * @param {string} section - Section name
     */
    function loadDataForSection(section) {
        console.log(`📊 [Tutor Panel] Loading data for section: ${section}`);

        switch (section) {
            case 'connections':
                // Default to "all" connections subsection
                toggleConnectionsSubSection('all');
                break;

            case 'requests':
                // Default to "sent" requests subsection
                toggleRequestsSubSection('sent');
                break;

            case 'events':
                // Default to "all" events subsection
                toggleEventsSubSection('all');
                break;

            case 'clubs':
                // Default to "all" clubs subsection
                toggleClubsSubSection('all');
                break;

            default:
                console.warn(`⚠️ [Tutor Panel] Unknown section: ${section}`);
        }
    }

    // ============================================
    // CONNECTIONS SUBSECTION TOGGLE & LOADING
    // ============================================

    /**
     * Toggle between connections subsections (all, students, parents, tutors)
     * @param {string} subsection - 'all', 'students', 'parents', 'tutors'
     */
    window.toggleConnectionsSubSection = function(subsection) {
        console.log(`🔄 [Tutor Panel] Toggling connections subsection: ${subsection}`);

        // Hide all connection subsections
        const subsections = document.querySelectorAll('.connections-subsection');
        subsections.forEach(section => {
            section.classList.add('hidden');
        });

        // Show selected subsection
        const selectedSubsection = document.getElementById(`${subsection}-connections-subsection`);
        if (selectedSubsection) {
            selectedSubsection.classList.remove('hidden');
            console.log(`✅ [Tutor Panel] Showing ${subsection}-connections-subsection`);
        } else {
            console.error(`❌ [Tutor Panel] Element ${subsection}-connections-subsection not found`);
            return;
        }

        // Update tab button active states
        const tabs = document.querySelectorAll('.connections-sub-tab');
        tabs.forEach(tab => {
            tab.classList.remove('text-blue-600', 'border-blue-600', 'border-b-2');
            tab.classList.add('text-gray-500', 'border-transparent');
        });

        const activeTab = document.getElementById(`${subsection}-connections-tab`);
        if (activeTab) {
            activeTab.classList.remove('text-gray-500', 'border-transparent');
            activeTab.classList.add('text-blue-600', 'border-blue-600', 'border-b-2');
        }

        // Load data for the subsection
        loadConnectionsData(subsection);
    };

    /**
     * Load connections data into the appropriate grid
     * @param {string} subsection - 'all', 'students', 'parents', 'tutors'
     */
    async function loadConnectionsData(subsection) {
        const gridId = `${subsection}-connections-grid`;
        const grid = document.getElementById(gridId);

        if (!grid) {
            console.error(`❌ [Tutor Panel] Grid "${gridId}" not found`);
            return;
        }

        console.log(`📥 [Tutor Panel] Loading connections to grid: ${gridId}`);
        console.log('🔍 [DEBUG] Subsection:', subsection);

        // Show loading state
        grid.innerHTML = `
            <div class="col-span-full flex items-center justify-center p-8">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p class="text-gray-600">Loading connections...</p>
                </div>
            </div>
        `;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                grid.innerHTML = `
                    <div class="col-span-full text-center p-8">
                        <p class="text-gray-600">Please log in to view connections</p>
                    </div>
                `;
                return;
            }

            // Fetch connections from API
            const response = await fetch(`${API_BASE_URL}/api/connections?status=accepted`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            let connections = await response.json();
            console.log(`✅ [Tutor Panel] Fetched ${connections.length} connections from API`);
            console.log('🔍 [DEBUG] Raw connections from API:', connections);

            // Filter by role if not "all"
            if (subsection !== 'all') {
                const roleMap = {
                    'students': 'student',
                    'parents': 'parent',
                    'tutors': 'tutor'
                };
                const targetRole = roleMap[subsection];
                connections = connections.filter(conn => {
                    const otherUserRoles = conn.requester_roles || conn.recipient_roles || [];
                    return otherUserRoles.includes(targetRole);
                });
                console.log(`🔍 [Tutor Panel] Filtered to ${connections.length} ${subsection}`);
            }

            // Display connections
            if (connections.length === 0) {
                grid.innerHTML = `
                    <div class="col-span-full text-center p-12">
                        <div class="text-gray-400 text-6xl mb-4">👥</div>
                        <h3 class="text-xl font-semibold text-gray-700 mb-2">No connections yet</h3>
                        <p class="text-gray-500">Start connecting with students, parents, and other tutors!</p>
                    </div>
                `;
            } else {
                renderConnectionCards(grid, connections);
            }

        } catch (error) {
            console.error(`❌ [Tutor Panel] Error loading connections:`, error);
            grid.innerHTML = `
                <div class="col-span-full text-center p-8">
                    <div class="text-red-500 text-4xl mb-4">⚠️</div>
                    <p class="text-gray-700 font-semibold mb-2">Failed to load connections</p>
                    <p class="text-gray-500 text-sm mb-4">${error.message}</p>
                    <button onclick="toggleConnectionsSubSection('${subsection}')"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    /**
     * Render connection cards (FIXED - matches community modal exactly)
     * @param {HTMLElement} grid - Grid container
     * @param {Array} connections - Array of connection objects
     */
    function renderConnectionCards(grid, connections) {
        console.log('🔍 [DEBUG] renderConnectionCards - Total connections:', connections.length);

        grid.innerHTML = connections.map((conn, index) => {
            console.log(`🔍 [DEBUG] Connection ${index + 1}:`, {
                id: conn.id,
                requested_by: conn.requested_by,
                requester_name: conn.requester_name,
                requester_email: conn.requester_email,
                recipient_id: conn.recipient_id,
                recipient_name: conn.recipient_name,
                recipient_email: conn.recipient_email,
                status: conn.status,
                created_at: conn.created_at
            });

            const currentUser = getCurrentUser();
            console.log(`🔍 [DEBUG] Current User ID: ${currentUser?.id}`);

            const otherUser = getOtherUser(conn);
            console.log(`🔍 [DEBUG] Other User for Connection ${index + 1}:`, otherUser);

            // Calculate connection duration
            const connectedDate = conn.created_at ? new Date(conn.created_at) : null;
            const connectedDays = connectedDate ? Math.floor((new Date() - connectedDate) / (1000 * 60 * 60 * 24)) : 0;
            const connectedText = connectedDays === 0 ? 'Connected today' :
                                 connectedDays === 1 ? 'Connected yesterday' :
                                 `Connected ${connectedDays} days ago`;

            // Get user role badge - use the role they connected as (profileType)
            const primaryRole = otherUser.profileType
                ? otherUser.profileType.charAt(0).toUpperCase() + otherUser.profileType.slice(1)
                : (otherUser.roles || []).includes('student') ? 'Student' :
                  (otherUser.roles || []).includes('tutor') ? 'Tutor' :
                  (otherUser.roles || []).includes('parent') ? 'Parent' :
                  (otherUser.roles || []).includes('admin') ? 'Admin' : 'User';

            const avatarUrl = otherUser.avatar || '../uploads/system_images/system_profile_pictures/man-user.png';

            return `
                <div class="connection-card" data-connection-id="${conn.id}" data-user-id="${otherUser.id}"
                     style="background: var(--card-bg); border-radius: 12px; padding: 1rem; border: 1px solid rgba(var(--border-rgb), 0.1); transition: all 0.2s ease; cursor: default;"
                     onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
                     onmouseleave="this.style.boxShadow='none'">
                    <div class="connection-header" style="position: relative;">
                        <img src="${avatarUrl}"
                             alt="${otherUser.name}"
                             style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; cursor: default;">
                        ${otherUser.isOnline ? '<span style="position: absolute; top: 0; right: 0; width: 12px; height: 12px; background: #10b981; border: 2px solid white; border-radius: 50%;"></span>' : ''}
                    </div>
                    <div class="connection-info" style="margin-top: 0.75rem;">
                        <h4 style="font-weight: 600; color: var(--heading); font-size: 0.95rem; margin: 0; cursor: pointer; transition: color 0.2s; user-select: none;"
                            onclick="viewProfile(${otherUser.profileId}, '${primaryRole.toLowerCase()}')"
                            onmouseover="this.style.color='var(--primary-color, #3b82f6)'"
                            onmouseout="this.style.color='var(--heading)'">${otherUser.name || 'Unknown User'}</h4>
                        <p style="margin: 0.25rem 0;">
                            <span style="font-size: 0.65rem; color: var(--text-muted); margin-right: 0.25rem;">Connected as</span>
                            <span style="display: inline-block; padding: 0.15rem 0.5rem; background: var(--primary-color, #3b82f6); color: white; border-radius: 4px; font-size: 0.7rem; font-weight: 500;">${primaryRole}</span>
                        </p>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.5rem 0 0 0;">
                            ${otherUser.email || 'No email provided'}
                        </p>
                        ${connectedDate ? `
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.5rem 0 0 0;">
                            <i class="fas fa-calendar" style="opacity: 0.7; margin-right: 0.25rem;"></i>
                            <span title="${connectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}">${connectedText}</span>
                        </p>
                        ` : ''}
                    </div>
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                        <button onclick="sendMessage(${otherUser.id})"
                                style="flex: 1; padding: 0.5rem; background: var(--button-bg, #3b82f6); color: white; border: none; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 500; transition: opacity 0.2s;"
                                onmouseover="this.style.opacity='0.8'"
                                onmouseout="this.style.opacity='1'">
                            <i class="fas fa-comment" style="margin-right: 0.25rem;"></i> Message
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        console.log(`✅ [Tutor Panel] Rendered ${connections.length} connection cards`);
    }

    /**
     * Get the other user from a connection object (matches CommunityManager.getOtherUser)
     * @param {Object} connection - Connection object
     * @returns {Object} Other user object
     */
    function getOtherUser(connection) {
        const user = getCurrentUser();
        // FIXED: Use user.user_id (from users table) not user.id (from tutor_profiles table)
        const currentUserId = user?.user_id || user?.id;

        console.log('🔍 [DEBUG] getOtherUser - Current User ID (user_id):', currentUserId);
        console.log('🔍 [DEBUG] getOtherUser - Connection requested_by:', connection.requested_by);
        console.log('🔍 [DEBUG] getOtherUser - Connection recipient_id:', connection.recipient_id);

        // UPDATED SCHEMA: requested_by, requester_type, recipient_id, recipient_type, requester_profile_id, recipient_profile_id
        if (connection.requested_by === currentUserId) {
            // Other user is the recipient
            console.log('🔍 [DEBUG] getOtherUser - YOU are the requester, returning RECIPIENT info');
            return {
                id: connection.recipient_id,
                profileId: connection.recipient_profile_id,  // NEW: Direct profile ID
                name: connection.recipient_name || 'Unknown User',
                email: connection.recipient_email || '',
                avatar: connection.recipient_profile_picture || null,
                roles: connection.recipient_roles || [],
                profileType: connection.recipient_type || null,
                isOnline: false
            };
        } else {
            // Other user is the requester
            console.log('🔍 [DEBUG] getOtherUser - YOU are the recipient, returning REQUESTER info');
            return {
                id: connection.requested_by,
                profileId: connection.requester_profile_id,  // NEW: Direct profile ID
                name: connection.requester_name || 'Unknown User',
                email: connection.requester_email || '',
                avatar: connection.requester_profile_picture || null,
                roles: connection.requester_roles || [],
                profileType: connection.requester_type || null,
                isOnline: false
            };
        }
    }

    // ============================================
    // REQUESTS SUBSECTION TOGGLE & LOADING
    // ============================================

    /**
     * Toggle between sent and received requests subsections
     * @param {string} subsection - 'sent' or 'received'
     */
    window.toggleRequestsSubSection = function(subsection) {
        console.log(`🔄 [Tutor Panel] Toggling requests subsection: ${subsection}`);

        // Hide all requests subsections
        const subsections = document.querySelectorAll('.requests-subsection');
        subsections.forEach(section => {
            section.classList.add('hidden');
        });

        // Show selected subsection
        const selectedSubsection = document.getElementById(`${subsection}-requests-subsection`);
        if (selectedSubsection) {
            selectedSubsection.classList.remove('hidden');
            console.log(`✅ [Tutor Panel] Showing ${subsection}-requests-subsection`);
        } else {
            console.error(`❌ [Tutor Panel] Element ${subsection}-requests-subsection not found`);
            return;
        }

        // Update card active states
        const requestCards = document.querySelectorAll('#requests-main-tab-content > div:first-child > div');

        requestCards.forEach(card => {
            card.classList.remove('active-requests-card');
            card.style.transform = '';
            card.style.boxShadow = '';
        });

        // Find and activate the clicked card
        const clickedCard = Array.from(requestCards).find(card =>
            card.getAttribute('onclick')?.includes(`'${subsection}'`)
        );

        if (clickedCard) {
            clickedCard.classList.add('active-requests-card');
            clickedCard.style.transform = 'scale(1.02)';
            clickedCard.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.1)';
            console.log(`✅ [Tutor Panel] Activated ${subsection} requests card`);
        }

        // Load data for the subsection
        loadRequestsData(subsection);
    };

    /**
     * Load requests data (sent or received)
     * @param {string} type - 'sent' or 'received'
     */
    async function loadRequestsData(type) {
        const listId = `${type}-requests-list`;
        const list = document.getElementById(listId);

        if (!list) {
            console.error(`❌ [Tutor Panel] List "${listId}" not found`);
            return;
        }

        console.log(`📥 [Tutor Panel] Loading ${type} requests to list: ${listId}`);

        // Show loading state
        list.innerHTML = `
            <div class="flex items-center justify-center p-8">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p class="text-gray-600">Loading requests...</p>
                </div>
            </div>
        `;

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                list.innerHTML = `
                    <div class="text-center p-8">
                        <p class="text-gray-600">Please log in to view requests</p>
                    </div>
                `;
                return;
            }

            const direction = type === 'sent' ? 'outgoing' : 'incoming';
            const response = await fetch(`${API_BASE_URL}/api/connections?status=pending&direction=${direction}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const requests = await response.json();
            console.log(`✅ [Tutor Panel] Fetched ${requests.length} ${type} requests from API`);
            console.log('🔍 [DEBUG] Raw requests from API:', requests);

            // Update count in summary card
            const countElement = document.getElementById(`${type}-requests-count`);
            if (countElement) {
                countElement.textContent = requests.length;
            }

            // Display requests
            if (requests.length === 0) {
                const emoji = type === 'sent' ? '📤' : '📥';
                const message = type === 'sent'
                    ? "You haven't sent any connection requests yet"
                    : "No pending connection requests";

                list.innerHTML = `
                    <div class="text-center p-12">
                        <div class="text-gray-400 text-6xl mb-4">${emoji}</div>
                        <h3 class="text-xl font-semibold text-gray-700 mb-2">No requests</h3>
                        <p class="text-gray-500">${message}</p>
                    </div>
                `;
            } else {
                renderRequestCards(list, requests, type);
            }

        } catch (error) {
            console.error(`❌ [Tutor Panel] Error loading ${type} requests:`, error);
            list.innerHTML = `
                <div class="text-center p-8">
                    <div class="text-red-500 text-4xl mb-4">⚠️</div>
                    <p class="text-gray-700 font-semibold mb-2">Failed to load requests</p>
                    <p class="text-gray-500 text-sm mb-4">${error.message}</p>
                    <button onclick="toggleRequestsSubSection('${type}')"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    /**
     * Render request cards (FIXED - matches community modal exactly)
     * @param {HTMLElement} container - Container element
     * @param {Array} requests - Array of request objects
     * @param {string} type - 'sent' or 'received'
     */
    function renderRequestCards(container, requests, type) {
        console.log(`🔍 [DEBUG] renderRequestCards - Type: ${type}, Total requests:`, requests.length);

        container.innerHTML = requests.map((req, index) => {
            console.log(`🔍 [DEBUG] Request ${index + 1}:`, {
                id: req.id,
                requested_by: req.requested_by,
                requester_name: req.requester_name,
                requester_email: req.requester_email,
                recipient_id: req.recipient_id,
                recipient_name: req.recipient_name,
                recipient_email: req.recipient_email,
                status: req.status
            });

            const isReceived = type === 'received';
            const otherUser = getOtherUser(req);
            console.log(`🔍 [DEBUG] Other User for Request ${index + 1}:`, otherUser);

            // Get user role badge
            const primaryRole = otherUser.profileType
                ? otherUser.profileType.charAt(0).toUpperCase() + otherUser.profileType.slice(1)
                : (otherUser.roles || []).includes('student') ? 'Student' :
                  (otherUser.roles || []).includes('tutor') ? 'Tutor' :
                  (otherUser.roles || []).includes('parent') ? 'Parent' :
                  (otherUser.roles || []).includes('admin') ? 'Admin' : 'User';

            const avatarUrl = otherUser.avatar || '../uploads/system_images/system_profile_pictures/man-user.png';

            return `
                <div class="connection-card" data-connection-id="${req.id}" data-user-id="${otherUser.id}"
                     style="background: var(--card-bg); border-radius: 12px; padding: 1rem; border: 1px solid rgba(var(--border-rgb), 0.1); transition: all 0.2s ease; cursor: default;"
                     onmouseenter="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'"
                     onmouseleave="this.style.boxShadow='none'">
                    <div class="connection-header" style="position: relative;">
                        <img src="${avatarUrl}"
                             alt="${otherUser.name}"
                             style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; cursor: default;">
                        ${otherUser.isOnline ? '<span style="position: absolute; top: 0; right: 0; width: 12px; height: 12px; background: #10b981; border: 2px solid white; border-radius: 50%;"></span>' : ''}
                    </div>
                    <div class="connection-info" style="margin-top: 0.75rem;">
                        <h4 style="font-weight: 600; color: var(--heading); font-size: 0.95rem; margin: 0; cursor: pointer; transition: color 0.2s; user-select: none;"
                            onclick="viewProfile(${otherUser.profileId}, '${primaryRole.toLowerCase()}')"
                            onmouseover="this.style.color='var(--primary-color, #3b82f6)'"
                            onmouseout="this.style.color='var(--heading)'">${otherUser.name || 'Unknown User'}</h4>
                        <p style="margin: 0.25rem 0;">
                            <span style="font-size: 0.65rem; color: var(--text-muted); margin-right: 0.25rem;">Role</span>
                            <span style="display: inline-block; padding: 0.15rem 0.5rem; background: var(--primary-color, #3b82f6); color: white; border-radius: 4px; font-size: 0.7rem; font-weight: 500;">${primaryRole}</span>
                        </p>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.5rem 0 0 0;">
                            ${otherUser.email || 'No email provided'}
                        </p>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.5rem 0 0 0;">
                            <i class="fas fa-clock" style="opacity: 0.7; margin-right: 0.25rem;"></i>
                            <span>${isReceived ? 'Pending your approval' : 'Awaiting response'}</span>
                        </p>
                    </div>
                    ${isReceived ? `
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                            <button onclick="acceptConnection(${req.id})"
                                    style="flex: 1; padding: 0.5rem; background: var(--button-bg, #3b82f6); color: white; border: none; border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 500; transition: opacity 0.2s;"
                                    onmouseover="this.style.opacity='0.8'"
                                    onmouseout="this.style.opacity='1'">
                                Accept
                            </button>
                            <button onclick="rejectConnection(${req.id})"
                                    style="flex: 1; padding: 0.5rem; background: transparent; color: var(--text-muted); border: 1px solid rgba(var(--border-rgb, 229, 231, 235), 0.3); border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 500; transition: all 0.2s;"
                                    onmouseover="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.color='#ef4444'; this.style.borderColor='#ef4444'"
                                    onmouseout="this.style.background='transparent'; this.style.color='var(--text-muted)'; this.style.borderColor='rgba(var(--border-rgb, 229, 231, 235), 0.3)'">
                                Decline
                            </button>
                        </div>
                    ` : `
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem;">
                            <button onclick="cancelSentRequest(${req.id})"
                                    style="flex: 1; padding: 0.5rem; background: transparent; color: var(--text-muted); border: 1px solid rgba(var(--border-rgb, 229, 231, 235), 0.3); border-radius: 6px; font-size: 0.8rem; cursor: pointer; font-weight: 500; transition: all 0.2s;"
                                    onmouseover="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.color='#ef4444'; this.style.borderColor='#ef4444'"
                                    onmouseout="this.style.background='transparent'; this.style.color='var(--text-muted)'; this.style.borderColor='rgba(var(--border-rgb, 229, 231, 235), 0.3)'">
                                <i class="fas fa-times" style="margin-right: 0.25rem;"></i> Cancel
                            </button>
                        </div>
                    `}
                </div>
            `;
        }).join('');

        console.log(`✅ [Tutor Panel] Rendered ${requests.length} ${type} request cards`);
    }

    // ============================================
    // EVENTS SUBSECTION TOGGLE & LOADING
    // ============================================

    /**
     * Toggle between events subsections (all, my-events, discover, joined, upcoming)
     * @param {string} subsection - 'all', 'my-events', 'discover', 'joined', 'upcoming'
     */
    window.toggleEventsSubSection = function(subsection) {
        console.log(`🔄 [Tutor Panel] Toggling events subsection: ${subsection}`);

        // Hide all event subsections
        const subsections = document.querySelectorAll('.events-subsection');
        subsections.forEach(section => {
            section.classList.add('hidden');
        });

        // Show selected subsection
        const selectedSubsection = document.getElementById(`${subsection}-events-subsection`);
        if (selectedSubsection) {
            selectedSubsection.classList.remove('hidden');
            console.log(`✅ [Tutor Panel] Showing ${subsection}-events-subsection`);
        } else {
            console.error(`❌ [Tutor Panel] Element ${subsection}-events-subsection not found`);
            return;
        }

        // Update tab button active states
        const tabs = document.querySelectorAll('.events-sub-tab');
        tabs.forEach(tab => {
            tab.classList.remove('text-blue-600', 'border-blue-600', 'border-b-2');
            tab.classList.add('text-gray-500', 'border-transparent');
        });

        const activeTab = document.getElementById(`${subsection}-events-tab`);
        if (activeTab) {
            activeTab.classList.remove('text-gray-500', 'border-transparent');
            activeTab.classList.add('text-blue-600', 'border-blue-600', 'border-b-2');
        }

        // Load data for the subsection
        loadEventsData(subsection);
    };

    /**
     * Load events data
     * @param {string} subsection - 'all', 'my-events', 'discover', 'joined', 'upcoming'
     */
    async function loadEventsData(subsection) {
        const gridId = `${subsection}-events-grid`;
        const grid = document.getElementById(gridId);

        if (!grid) {
            console.error(`❌ [Tutor Panel] Grid "${gridId}" not found`);
            return;
        }

        console.log(`📥 [Tutor Panel] Loading events to grid: ${gridId}`);

        // Show loading state
        grid.innerHTML = `
            <div class="col-span-full flex items-center justify-center p-8">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p class="text-gray-600">Loading events...</p>
                </div>
            </div>
        `;

        try {
            const token = localStorage.getItem('token');
            const user = getCurrentUser();
            const currentUserId = user?.user_id || user?.id;

            if (!token) {
                grid.innerHTML = `
                    <div class="col-span-full text-center p-8">
                        <p class="text-gray-600">Please log in to view events</p>
                    </div>
                `;
                return;
            }

            // Fetch events from API
            const response = await fetch(`${API_BASE_URL}/api/events`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();
            let events = data.events || [];
            console.log(`✅ [Tutor Panel] Fetched ${events.length} events from API`);

            // Filter events based on subsection
            if (subsection === 'my-events') {
                // Show only events created by current user
                events = events.filter(event => event.created_by === currentUserId);
                console.log(`🔍 [Tutor Panel] Filtered to ${events.length} my events`);
            } else if (subsection === 'joined') {
                // Show only events the user has joined
                events = events.filter(event => event.joined_status === true);
                console.log(`🔍 [Tutor Panel] Filtered to ${events.length} joined events`);
            } else if (subsection === 'discover') {
                // Show events not created by user and not joined
                events = events.filter(event =>
                    event.created_by !== currentUserId &&
                    event.joined_status !== true &&
                    !event.is_system
                );
                console.log(`🔍 [Tutor Panel] Filtered to ${events.length} discover events`);
            } else if (subsection === 'upcoming') {
                // Show only upcoming events
                const now = new Date();
                events = events.filter(event => {
                    const eventDate = new Date(event.start_datetime || event.date);
                    return eventDate >= now;
                });
                console.log(`🔍 [Tutor Panel] Filtered to ${events.length} upcoming events`);
            }
            // 'all' shows all events (no filtering)

            // Display events
            if (events.length === 0) {
                grid.innerHTML = `
                    <div class="col-span-full text-center p-12">
                        <div class="text-gray-400 text-6xl mb-4">📅</div>
                        <h3 class="text-xl font-semibold text-gray-700 mb-2">No events found</h3>
                        <p class="text-gray-500">
                            ${subsection === 'my-events' ? 'You haven\'t created any events yet' :
                              subsection === 'joined' ? 'You haven\'t joined any events yet' :
                              subsection === 'discover' ? 'No new events to discover right now' :
                              subsection === 'upcoming' ? 'No upcoming events scheduled' :
                              'Stay tuned for upcoming educational events!'}
                        </p>
                    </div>
                `;
            } else {
                renderEventCards(grid, events, subsection);
            }

        } catch (error) {
            console.error(`❌ [Tutor Panel] Error loading events:`, error);
            grid.innerHTML = `
                <div class="col-span-full text-center p-8">
                    <div class="text-red-500 text-4xl mb-4">⚠️</div>
                    <p class="text-gray-700 font-semibold mb-2">Failed to load events</p>
                    <p class="text-gray-500 text-sm mb-4">${error.message}</p>
                    <button onclick="toggleEventsSubSection('${subsection}')"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    /**
     * Render event cards (matching communityManager.js pattern)
     * @param {HTMLElement} grid - Grid container
     * @param {Array} events - Array of event objects
     * @param {string} subsection - Current subsection
     */
    function renderEventCards(grid, events, subsection) {
        const user = getCurrentUser();
        const currentUserId = user?.user_id || user?.id;

        grid.innerHTML = events.map(event => {
            const startDate = new Date(event.start_datetime || event.date);
            const isOnline = event.is_online || (event.location && event.location.toLowerCase() === 'online');

            // Determine badge text based on backend response
            const isSystemEvent = event.is_system;
            const isOwnEvent = event.created_by === currentUserId;
            const hasJoined = event.joined_status;

            let badgeText = 'System Event';
            if (isOwnEvent) {
                badgeText = 'Your Event';
            } else if (hasJoined && isSystemEvent) {
                badgeText = 'Participating';
            } else if (hasJoined) {
                badgeText = 'Enrolled';
            }

            return `
                <div class="event-card bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
                    ${event.event_picture ? `<img src="${event.event_picture}" alt="${event.title}" class="w-full h-40 object-cover rounded-t-xl">` : ''}
                    <div class="p-6">
                        <div class="flex items-start justify-between mb-3">
                            <h4 class="font-bold text-lg text-gray-900 flex-1">${event.title || 'Untitled Event'}</h4>
                            <span class="text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">${badgeText}</span>
                        </div>

                        <div class="space-y-2 mb-4">
                            <div class="flex items-center gap-2 text-sm text-gray-600">
                                <span>📅</span>
                                <span>${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <div class="flex items-center gap-2 text-sm text-gray-600">
                                <span>🕐</span>
                                <span>${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div class="flex items-center gap-2 text-sm text-gray-600">
                                <span>📍</span>
                                <span>${event.location || 'TBA'}</span>
                            </div>
                            <div class="flex items-center gap-2 text-sm text-gray-600">
                                <span>👥</span>
                                <span>${event.registered_count || 0}/${event.available_seats || 'Unlimited'} registered</span>
                            </div>
                            ${event.price > 0 ? `
                            <div class="flex items-center gap-2 text-sm text-gray-600">
                                <span>💰</span>
                                <span>${event.price} ETB</span>
                            </div>
                            ` : '<div class="flex items-center gap-2 text-sm text-green-600"><span>🎁</span><span>Free</span></div>'}
                        </div>

                        <p class="text-sm text-gray-600 mb-4 line-clamp-2">${event.description || 'No description available'}</p>

                        <div class="flex gap-2">
                            <button onclick="viewEvent(${event.id})"
                                    class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                                View Details
                            </button>
                            ${!hasJoined ? `
                            <button onclick="joinEvent(${event.id})"
                                    class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                                Join Event
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        console.log(`✅ [Tutor Panel] Rendered ${events.length} event cards`);
    }

    // ============================================
    // CLUBS SUBSECTION TOGGLE & LOADING
    // ============================================

    /**
     * Toggle between clubs subsections (all, my-clubs, discover, joined, upcoming)
     * @param {string} subsection - 'all', 'my-clubs', 'discover', 'joined', 'upcoming'
     */
    window.toggleClubsSubSection = function(subsection) {
        console.log(`🔄 [Tutor Panel] Toggling clubs subsection: ${subsection}`);

        // Hide all club subsections
        const subsections = document.querySelectorAll('.clubs-subsection');
        subsections.forEach(section => {
            section.classList.add('hidden');
        });

        // Show selected subsection
        const selectedSubsection = document.getElementById(`${subsection}-clubs-subsection`);
        if (selectedSubsection) {
            selectedSubsection.classList.remove('hidden');
            console.log(`✅ [Tutor Panel] Showing ${subsection}-clubs-subsection`);
        } else {
            console.error(`❌ [Tutor Panel] Element ${subsection}-clubs-subsection not found`);
            return;
        }

        // Update tab button active states
        const tabs = document.querySelectorAll('.clubs-sub-tab');
        tabs.forEach(tab => {
            tab.classList.remove('text-purple-600', 'border-purple-600', 'border-b-2');
            tab.classList.add('text-gray-500', 'border-transparent');
        });

        const activeTab = document.getElementById(`${subsection}-clubs-tab`);
        if (activeTab) {
            activeTab.classList.remove('text-gray-500', 'border-transparent');
            activeTab.classList.add('text-purple-600', 'border-purple-600', 'border-b-2');
        }

        // Load data for the subsection
        loadClubsData(subsection);
    };

    /**
     * Load clubs data
     * @param {string} subsection - 'all', 'my-clubs', 'discover', 'joined', 'upcoming'
     */
    async function loadClubsData(subsection) {
        const gridId = `${subsection}-clubs-grid`;
        const grid = document.getElementById(gridId);

        if (!grid) {
            console.error(`❌ [Tutor Panel] Grid "${gridId}" not found`);
            return;
        }

        console.log(`📥 [Tutor Panel] Loading clubs to grid: ${gridId}`);

        // Show loading state
        grid.innerHTML = `
            <div class="col-span-full flex items-center justify-center p-8">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p class="text-gray-600">Loading clubs...</p>
                </div>
            </div>
        `;

        try {
            const token = localStorage.getItem('token');
            const user = getCurrentUser();
            const currentUserId = user?.user_id || user?.id;

            if (!token) {
                grid.innerHTML = `
                    <div class="col-span-full text-center p-8">
                        <p class="text-gray-600">Please log in to view clubs</p>
                    </div>
                `;
                return;
            }

            // Fetch clubs from API
            const response = await fetch(`${API_BASE_URL}/api/clubs`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();
            let clubs = data.clubs || [];
            console.log(`✅ [Tutor Panel] Fetched ${clubs.length} clubs from API`);

            // Filter clubs based on subsection
            if (subsection === 'my-clubs') {
                // Show only clubs created by current user
                clubs = clubs.filter(club => club.created_by === currentUserId);
                console.log(`🔍 [Tutor Panel] Filtered to ${clubs.length} my clubs`);
            } else if (subsection === 'joined') {
                // Show only clubs the user has joined
                clubs = clubs.filter(club => club.joined_status === true);
                console.log(`🔍 [Tutor Panel] Filtered to ${clubs.length} joined clubs`);
            } else if (subsection === 'discover') {
                // Show clubs not created by user and not joined
                clubs = clubs.filter(club =>
                    club.created_by !== currentUserId &&
                    club.joined_status !== true &&
                    !club.is_system
                );
                console.log(`🔍 [Tutor Panel] Filtered to ${clubs.length} discover clubs`);
            } else if (subsection === 'upcoming') {
                // Show clubs with upcoming meetings/events
                clubs = clubs.filter(club => {
                    if (club.next_meeting) {
                        const meetingDate = new Date(club.next_meeting);
                        return meetingDate >= new Date();
                    }
                    return false;
                });
                console.log(`🔍 [Tutor Panel] Filtered to ${clubs.length} clubs with upcoming meetings`);
            }
            // 'all' shows all clubs (no filtering)

            // Display clubs
            if (clubs.length === 0) {
                grid.innerHTML = `
                    <div class="col-span-full text-center p-12">
                        <div class="text-gray-400 text-6xl mb-4">🎭</div>
                        <h3 class="text-xl font-semibold text-gray-700 mb-2">No clubs found</h3>
                        <p class="text-gray-500">
                            ${subsection === 'my-clubs' ? 'You haven\'t created any clubs yet' :
                              subsection === 'joined' ? 'You haven\'t joined any clubs yet' :
                              subsection === 'discover' ? 'No new clubs to discover right now' :
                              subsection === 'upcoming' ? 'No clubs with upcoming meetings' :
                              'Join or discover educational clubs to collaborate with peers!'}
                        </p>
                    </div>
                `;
            } else {
                renderClubCards(grid, clubs, subsection);
            }

        } catch (error) {
            console.error(`❌ [Tutor Panel] Error loading clubs:`, error);
            grid.innerHTML = `
                <div class="col-span-full text-center p-8">
                    <div class="text-red-500 text-4xl mb-4">⚠️</div>
                    <p class="text-gray-700 font-semibold mb-2">Failed to load clubs</p>
                    <p class="text-gray-500 text-sm mb-4">${error.message}</p>
                    <button onclick="toggleClubsSubSection('${subsection}')"
                            class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    /**
     * Render club cards (matching communityManager.js pattern)
     * @param {HTMLElement} grid - Grid container
     * @param {Array} clubs - Array of club objects
     * @param {string} subsection - Current subsection
     */
    function renderClubCards(grid, clubs, subsection) {
        const user = getCurrentUser();
        const currentUserId = user?.user_id || user?.id;

        grid.innerHTML = clubs.map(club => {
            // Determine badge text based on backend response
            const isSystemClub = club.is_system;
            const isOwnClub = club.created_by === currentUserId;
            const hasJoined = club.joined_status;

            let badgeText = 'System Club';
            if (isOwnClub) {
                badgeText = 'Your Club';
            } else if (hasJoined && isSystemClub) {
                badgeText = 'Member';
            } else if (hasJoined) {
                badgeText = 'Joined';
            }

            return `
                <div class="club-card bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
                    ${club.club_picture ? `<img src="${club.club_picture}" alt="${club.title}" class="w-full h-40 object-cover rounded-t-xl">` : ''}
                    <div class="p-6">
                        <div class="flex items-start justify-between mb-3">
                            <h4 class="font-bold text-lg text-gray-900 flex-1">${club.title || club.name || 'Untitled Club'}</h4>
                            <span class="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">${badgeText}</span>
                        </div>

                        <div class="space-y-2 mb-4">
                            <div class="flex items-center gap-2 text-sm text-gray-600">
                                <span>📚</span>
                                <span>${club.category || 'General'}</span>
                            </div>
                            <div class="flex items-center gap-2 text-sm text-gray-600">
                                <span>👥</span>
                                <span>${club.current_members || club.member_count || 0}/${club.member_limit || 'Unlimited'} members</span>
                            </div>
                            ${club.is_paid ? `
                            <div class="flex items-center gap-2 text-sm text-gray-600">
                                <span>💰</span>
                                <span>${club.membership_fee} ETB</span>
                            </div>
                            ` : '<div class="flex items-center gap-2 text-sm text-green-600"><span>🎁</span><span>Free</span></div>'}
                        </div>

                        <p class="text-sm text-gray-600 mb-4 line-clamp-2">${club.description || 'No description available'}</p>

                        <div class="flex gap-2">
                            <button onclick="viewClub(${club.id})"
                                    class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                                View Details
                            </button>
                            ${!hasJoined ? `
                            <button onclick="joinClub(${club.id})"
                                    class="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                                Join Club
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        console.log(`✅ [Tutor Panel] Rendered ${clubs.length} club cards`);
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    /**
     * Get current user from localStorage
     */
    function getCurrentUser() {
        try {
            // FIXED: Use 'currentUser' (from profile-system.js) not 'user'
            const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            console.log('🔍 [DEBUG] getCurrentUser - Full user object:', user);
            console.log('🔍 [DEBUG] getCurrentUser - user.id:', user?.id);
            console.log('🔍 [DEBUG] getCurrentUser - user.user_id:', user?.user_id);
            return user;
        } catch (error) {
            console.error('Error parsing user from localStorage:', error);
            return null;
        }
    }

    /**
     * Get role configuration (icon, colors, label)
     */
    function getRoleConfig(role) {
        const configs = {
            'student': {
                icon: '👨‍🎓',
                label: 'Student',
                bgColor: 'bg-blue-100',
                textColor: 'text-blue-700',
                borderColor: 'border-blue-200'
            },
            'tutor': {
                icon: '👨‍🏫',
                label: 'Tutor',
                bgColor: 'bg-purple-100',
                textColor: 'text-purple-700',
                borderColor: 'border-purple-200'
            },
            'parent': {
                icon: '👨‍👩‍👧',
                label: 'Parent',
                bgColor: 'bg-orange-100',
                textColor: 'text-orange-700',
                borderColor: 'border-orange-200'
            },
            'admin': {
                icon: '👑',
                label: 'Admin',
                bgColor: 'bg-red-100',
                textColor: 'text-red-700',
                borderColor: 'border-red-200'
            }
        };

        return configs[role] || configs['student'];
    }

    /**
     * Get default avatar URL
     */
    function getDefaultAvatar(name) {
        const cleanName = (name || 'User').trim();
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=4F46E5&color=fff&size=128&bold=true`;
    }

    /**
     * Get time ago string
     */
    function getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

        return date.toLocaleDateString();
    }

    // ============================================
    // ACTION FUNCTIONS (Placeholders)
    // ============================================

    window.sendMessage = function(userId) {
        alert(`Send message to user ${userId} - Feature coming soon!`);
    };

    /**
     * Navigate to user profile page based on role
     * @param {number} profileId - Profile ID (tutor_profiles.id, student_profiles.id, etc.)
     * @param {string} role - User role ('student', 'tutor', 'parent', 'admin')
     */
    window.viewProfile = function(profileId, role) {
        console.log(`🔍 viewProfile called - profileId: ${profileId}, role: ${role}`);

        const roleMap = {
            'student': 'student',
            'tutor': 'tutor',
            'parent': 'parent',
            'admin': 'tutor',  // Fallback to tutor page for admins
            'advertiser': 'advertiser'
        };

        const profileType = roleMap[role.toLowerCase()] || 'student';

        // Use profileId directly - no conversion needed!
        const url = `../view-profiles/view-${profileType}.html?id=${profileId}`;

        console.log(`➡️ Navigating to: ${url}`);
        window.location.href = url;
    };

    window.acceptConnection = function(connectionId) {
        alert(`Accept connection ${connectionId} - Feature coming soon!`);
    };

    window.rejectConnection = function(connectionId) {
        alert(`Reject connection ${connectionId} - Feature coming soon!`);
    };

    window.viewEvent = function(eventId) {
        alert(`View event ${eventId} - Feature coming soon!`);
    };

    window.joinEvent = function(eventId) {
        alert(`Join event ${eventId} - Feature coming soon!`);
    };

    window.viewClub = function(clubId) {
        alert(`View club ${clubId} - Feature coming soon!`);
    };

    window.joinClub = function(clubId) {
        alert(`Join club ${clubId} - Feature coming soon!`);
    };

    // ============================================
    // INITIALIZATION
    // ============================================

    // When the community panel is opened via sidebar, load connections by default
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ [Tutor Panel] Community Panel Manager (FIXED) initialized');

        // Listen for panel switches
        const communityMenuItem = document.querySelector('.sidebar-item[data-panel="tutor-community"]');
        if (communityMenuItem) {
            communityMenuItem.addEventListener('click', function() {
                console.log('🎯 [Tutor Panel] Community panel opened from sidebar');
                // Wait a bit for panel to become visible, then load connections
                setTimeout(() => {
                    switchCommunityMainTab('connections');
                }, 100);
            });
        }
    });

    console.log('✅ Tutor Community Panel Manager (FIXED) loaded successfully');

})();
