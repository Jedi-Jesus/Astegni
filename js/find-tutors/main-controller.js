
// ============================================
// MAIN CONTROLLER
// ============================================

const FindTutorsController = {
    // Cache for user's connections
    userConnections: [],
    connectionsLoaded: false,

    async init() {
        console.log('🔍 Initializing Find Tutors page...');

        // Initialize UI
        FindTutorsUI.init();

        // Load user's connections first (if logged in)
        await this.loadUserConnections();

        // Load initial data
        await this.loadTutors();

        // Initialize WebSocket if available
        this.initWebSocket();

        console.log('✅ Find Tutors page initialized');
    },

    async loadUserConnections() {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) {
            console.log('User not logged in, skipping connection load');
            return;
        }

        try {
            const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000/api';
            const response = await fetch(`${API_BASE_URL}/connections?status=accepted&status=pending`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.userConnections = await response.json();
                this.connectionsLoaded = true;
                console.log(`Loaded ${this.userConnections.length} user connections:`);
                // Debug: log all connections with their profile IDs
                this.userConnections.forEach(conn => {
                    console.log(`  Connection ${conn.id}: requester_profile_id=${conn.requester_profile_id} (${conn.requester_type}), recipient_profile_id=${conn.recipient_profile_id} (${conn.recipient_type}), status=${conn.status}`);
                });
            } else {
                console.error('Failed to load connections:', response.status, await response.text());
            }
        } catch (error) {
            console.error('Failed to load user connections:', error);
        }
    },

    getConnectionStatus(tutorProfileId) {
        // Find if there's a connection with this tutor using profile IDs
        const connection = this.userConnections.find(conn => {
            // Check if tutor is the recipient (we sent request to them)
            if (conn.recipient_type === 'tutor' && conn.recipient_profile_id === tutorProfileId) {
                return true;
            }
            // Check if tutor is the requester (they sent request to us)
            if (conn.requester_type === 'tutor' && conn.requester_profile_id === tutorProfileId) {
                return true;
            }
            return false;
        });

        if (!connection) return null;

        // Determine if this is an outgoing request (we sent it) or incoming (they sent it)
        const isOutgoing = connection.recipient_profile_id === tutorProfileId;

        return {
            status: connection.status,
            isOutgoing: isOutgoing,
            connectionId: connection.id
        };
    },

    async loadTutors() {
        try {
            FindTutorsUI.showLoading();

            const params = {
                page: FindTutorsState.currentPage,
                limit: FindTutorsState.itemsPerPage,
                ...FindTutorsState.filters
            };

            // Remove empty parameters (but keep boolean false values)
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null || params[key] === undefined) {
                    delete params[key];
                }
                // Keep false boolean values for preference filters
            });

            console.log('Loading tutors with params:', params);
            const response = await FindTutorsAPI.getTutors(params);
            console.log('API response:', response);

            let tutors = response.tutors || [];

            // Merge connection status with tutors
            if (this.connectionsLoaded && this.userConnections.length > 0) {
                tutors = tutors.map(tutor => {
                    // Use tutor.id (profile ID) to match against recipient_profile_id/requester_profile_id
                    const connectionStatus = this.getConnectionStatus(tutor.id);
                    if (connectionStatus) {
                        tutor.is_connected = connectionStatus.status === 'accepted';
                        tutor.connection_pending = connectionStatus.status === 'pending' && connectionStatus.isOutgoing;
                        tutor.connection_incoming = connectionStatus.status === 'pending' && !connectionStatus.isOutgoing;
                        tutor.connection_status = connectionStatus.status;
                        tutor.connection_id = connectionStatus.connectionId;
                        tutor.is_outgoing = connectionStatus.isOutgoing;
                        console.log(`Tutor ${tutor.id} (${tutor.first_name}): ${connectionStatus.status}, outgoing=${connectionStatus.isOutgoing}`);
                    }
                    return tutor;
                });
                console.log('Merged connection status with tutors');
            }

            // Apply CLIENT-SIDE preference filters AFTER getting backend results
            if (params.favorite === true) {
                const favoriteTutors = PreferencesManager.getFavorites();
                console.log('Client-side filtering by favorites:', favoriteTutors);
                tutors = tutors.filter(tutor => favoriteTutors.includes(tutor.id));
            }

            if (params.saved === true) {
                const savedTutors = PreferencesManager.getSaved();
                console.log('Client-side filtering by saved:', savedTutors);
                tutors = tutors.filter(tutor => savedTutors.includes(tutor.id));
            }

            if (params.searchHistory === true) {
                const historyTutorIds = PreferencesManager.getSearchHistoryTutorIds();
                console.log('Client-side filtering by search history:', historyTutorIds);
                tutors = tutors.filter(tutor => historyTutorIds.includes(tutor.id));
            }

            FindTutorsState.tutors = tutors;
            FindTutorsState.filteredTutors = tutors; // Store for search history

            // Use API total count for pagination (not client-side filtered count)
            // Only use client-side count for preference filters
            if (params.favorite === true || params.saved === true || params.searchHistory === true) {
                // For preference filters, use client-side filtered count
                FindTutorsState.totalTutors = tutors.length;
                FindTutorsState.totalPages = Math.ceil(tutors.length / params.limit);
            } else {
                // For normal filtering, use API's total count
                FindTutorsState.totalTutors = response.total || tutors.length;
                FindTutorsState.totalPages = Math.ceil(FindTutorsState.totalTutors / params.limit);
            }

            // Record search history when user performs a search and gets results
            if (params.search && params.search.trim() && tutors.length > 0) {
                const tutorIds = tutors.map(t => t.id);
                PreferencesManager.addSearchToHistory(params.search.trim(), tutorIds);
                console.log(`📝 Recorded search history: "${params.search}" with ${tutorIds.length} tutors`);
            }

            console.log(`Showing ${FindTutorsState.tutors.length} tutors after client-side filtering`);
            FindTutorsUI.renderTutors(FindTutorsState.tutors);
            FindTutorsUI.renderPagination();

        } catch (error) {
            console.error('Failed to load tutors:', error);
            this.showError('Failed to load tutors. Please try again.');
        } finally {
            FindTutorsUI.hideLoading();
        }
    },

    showError(message) {
        if (FindTutorsUI.elements.tutorGrid) {
            FindTutorsUI.elements.tutorGrid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-red-500 mb-4">
                        <svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                        </svg>
                    </div>
                    <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading Tutors</h3>
                    <p class="text-gray-500 dark:text-gray-400 mb-4">${message}</p>
                    <button onclick="FindTutorsController.loadTutors()"
                            class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">
                        Try Again
                    </button>
                </div>
            `;
        }
    },

    initWebSocket() {
        // Optional WebSocket initialization for real-time updates
        if (window.WebSocket && window.location.protocol !== 'file:') {
            try {
                const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsHost = window.API_BASE_URL ? new URL(window.API_BASE_URL).host : 'localhost:8000';
                const wsUrl = `${wsProtocol}//${wsHost}/ws`;
                const ws = new WebSocket(wsUrl);

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === 'tutor_update') {
                        FindTutorsController.loadTutors(); // Refresh tutors on update
                    }
                };

                ws.onerror = (error) => {
                    console.log('WebSocket connection failed:', error);
                };
            } catch (error) {
                console.log('WebSocket initialization failed:', error);
            }
        }
    }
};
