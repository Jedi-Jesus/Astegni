// ============================================
// COMMUNITY MODAL MANAGER - Consolidated
// ============================================
// This file consolidates all community modal functionality:
// - Modal open/close
// - Section/tab switching
// - Database integration via CommunityManager
// - Search and filtering
// - Event handlers
// ============================================

(function() {
    'use strict';

    // ============================================
    // COMMUNITY MANAGER INSTANCE
    // ============================================
    let communityManager = null;

    // Initialize CommunityManager when DOM is ready
    document.addEventListener('DOMContentLoaded', function () {
        // CommunityManager class is defined in communityManager.js
        if (typeof CommunityManager !== 'undefined') {
            communityManager = new CommunityManager();
            window.communityManager = communityManager; // Make globally accessible
            console.log('✅ CommunityManager initialized for tutor profile');
        } else {
            console.error('❌ CommunityManager class not found! Make sure communityManager.js is loaded before this file.');
        }
    });

    // ============================================
    // MODAL CONTROL FUNCTIONS
    // ============================================

    /**
     * Open Community Modal
     * @param {string} section - Section to open ('all', 'connections', 'requests', 'events', 'clubs')
     */
    function openCommunityModal(section = 'connections') {
        const modal = document.getElementById('communityModal');
        if (!modal) {
            console.error('Community modal not found in DOM');
            return;
        }

        // Open modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        console.log(`🚀 Opening community modal - Section: ${section}`);

        // Switch to the specified section
        if (section) {
            switchCommunitySection(section);
        }
    }

    /**
     * Close Community Modal
     */
    function closeCommunityModal() {
        const modal = document.getElementById('communityModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            document.body.style.overflow = '';
            console.log('👋 Community modal closed');
        }
    }

    // ============================================
    // SECTION SWITCHING
    // ============================================

    /**
     * Switch Community Section (All, Requests, Connections, Events, Clubs)
     * @param {string} section - Section name to switch to
     */
    function switchCommunitySection(section) {
        console.log(`🔄 Switching to section: ${section}`);

        const modal = document.getElementById('communityModal');
        if (!modal) return;

        // Remove active class from all menu items
        const menuItems = document.querySelectorAll('.community-menu .menu-item');
        menuItems.forEach(item => item.classList.remove('active'));

        // Hide ALL sections first
        const sections = document.querySelectorAll('.community-section');
        sections.forEach(s => {
            s.classList.add('hidden');
            s.classList.remove('active');
            s.style.display = 'none';
        });

        // Remove section-specific classes from modal
        modal.classList.remove('events-active');

        // Add section-specific class for Events
        if (section === 'events') {
            modal.classList.add('events-active');
        }

        // Activate the selected menu item
        const activeMenuItem = document.querySelector(`.menu-item[onclick*="${section}"]`);
        if (activeMenuItem) {
            activeMenuItem.classList.add('active');
        }

        // Show ONLY the active section
        const activeSection = document.getElementById(`${section}-section`);
        if (activeSection) {
            activeSection.classList.remove('hidden');
            activeSection.classList.add('active');
            activeSection.style.display = 'flex';
            console.log(`✅ Section "${section}" is now visible`);
        } else {
            console.error(`❌ Section "${section}-section" not found in DOM`);
        }

        // Load data for the section using CommunityManager
        loadSectionData(section);
    }

    /**
     * Load data for a section using CommunityManager
     * @param {string} section - Section to load data for
     */
    function loadSectionData(section) {
        if (!communityManager) {
            console.warn('⚠️ CommunityManager not initialized yet');
            return;
        }

        switch (section) {
            case 'connections':
                communityManager.loadSectionGrid('connections', 'all');
                break;
            case 'requests':
                communityManager.loadRequestTab('received', 'all');
                break;
            case 'events':
                communityManager.loadSectionGrid('events', 'upcoming');
                break;
                case 'all':
                communityManager.loadSectionGrid('all', 'all');
                break;
            default:
                console.warn(`Unknown section: ${section}`);
        }
    }

    // ============================================
    // REQUEST TAB SWITCHING
    // ============================================

    /**
     * Switch Request Tab (Received/Sent)
     * @param {string} tab - 'received' or 'sent'
     */
    function switchRequestTab(tab) {
        console.log(`🔄 Switching to request tab: ${tab}`);

        // Update tab buttons - use inline styles since buttons use inline styling
        const tabBtns = document.querySelectorAll('.request-tab-btn');
        tabBtns.forEach(btn => {
            const isActive = btn.dataset.tab === tab;
            if (isActive) {
                btn.classList.add('active');
                btn.style.background = 'var(--button-bg)';
                btn.style.color = 'white';
                btn.style.border = 'none';
            } else {
                btn.classList.remove('active');
                btn.style.background = 'transparent';
                btn.style.color = 'var(--text)';
                btn.style.border = '1px solid rgba(var(--border-rgb), 0.3)';
            }
        });

        // Show/hide tab content - FIXED: Correct element IDs
        const receivedContent = document.getElementById('received-requests-content');
        const sentContent = document.getElementById('sent-requests-content');

        if (tab === 'received') {
            if (receivedContent) {
                receivedContent.classList.remove('hidden');
                console.log('✅ Showing received requests content');
            } else {
                console.error('❌ received-requests-content element not found');
            }
            if (sentContent) {
                sentContent.classList.add('hidden');
            }
        } else if (tab === 'sent') {
            if (sentContent) {
                sentContent.classList.remove('hidden');
                console.log('✅ Showing sent requests content');
            } else {
                console.error('❌ sent-requests-content element not found');
            }
            if (receivedContent) {
                receivedContent.classList.add('hidden');
            }
        }

        // Load data for the selected tab using CommunityManager
        if (communityManager) {
            communityManager.loadRequestTab(tab, 'all');
        } else {
            console.error('❌ CommunityManager not initialized');
        }
    }

    // ============================================
    // FILTER FUNCTIONS
    // ============================================

    /**
     * Filter community section by category (All/Students/Parents/Tutors)
     * @param {string} section - Section to filter ('all', 'connections', 'requests')
     * @param {string} category - Category to filter by ('all', 'students', 'parents', 'tutors')
     */
    function filterCommunity(section, category) {
        console.log(`🔍 Filtering ${section} by: ${category}`);

        // Update filter button active states
        const sectionElement = document.getElementById(`${section}-section`);
        if (sectionElement) {
            const filterBtns = sectionElement.querySelectorAll('.filter-btn');
            filterBtns.forEach(btn => {
                if (btn.dataset.filter === category) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // Load filtered data from database
        if (communityManager) {
            if (section === 'requests') {
                // For requests, we need to know which tab is active
                const activeTab = document.querySelector('.request-tab-btn.active');
                const tab = activeTab ? activeTab.dataset.tab : 'received';
                communityManager.loadRequestTab(tab, category);
            } else {
                communityManager.loadSectionGrid(section, category);
            }
        }
    }

    // ============================================
    // SEARCH FUNCTIONS
    // ============================================

    /**
     * Search connections in the current section
     * @param {string} section - Section to search in
     * @param {string} query - Search query
     */
    function searchConnections(section, query) {
        console.log(`🔎 Searching ${section} for: "${query}"`);

        if (communityManager) {
            communityManager.searchConnections(query, section);
        }
    }

    /**
     * Search in request tabs
     * @param {string} tab - 'received' or 'sent'
     * @param {string} query - Search query
     */
    function searchRequestTab(tab, query) {
        console.log(`🔎 Searching ${tab} requests for: "${query}"`);

        if (communityManager) {
            communityManager.searchRequestTab(tab, query);
        }
    }

    // ============================================
    // KEYBOARD SHORTCUTS
    // ============================================

    // Close modal on ESC key
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            const communityModal = document.getElementById('communityModal');
            if (communityModal && !communityModal.classList.contains('hidden')) {
                closeCommunityModal();
            }
        }
    });

    // ============================================
    // SIDEBAR NAVIGATION (Alternative naming for compatibility)
    // ============================================

    /**
     * Switch Community Main Section (Alternative function name for sidebar compatibility)
     * @param {string} sectionName - Section name to switch to
     */
    function switchCommunityMainSection(sectionName) {
        console.log(`🔄 Sidebar clicked: ${sectionName}`);
        // Just call the main switchCommunitySection function
        switchCommunitySection(sectionName);
    }

    // ============================================
    // FILTER FUNCTIONS (Specific names for each section)
    // ============================================

    /**
     * Filter connections by category (wrapper for filterCommunity)
     * @param {string} category - Category to filter by ('all', 'students', 'parents', 'tutors')
     */
    function filterConnectionsBy(category) {
        console.log(`🔍 Filtering connections by: ${category}`);
        filterCommunity('connections', category);
    }

    /**
     * Filter received requests by category
     * @param {string} category - Category to filter by
     */
    function filterReceivedRequestsBy(category) {
        console.log(`🔍 Filtering received requests by: ${category}`);
        filterCommunity('requests', category);
    }

    /**
     * Filter sent requests by category
     * @param {string} category - Category to filter by
     */
    function filterSentRequestsBy(category) {
        console.log(`🔍 Filtering sent requests by: ${category}`);
        filterCommunity('requests', category);
    }

    /**
     * Filter events by type
     * @param {string} filterType - Filter type ('all', 'joined', 'upcoming', 'past')
     */
    function filterEventsBy(filterType) {
        console.log(`🔍 Filtering events by: ${filterType}`);
        // Events filtering logic (to be implemented)
        if (communityManager) {
            communityManager.loadSectionGrid('events', filterType);
        }
    }

    // ============================================
    // SEARCH FUNCTIONS (Specific names for compatibility)
    // ============================================

    /**
     * Search received requests
     * @param {string} query - Search query
     */
    function searchReceivedRequests(query) {
        console.log(`🔎 Searching received requests: "${query}"`);
        searchRequestTab('received', query);
    }

    /**
     * Search sent requests
     * @param {string} query - Search query
     */
    function searchSentRequests(query) {
        console.log(`🔎 Searching sent requests: "${query}"`);
        searchRequestTab('sent', query);
    }

    /**
     * Search events
     * @param {string} query - Search query
     */
    function searchEvents(query) {
        console.log(`🔎 Searching events: "${query}"`);
        // Events search logic (to be implemented)
        if (communityManager) {
            communityManager.searchEvents && communityManager.searchEvents(query);
        }
    }

    // ============================================
    // GENERIC MODAL FUNCTIONS (for other modals)
    // ============================================

    /**
     * Open any modal by ID
     * @param {string} modalId - Modal element ID
     */
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Close any modal by ID
     * @param {string} modalId - Modal element ID
     */
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    // ============================================
    // UTILITY FUNCTIONS FOR PROFILE CARDS
    // ============================================

    /**
     * Open Community Modal with specific tab
     * Maps profile card clicks to the appropriate modal section and tab
     * @param {string} tab - Tab to open ('connections', 'pending', 'received')
     */
    function openCommunityModalTab(tab) {
        console.log(`🔗 Opening community modal tab: ${tab}`);

        // Map tab names to sections and request tabs
        const tabMapping = {
            'connections': { section: 'connections', requestTab: null },
            'pending': { section: 'requests', requestTab: 'sent' },  // Pending requests = Sent requests
            'received': { section: 'requests', requestTab: 'received' }  // Received requests
        };

        const mapping = tabMapping[tab];

        if (!mapping) {
            console.warn(`Unknown tab: ${tab}, opening connections by default`);
            openCommunityModal('connections');
            return;
        }

        // Open the modal with the appropriate section
        openCommunityModal(mapping.section);

        // If it's a request section, switch to the specific request tab
        if (mapping.requestTab) {
            // Small delay to ensure modal is fully opened before switching tabs
            setTimeout(() => {
                switchRequestTab(mapping.requestTab);
            }, 100);
        }
    }

    // ============================================
    // EXPORT TO WINDOW (for HTML onclick handlers)
    // ============================================

    // Community Modal Functions
    window.openCommunityModal = openCommunityModal;
    window.openCommunityModalTab = openCommunityModalTab;
    window.closeCommunityModal = closeCommunityModal;
    window.switchCommunitySection = switchCommunitySection;
    window.switchCommunityMainSection = switchCommunityMainSection; // Sidebar compatibility
    window.switchRequestTab = switchRequestTab;
    window.filterCommunity = filterCommunity;
    window.searchConnections = searchConnections;
    window.searchRequestTab = searchRequestTab;

    // Filter Functions (specific names for HTML onclick handlers)
    window.filterConnectionsBy = filterConnectionsBy;
    window.filterReceivedRequestsBy = filterReceivedRequestsBy;
    window.filterSentRequestsBy = filterSentRequestsBy;
    window.filterEventsBy = filterEventsBy;

    // Search Functions (specific names for HTML onclick handlers)
    window.searchReceivedRequests = searchReceivedRequests;
    window.searchSentRequests = searchSentRequests;
    window.searchEvents = searchEvents;

    // Generic Modal Functions
    window.openModal = openModal;
    window.closeModal = closeModal;

    // Make CommunityManager instance accessible
    window.getCommunityManager = function() {
        return communityManager;
    };

    console.log('✅ Community Modal Manager loaded successfully');

})();
