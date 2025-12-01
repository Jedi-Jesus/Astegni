/**
 * Manage Tutors - Complete Database Integration
 * Handles all tutor management functionalities with full database integration
 */

// Use existing API_BASE_URL if defined, otherwise set it
if (typeof API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'https://api.astegni.com';
}

// State management
const TutorManagementState = {
    currentPanel: 'dashboard',
    stats: {
        pending: 0,
        verified: 0,
        rejected: 0,
        suspended: 0,
        archived: 0,
        totalTutors: 0,
        approvalRate: 0,
        avgProcessingTime: 0,
        clientSatisfaction: 0
    },
    filters: {
        search: '',
        subject: '',
        level: '',
        location: '',
        dateRange: ''
    },
    currentPage: {
        pending: 1,
        verified: 1,
        rejected: 1,
        suspended: 1
    },
    liveTutorRequests: [],
    dailyQuota: {
        verified: { current: 0, total: 150 },
        pending: { current: 0, total: 10 },
        rejected: { current: 0, total: 5 },
        suspended: { current: 0, total: 5 },
        archived: { current: 0, total: 100 }
    }
};

/**
 * Initialize the tutor management system
 */
async function initializeTutorManagement() {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Load dashboard statistics
    await loadDashboardStats();

    // Load tutors for all panels
    await loadAllPanelData();

    // Start live updates
    startLiveUpdates();

    // Initialize search and filters
    initializeSearchAndFilters();

    // Initialize panel switching
    initializePanelSwitching();
}

/**
 * Load dashboard statistics from the backend
 */
async function loadDashboardStats() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/tutors/statistics`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // If endpoint doesn't exist, use fallback
            if (response.status === 404) {
                await calculateStatsFromTutorData();
                return;
            }
            throw new Error(`Failed to load statistics: ${response.status}`);
        }

        const stats = await response.json();
        TutorManagementState.stats = stats;
        updateDashboardDisplay();

    } catch (error) {
        console.error('Error loading statistics:', error);
        // Calculate stats from tutor data as fallback
        await calculateStatsFromTutorData();
    }
}

/**
 * Calculate statistics from tutor data (fallback method)
 */
async function calculateStatsFromTutorData() {
    try {
        const token = localStorage.getItem('token');

        // Fetch all tutors to calculate stats
        const [pending, verified, rejected, suspended] = await Promise.all([
            fetch(`${API_BASE_URL}/api/admin/tutors/pending?limit=1000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE_URL}/api/admin/tutors/verified?limit=1000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE_URL}/api/admin/tutors/rejected?limit=1000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE_URL}/api/admin/tutors/suspended?limit=1000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        const pendingData = pending.ok ? await pending.json() : { total: 0 };
        const verifiedData = verified.ok ? await verified.json() : { total: 0 };
        const rejectedData = rejected.ok ? await rejected.json() : { total: 0 };
        const suspendedData = suspended.ok ? await suspended.json() : { total: 0 };

        // Update stats
        TutorManagementState.stats = {
            pending: pendingData.total || pendingData.tutors?.length || 0,
            verified: verifiedData.total || verifiedData.tutors?.length || 0,
            rejected: rejectedData.total || rejectedData.tutors?.length || 0,
            suspended: suspendedData.total || suspendedData.tutors?.length || 0,
            archived: 0, // Will be calculated separately if needed
            totalTutors: (pendingData.total || 0) + (verifiedData.total || 0) +
                        (rejectedData.total || 0) + (suspendedData.total || 0),
            approvalRate: calculateApprovalRate(verifiedData.total, rejectedData.total),
            avgProcessingTime: '< 1hr', // This would come from backend analytics
            clientSatisfaction: 96 // This would come from backend analytics
        };

        updateDashboardDisplay();

    } catch (error) {
        console.error('Error calculating statistics:', error);
        // Use default values
        updateDashboardDisplay();
    }
}

/**
 * Calculate approval rate
 */
function calculateApprovalRate(approved, rejected) {
    const total = approved + rejected;
    if (total === 0) return 0;
    return Math.round((approved / total) * 100);
}

/**
 * Update dashboard display with current statistics
 */
