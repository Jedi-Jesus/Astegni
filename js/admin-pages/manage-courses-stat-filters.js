// manage-courses-stat-filters.js - Click-to-Filter from Statistics Cards
// Implements navigation and filtering when stats cards are clicked

(function() {
    'use strict';

    // ============================================
    // FILTER STATE MANAGEMENT
    // ============================================

    // Store active filters for each panel
    window.statFilters = {
        requested: {
            status: null,  // 'new' or 'under_review'
            category: null,
            level: null
        },
        verified: {
            category: null,
            level: null,
            rating: null
        }
    };

    // ============================================
    // DASHBOARD STATS CLICK HANDLERS
    // ============================================

    /**
     * Navigate to panel when dashboard stat is clicked
     */
    window.navigateFromDashboardStat = function(statType) {
        console.log('Navigating from dashboard stat:', statType);

        switch(statType) {
            case 'active':
                window.switchPanel('verified');
                clearPanelFilters('verified');
                break;

            case 'pending':
                window.switchPanel('requested');
                clearPanelFilters('requested');
                break;

            case 'rejected':
                window.switchPanel('rejected');
                break;

            case 'suspended':
                window.switchPanel('suspended');
                break;

            default:
                console.warn('Unknown stat type:', statType);
        }
    };

    // ============================================
    // REQUESTED PANEL - STATUS FILTERS
    // ============================================

    /**
     * Filter requested courses by status
     */
    window.filterRequestedByStatus = function(status) {
        console.log('Filtering requested courses by status:', status);

        // Set active filter
        window.statFilters.requested.status = status;

        // Apply filter
        applyRequestedStatusFilter(status);

        // Visual feedback
        highlightActiveStatCard('requested', status);
    };

    /**
     * Apply status filter to requested courses table
     */
    function applyRequestedStatusFilter(status) {
        const tbody = document.querySelector('#requested-panel table tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        let visibleCount = 0;

        rows.forEach(row => {
            // Skip empty state rows
            if (row.querySelector('[colspan]')) {
                row.style.display = 'none';
                return;
            }

            // Get course data
            const requestId = row.querySelector('.text-sm.text-gray-500')?.textContent.replace('ID: ', '').trim();

            if (!requestId) {
                row.style.display = '';
                return;
            }

            // Fetch course status from API or check badge
            const statusBadge = row.querySelector('.px-3.py-1.rounded-full');
            let courseStatus = 'new'; // default

            if (statusBadge) {
                const badgeText = statusBadge.textContent.trim().toLowerCase();
                if (badgeText.includes('under review')) {
                    courseStatus = 'under_review';
                } else if (badgeText.includes('new')) {
                    courseStatus = 'new';
                }
            }

            // Apply filter
            if (status === null || courseStatus === status) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // Update filtered count
        updateFilteredCountDisplay('requested', visibleCount);
    }

    // ============================================
    // VERIFIED PANEL - CATEGORY/RATING FILTERS
    // ============================================

    /**
     * Filter active courses by category
     */
    window.filterVerifiedByCategory = function(category) {
        console.log('Filtering active courses by category:', category);

        // Set active filter
        window.statFilters.verified.category = category;

        // Apply filter
        applyVerifiedCategoryFilter(category);

        // Visual feedback
        highlightActiveStatCard('verified', 'category-' + category);
    };

    /**
     * Apply category filter to verified courses table
     */
    function applyVerifiedCategoryFilter(category) {
        const tbody = document.querySelector('#verified-panel table tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        let visibleCount = 0;

        rows.forEach(row => {
            // Skip empty state rows
            if (row.querySelector('[colspan]')) {
                row.style.display = 'none';
                return;
            }

            const cells = row.querySelectorAll('td');
            if (cells.length < 2) {
                row.style.display = '';
                return;
            }

            const courseCategory = cells[1]?.textContent.trim(); // Category is in 2nd column

            // Apply filter
            if (category === null || courseCategory === category) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // Update filtered count
        updateFilteredCountDisplay('verified', visibleCount);
    }

    // ============================================
    // CLEAR FILTERS
    // ============================================

    /**
     * Clear all filters for a panel
     */
    window.clearPanelFilters = function(panelName) {
        console.log('Clearing filters for panel:', panelName);

        if (panelName === 'requested') {
            window.statFilters.requested.status = null;
            applyRequestedStatusFilter(null);
        } else if (panelName === 'verified') {
            window.statFilters.verified.category = null;
            applyVerifiedCategoryFilter(null);
        }

        // Remove highlight from all stat cards
        removeAllStatCardHighlights(panelName);

        // Update display
        updateFilteredCountDisplay(panelName, null);
    };

    // ============================================
    // VISUAL FEEDBACK
    // ============================================

    /**
     * Highlight the active stat card
     */
    function highlightActiveStatCard(panelName, filterKey) {
        // Remove existing highlights
        removeAllStatCardHighlights(panelName);

        // Add highlight to clicked card
        const panelSelector = `#${panelName}-panel .dashboard-grid`;
        const statsGrid = document.querySelector(panelSelector);
        if (!statsGrid) return;

        const statCards = statsGrid.querySelectorAll('.card.p-4');
        statCards.forEach(card => {
            const heading = card.querySelector('h3');
            if (!heading) return;

            const cardText = heading.textContent.trim().toLowerCase();

            // Match filter to card
            let shouldHighlight = false;
            if (filterKey === 'new' && cardText.includes('new requests')) {
                shouldHighlight = true;
            } else if (filterKey === 'under_review' && cardText.includes('under review')) {
                shouldHighlight = true;
            } else if (filterKey === 'category-Academic' && cardText.includes('academic')) {
                shouldHighlight = true;
            } else if (filterKey === 'category-Professional' && cardText.includes('professional')) {
                shouldHighlight = true;
            }

            if (shouldHighlight) {
                card.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
                card.style.transform = 'scale(1.02)';
                card.style.transition = 'all 0.2s ease';
            }
        });
    }

    /**
     * Remove all stat card highlights
     */
    function removeAllStatCardHighlights(panelName) {
        const panelSelector = `#${panelName}-panel .dashboard-grid`;
        const statsGrid = document.querySelector(panelSelector);
        if (!statsGrid) return;

        const statCards = statsGrid.querySelectorAll('.card.p-4');
        statCards.forEach(card => {
            card.style.boxShadow = '';
            card.style.transform = '';
        });
    }

    /**
     * Update filtered count display
     */
    function updateFilteredCountDisplay(panelName, count) {
        const panelSelector = `#${panelName}-panel`;
        const panel = document.querySelector(panelSelector);
        if (!panel) return;

        // Find or create filter indicator
        let filterIndicator = panel.querySelector('.filter-indicator');

        if (count === null || count === undefined) {
            // Remove indicator if no filter
            if (filterIndicator) {
                filterIndicator.remove();
            }
            return;
        }

        if (!filterIndicator) {
            // Create indicator
            filterIndicator = document.createElement('div');
            filterIndicator.className = 'filter-indicator bg-blue-100 border-l-4 border-blue-500 p-4 mb-4';
            filterIndicator.style.display = 'flex';
            filterIndicator.style.justifyContent = 'space-between';
            filterIndicator.style.alignItems = 'center';

            // Insert before table
            const table = panel.querySelector('.card.overflow-hidden');
            if (table) {
                table.parentNode.insertBefore(filterIndicator, table);
            }
        }

        filterIndicator.innerHTML = `
            <div>
                <strong>Filter Active:</strong> Showing ${count} results
            </div>
            <button onclick="clearPanelFilters('${panelName}')" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Clear Filter
            </button>
        `;
    }

    // ============================================
    // MAKE STAT CARDS CLICKABLE
    // ============================================

    /**
     * Initialize stat card click handlers
     */
    function initializeStatCardClickHandlers() {
        console.log('Initializing stat card click handlers...');

        // Dashboard stats
        addDashboardStatClickHandlers();

        // Panel-specific stats (when panel changes)
        document.addEventListener('panelChanged', function(event) {
            const panelName = event.detail.panelName;
            if (panelName === 'requested') {
                addRequestedPanelStatClickHandlers();
            } else if (panelName === 'verified') {
                addVerifiedPanelStatClickHandlers();
            }
        });

        // Initial load for current panel
        const activePanel = document.querySelector('.panel-content.active');
        if (activePanel && activePanel.id === 'requested-panel') {
            addRequestedPanelStatClickHandlers();
        } else if (activePanel && activePanel.id === 'verified-panel') {
            addVerifiedPanelStatClickHandlers();
        }
    }

    /**
     * Add click handlers to dashboard stats
     */
    function addDashboardStatClickHandlers() {
        const dashboardStats = document.querySelectorAll('#dashboard-panel .dashboard-grid .card.p-4');

        dashboardStats.forEach(card => {
            const heading = card.querySelector('h3');
            if (!heading) return;

            const statName = heading.textContent.trim().toLowerCase();

            // Make clickable
            card.style.cursor = 'pointer';
            card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';

            // Hover effect
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
                card.style.boxShadow = '';
            });

            // Click handler
            card.addEventListener('click', () => {
                if (statName.includes('active courses')) {
                    navigateFromDashboardStat('active');
                } else if (statName.includes('pending')) {
                    navigateFromDashboardStat('pending');
                } else if (statName.includes('rejected')) {
                    navigateFromDashboardStat('rejected');
                } else if (statName.includes('suspended')) {
                    navigateFromDashboardStat('suspended');
                }
            });
        });
    }

    /**
     * Add click handlers to requested panel stats
     */
    function addRequestedPanelStatClickHandlers() {
        const requestedStats = document.querySelectorAll('#requested-panel .dashboard-grid .card.p-4');

        requestedStats.forEach(card => {
            const heading = card.querySelector('h3');
            if (!heading) return;

            const statName = heading.textContent.trim().toLowerCase();

            // Make clickable
            card.style.cursor = 'pointer';
            card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';

            // Hover effect
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            });

            card.addEventListener('mouseleave', () => {
                if (!card.style.boxShadow.includes('rgba(59')) { // Don't remove if highlighted
                    card.style.transform = '';
                    card.style.boxShadow = '';
                }
            });

            // Click handler
            card.addEventListener('click', () => {
                if (statName.includes('new requests')) {
                    filterRequestedByStatus('new');
                } else if (statName.includes('under review')) {
                    filterRequestedByStatus('under_review');
                } else if (statName.includes('rejected')) {
                    navigateFromDashboardStat('rejected');
                } else if (statName.includes('approved today')) {
                    // Approved today is informational, just clear filter to show all
                    clearPanelFilters('requested');
                }
            });
        });
    }

    /**
     * Add click handlers to verified panel stats
     */
    function addVerifiedPanelStatClickHandlers() {
        const verifiedStats = document.querySelectorAll('#verified-panel .dashboard-grid .card.p-4');

        verifiedStats.forEach(card => {
            const heading = card.querySelector('h3');
            if (!heading) return;

            const statName = heading.textContent.trim().toLowerCase();

            // Make clickable
            card.style.cursor = 'pointer';
            card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';

            // Hover effect
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            });

            card.addEventListener('mouseleave', () => {
                if (!card.style.boxShadow.includes('rgba(59')) {
                    card.style.transform = '';
                    card.style.boxShadow = '';
                }
            });

            // Click handler
            card.addEventListener('click', () => {
                if (statName.includes('total active')) {
                    clearPanelFilters('verified');
                } else if (statName.includes('academic')) {
                    filterVerifiedByCategory('Academic');
                } else if (statName.includes('professional')) {
                    filterVerifiedByCategory('Professional');
                } else if (statName.includes('average rating')) {
                    // Rating is informational, just clear filter
                    clearPanelFilters('verified');
                }
            });
        });
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    document.addEventListener('DOMContentLoaded', function() {
        if (window.location.href.includes('manage-courses.html')) {
            console.log('Initializing Stat Filters Module...');
            setTimeout(() => {
                initializeStatCardClickHandlers();
            }, 1000);
        }
    });

    // Expose functions globally
    window.StatFilters = {
        filterRequestedByStatus: filterRequestedByStatus,
        filterVerifiedByCategory: filterVerifiedByCategory,
        clearPanelFilters: clearPanelFilters,
        navigateFromDashboardStat: navigateFromDashboardStat
    };

})();
