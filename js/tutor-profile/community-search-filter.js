// ============================================
// COMMUNITY PANEL - SEARCH & FILTER FUNCTIONS
// ============================================
// Handles all search and filter functionality for community panel
// ============================================

(function() {
    'use strict';

    console.log('🔍 Community Search & Filter loading...');

    // Store current data for filtering
    let currentConnectionsData = [];
    let currentSentRequestsData = [];
    let currentReceivedRequestsData = [];

    // ============================================
    // CONNECTIONS SEARCH FUNCTIONS
    // ============================================

    window.searchAllConnections = function(query) {
        console.log(`🔍 Searching all connections: "${query}"`);
        const grid = document.getElementById('all-connections-grid');
        if (!grid || !currentConnectionsData.length) return;

        filterAndDisplayConnections(grid, currentConnectionsData, query);
    };

    window.searchStudentConnections = function(query) {
        console.log(`🔍 Searching student connections: "${query}"`);
        const grid = document.getElementById('student-connections-grid');
        if (!grid || !currentConnectionsData.length) return;

        const students = currentConnectionsData.filter(conn => {
            const roles = conn.requester_roles || conn.recipient_roles || [];
            return roles.includes('student');
        });

        filterAndDisplayConnections(grid, students, query);
    };

    window.searchParentConnections = function(query) {
        console.log(`🔍 Searching parent connections: "${query}"`);
        const grid = document.getElementById('parent-connections-grid');
        if (!grid || !currentConnectionsData.length) return;

        const parents = currentConnectionsData.filter(conn => {
            const roles = conn.requester_roles || conn.recipient_roles || [];
            return roles.includes('parent');
        });

        filterAndDisplayConnections(grid, parents, query);
    };

    window.searchTutorConnections = function(query) {
        console.log(`🔍 Searching tutor connections: "${query}"`);
        const grid = document.getElementById('tutor-connections-grid');
        if (!grid || !currentConnectionsData.length) return;

        const tutors = currentConnectionsData.filter(conn => {
            const roles = conn.requester_roles || conn.recipient_roles || [];
            return roles.includes('tutor');
        });

        filterAndDisplayConnections(grid, tutors, query);
    };

    function filterAndDisplayConnections(grid, connections, query) {
        if (!query || query.trim() === '') {
            // Show all if no query
            renderConnectionCards(grid, connections);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const filtered = connections.filter(conn => {
            const name = (conn.requester_name || conn.recipient_name || '').toLowerCase();
            const email = (conn.requester_email || conn.recipient_email || '').toLowerCase();
            return name.includes(lowerQuery) || email.includes(lowerQuery);
        });

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center p-12">
                    <div class="text-gray-400 text-6xl mb-4">🔍</div>
                    <h3 class="text-xl font-semibold text-gray-700 mb-2">No results found</h3>
                    <p class="text-gray-500">Try different keywords</p>
                </div>
            `;
        } else {
            renderConnectionCards(grid, filtered);
        }

        console.log(`✅ Filtered ${filtered.length} connections from ${connections.length}`);
    }

    // Helper to render connection cards (calls the function from community-panel-manager.js)
    function renderConnectionCards(grid, connections) {
        // This will be handled by the main community-panel-manager.js
        // For now, just show count
        grid.innerHTML = `<div class="col-span-full text-center p-4">Found ${connections.length} connections</div>`;
    }

    // ============================================
    // REQUESTS FILTER FUNCTIONS
    // ============================================

    window.filterSentRequests = function(status) {
        console.log(`🔍 Filtering sent requests by status: "${status}"`);

        // Update active tab
        const tabs = document.querySelectorAll('.sent-requests-status-tab');
        tabs.forEach(tab => {
            if (tab.getAttribute('data-status') === status) {
                tab.classList.add('border-blue-600', 'text-blue-600');
                tab.classList.remove('border-transparent', 'text-gray-600');
            } else {
                tab.classList.remove('border-blue-600', 'text-blue-600');
                tab.classList.add('border-transparent', 'text-gray-600');
            }
        });

        const list = document.getElementById('sent-requests-list');
        if (!list || !currentSentRequestsData.length) return;

        if (status === 'all') {
            renderRequestCards(list, currentSentRequestsData, 'sent');
        } else {
            const filtered = currentSentRequestsData.filter(req => req.status === status);
            renderRequestCards(list, filtered, 'sent');
            console.log(`✅ Filtered ${filtered.length} sent requests with status: ${status}`);
        }
    };

    window.filterReceivedRequests = function(status) {
        console.log(`🔍 Filtering received requests by status: "${status}"`);

        // Update active tab
        const tabs = document.querySelectorAll('.received-requests-status-tab');
        tabs.forEach(tab => {
            if (tab.getAttribute('data-status') === status) {
                tab.classList.add('border-green-600', 'text-green-600');
                tab.classList.remove('border-transparent', 'text-gray-600');
            } else {
                tab.classList.remove('border-green-600', 'text-green-600');
                tab.classList.add('border-transparent', 'text-gray-600');
            }
        });

        const list = document.getElementById('received-requests-list');
        if (!list || !currentReceivedRequestsData.length) return;

        if (status === 'all') {
            renderRequestCards(list, currentReceivedRequestsData, 'received');
        } else {
            const filtered = currentReceivedRequestsData.filter(req => req.status === status);
            renderRequestCards(list, filtered, 'received');
            console.log(`✅ Filtered ${filtered.length} received requests with status: ${status}`);
        }
    };

    // Helper to render request cards
    function renderRequestCards(container, requests, type) {
        // This will be handled by the main community-panel-manager.js
        // For now, just show count
        container.innerHTML = `<div class="text-center p-4">Found ${requests.length} ${type} requests</div>`;
    }

    // ============================================
    // EVENTS SEARCH FUNCTIONS
    // ============================================

    window.searchAllEvents = function(query) {
        console.log(`🔍 Searching all events: "${query}"`);
        // Placeholder for events search
        alert('Event search coming soon!');
    };

    window.searchUpcomingEvents = function(query) {
        console.log(`🔍 Searching upcoming events: "${query}"`);
        alert('Event search coming soon!');
    };

    window.searchPastEvents = function(query) {
        console.log(`🔍 Searching past events: "${query}"`);
        alert('Event search coming soon!');
    };

    // ============================================
    // CLUBS SEARCH FUNCTIONS
    // ============================================

    window.searchAllClubs = function(query) {
        console.log(`🔍 Searching all clubs: "${query}"`);
        alert('Club search coming soon!');
    };

    window.searchJoinedClubs = function(query) {
        console.log(`🔍 Searching joined clubs: "${query}"`);
        alert('Club search coming soon!');
    };

    window.searchDiscoverClubs = function(query) {
        console.log(`🔍 Searching discover clubs: "${query}"`);
        alert('Club search coming soon!');
    };

    // ============================================
    // DATA STORAGE (for filtering)
    // ============================================

    /**
     * Store connections data for search/filter
     */
    window.storeConnectionsData = function(data) {
        currentConnectionsData = data;
        console.log(`📦 Stored ${data.length} connections for searching`);
    };

    /**
     * Store sent requests data for filtering
     */
    window.storeSentRequestsData = function(data) {
        currentSentRequestsData = data;
        console.log(`📦 Stored ${data.length} sent requests for filtering`);
    };

    /**
     * Store received requests data for filtering
     */
    window.storeReceivedRequestsData = function(data) {
        currentReceivedRequestsData = data;
        console.log(`📦 Stored ${data.length} received requests for filtering`);
    };

    console.log('✅ Community Search & Filter loaded successfully');

})();