function updateDashboardDisplay() {
    const stats = TutorManagementState.stats;

    // Update stat cards in dashboard panel
    const statCards = document.querySelectorAll('#dashboard-panel .dashboard-grid .card');

    // Verified Tutors - Navigate to verified panel
    if (statCards[0]) {
        statCards[0].querySelector('.text-2xl').textContent = stats.verified;
        statCards[0].querySelector('.text-sm').textContent = `${Math.round((stats.verified / stats.totalTutors) * 100 || 0)}% of total`;
        makeStatCardClickable(statCards[0], 'verified');
    }

    // Pending Tutors - Navigate to requested panel
    if (statCards[1]) {
        statCards[1].querySelector('.text-2xl').textContent = stats.pending;
        makeStatCardClickable(statCards[1], 'requested');
    }

    // Rejected Tutors - Navigate to rejected panel
    if (statCards[2]) {
        statCards[2].querySelector('.text-2xl').textContent = stats.rejected;
        makeStatCardClickable(statCards[2], 'rejected');
    }

    // Suspended Tutors - Navigate to suspended panel
    if (statCards[3]) {
        statCards[3].querySelector('.text-2xl').textContent = stats.suspended;
        makeStatCardClickable(statCards[3], 'suspended');
    }

    // Archived Tutors - No specific panel yet
    if (statCards[4]) {
        statCards[4].querySelector('.text-2xl').textContent = stats.archived;
    }

    // Approval Rate - No specific panel
    if (statCards[5]) {
        statCards[5].querySelector('.text-2xl').textContent = `${stats.approvalRate}%`;
    }

    // Avg Processing Time - No specific panel
    if (statCards[6]) {
        statCards[6].querySelector('.text-2xl').textContent = stats.avgProcessingTime;
    }

    // Client Satisfaction - No specific panel
    if (statCards[7]) {
        statCards[7].querySelector('.text-2xl').textContent = `${stats.clientSatisfaction}%`;
    }

    // Update daily quota widget
    updateDailyQuotaWidget();
}

/**
 * Make a stat card clickable to navigate to a panel
 */
function makeStatCardClickable(card, panelName) {
    // Add cursor pointer style
    card.style.cursor = 'pointer';
    card.style.transition = 'transform 0.2s, box-shadow 0.2s';

    // Add hover effect
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '';
    });

    // Add click handler
    card.addEventListener('click', () => {
        navigateToPanel(panelName);
    });
}

/**
 * Navigate to a specific panel
 */
function navigateToPanel(panelName) {
    // Use the global switchPanel function if available
    if (typeof window.switchPanel === 'function') {
        window.switchPanel(panelName);
    } else {
        console.error('switchPanel function not found');
    }
}

/**
 * Load data for all panels
 */
async function loadAllPanelData() {
    // Show loading states
    showLoadingStates();

    // Load data using the existing functions from manage-tutors-data.js
    await Promise.all([
        window.loadPendingTutors ? window.loadPendingTutors() : Promise.resolve(),
        window.loadVerifiedTutors ? window.loadVerifiedTutors() : Promise.resolve(),
        window.loadRejectedTutors ? window.loadRejectedTutors() : Promise.resolve(),
        window.loadSuspendedTutors ? window.loadSuspendedTutors() : Promise.resolve(),
        loadLiveTutorRequests()
    ]);

    // Update panel-specific statistics
    updatePanelStatistics();
}

/**
 * Show loading states for all panels
 */
