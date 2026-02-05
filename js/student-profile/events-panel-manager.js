// ============================================
// STUDENT EVENTS PANEL MANAGER
// ============================================
// This file manages the standalone Events panel for student profiles
// - Separate from Community panel
// - Shows Past, Upcoming, and Joined events
// - Events are created by advertisers only
// ============================================

(function() {
    'use strict';

    console.log('🚀 Student Events Panel Manager loading...');

    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

    // ============================================
    // TAB SWITCHING
    // ============================================

    /**
     * Switch between Events Panel tabs (Past, Upcoming, Joined)
     * @param {string} tabName - Tab name ('past', 'upcoming', 'joined')
     */
    window.switchEventsTab = function(tabName) {
        console.log(`🔄 [Events Panel] Switching to tab: ${tabName}`);

        // Hide all tab content sections
        const tabContents = document.querySelectorAll('.events-tab-content');
        tabContents.forEach(content => {
            content.classList.add('hidden');
        });

        // Show the selected tab content
        const selectedContent = document.getElementById(`${tabName}-events-${tabName === 'past' ? 'tab' : tabName === 'upcoming' ? 'panel-tab' : 'panel-tab'}-content`);
        if (selectedContent) {
            selectedContent.classList.remove('hidden');
            console.log(`✅ [Events Panel] Showing ${tabName} events tab content`);
        } else {
            console.error(`❌ [Events Panel] Tab content for ${tabName} not found`);
            return;
        }

        // Update tab button active states
        const tabs = document.querySelectorAll('.events-tab');
        tabs.forEach(tab => {
            tab.classList.remove('text-blue-600', 'border-blue-600', 'border-b-2');
            tab.classList.add('text-gray-500');
        });

        const activeTab = document.getElementById(`${tabName}-events-tab`) ||
                         document.getElementById(`${tabName}-events-panel-tab`);
        if (activeTab) {
            activeTab.classList.remove('text-gray-500');
            activeTab.classList.add('text-blue-600', 'border-blue-600', 'border-b-2');
        }

        // Load data for the selected tab
        loadEventsForTab(tabName);
    };

    // ============================================
    // DATA LOADING
    // ============================================

    /**
     * Load events data for a specific tab
     * @param {string} tabName - Tab name ('past', 'upcoming', 'joined')
     */
    async function loadEventsForTab(tabName) {
        const gridId = tabName === 'past' ? 'past-events-grid' :
                      tabName === 'upcoming' ? 'upcoming-events-panel-grid' :
                      'joined-events-panel-grid';

        const grid = document.getElementById(gridId);

        if (!grid) {
            console.error(`❌ [Events Panel] Grid "${gridId}" not found`);
            return;
        }

        console.log(`📥 [Events Panel] Loading ${tabName} events to grid: ${gridId}`);

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
            // Wait for auth to be ready before checking token
            if (window.StudentAuthReady) {
                await window.StudentAuthReady.waitForAuth();
            }

            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                grid.innerHTML = `
                    <div class="col-span-full text-center p-8">
                        <p class="text-gray-600">Please log in to view events</p>
                    </div>
                `;
                return;
            }

            // Get active role from JWT token
            let activeRole = 'student';
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                activeRole = payload.role || 'student';
            } catch (e) {
                console.warn('Could not parse role from token, defaulting to student');
            }

            // Fetch events from API
            const response = await fetch(`${API_BASE_URL}/api/events?role=${activeRole}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();
            let events = data.events || [];
            console.log(`✅ [Events Panel] Fetched ${events.length} events from API`);

            // Get current user ID
            const user = getCurrentUser();
            const currentUserId = user?.user_id || user?.id;

            // Filter events based on tab
            const now = new Date();

            if (tabName === 'past') {
                // Past Events - Events NOT joined that already happened
                events = events.filter(event => {
                    const eventDate = new Date(event.start_datetime || event.date);
                    return eventDate < now && event.joined_status !== true;
                });
                console.log(`🔍 [Events Panel] Filtered to ${events.length} past events (not joined)`);
            } else if (tabName === 'upcoming') {
                // Upcoming Events - Events NOT joined yet that are scheduled for the future
                events = events.filter(event => {
                    const eventDate = new Date(event.start_datetime || event.date);
                    return eventDate >= now && event.joined_status !== true;
                });
                console.log(`🔍 [Events Panel] Filtered to ${events.length} upcoming events (not joined)`);
            } else if (tabName === 'joined') {
                // Joined Events - All events the user has joined (past + upcoming)
                events = events.filter(event => event.joined_status === true);
                console.log(`🔍 [Events Panel] Filtered to ${events.length} joined events`);
            }

            // Display events
            if (events.length === 0) {
                const emptyMessages = {
                    past: 'No past events to display',
                    upcoming: 'No upcoming events available',
                    joined: 'You haven\'t joined any events yet'
                };

                grid.innerHTML = `
                    <div class="col-span-full text-center p-12">
                        <div class="text-gray-400 text-6xl mb-4">📅</div>
                        <h3 class="text-xl font-semibold text-gray-700 mb-2">No events found</h3>
                        <p class="text-gray-500">${emptyMessages[tabName]}</p>
                    </div>
                `;
            } else {
                renderEventCards(grid, events);
            }

        } catch (error) {
            console.error(`❌ [Events Panel] Error loading events:`, error);
            grid.innerHTML = `
                <div class="col-span-full text-center p-8">
                    <div class="text-red-500 text-4xl mb-4">⚠️</div>
                    <p class="text-gray-700 font-semibold mb-2">Failed to load events</p>
                    <p class="text-gray-500 text-sm mb-4">${error.message}</p>
                    <button onclick="switchEventsTab('${tabName}')"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    // ============================================
    // RENDERING
    // ============================================

    /**
     * Render event cards
     * @param {HTMLElement} grid - Grid container
     * @param {Array} events - Array of event objects
     */
    function renderEventCards(grid, events) {
        const user = getCurrentUser();
        const currentUserId = user?.user_id || user?.id;

        const cardsHtml = events.map(event => {
            const startDate = new Date(event.start_datetime || event.date);
            const isOnline = event.is_online || (event.location && event.location.toLowerCase() === 'online');
            const hasJoined = event.joined_status;
            const isPast = startDate < new Date();

            return `
                <div class="event-card bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
                    ${event.event_picture ? `<img src="${event.event_picture}" alt="${event.title}" class="w-full h-40 object-cover rounded-t-xl">` : ''}
                    <div class="p-6">
                        <div class="flex items-start justify-between mb-3">
                            <h4 class="font-bold text-lg text-gray-900 flex-1">${event.title || 'Untitled Event'}</h4>
                            ${isPast ? `<span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">Past Event</span>` :
                              hasJoined ? `<span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Joined</span>` :
                              `<span class="text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}">${isOnline ? 'Online' : 'In-Person'}</span>`}
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
                                <span>${event.price} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}</span>
                            </div>
                            ` : '<div class="flex items-center gap-2 text-sm text-green-600"><span>🎁</span><span>Free</span></div>'}
                        </div>

                        <p class="text-sm text-gray-600 mb-4 line-clamp-2">${event.description || 'No description available'}</p>

                        <div class="flex gap-2">
                            <button onclick="viewEvent(${event.id})"
                                    class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm">
                                View Details
                            </button>
                            ${!hasJoined && !isPast ? `
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

        grid.innerHTML = cardsHtml;
        console.log(`✅ [Events Panel] Rendered ${events.length} event cards`);
    }

    // ============================================
    // SEARCH FUNCTIONS
    // ============================================

    /**
     * Search past events
     * @param {string} searchTerm - Search term
     */
    window.searchPastEvents = function(searchTerm) {
        console.log(`🔍 [Events Panel] Searching past events: ${searchTerm}`);
        // TODO: Implement search filtering
    };

    /**
     * Search upcoming events
     * @param {string} searchTerm - Search term
     */
    window.searchUpcomingPanelEvents = function(searchTerm) {
        console.log(`🔍 [Events Panel] Searching upcoming events: ${searchTerm}`);
        // TODO: Implement search filtering
    };

    /**
     * Search joined events
     * @param {string} searchTerm - Search term
     */
    window.searchJoinedPanelEvents = function(searchTerm) {
        console.log(`🔍 [Events Panel] Searching joined events: ${searchTerm}`);
        // TODO: Implement search filtering
    };

    // ============================================
    // ACTION FUNCTIONS
    // ============================================

    /**
     * View event details
     * @param {number} eventId - Event ID
     */
    window.viewEvent = function(eventId) {
        console.log(`👁️ [Events Panel] View event: ${eventId}`);
        alert(`View event ${eventId} - Feature coming soon!`);
        // TODO: Implement event details modal or navigation
    };

    /**
     * Join an event
     * @param {number} eventId - Event ID
     */
    window.joinEvent = async function(eventId) {
        console.log(`➕ [Events Panel] Join event: ${eventId}`);

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                alert('Please log in to join events');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/join`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to join event`);
            }

            alert('Successfully joined the event!');

            // Refresh the current tab
            const activeTab = document.querySelector('.events-tab.text-blue-600');
            if (activeTab) {
                const tabName = activeTab.id.replace('-events-tab', '').replace('-events-panel-tab', '');
                switchEventsTab(tabName);
            }

        } catch (error) {
            console.error('Error joining event:', error);
            alert('Failed to join event. Please try again.');
        }
    };

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    /**
     * Get current user from localStorage
     */
    function getCurrentUser() {
        try {
            const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error parsing user from localStorage:', error);
            return null;
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    console.log('✅ Student Events Panel Manager loaded successfully');

})();
