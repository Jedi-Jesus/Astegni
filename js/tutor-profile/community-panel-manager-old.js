// ============================================
// TUTOR COMMUNITY PANEL MANAGER
// ============================================
// This file manages the community panel for tutor profiles
// - Integrates with CommunityManager for database operations
// - Handles main tab switching (Connections, Requests, Events, Clubs)
// - Loads data on panel switch and tab clicks
// ============================================

(function() {
    'use strict';

    console.log('🚀 Tutor Community Panel Manager loading...');

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
            activeCard.style.transform = 'translateY(-4px)';
            activeCard.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15)';
            console.log(`✅ [Tutor Panel] Activated ${section}-main-tab card`);
        }

        // Load data for the selected section using CommunityManager
        loadDataForSection(section);
    };

    /**
     * Load data for a specific section using CommunityManager
     * @param {string} section - Section name
     */
    function loadDataForSection(section) {
        console.log(`📊 [Tutor Panel] Loading data for section: ${section}`);

        // Check if CommunityManager is available
        if (!window.communityManager) {
            console.error('❌ [Tutor Panel] CommunityManager not initialized');
            return;
        }

        switch (section) {
            case 'connections':
                // Load accepted connections (status='accepted')
                console.log('📥 [Tutor Panel] Loading connections (status=accepted)...');
                window.communityManager.loadSectionGrid('connections', 'all');
                break;

            case 'requests':
                // Load pending requests - default to "received" tab (status='pending', direction='incoming')
                console.log('📥 [Tutor Panel] Loading requests (received tab, status=pending, direction=incoming)...');
                switchRequestsTab('received');
                break;

            case 'events':
                // Load events from events table
                console.log('📥 [Tutor Panel] Loading events from database...');
                window.communityManager.loadSectionGrid('events');
                break;

            case 'clubs':
                // Load clubs from clubs table
                console.log('📥 [Tutor Panel] Loading clubs from database...');
                window.communityManager.loadSectionGrid('clubs');
                break;

            default:
                console.warn(`⚠️ [Tutor Panel] Unknown section: ${section}`);
        }
    }

    // ============================================
    // REQUESTS TAB SWITCHING (Received/Sent)
    // ============================================

    /**
     * Switch Requests Tab (Received/Sent)
     * @param {string} tab - 'received' or 'sent'
     */
    window.switchRequestsTab = function(tab) {
        console.log(`🔄 [Tutor Panel] Switching requests tab to: ${tab}`);

        // Update tab button active states
        const receivedBtn = document.getElementById('received-requests-tab');
        const sentBtn = document.getElementById('sent-requests-tab');

        if (receivedBtn && sentBtn) {
            if (tab === 'received') {
                receivedBtn.classList.add('active');
                receivedBtn.classList.add('bg-blue-600', 'text-white');
                receivedBtn.classList.remove('bg-transparent', 'text-gray-700');
                sentBtn.classList.remove('active');
                sentBtn.classList.remove('bg-blue-600', 'text-white');
                sentBtn.classList.add('bg-transparent', 'text-gray-700');
            } else {
                sentBtn.classList.add('active');
                sentBtn.classList.add('bg-blue-600', 'text-white');
                sentBtn.classList.remove('bg-transparent', 'text-gray-700');
                receivedBtn.classList.remove('active');
                receivedBtn.classList.remove('bg-blue-600', 'text-white');
                receivedBtn.classList.add('bg-transparent', 'text-gray-700');
            }
        }

        // Show/hide tab content sections
        const receivedContent = document.getElementById('received-requests-content');
        const sentContent = document.getElementById('sent-requests-content');

        if (receivedContent && sentContent) {
            if (tab === 'received') {
                receivedContent.classList.remove('hidden');
                sentContent.classList.add('hidden');
                console.log('✅ [Tutor Panel] Showing received requests content');
            } else {
                sentContent.classList.remove('hidden');
                receivedContent.classList.add('hidden');
                console.log('✅ [Tutor Panel] Showing sent requests content');
            }
        } else {
            console.error('❌ [Tutor Panel] Requests content elements not found');
        }

        // Load data for the selected tab using CommunityManager
        if (window.communityManager) {
            if (tab === 'received') {
                console.log('📥 [Tutor Panel] Loading received requests (status=pending, direction=incoming)...');
                window.communityManager.loadRequestTab('received', 'all');
            } else {
                console.log('📥 [Tutor Panel] Loading sent requests (status=pending, direction=outgoing)...');
                window.communityManager.loadRequestTab('sent', 'all');
            }
        } else {
            console.error('❌ [Tutor Panel] CommunityManager not initialized');
        }
    };

    // ============================================
    // FILTER FUNCTIONS
    // ============================================

    /**
     * Filter connections by category (All/Students/Parents/Tutors)
     * @param {string} category - Category to filter by
     */
    window.filterConnectionsBy = function(category) {
        console.log(`🔍 [Tutor Panel] Filtering connections by: ${category}`);

        // Update filter button active states
        updateFilterButtons('connections-main-tab-content', category);

        // Load filtered data from database
        if (window.communityManager) {
            window.communityManager.loadSectionGrid('connections', category);
        } else {
            console.error('❌ [Tutor Panel] CommunityManager not initialized');
        }
    };

    /**
     * Filter received requests by category
     * @param {string} category - Category to filter by
     */
    window.filterReceivedRequestsBy = function(category) {
        console.log(`🔍 [Tutor Panel] Filtering received requests by: ${category}`);

        // Update filter button active states
        updateFilterButtons('received-requests-content', category);

        // Load filtered data from database
        if (window.communityManager) {
            window.communityManager.loadRequestTab('received', category);
        } else {
            console.error('❌ [Tutor Panel] CommunityManager not initialized');
        }
    };

    /**
     * Filter sent requests by category
     * @param {string} category - Category to filter by
     */
    window.filterSentRequestsBy = function(category) {
        console.log(`🔍 [Tutor Panel] Filtering sent requests by: ${category}`);

        // Update filter button active states
        updateFilterButtons('sent-requests-content', category);

        // Load filtered data from database
        if (window.communityManager) {
            window.communityManager.loadRequestTab('sent', category);
        } else {
            console.error('❌ [Tutor Panel] CommunityManager not initialized');
        }
    };

    /**
     * Update filter button active states
     * @param {string} containerId - Container element ID
     * @param {string} activeCategory - Active category
     */
    function updateFilterButtons(containerId, activeCategory) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const filterBtns = container.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            if (btn.dataset.filter === activeCategory) {
                btn.classList.add('active');
                btn.classList.add('bg-blue-600', 'text-white');
                btn.classList.remove('bg-transparent', 'text-gray-700');
            } else {
                btn.classList.remove('active');
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-transparent', 'text-gray-700');
            }
        });
    }

    // ============================================
    // SEARCH FUNCTIONS
    // ============================================

    /**
     * Search connections
     * @param {Event} event - Input event
     */
    window.searchConnections = function(event) {
        const query = event.target.value;
        console.log(`🔎 [Tutor Panel] Searching connections: "${query}"`);

        if (window.communityManager) {
            window.communityManager.searchConnections(query, 'connections');
        }
    };

    /**
     * Search received requests
     * @param {Event} event - Input event
     */
    window.searchReceivedRequests = function(event) {
        const query = event.target.value;
        console.log(`🔎 [Tutor Panel] Searching received requests: "${query}"`);

        if (window.communityManager) {
            window.communityManager.searchRequestTab('received', query);
        }
    };

    /**
     * Search sent requests
     * @param {Event} event - Input event
     */
    window.searchSentRequests = function(event) {
        const query = event.target.value;
        console.log(`🔎 [Tutor Panel] Searching sent requests: "${query}"`);

        if (window.communityManager) {
            window.communityManager.searchRequestTab('sent', query);
        }
    };

    // ============================================
    // REQUESTS SUB-SECTION FUNCTIONS
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

        // Load data for the subsection using CommunityManager
        if (window.communityManager) {
            if (subsection === 'sent') {
                window.communityManager.loadSentRequests();
            } else if (subsection === 'received') {
                window.communityManager.loadReceivedRequests();
            }
        }
    };

    // ============================================
    // INITIALIZATION
    // ============================================

    // When the community panel is opened via sidebar, load connections by default
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ [Tutor Panel] Community Panel Manager initialized');

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

    console.log('✅ Tutor Community Panel Manager loaded successfully');

})();