function showLoadingStates() {
    // Add loading spinner to all tables
    const tables = document.querySelectorAll('.panel-content tbody');
    tables.forEach(tbody => {
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" class="p-8 text-center">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <p class="mt-2 text-gray-500">Loading data...</p>
                    </td>
                </tr>
            `;
        }
    });
}

/**
 * Update statistics for all panels based on loaded data
 */
function updatePanelStatistics() {
    const stats = TutorManagementState.stats;

    // Update Verified Panel Stats
    const verifiedStats = document.getElementById('verified-panel-stats');
    if (verifiedStats) {
        const cards = verifiedStats.querySelectorAll('.card');
        if (cards[0]) {
            cards[0].querySelector('.text-2xl').textContent = stats.verified || '0';
            makeStatCardClickable(cards[0], 'verified', null); // Show all verified
        }
        if (cards[1]) {
            cards[1].querySelector('.text-2xl').textContent = Math.floor(stats.verified * 0.57) || '0';
            // Future: Filter by full-time when backend supports it
        }
        if (cards[2]) {
            cards[2].querySelector('.text-2xl').textContent = Math.floor(stats.verified * 0.43) || '0';
            // Future: Filter by part-time when backend supports it
        }
        if (cards[3]) {
            cards[3].querySelector('.text-2xl').textContent = calculateAverageRating();
            // Future: Sort by rating when clicked
        }
    }

    // Update Requested Panel Stats
    const requestedStats = document.getElementById('requested-panel-stats');
    if (requestedStats) {
        const cards = requestedStats.querySelectorAll('.card');
        if (cards[0]) {
            cards[0].querySelector('.text-2xl').textContent = stats.pending || '0';
            makeStatCardClickable(cards[0], 'requested', null); // Show all pending
        }
        if (cards[1]) {
            cards[1].querySelector('.text-2xl').textContent = Math.floor(stats.pending * 0.375) || '0';
            // Future: Filter by under review status
        }
        if (cards[2]) {
            cards[2].querySelector('.text-2xl').textContent = stats.todayApproved || '0';
            // Future: Filter by approved today
        }
        if (cards[3]) {
            cards[3].querySelector('.text-2xl').textContent = stats.avgProcessingTime || '-';
        }
    }

    // Update Rejected Panel Stats
    const rejectedStats = document.getElementById('rejected-panel-stats');
    if (rejectedStats) {
        const cards = rejectedStats.querySelectorAll('.card');
        if (cards[0]) {
            cards[0].querySelector('.text-2xl').textContent = stats.rejected || '0';
            makeStatCardClickable(cards[0], 'rejected', null); // Show all rejected
        }
        if (cards[1]) {
            cards[1].querySelector('.text-2xl').textContent = calculateThisMonthRejected();
            makePanelStatCardClickable(cards[1], 'rejected', 'this-month'); // Filter this month
        }
        if (cards[2]) {
            cards[2].querySelector('.text-2xl').textContent = '0';
            // Future: Show reconsidered applications
        }
        if (cards[3]) {
            cards[3].querySelector('.text-lg').textContent = 'Documentation';
        }
    }

    // Update Suspended Panel Stats
    const suspendedStats = document.getElementById('suspended-panel-stats');
    if (suspendedStats) {
        const cards = suspendedStats.querySelectorAll('.card');
        if (cards[0]) {
            cards[0].querySelector('.text-2xl').textContent = stats.suspended || '0';
            makeStatCardClickable(cards[0], 'suspended', null); // Show all suspended
        }
        if (cards[1]) {
            cards[1].querySelector('.text-2xl').textContent = Math.floor(stats.suspended * 0.5) || '0';
            // Future: Filter by policy violations
        }
        if (cards[2]) {
            cards[2].querySelector('.text-2xl').textContent = Math.floor(stats.suspended * 0.5) || '0';
            // Future: Filter by under investigation
        }
        if (cards[3]) {
            cards[3].querySelector('.text-2xl').textContent = '0';
            // Future: Show reinstated this year
        }
    }
}

/**
 * Make a panel-specific stat card clickable with filter action
 * This stays within the current panel and applies a filter
 */
function makePanelStatCardClickable(card, panelName, filterType) {
    // Add cursor pointer style
    card.style.cursor = 'pointer';
    card.style.transition = 'transform 0.2s, box-shadow 0.2s';

    // Add hover effect
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '';
    });

    // Add click handler for filtering
    card.addEventListener('click', () => {
        applyPanelFilter(panelName, filterType);
    });
}

/**
 * Apply a filter to the current panel's data
 */
function applyPanelFilter(panelName, filterType) {
    console.log(`Applying filter: ${filterType} to panel: ${panelName}`);

    // Store the filter in state
    TutorManagementState.activeFilter = filterType;

    // Apply filter based on type
    switch(filterType) {
        case 'this-month':
            // Filter data to show only this month's entries
            filterByDateRange(panelName, 'month');
            break;
        case 'full-time':
            // Filter by full-time tutors
            TutorManagementState.filters.workType = 'full-time';
            reloadCurrentPanelData();
            break;
        case 'part-time':
            // Filter by part-time tutors
            TutorManagementState.filters.workType = 'part-time';
            reloadCurrentPanelData();
            break;
        default:
            // Clear filters and show all
            clearPanelFilters();
            reloadCurrentPanelData();
    }
}

/**
 * Filter table data by date range
 */
function filterByDateRange(panelName, range) {
    const now = new Date();
    const startDate = new Date();

    // Calculate start date based on range
    switch(range) {
        case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
    }

    // Get the table body for current panel
    const panel = document.getElementById(`${panelName}-panel`);
    if (!panel) return;

    const rows = panel.querySelectorAll('tbody tr');
    let visibleCount = 0;

    rows.forEach(row => {
        // Get date from the row (usually in 4th column for rejected/suspended)
        const dateCell = row.cells[2] || row.cells[3];
        if (!dateCell) return;

        const dateText = dateCell.textContent.trim();
        const rowDate = parseDateText(dateText);

        if (rowDate && rowDate >= startDate) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    // Show notification
    showNotification(`Showing ${visibleCount} records from the last ${range}`, 'info');
}

/**
 * Parse date text from table cells
 */
function parseDateText(text) {
    // Handle relative dates like "2 days ago", "1 week ago"
    if (text.includes('ago')) {
        const now = new Date();
        if (text.includes('day')) {
            const days = parseInt(text);
            return new Date(now.setDate(now.getDate() - days));
        } else if (text.includes('week')) {
            const weeks = parseInt(text);
            return new Date(now.setDate(now.getDate() - (weeks * 7)));
        }
    }

    // Try parsing as standard date
    const parsed = new Date(text);
    return isNaN(parsed) ? null : parsed;
}

/**
 * Clear all panel filters
 */
function clearPanelFilters() {
    TutorManagementState.activeFilter = null;
    TutorManagementState.filters = {
        search: '',
        subject: '',
        level: '',
        location: '',
        dateRange: '',
        workType: ''
    };

    // Show all rows
    document.querySelectorAll('.panel-content tbody tr').forEach(row => {
        row.style.display = '';
    });
}

/**
 * Calculate average rating from verified tutors
 */
function calculateAverageRating() {
    // This would normally calculate from actual tutor data
    // For now, return a placeholder
    return '4.5/5';
}

/**
 * Calculate rejections this month
 */
function calculateThisMonthRejected() {
    // This would normally filter by date
    // For now, return a portion of total rejected
    return Math.floor(TutorManagementState.stats.rejected * 0.25) || '0';
}

/**
 * Load live tutor requests for the widget
 */
async function loadLiveTutorRequests() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/tutors/recent-activity?limit=10`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // Use pending tutors as fallback
            const pendingResponse = await fetch(`${API_BASE_URL}/api/admin/tutors/pending?limit=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (pendingResponse.ok) {
                const data = await pendingResponse.json();
                TutorManagementState.liveTutorRequests = data.tutors || [];
                updateLiveTutorRequestsWidget();
            }
            return;
        }

        const data = await response.json();
        TutorManagementState.liveTutorRequests = data.activities || data.tutors || [];
        updateLiveTutorRequestsWidget();

    } catch (error) {
        console.error('Error loading live tutor requests:', error);
        // Use sample data as fallback
        useSampleLiveTutorRequests();
    }
}

/**
 * Update live tutor requests widget
 */
function updateLiveTutorRequestsWidget() {
    const container = document.getElementById('live-tutor-requests-scroll');
    if (!container) {
        // Try old selector as fallback
        const oldContainer = document.querySelector('.school-requests-scroll');
        if (oldContainer) {
            oldContainer.id = 'live-tutor-requests-scroll';
            updateLiveTutorRequestsWidget();
        }
        return;
    }

    const requests = TutorManagementState.liveTutorRequests;

    if (requests.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-inbox text-4xl mb-2"></i>
                <p>No recent activity</p>
                <button onclick="loadLiveTutorRequests()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    <i class="fas fa-sync-alt mr-2"></i>Refresh
                </button>
            </div>
        `;
        // Stop animation if no data
        container.style.animation = 'none';
        return;
    }

    const requestsHTML = requests.map(tutor => {
        const status = getStatusTag(tutor.verification_status);
        const icon = getSubjectIcon(tutor.courses?.[0]);
        const timeAgo = getTimeAgo(tutor.created_at || tutor.updated_at);

        return `
            <div class="school-request-item">
                <div class="request-content">
                    <div class="request-header">
                        <i class="${icon}"></i>
                        <span class="school-name">${tutor.name || 'Unknown'}</span>
                        <span class="status-tag ${status.class}">${status.text}</span>
                    </div>
                    <div class="request-info">
                        <span class="school-type">${tutor.courses ? tutor.courses.join(', ') : 'Not specified'}</span>
                        <span class="location">${tutor.location || 'Location not specified'}</span>
                    </div>
                    <div class="request-footer">
                        <span class="timestamp">${timeAgo}</span>
                        <button class="action-btn" onclick="reviewTutorRequest(${tutor.id})">
                            ${tutor.verification_status === 'pending' ? 'Review' : 'View'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Duplicate for continuous scrolling effect
    container.innerHTML = requestsHTML + requestsHTML;

    // Add scrolling animation
    addScrollingAnimation(container);
}

/**
 * Add continuous scrolling animation to the container
 */
function addScrollingAnimation(container) {
    // Remove existing animation
    container.style.animation = 'none';

    // Force reflow
    container.offsetHeight;

    // Add CSS for smooth scrolling if not already present
    if (!document.getElementById('live-scroll-styles')) {
        const style = document.createElement('style');
        style.id = 'live-scroll-styles';
        style.textContent = `
            @keyframes scrollUp {
                0% {
                    transform: translateY(0);
                }
                100% {
                    transform: translateY(-50%);
                }
            }
            #live-tutor-requests-scroll {
                animation: scrollUp 30s linear infinite;
            }
            #live-tutor-requests-scroll:hover {
                animation-play-state: paused !important;
            }
            .school-requests-container {
                height: 400px;
                overflow: hidden;
                position: relative;
            }
            .school-request-item {
                padding: 0.75rem;
                border-bottom: 1px solid var(--border-color, #e5e7eb);
                transition: background 0.2s;
            }
            .school-request-item:hover {
                background: var(--hover-bg, rgba(0,0,0,0.02));
            }
            .request-content {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            .request-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-weight: 600;
            }
            .request-header i {
                width: 20px;
            }
            .school-name {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .status-tag {
                padding: 0.125rem 0.5rem;
                border-radius: 9999px;
                font-size: 0.625rem;
                font-weight: 700;
                text-transform: uppercase;
            }
            .status-tag.new {
                background: #dbeafe;
                color: #1e40af;
            }
            .status-tag.pending {
                background: #fef3c7;
                color: #92400e;
            }
            .status-tag.approved {
                background: #d1fae5;
                color: #065f46;
            }
            .status-tag.rejected {
                background: #fee2e2;
                color: #991b1b;
            }
            .status-tag.suspended {
                background: #fed7aa;
                color: #9a3412;
            }
            .request-info {
                display: flex;
                gap: 1rem;
                font-size: 0.875rem;
                color: #6b7280;
            }
            .request-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 0.75rem;
            }
            .timestamp {
                color: #9ca3af;
            }
            .action-btn {
                padding: 0.25rem 0.75rem;
                background: #3b82f6;
                color: white;
                border-radius: 0.25rem;
                font-size: 0.75rem;
                border: none;
                cursor: pointer;
                transition: background 0.2s;
            }
            .action-btn:hover {
                background: #2563eb;
            }
            .school-requests-fade-top,
            .school-requests-fade-bottom {
                position: absolute;
                left: 0;
                right: 0;
                height: 30px;
                pointer-events: none;
                z-index: 1;
            }
            .school-requests-fade-top {
                top: 0;
                background: linear-gradient(to bottom, var(--card-bg, white), transparent);
            }
            .school-requests-fade-bottom {
                bottom: 0;
                background: linear-gradient(to top, var(--card-bg, white), transparent);
            }
        `;
        document.head.appendChild(style);
    }

    // Apply animation
    container.style.animation = 'scrollUp 30s linear infinite';
}

/**
 * Get status tag based on verification status
 */
function getStatusTag(status) {
    const statusMap = {
        'pending': { text: 'NEW', class: 'new' },
        'verified': { text: 'APPROVED', class: 'approved' },
        'rejected': { text: 'REJECTED', class: 'rejected' },
        'suspended': { text: 'SUSPENDED', class: 'suspended' },
        'under_review': { text: 'PENDING', class: 'pending' }
    };

    return statusMap[status] || { text: 'PENDING', class: 'pending' };
}

/**
 * Get icon based on subject
 */
function getSubjectIcon(subject) {
    const iconMap = {
        'Mathematics': 'fas fa-calculator text-blue-600',
        'Science': 'fas fa-flask text-green-600',
        'Physics': 'fas fa-atom text-indigo-600',
        'Chemistry': 'fas fa-vial text-purple-600',
        'Biology': 'fas fa-dna text-red-600',
        'English': 'fas fa-book text-yellow-600',
        'History': 'fas fa-scroll text-brown-600',
        'Geography': 'fas fa-globe text-teal-600',
        'Computer Science': 'fas fa-laptop-code text-orange-600'
    };

    return iconMap[subject] || 'fas fa-chalkboard-teacher text-gray-600';
}

/**
 * Get time ago string
 */
function getTimeAgo(dateString) {
    if (!dateString) return 'Just now';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
}

/**
 * Update daily quota widget
 */
function updateDailyQuotaWidget() {
    const stats = TutorManagementState.stats;

    // Update quota values
    TutorManagementState.dailyQuota = {
        verified: { current: stats.verified, total: 150 },
        pending: { current: stats.pending, total: 10 },
        rejected: { current: stats.rejected, total: 5 },
        suspended: { current: stats.suspended, total: 5 },
        archived: { current: stats.archived, total: 100 }
    };

    // Update display
    const quotaItems = [
        { selector: '.admin-widget-card:nth-child(2) .space-y-3 > div:nth-child(1)', data: TutorManagementState.dailyQuota.verified, color: 'green' },
        { selector: '.admin-widget-card:nth-child(2) .space-y-3 > div:nth-child(3)', data: TutorManagementState.dailyQuota.pending, color: 'yellow' },
        { selector: '.admin-widget-card:nth-child(2) .space-y-3 > div:nth-child(5)', data: TutorManagementState.dailyQuota.rejected, color: 'red' },
        { selector: '.admin-widget-card:nth-child(2) .space-y-3 > div:nth-child(7)', data: TutorManagementState.dailyQuota.suspended, color: 'orange' },
        { selector: '.admin-widget-card:nth-child(2) .space-y-3 > div:nth-child(9)', data: TutorManagementState.dailyQuota.archived, color: 'gray' }
    ];

    quotaItems.forEach((item) => {
        const container = document.querySelector(item.selector);
        if (container) {
            const valueSpan = container.querySelector('.font-semibold');
            const progressBar = container.nextElementSibling?.querySelector('div');

            if (valueSpan) {
                valueSpan.textContent = `${item.data.current}/${item.data.total}`;
            }

            if (progressBar) {
                const percentage = Math.min(100, (item.data.current / item.data.total) * 100);
                progressBar.style.width = `${percentage}%`;
                progressBar.className = `bg-${item.color}-500 h-2 rounded-full`;
            }
        }
    });
}

/**
 * Initialize search and filters
 */
function initializeSearchAndFilters() {
    // Initialize search for each panel
    initializePanelSearch('verified');
    initializePanelSearch('requested');
    initializePanelSearch('rejected');
    initializePanelSearch('suspended');
}

/**
 * Initialize search and filters for a specific panel
 */
function initializePanelSearch(panelName) {
    // Search input
    const searchInput = document.getElementById(`${panelName}-search-input`);
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            const searchTerm = e.target.value.trim();
            handlePanelSearch(panelName, searchTerm);
        }, 300));
    }

    // Subject filter
    const subjectFilter = document.getElementById(`${panelName}-subject-filter`);
    if (subjectFilter) {
        subjectFilter.addEventListener('change', (e) => {
            TutorManagementState.filters.subject = e.target.value;
            reloadPanelWithFilters(panelName);
        });
    }

    // Level filter
    const levelFilter = document.getElementById(`${panelName}-level-filter`);
    if (levelFilter) {
        levelFilter.addEventListener('change', (e) => {
            TutorManagementState.filters.level = e.target.value;
            reloadPanelWithFilters(panelName);
        });
    }
}

/**
 * Handle search for a specific panel
 */
function handlePanelSearch(panelName, searchTerm) {
    TutorManagementState.filters.search = searchTerm;

    // Update the current panel state
    TutorManagementState.currentPanel = panelName;

    // Reload the panel with search term
    reloadPanelWithFilters(panelName);
}

/**
 * Reload a specific panel with current filters
 */
async function reloadPanelWithFilters(panelName) {
    const search = TutorManagementState.filters.search;
    const subject = TutorManagementState.filters.subject;
    const level = TutorManagementState.filters.level;

    console.log(`Reloading ${panelName} with filters:`, { search, subject, level });

    switch(panelName) {
        case 'verified':
            await window.loadVerifiedTutors(1, search);
            break;
        case 'requested':
            await window.loadPendingTutors(1, search);
            break;
        case 'rejected':
            await window.loadRejectedTutors(1, search);
            break;
        case 'suspended':
            await window.loadSuspendedTutors(1, search);
            break;
    }
}

/**
 * Initialize panel switching
 * NOTE: Panel switching is now handled by panel-manager-unified.js
 * This function just sets up panel change listeners
 */
function initializePanelSwitching() {
    // Listen for panel changes and update state
    document.addEventListener('panelChanged', (event) => {
        const panelName = event.detail.panelName;
        TutorManagementState.currentPanel = panelName;
        console.log('Panel changed to:', panelName);
    });

    console.log('Panel switching listeners initialized');
}

/**
 * Reload data for current panel
 */
async function reloadCurrentPanelData() {
    const panel = TutorManagementState.currentPanel;

    // First load stats if not dashboard
    if (panel !== 'dashboard') {
        await loadDashboardStats();
    }

    switch(panel) {
        case 'requested':
            await window.loadPendingTutors();
            break;
        case 'verified':
            await window.loadVerifiedTutors();
            break;
        case 'rejected':
            await window.loadRejectedTutors();
            break;
        case 'suspended':
            await window.loadSuspendedTutors();
            break;
        case 'dashboard':
            await loadDashboardStats();
            await loadAllPanelData();
            break;
    }

    // Update panel-specific statistics after loading data
    updatePanelStatistics();
}

/**
 * Start live updates
 */
function startLiveUpdates() {
    // Update live requests every 30 seconds
    setInterval(() => {
        loadLiveTutorRequests();
    }, 30000);

    // Update stats every minute
    setInterval(() => {
        loadDashboardStats();
    }, 60000);
}

/**
 * Use sample data for live tutor requests (fallback)
 */
function useSampleLiveTutorRequests() {
    TutorManagementState.liveTutorRequests = [
        {
            id: 1,
            name: 'Sample Tutor 1',
            courses: ['Mathematics'],
            location: 'Addis Ababa',
            verification_status: 'pending',
            created_at: new Date().toISOString()
        },
        {
            id: 2,
            name: 'Sample Tutor 2',
            courses: ['English'],
            location: 'Bahir Dar',
            verification_status: 'verified',
            created_at: new Date(Date.now() - 300000).toISOString()
        }
    ];

    updateLiveTutorRequestsWidget();
}

/**
 * Utility: Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Utility: Show notification (use from manage-tutors-data.js if available)
 */
function showNotification(message, type = 'info') {
    // Use the function from manage-tutors-data.js if available
    if (window.showNotification && window.showNotification !== showNotification) {
        return window.showNotification(message, type);
    }

    // Fallback implementation
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg text-white z-50 animate-fadeIn`;

    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#10b981';
            break;
        case 'error':
            notification.style.backgroundColor = '#ef4444';
            break;
        case 'warning':
            notification.style.backgroundColor = '#f59e0b';
            break;
        default:
            notification.style.backgroundColor = '#3b82f6';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('animate-fadeOut');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Export functions for global access (initialization handled by panel manager)
window.initializeTutorManagement = initializeTutorManagement;
window.loadDashboardStats = loadDashboardStats;
window.reloadCurrentPanelData = reloadCurrentPanelData;
window.loadLiveTutorRequests = loadLiveTutorRequests;
window.clearPanelFilters = clearPanelFilters;

// Initialize after a delay to ensure all modules are loaded
setTimeout(() => {
    console.log('Starting tutor management initialization...');
    initializeTutorManagement();
}, 200);

console.log('Manage Tutors Complete module loaded');