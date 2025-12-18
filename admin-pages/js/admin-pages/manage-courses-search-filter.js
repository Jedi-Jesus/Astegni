// manage-courses-search-filter.js - Search and Filter System
// Database-integrated search and filters for all panels

(function() {
    'use strict';

    const API_BASE_URL_LOCAL = 'https://api.astegni.com';

    // ============================================
    // FILTER STATE MANAGEMENT
    // ============================================

    const filterState = {
        verified: {
            search: '',
            category: '',
            level: ''
        },
        requested: {
            search: '',
            category: '',
            level: ''
        },
        rejected: {
            search: '',
            category: '',
            level: ''
        },
        suspended: {
            search: '',
            category: '',
            level: ''
        }
    };

    // ============================================
    // CLIENT-SIDE FILTERING
    // ============================================

    /**
     * Filter courses based on current panel filters
     */
    function filterCourses(courses, panelName) {
        const filters = filterState[panelName];
        if (!filters) return courses;

        return courses.filter(course => {
            // Search filter (title, category, requested_by)
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                    (course.title && course.title.toLowerCase().includes(searchLower)) ||
                    (course.category && course.category.toLowerCase().includes(searchLower)) ||
                    (course.requested_by && course.requested_by.toLowerCase().includes(searchLower));

                if (!matchesSearch) return false;
            }

            // Category filter
            if (filters.category && course.category) {
                if (!course.category.toLowerCase().includes(filters.category.toLowerCase())) {
                    return false;
                }
            }

            // Level filter
            if (filters.level && course.level) {
                if (!course.level.toLowerCase().includes(filters.level.toLowerCase())) {
                    return false;
                }
            }

            return true;
        });
    }

    // ============================================
    // PANEL-SPECIFIC FILTER FUNCTIONS
    // ============================================

    /**
     * Load and filter verified/active courses
     */
    async function loadAndFilterActiveCourses() {
        try {
            const response = await fetch(`${API_BASE_URL_LOCAL}/api/course-management/active`);
            if (!response.ok) throw new Error('Failed to fetch active courses');

            const data = await response.json();
            const filteredCourses = filterCourses(data.courses || [], 'verified');

            updateActiveCourseTable(filteredCourses);
            updateFilteredCount('verified', filteredCourses.length, data.count || 0);

        } catch (error) {
            console.error('Error loading active courses:', error);
            showFilterNotification('Failed to load active courses', 'error');
        }
    }

    /**
     * Load and filter course requests
     */
    async function loadAndFilterCourseRequests() {
        try {
            const response = await fetch(`${API_BASE_URL_LOCAL}/api/course-management/requests`);
            if (!response.ok) throw new Error('Failed to fetch course requests');

            const data = await response.json();
            const filteredCourses = filterCourses(data.courses || [], 'requested');

            updateCourseRequestTable(filteredCourses);
            updateFilteredCount('requested', filteredCourses.length, data.count || 0);

        } catch (error) {
            console.error('Error loading course requests:', error);
            showFilterNotification('Failed to load course requests', 'error');
        }
    }

    /**
     * Load and filter rejected courses
     */
    async function loadAndFilterRejectedCourses() {
        try {
            const response = await fetch(`${API_BASE_URL_LOCAL}/api/course-management/rejected`);
            if (!response.ok) throw new Error('Failed to fetch rejected courses');

            const data = await response.json();
            const filteredCourses = filterCourses(data.courses || [], 'rejected');

            updateRejectedCourseTable(filteredCourses);
            updateFilteredCount('rejected', filteredCourses.length, data.count || 0);

        } catch (error) {
            console.error('Error loading rejected courses:', error);
            showFilterNotification('Failed to load rejected courses', 'error');
        }
    }

    /**
     * Load and filter suspended courses
     */
    async function loadAndFilterSuspendedCourses() {
        try {
            const response = await fetch(`${API_BASE_URL_LOCAL}/api/course-management/suspended`);
            if (!response.ok) throw new Error('Failed to fetch suspended courses');

            const data = await response.json();
            const filteredCourses = filterCourses(data.courses || [], 'suspended');

            updateSuspendedCourseTable(filteredCourses);
            updateFilteredCount('suspended', filteredCourses.length, data.count || 0);

        } catch (error) {
            console.error('Error loading suspended courses:', error);
            showFilterNotification('Failed to load suspended courses', 'error');
        }
    }

    // ============================================
    // TABLE UPDATE FUNCTIONS
    // ============================================

    /**
     * Update active courses table
     */
    function updateActiveCourseTable(courses) {
        const tbody = document.querySelector('#verified-panel table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (courses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="p-8 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <p class="text-lg font-semibold mb-2">No Courses Found</p>
                            <p class="text-sm">Try adjusting your filters</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        courses.forEach(course => {
            const row = createActiveCourseRow(course);
            tbody.appendChild(row);
        });
    }

    /**
     * Update course requests table
     */
    function updateCourseRequestTable(courses) {
        const tbody = document.querySelector('#requested-panel table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (courses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="p-8 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <p class="text-lg font-semibold mb-2">No Requests Found</p>
                            <p class="text-sm">Try adjusting your filters</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        courses.forEach(course => {
            const row = createCourseRequestRow(course);
            tbody.appendChild(row);
        });
    }

    /**
     * Update rejected courses table
     */
    function updateRejectedCourseTable(courses) {
        const tbody = document.querySelector('#rejected-panel table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (courses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="p-8 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <p class="text-lg font-semibold mb-2">No Rejected Courses Found</p>
                            <p class="text-sm">Try adjusting your filters</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        courses.forEach(course => {
            const row = createRejectedCourseRow(course);
            tbody.appendChild(row);
        });
    }

    /**
     * Update suspended courses table
     */
    function updateSuspendedCourseTable(courses) {
        const tbody = document.querySelector('#suspended-panel table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (courses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="p-8 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                            <p class="text-lg font-semibold mb-2">No Suspended Courses Found</p>
                            <p class="text-sm">Try adjusting your filters</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        courses.forEach(course => {
            const row = createSuspendedCourseRow(course);
            tbody.appendChild(row);
        });
    }

    // ============================================
    // ROW CREATION FUNCTIONS (Reused from db-loader)
    // ============================================

    function createActiveCourseRow(course) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';

        const stars = generateStarRating(course.rating || 0);
        const notificationStatus = course.notification_sent
            ? '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800"><i class="fas fa-check-circle"></i> Sent</span>'
            : '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800"><i class="fas fa-times-circle"></i> Unsent</span>';

        row.innerHTML = `
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23e5e7eb'/%3E%3C/svg%3E" alt="Course" class="w-10 h-10 rounded">
                    <div>
                        <div class="font-semibold">${escapeHtml(course.title)}</div>
                        <div class="text-sm text-gray-500">ID: ${escapeHtml(course.course_id)}</div>
                    </div>
                </div>
            </td>
            <td class="p-4">${escapeHtml(course.category)}</td>
            <td class="p-4">${escapeHtml(course.level || 'N/A')}</td>
            <td class="p-4">${course.enrolled_students || 0}</td>
            <td class="p-4">
                <div class="flex items-center gap-1">
                    <span class="text-yellow-500">${stars}</span>
                    <span class="text-sm">(${course.rating ? course.rating.toFixed(1) : '0.0'})</span>
                </div>
            </td>
            <td class="p-4">${notificationStatus}</td>
            <td class="p-4">
                <button onclick="viewCourse('${escapeHtml(course.course_id)}')"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;

        return row;
    }

    function createCourseRequestRow(course) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';

        const submittedDate = course.created_at
            ? formatRelativeTime(new Date(course.created_at))
            : 'Unknown';

        row.innerHTML = `
            <td class="p-4">
                <div>
                    <div class="font-semibold">${escapeHtml(course.title)}</div>
                    <div class="text-sm text-gray-500">${escapeHtml(course.request_id)}</div>
                </div>
            </td>
            <td class="p-4">${escapeHtml(course.requested_by || 'N/A')}</td>
            <td class="p-4">${escapeHtml(course.category)}</td>
            <td class="p-4">${escapeHtml(course.level || 'N/A')}</td>
            <td class="p-4">${submittedDate}</td>
            <td class="p-4">
                <button onclick="viewCourseRequest('${escapeHtml(course.request_id)}')"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;

        return row;
    }

    function createRejectedCourseRow(course) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';

        const rejectedDate = course.rejected_at
            ? formatDate(new Date(course.rejected_at))
            : 'Unknown';

        row.innerHTML = `
            <td class="p-4">
                <div>
                    <div class="font-semibold">${escapeHtml(course.title)}</div>
                    <div class="text-sm text-gray-500">${escapeHtml(course.rejected_id)}</div>
                </div>
            </td>
            <td class="p-4">${escapeHtml(course.category)}</td>
            <td class="p-4">${rejectedDate}</td>
            <td class="p-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    ${escapeHtml(course.rejection_reason || 'No reason provided')}
                </span>
            </td>
            <td class="p-4">
                <button onclick="viewCourseRequest('${escapeHtml(course.rejected_id)}')"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;

        return row;
    }

    function createSuspendedCourseRow(course) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';

        const suspendedDate = course.suspended_at
            ? formatDate(new Date(course.suspended_at))
            : 'Unknown';

        row.innerHTML = `
            <td class="p-4">
                <div>
                    <div class="font-semibold">${escapeHtml(course.title)}</div>
                    <div class="text-sm text-gray-500">${escapeHtml(course.suspended_id)}</div>
                </div>
            </td>
            <td class="p-4">${escapeHtml(course.category)}</td>
            <td class="p-4">${suspendedDate}</td>
            <td class="p-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                    ${escapeHtml(course.suspension_reason || 'No reason provided')}
                </span>
            </td>
            <td class="p-4">
                <button onclick="viewCourse('${escapeHtml(course.suspended_id)}')"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;

        return row;
    }

    // ============================================
    // UI HELPER FUNCTIONS
    // ============================================

    /**
     * Update filtered count display
     */
    function updateFilteredCount(panelName, filteredCount, totalCount) {
        // Find or create count display element
        const panel = document.getElementById(`${panelName}-panel`);
        if (!panel) return;

        let countDisplay = panel.querySelector('.filter-count-display');

        if (!countDisplay) {
            // Create count display if it doesn't exist
            const searchCard = panel.querySelector('.card.p-6');
            if (searchCard) {
                countDisplay = document.createElement('div');
                countDisplay.className = 'filter-count-display mt-2 text-sm text-gray-600';
                searchCard.appendChild(countDisplay);
            }
        }

        if (countDisplay) {
            if (filteredCount === totalCount) {
                countDisplay.innerHTML = `<span class="font-semibold">${totalCount}</span> courses total`;
            } else {
                countDisplay.innerHTML = `
                    Showing <span class="font-semibold text-blue-600">${filteredCount}</span> of
                    <span class="font-semibold">${totalCount}</span> courses
                `;
            }
        }
    }

    /**
     * Show filter notification
     */
    function showFilterNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300`;

        switch(type) {
            case 'success':
                notification.className += ' bg-green-500 text-white';
                break;
            case 'error':
                notification.className += ' bg-red-500 text-white';
                break;
            default:
                notification.className += ' bg-blue-500 text-white';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, 3000);
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    function generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let stars = '';

        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                stars += '★';
            } else if (i === fullStars && hasHalfStar) {
                stars += '½';
            } else {
                stars += '☆';
            }
        }

        return stars;
    }

    function formatDate(date) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

    function formatRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    // ============================================
    // EVENT LISTENER SETUP
    // ============================================

    /**
     * Setup search and filter inputs for a panel
     */
    function setupPanelFilters(panelName, loadFunction) {
        const panel = document.getElementById(`${panelName}-panel`);
        if (!panel) return;

        // Search input
        const searchInput = panel.querySelector('input[type="text"]');
        if (searchInput) {
            // Debounced search
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                filterState[panelName].search = e.target.value;

                searchTimeout = setTimeout(() => {
                    console.log(`${panelName} search:`, filterState[panelName].search);
                    loadFunction();
                }, 300); // 300ms debounce
            });
        }

        // Category select
        const categorySelects = panel.querySelectorAll('select');
        if (categorySelects.length > 0) {
            categorySelects[0].addEventListener('change', (e) => {
                filterState[panelName].category = e.target.value;
                console.log(`${panelName} category filter:`, filterState[panelName].category);
                loadFunction();
            });
        }

        // Level select
        if (categorySelects.length > 1) {
            categorySelects[1].addEventListener('change', (e) => {
                filterState[panelName].level = e.target.value;
                console.log(`${panelName} level filter:`, filterState[panelName].level);
                loadFunction();
            });
        }

        console.log(`Filters setup complete for ${panelName}-panel`);
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    document.addEventListener('DOMContentLoaded', function() {
        if (window.location.href.includes('manage-courses.html')) {
            console.log('Initializing Search & Filter System...');

            // Setup filters for each panel after a brief delay
            setTimeout(() => {
                setupPanelFilters('verified', loadAndFilterActiveCourses);
                setupPanelFilters('requested', loadAndFilterCourseRequests);
                setupPanelFilters('rejected', loadAndFilterRejectedCourses);
                setupPanelFilters('suspended', loadAndFilterSuspendedCourses);

                console.log('Search & Filter System initialized');
            }, 1000); // Wait for DOM to be fully ready
        }
    });

    // Listen for panel changes to reload filtered data
    document.addEventListener('panelChanged', function(event) {
        const panelName = event.detail.panelName;

        // Reload filtered data when switching to a panel
        switch(panelName) {
            case 'verified':
                loadAndFilterActiveCourses();
                break;
            case 'requested':
                loadAndFilterCourseRequests();
                break;
            case 'rejected':
                loadAndFilterRejectedCourses();
                break;
            case 'suspended':
                loadAndFilterSuspendedCourses();
                break;
        }
    });

    // ============================================
    // GLOBAL EXPORTS
    // ============================================

    window.CourseSearchFilter = {
        loadAndFilterActive: loadAndFilterActiveCourses,
        loadAndFilterRequests: loadAndFilterCourseRequests,
        loadAndFilterRejected: loadAndFilterRejectedCourses,
        loadAndFilterSuspended: loadAndFilterSuspendedCourses,
        getFilterState: () => filterState,
        clearFilters: (panelName) => {
            if (filterState[panelName]) {
                filterState[panelName] = { search: '', category: '', level: '' };

                // Clear UI inputs
                const panel = document.getElementById(`${panelName}-panel`);
                if (panel) {
                    const searchInput = panel.querySelector('input[type="text"]');
                    if (searchInput) searchInput.value = '';

                    const selects = panel.querySelectorAll('select');
                    selects.forEach(select => select.selectedIndex = 0);
                }
            }
        }
    };

})();
