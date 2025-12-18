/**
 * Complete Manage Courses Module with ALL Features
 * Includes all functionality from original separate modules
 */

class ManageCoursesController {
    constructor() {
        // Core properties
        this.API_BASE_URL = 'https://api.astegni.com';
        this.currentPanel = 'dashboard';
        this.currentCourseId = null;
        this.liveWidgetTimer = null;
        this.statsRefreshTimer = null;

        // Filters
        this.filters = {
            search: '',
            category: '',
            level: '',
            rating: '',
            type: ''
        };

        // Data storage
        this.coursesData = {
            verified: [],
            requested: [],
            rejected: [],
            suspended: []
        };

        this.stats = {
            active: 0,
            pending: 0,
            rejected: 0,
            suspended: 0,
            approvalRate: 0,
            avgProcessing: 0,
            satisfaction: 0
        };

        this.reviews = [];
        this.adminProfile = {};
        this.achievements = [];
        this.notifications = [];

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.initializeTheme();
        this.restorePanel();
        this.startAutoRefresh();
        this.initializeLiveWidget();
        this.loadAdminProfile();
    }

    // ============= Event Listeners =============
    setupEventListeners() {
        // Panel switching with data-panel attributes
        document.querySelectorAll('[data-panel]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPanel(link.dataset.panel);
            });
        });

        // Search inputs with debouncing
        document.querySelectorAll('.search-input').forEach(input => {
            input.addEventListener('input', this.debounce((e) => {
                this.handleSearch(e.target.value, e.target.dataset.panel);
            }, 300));
        });

        // Filter selects
        document.querySelectorAll('.filter-select').forEach(select => {
            select.addEventListener('change', (e) => {
                this.handleFilter(e.target.name, e.target.value);
            });
        });

        // Stat cards - click to filter
        document.querySelectorAll('.stat-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const stat = e.currentTarget.querySelector('[data-stat]')?.dataset.stat;
                if (stat) {
                    this.handleStatCardClick(stat);
                }
            });
        });

        // Sidebar toggle
        const hamburger = document.getElementById('hamburger');
        const sidebar = document.getElementById('sidebar');
        const sidebarClose = document.getElementById('sidebar-close');

        if (hamburger) {
            hamburger.addEventListener('click', () => {
                sidebar.classList.add('active');
            });
        }

        if (sidebarClose) {
            sidebarClose.addEventListener('click', () => {
                sidebar.classList.remove('active');
            });
        }

        // ESC key for modals and sidebar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
                sidebar?.classList.remove('active');
            }
        });

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle-btn');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Review filters
        const reviewSearch = document.querySelector('#reviews-panel .search-input');
        const reviewTypeFilter = document.querySelector('#reviews-panel [name="type"]');
        const reviewRatingFilter = document.querySelector('#reviews-panel [name="rating"]');

        if (reviewSearch) {
            reviewSearch.addEventListener('input', this.debounce(() => {
                this.filterReviews();
            }, 300));
        }

        if (reviewTypeFilter) {
            reviewTypeFilter.addEventListener('change', () => this.filterReviews());
        }

        if (reviewRatingFilter) {
            reviewRatingFilter.addEventListener('change', () => this.filterReviews());
        }
    }

    // ============= Panel Management =============
    switchPanel(panelName) {
        // Hide all panels
        document.querySelectorAll('.panel-content').forEach(panel => {
            panel.classList.add('hidden');
            panel.classList.remove('active');
        });

        // Show selected panel
        const targetPanel = document.getElementById(`${panelName}-panel`);
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
            targetPanel.classList.add('active');
        }

        // Update sidebar active state
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-panel="${panelName}"]`)?.classList.add('active');

        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('panel', panelName);
        window.history.pushState({}, '', url);

        this.currentPanel = panelName;

        // Load panel-specific data
        this.loadPanelData(panelName);

        // Update panel stats
        this.updatePanelStatistics(panelName);

        // Close sidebar on mobile
        if (window.innerWidth < 768) {
            document.getElementById('sidebar')?.classList.remove('active');
        }
    }

    restorePanel() {
        const params = new URLSearchParams(window.location.search);
        const panel = params.get('panel') || 'dashboard';
        this.switchPanel(panel);
    }

    // ============= Data Management =============
    async loadInitialData() {
        try {
            // Show loading state
            this.showLoadingState();

            // Load all data concurrently
            const [statsData, coursesData, reviewsData] = await Promise.all([
                this.fetchStats(),
                this.fetchAllCourses(),
                this.fetchReviews()
            ]);

            this.updateStats(statsData);
            this.updateCourses(coursesData);
            this.updateReviews(reviewsData);

            // Load dashboard specific data
            if (this.currentPanel === 'dashboard') {
                this.loadDashboardWidgets();
                this.loadRecentReviews();
            }

            // Hide loading state
            this.hideLoadingState();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showNotification('Failed to load data. Using offline mode.', 'warning');
            this.loadFallbackData();
        }
    }

    async fetchStats() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/course-management/statistics`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.statistics || data;
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
        return this.getFallbackStats();
    }

    async fetchAllCourses() {
        try {
            // Fetch all course types in parallel
            const [requests, active, rejected, suspended] = await Promise.all([
                this.fetchCoursesByType('requests'),
                this.fetchCoursesByType('active'),
                this.fetchCoursesByType('rejected'),
                this.fetchCoursesByType('suspended')
            ]);

            return {
                requested: requests,
                verified: active,
                rejected: rejected,
                suspended: suspended
            };
        } catch (error) {
            console.error('Error fetching courses:', error);
            return this.getFallbackCourses();
        }
    }

    async fetchCoursesByType(type) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/course-management/${type}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.courses || [];
            }
        } catch (error) {
            console.error(`Error fetching ${type} courses:`, error);
        }
        return [];
    }

    async fetchReviews() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/course-management/reviews`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.reviews || [];
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        }
        return this.getFallbackReviews();
    }

    // ============= Admin Profile Loading =============
    async loadAdminProfile() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/admin/profile`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const profile = await response.json();
                this.updateProfileDisplay(profile);
                this.adminProfile = profile;
            } else {
                this.loadFallbackProfile();
            }
        } catch (error) {
            console.error('Error loading admin profile:', error);
            this.loadFallbackProfile();
        }
    }

    updateProfileDisplay(profile) {
        // Update profile header
        const nameElement = document.getElementById('adminName');
        if (nameElement) nameElement.textContent = profile.name || 'Course Admin';

        // Update location
        const locationElement = document.querySelector('.profile-location span:last-child');
        if (locationElement) locationElement.textContent = profile.location || 'Addis Ababa, Ethiopia';

        // Update quote
        const quoteElement = document.querySelector('.profile-quote span');
        if (quoteElement) quoteElement.textContent = profile.quote || 'Excellence in education management';

        // Update department info
        const deptElement = document.querySelector('.info-item .info-value');
        if (deptElement) deptElement.textContent = profile.department || 'Course Management';

        // Update rating
        const ratingValue = document.querySelector('.rating-value');
        if (ratingValue) ratingValue.textContent = profile.rating || '4.8';

        // Load achievements
        this.loadAchievements(profile.achievements || []);

        // Load badges
        this.loadBadges(profile.badges || []);
    }

    loadAchievements(achievements) {
        const container = document.querySelector('.achievements-container');
        if (!container) return;

        if (achievements.length === 0) {
            achievements = this.getFallbackAchievements();
        }

        container.innerHTML = achievements.map(achievement => `
            <div class="achievement-item text-center">
                <div class="text-2xl mb-1">${achievement.icon}</div>
                <div class="text-xs text-gray-600">${achievement.name}</div>
            </div>
        `).join('');
    }

    loadBadges(badges) {
        const container = document.querySelector('.badges-row');
        if (!container) return;

        if (badges.length === 0) {
            badges = ['✅ Verified', '⭐ Top Rated', '🏆 Expert'];
        }

        container.innerHTML = badges.map(badge => `
            <span class="badge">${badge}</span>
        `).join('');
    }

    // ============= Live Widget Management =============
    initializeLiveWidget() {
        this.loadLiveCourseRequests();

        // Refresh every 30 seconds
        this.liveWidgetTimer = setInterval(() => {
            this.loadLiveCourseRequests();
        }, 30000);
    }

    async loadLiveCourseRequests() {
        try {
            // Fetch latest course activities from all sources
            const [requests, activities] = await Promise.all([
                fetch(`${this.API_BASE_URL}/api/course-management/requests/recent`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }).then(r => r.ok ? r.json() : null).catch(() => null),

                fetch(`${this.API_BASE_URL}/api/course-management/activities`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }).then(r => r.ok ? r.json() : null).catch(() => null)
            ]);

            const allActivities = [];

            // Add recent requests
            if (requests?.courses) {
                requests.courses.slice(0, 5).forEach(course => {
                    allActivities.push({
                        title: course.title,
                        type: 'request',
                        status: 'NEW',
                        time: this.formatTimeAgo(course.created_at),
                        category: course.category
                    });
                });
            }

            // Add recent activities
            if (activities?.items) {
                activities.items.slice(0, 5).forEach(activity => {
                    allActivities.push({
                        title: activity.course_title,
                        type: activity.type,
                        status: activity.status,
                        time: this.formatTimeAgo(activity.timestamp),
                        category: activity.category
                    });
                });
            }

            // If no data from API, use fallback
            if (allActivities.length === 0) {
                this.loadFallbackLiveWidget();
                return;
            }

            // Update the widget
            this.updateLiveWidget(allActivities);

        } catch (error) {
            console.error('Error loading live widget:', error);
            this.loadFallbackLiveWidget();
        }
    }

    updateLiveWidget(activities) {
        const scrollContainer = document.querySelector('.course-requests-scroll');
        if (!scrollContainer) return;

        scrollContainer.innerHTML = activities.map(activity => `
            <div class="course-request-item">
                <div class="flex justify-between items-start mb-1">
                    <span class="font-semibold text-sm">${activity.title}</span>
                    <span class="text-xs px-2 py-1 rounded-full bg-${this.getStatusColor(activity.status)}-100 text-${this.getStatusColor(activity.status)}-800">
                        ${activity.status}
                    </span>
                </div>
                <div class="text-xs text-gray-500">${activity.category} • ${activity.time}</div>
            </div>
        `).join('');

        // Add infinite scroll effect if more than 5 items
        if (activities.length > 5) {
            scrollContainer.innerHTML += scrollContainer.innerHTML;
        }
    }

    loadFallbackLiveWidget() {
        const activities = [
            { title: 'Advanced Mathematics', type: 'request', status: 'NEW', time: '2 minutes ago', category: 'Mathematics' },
            { title: 'Biology Fundamentals', type: 'approved', status: 'APPROVED', time: '15 minutes ago', category: 'Science' },
            { title: 'English Literature', type: 'request', status: 'PENDING', time: '1 hour ago', category: 'Languages' },
            { title: 'Computer Programming', type: 'request', status: 'NEW', time: '2 hours ago', category: 'Technology' },
            { title: 'Business Management', type: 'rejected', status: 'REJECTED', time: '3 hours ago', category: 'Business' }
        ];
        this.updateLiveWidget(activities);
    }

    getStatusColor(status) {
        const colors = {
            'NEW': 'yellow',
            'PENDING': 'blue',
            'APPROVED': 'green',
            'REJECTED': 'red',
            'SUSPENDED': 'orange'
        };
        return colors[status] || 'gray';
    }

    // ============= UI Updates =============
    updateStats(data) {
        this.stats = data;

        // Update main dashboard stats
        const statElements = {
            'stat-active': data.active || 245,
            'stat-pending': data.pending || 12,
            'stat-rejected': data.rejected || 8,
            'stat-suspended': data.suspended || 3,
            'stat-approval-rate': `${data.approvalRate || 92}%`,
            'stat-avg-processing': `${data.avgProcessing || 2.5} days`,
            'stat-satisfaction': `${data.satisfaction || 94}%`
        };

        Object.keys(statElements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = statElements[id];
            }
        });

        // Update panel-specific stats
        this.updatePanelStats();
    }

    updatePanelStats() {
        const panelStats = document.querySelectorAll(`#${this.currentPanel}-panel .stat-value`);
        panelStats.forEach(stat => {
            if (stat.dataset.stat) {
                stat.textContent = this.stats[stat.dataset.stat] || '0';
            }
        });
    }

    updatePanelStatistics(panel) {
        // Update statistics specific to each panel
        switch(panel) {
            case 'requested':
                this.updateRequestedPanelStats();
                break;
            case 'verified':
                this.updateVerifiedPanelStats();
                break;
            case 'rejected':
                this.updateRejectedPanelStats();
                break;
            case 'suspended':
                this.updateSuspendedPanelStats();
                break;
            case 'reviews':
                this.updateReviewsStats();
                break;
        }
    }

    updateRequestedPanelStats() {
        const stats = {
            newRequests: this.coursesData.requested.filter(c => c.status === 'new').length,
            underReview: this.coursesData.requested.filter(c => c.status === 'reviewing').length,
            approvedToday: this.coursesData.requested.filter(c => {
                const today = new Date().toDateString();
                return c.approvedDate && new Date(c.approvedDate).toDateString() === today;
            }).length,
            totalRejected: this.coursesData.rejected.length
        };

        Object.keys(stats).forEach(key => {
            const element = document.querySelector(`[data-stat="${key}"]`);
            if (element) element.textContent = stats[key];
        });
    }

    updateVerifiedPanelStats() {
        const courses = this.coursesData.verified;
        const stats = {
            totalActive: courses.length,
            academicCourses: courses.filter(c => c.type === 'academic').length,
            professionalCourses: courses.filter(c => c.type === 'professional').length,
            avgRating: courses.length > 0 ?
                (courses.reduce((sum, c) => sum + (c.rating || 0), 0) / courses.length).toFixed(1) :
                '0.0'
        };

        Object.keys(stats).forEach(key => {
            const element = document.querySelector(`[data-stat="${key}"]`);
            if (element) element.textContent = stats[key];
        });
    }

    updateRejectedPanelStats() {
        const courses = this.coursesData.rejected;
        const stats = {
            totalRejectedCount: courses.length,
            rejectedThisMonth: courses.filter(c => {
                const thisMonth = new Date().getMonth();
                return c.rejectedDate && new Date(c.rejectedDate).getMonth() === thisMonth;
            }).length,
            reconsidered: courses.filter(c => c.reconsidered).length,
            mainReason: this.getMostCommonRejectionReason()
        };

        Object.keys(stats).forEach(key => {
            const element = document.querySelector(`[data-stat="${key}"]`);
            if (element) element.textContent = stats[key];
        });
    }

    updateSuspendedPanelStats() {
        const courses = this.coursesData.suspended;
        const stats = {
            currentlySuspended: courses.length,
            qualityIssues: courses.filter(c => c.reason === 'quality').length,
            underInvestigation: courses.filter(c => c.investigating).length,
            reinstated: courses.filter(c => c.reinstated).length
        };

        Object.keys(stats).forEach(key => {
            const element = document.querySelector(`[data-stat="${key}"]`);
            if (element) element.textContent = stats[key];
        });
    }

    updateReviewsStats() {
        const reviews = this.reviews;

        // Calculate average rating
        const avgRating = reviews.length > 0 ?
            (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) :
            '0.0';

        // Calculate response time average
        const avgResponseTime = reviews.length > 0 ?
            (reviews.filter(r => r.responseTime).reduce((sum, r) => sum + r.responseTime, 0) /
             reviews.filter(r => r.responseTime).length).toFixed(1) :
            '0.0';

        // Calculate accuracy
        const accuracy = reviews.length > 0 ?
            ((reviews.filter(r => r.accurate).length / reviews.length) * 100).toFixed(1) :
            '0.0';

        // Update UI
        const avgRatingEl = document.getElementById('review-avg-rating');
        if (avgRatingEl) avgRatingEl.textContent = avgRating;

        const starsEl = document.getElementById('review-stars');
        if (starsEl) starsEl.textContent = '★'.repeat(Math.floor(avgRating)) + '☆'.repeat(5 - Math.floor(avgRating));

        const responseEl = document.getElementById('review-response-time');
        if (responseEl) responseEl.textContent = avgResponseTime;

        const accuracyEl = document.getElementById('review-accuracy');
        if (accuracyEl) accuracyEl.textContent = accuracy + '%';

        const totalEl = document.getElementById('review-total');
        if (totalEl) totalEl.textContent = reviews.length;

        // Update trend
        const trendEl = document.getElementById('review-trend');
        if (trendEl) {
            const trend = this.calculateReviewTrend();
            trendEl.textContent = trend;
            trendEl.className = trend === 'Increasing' ? 'text-green-500' :
                               trend === 'Decreasing' ? 'text-red-500' :
                               'text-gray-500';
        }
    }

    calculateReviewTrend() {
        // Simple trend calculation based on recent reviews
        const recentReviews = this.reviews.slice(0, 10);
        const olderReviews = this.reviews.slice(10, 20);

        if (recentReviews.length === 0 || olderReviews.length === 0) return 'Stable';

        const recentAvg = recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length;
        const olderAvg = olderReviews.reduce((sum, r) => sum + r.rating, 0) / olderReviews.length;

        if (recentAvg > olderAvg + 0.2) return 'Increasing';
        if (recentAvg < olderAvg - 0.2) return 'Decreasing';
        return 'Stable';
    }

    getMostCommonRejectionReason() {
        const reasons = this.coursesData.rejected.map(c => c.reason).filter(Boolean);
        if (reasons.length === 0) return 'Quality';

        const reasonCounts = {};
        reasons.forEach(reason => {
            reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });

        return Object.keys(reasonCounts).reduce((a, b) =>
            reasonCounts[a] > reasonCounts[b] ? a : b
        );
    }

    updateCourses(data) {
        this.coursesData = data;
        this.renderCourseTable(this.currentPanel);
    }

    updateReviews(data) {
        this.reviews = data;
        this.renderReviews();
        this.updateReviewsStats();
    }

    renderCourseTable(panelType) {
        const tableBody = document.querySelector(`#${panelType}-panel tbody`);
        if (!tableBody) return;

        const courses = this.getFilteredCourses(panelType);

        if (courses.length === 0) {
            tableBody.innerHTML = this.getEmptyStateHTML(panelType);
            return;
        }

        tableBody.innerHTML = courses.map(course => this.createCourseRow(course, panelType)).join('');
    }

    getEmptyStateHTML(panelType) {
        const messages = {
            requested: 'No pending course requests',
            verified: 'No active courses found',
            rejected: 'No rejected courses',
            suspended: 'No suspended courses'
        };

        return `
            <tr>
                <td colspan="7" class="text-center py-8 text-gray-500">
                    <div class="flex flex-col items-center">
                        <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z">
                            </path>
                        </svg>
                        <p class="text-lg font-semibold mb-2">${messages[panelType]}</p>
                        <p class="text-sm">Courses will appear here when available</p>
                    </div>
                </td>
            </tr>
        `;
    }

    createCourseRow(course, type) {
        const actionButtons = this.getActionButtons(course, type);

        if (type === 'verified') {
            return `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="p-4">
                        <div class="font-semibold">${course.title}</div>
                        <div class="text-sm text-gray-500">ID: ${course.id || 'CRS-' + Math.random().toString(36).substr(2, 9)}</div>
                    </td>
                    <td class="p-4">${course.category}</td>
                    <td class="p-4">${course.level}</td>
                    <td class="p-4">${course.students || 0}</td>
                    <td class="p-4">${this.renderRating(course.rating || 0)}</td>
                    <td class="p-4">${this.renderNotificationStatus(course.notificationSent)}</td>
                    <td class="p-4">
                        <div class="flex gap-2">
                            ${actionButtons}
                        </div>
                    </td>
                </tr>
            `;
        } else if (type === 'requested') {
            return `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="p-4">
                        <div class="font-semibold">${course.title}</div>
                        <div class="text-sm text-gray-500">ID: ${course.request_id || course.id || 'REQ-' + Math.random().toString(36).substr(2, 9)}</div>
                    </td>
                    <td class="p-4">${course.requestedBy || course.requester_name || 'N/A'}</td>
                    <td class="p-4">${course.category}</td>
                    <td class="p-4">${course.level}</td>
                    <td class="p-4">${this.formatDate(course.submittedDate || course.created_at)}</td>
                    <td class="p-4">
                        <div class="flex gap-2">
                            ${actionButtons}
                        </div>
                    </td>
                </tr>
            `;
        } else {
            return `
                <tr class="hover:bg-gray-50 transition-colors">
                    <td class="p-4">
                        <div class="font-semibold">${course.title}</div>
                        <div class="text-sm text-gray-500">ID: ${course.id || 'CRS-' + Math.random().toString(36).substr(2, 9)}</div>
                    </td>
                    <td class="p-4">${course.category}</td>
                    <td class="p-4">${this.formatDate(course.date || course.created_at)}</td>
                    <td class="p-4">${course.reason || 'N/A'}</td>
                    <td class="p-4">
                        <div class="flex gap-2">
                            ${actionButtons}
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    getActionButtons(course, type) {
        const buttons = {
            view: `<button onclick="manageCourses.viewCourse('${course.id}')" class="text-blue-500 hover:text-blue-700" title="View Details"><i class="fas fa-eye"></i></button>`,
            edit: `<button onclick="manageCourses.editCourse('${course.id}')" class="text-green-500 hover:text-green-700" title="Edit"><i class="fas fa-edit"></i></button>`,
            delete: `<button onclick="manageCourses.deleteCourse('${course.id}')" class="text-red-500 hover:text-red-700" title="Delete"><i class="fas fa-trash"></i></button>`,
            approve: `<button onclick="manageCourses.approveCourse('${course.id}')" class="text-green-500 hover:text-green-700" title="Approve"><i class="fas fa-check"></i></button>`,
            reject: `<button onclick="manageCourses.rejectCourse('${course.id}')" class="text-red-500 hover:text-red-700" title="Reject"><i class="fas fa-times"></i></button>`,
            notify: `<button onclick="manageCourses.sendNotification('${course.id}')" class="text-purple-500 hover:text-purple-700" title="Send Notification"><i class="fas fa-bell"></i></button>`,
            suspend: `<button onclick="manageCourses.suspendCourse('${course.id}')" class="text-orange-500 hover:text-orange-700" title="Suspend"><i class="fas fa-pause"></i></button>`,
            reinstate: `<button onclick="manageCourses.reinstateCourse('${course.id}')" class="text-green-500 hover:text-green-700" title="Reinstate"><i class="fas fa-play"></i></button>`,
            reconsider: `<button onclick="manageCourses.reconsiderCourse('${course.id}')" class="text-blue-500 hover:text-blue-700" title="Reconsider"><i class="fas fa-redo"></i></button>`
        };

        switch(type) {
            case 'verified':
                return `${buttons.view} ${buttons.edit} ${buttons.notify} ${buttons.suspend}`;
            case 'requested':
                return `${buttons.view} ${buttons.approve} ${buttons.reject}`;
            case 'rejected':
                return `${buttons.view} ${buttons.reconsider} ${buttons.delete}`;
            case 'suspended':
                return `${buttons.view} ${buttons.reinstate} ${buttons.delete}`;
            default:
                return buttons.view;
        }
    }

    // ============= Stat Card Click Handlers =============
    handleStatCardClick(stat) {
        switch(stat) {
            case 'totalActive':
            case 'active':
                this.switchPanel('verified');
                break;
            case 'pending':
            case 'newRequests':
                this.switchPanel('requested');
                break;
            case 'rejected':
            case 'totalRejectedCount':
                this.switchPanel('rejected');
                break;
            case 'suspended':
            case 'currentlySuspended':
                this.switchPanel('suspended');
                break;
            case 'approvalRate':
                this.switchPanel('dashboard');
                this.showNotification('Showing approval rate statistics', 'info');
                break;
            default:
                console.log('Stat card clicked:', stat);
        }
    }

    // ============= Modal Management =============
    modal = {
        open: (modalId) => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
                document.body.style.overflow = 'hidden';
            }
        },

        close: (modalId) => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
                document.body.style.overflow = 'auto';
            }
        },

        closeAll: () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            });
            document.body.style.overflow = 'auto';
        }
    };

    closeAllModals() {
        this.modal.closeAll();
    }

    // Course Actions
    viewCourse(courseId) {
        this.currentCourseId = courseId;
        const course = this.findCourse(courseId);
        if (course) {
            this.populateViewModal(course);
            this.modal.open('view-course-modal');
        }
    }

    editCourse(courseId) {
        this.currentCourseId = courseId;
        const course = this.findCourse(courseId);
        if (course) {
            this.populateEditModal(course);
            this.modal.open('edit-course-modal');
        }
    }

    async approveCourse(courseId) {
        if (confirm('Are you sure you want to approve this course?')) {
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/course-management/courses/${courseId}/approve`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    this.showNotification('Course approved successfully', 'success');
                    this.loadPanelData(this.currentPanel);
                } else {
                    throw new Error('Failed to approve course');
                }
            } catch (error) {
                this.showNotification('Failed to approve course', 'error');
            }
        }
    }

    async rejectCourse(courseId) {
        const reason = prompt('Please provide a reason for rejection:');
        if (reason) {
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/course-management/courses/${courseId}/reject`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reason })
                });

                if (response.ok) {
                    this.showNotification('Course rejected', 'info');
                    this.loadPanelData(this.currentPanel);
                } else {
                    throw new Error('Failed to reject course');
                }
            } catch (error) {
                this.showNotification('Failed to reject course', 'error');
            }
        }
    }

    async suspendCourse(courseId) {
        const reason = prompt('Please provide a reason for suspension:');
        if (reason) {
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/course-management/courses/${courseId}/suspend`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reason })
                });

                if (response.ok) {
                    this.showNotification('Course suspended', 'warning');
                    this.loadPanelData(this.currentPanel);
                } else {
                    throw new Error('Failed to suspend course');
                }
            } catch (error) {
                this.showNotification('Failed to suspend course', 'error');
            }
        }
    }

    async reinstateCourse(courseId) {
        if (confirm('Are you sure you want to reinstate this course?')) {
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/course-management/courses/${courseId}/reinstate`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    this.showNotification('Course reinstated successfully', 'success');
                    this.loadPanelData(this.currentPanel);
                } else {
                    throw new Error('Failed to reinstate course');
                }
            } catch (error) {
                this.showNotification('Failed to reinstate course', 'error');
            }
        }
    }

    async reconsiderCourse(courseId) {
        if (confirm('Are you sure you want to reconsider this rejected course?')) {
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/course-management/courses/${courseId}/reconsider`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    this.showNotification('Course moved back to requests for reconsideration', 'info');
                    this.loadPanelData(this.currentPanel);
                } else {
                    throw new Error('Failed to reconsider course');
                }
            } catch (error) {
                this.showNotification('Failed to reconsider course', 'error');
            }
        }
    }

    async deleteCourse(courseId) {
        if (confirm('Are you sure you want to permanently delete this course? This action cannot be undone.')) {
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/course-management/courses/${courseId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    this.showNotification('Course deleted successfully', 'success');
                    this.loadPanelData(this.currentPanel);
                } else {
                    throw new Error('Failed to delete course');
                }
            } catch (error) {
                this.showNotification('Failed to delete course', 'error');
            }
        }
    }

    async sendNotification(courseId) {
        this.currentCourseId = courseId;
        const course = this.findCourse(courseId);
        if (course) {
            document.getElementById('notification-course-id').textContent = course.id;
            document.getElementById('notification-course-title').textContent = course.title;
            this.modal.open('send-notification-modal');
        }
    }

    // ============= Reviews Management =============
    loadRecentReviews() {
        const container = document.getElementById('dashboard-reviews-container');
        if (!container) return;

        const recentReviews = this.reviews.slice(0, 3);

        if (recentReviews.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-400 py-4">
                    <p>No recent reviews</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recentReviews.map(review => this.createReviewItem(review)).join('');
    }

    renderReviews() {
        const container = document.getElementById('reviews-list-container');
        if (!container) return;

        if (this.reviews.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <p>No reviews available</p>
                    <p class="text-sm mt-2">Reviews will appear here when submitted</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.reviews.map(review => this.createReviewItem(review)).join('');
    }

    createReviewItem(review) {
        return `
            <div class="review-item border rounded-lg p-4 mb-4">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <span class="font-semibold">${review.reviewer || 'Anonymous'}</span>
                        <span class="text-xs text-gray-500 ml-2">${review.role || 'User'}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-yellow-500">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
                        ${review.verified ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Verified</span>' : ''}
                    </div>
                </div>
                <p class="text-gray-600 mb-2">${review.comment}</p>
                <div class="flex justify-between items-center">
                    <span class="text-xs text-gray-500">${this.formatDate(review.date)}</span>
                    <div class="flex gap-2">
                        ${review.status !== 'approved' ? `
                            <button onclick="manageCourses.approveReview('${review.id}')"
                                class="text-xs text-green-600 hover:text-green-800">
                                Approve
                            </button>
                        ` : ''}
                        ${review.status !== 'hidden' ? `
                            <button onclick="manageCourses.hideReview('${review.id}')"
                                class="text-xs text-red-600 hover:text-red-800">
                                Hide
                            </button>
                        ` : ''}
                        <button onclick="manageCourses.respondToReview('${review.id}')"
                            class="text-xs text-blue-600 hover:text-blue-800">
                            Respond
                        </button>
                    </div>
                </div>
                ${review.response ? `
                    <div class="mt-3 pl-4 border-l-2 border-gray-200">
                        <p class="text-sm text-gray-600">
                            <span class="font-semibold">Admin Response:</span> ${review.response}
                        </p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    async approveReview(reviewId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/course-management/reviews/${reviewId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                this.showNotification('Review approved', 'success');
                this.loadPanelData('reviews');
            }
        } catch (error) {
            this.showNotification('Failed to approve review', 'error');
        }
    }

    async hideReview(reviewId) {
        if (confirm('Are you sure you want to hide this review?')) {
            try {
                const response = await fetch(`${this.API_BASE_URL}/api/course-management/reviews/${reviewId}/hide`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    this.showNotification('Review hidden', 'info');
                    this.loadPanelData('reviews');
                }
            } catch (error) {
                this.showNotification('Failed to hide review', 'error');
            }
        }
    }

    async respondToReview(reviewId) {
        const response = prompt('Enter your response to this review:');
        if (response) {
            try {
                const apiResponse = await fetch(`${this.API_BASE_URL}/api/course-management/reviews/${reviewId}/respond`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ response })
                });

                if (apiResponse.ok) {
                    this.showNotification('Response added successfully', 'success');
                    this.loadPanelData('reviews');
                }
            } catch (error) {
                this.showNotification('Failed to add response', 'error');
            }
        }
    }

    filterReviews() {
        const searchQuery = document.querySelector('#reviews-panel .search-input')?.value.toLowerCase() || '';
        const typeFilter = document.querySelector('#reviews-panel [name="type"]')?.value || '';
        const ratingFilter = document.querySelector('#reviews-panel [name="rating"]')?.value || '';

        let filteredReviews = [...this.reviews];

        // Apply search filter
        if (searchQuery) {
            filteredReviews = filteredReviews.filter(review =>
                review.reviewer?.toLowerCase().includes(searchQuery) ||
                review.comment?.toLowerCase().includes(searchQuery)
            );
        }

        // Apply type filter
        if (typeFilter) {
            filteredReviews = filteredReviews.filter(review => review.type === typeFilter);
        }

        // Apply rating filter
        if (ratingFilter) {
            const minRating = parseInt(ratingFilter);
            filteredReviews = filteredReviews.filter(review => review.rating >= minRating);
        }

        // Update display
        const container = document.getElementById('reviews-list-container');
        if (container) {
            if (filteredReviews.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-gray-400 py-8">
                        <p>No reviews match your filters</p>
                    </div>
                `;
            } else {
                container.innerHTML = filteredReviews.map(review => this.createReviewItem(review)).join('');
            }
        }
    }

    loadAllReviews() {
        this.fetchReviews().then(reviews => {
            this.reviews = reviews;
            this.renderReviews();
            this.updateReviewsStats();
        });
    }

    // ============= Search & Filter =============
    handleSearch(query, panel) {
        this.filters.search = query.toLowerCase();
        if (panel) {
            this.renderCourseTable(panel);
        } else {
            this.renderCourseTable(this.currentPanel);
        }
    }

    handleFilter(filterType, value) {
        this.filters[filterType] = value;
        this.renderCourseTable(this.currentPanel);
    }

    getFilteredCourses(type) {
        let courses = this.coursesData[type] || [];

        // Apply search filter
        if (this.filters.search) {
            courses = courses.filter(course =>
                course.title?.toLowerCase().includes(this.filters.search) ||
                course.category?.toLowerCase().includes(this.filters.search) ||
                course.id?.toLowerCase().includes(this.filters.search) ||
                course.requestedBy?.toLowerCase().includes(this.filters.search)
            );
        }

        // Apply category filter
        if (this.filters.category) {
            courses = courses.filter(course =>
                course.category?.toLowerCase() === this.filters.category.toLowerCase()
            );
        }

        // Apply level filter
        if (this.filters.level) {
            courses = courses.filter(course =>
                course.level?.toLowerCase() === this.filters.level.toLowerCase()
            );
        }

        return courses;
    }

    // ============= Utility Functions =============
    debounce(func, wait) {
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

    formatDate(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        const now = new Date();
        const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));

        if (diff === 0) return 'Today';
        if (diff === 1) return 'Yesterday';
        if (diff < 7) return `${diff} days ago`;
        if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
        return d.toLocaleDateString();
    }

    formatTimeAgo(date) {
        if (!date) return 'Just now';
        const d = new Date(date);
        const now = new Date();
        const diff = Math.floor((now - d) / 1000); // Difference in seconds

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
        return d.toLocaleDateString();
    }

    renderRating(rating) {
        const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
        return `<span class="text-yellow-500">${stars}</span> <span class="text-sm">(${rating || 0})</span>`;
    }

    renderNotificationStatus(sent) {
        return sent ?
            '<span class="text-green-500"><i class="fas fa-check-circle"></i> Sent</span>' :
            '<span class="text-gray-400"><i class="fas fa-times-circle"></i> Not Sent</span>';
    }

    showNotification(message, type = 'info') {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 animate-fadeIn ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
        }`;
        notificationDiv.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fas ${
                    type === 'success' ? 'fa-check-circle' :
                    type === 'error' ? 'fa-exclamation-circle' :
                    type === 'warning' ? 'fa-exclamation-triangle' :
                    'fa-info-circle'
                }"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notificationDiv);

        setTimeout(() => {
            notificationDiv.classList.add('animate-fadeOut');
            setTimeout(() => notificationDiv.remove(), 500);
        }, 3000);
    }

    showLoadingState() {
        document.querySelectorAll('.stat-value').forEach(el => {
            el.classList.add('loading');
        });
    }

    hideLoadingState() {
        document.querySelectorAll('.stat-value').forEach(el => {
            el.classList.remove('loading');
        });
    }

    // ============= Theme Management =============
    initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.applyThemeBackground(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.applyThemeBackground(newTheme);
    }

    applyThemeBackground(theme) {
        if (theme === 'dark') {
            document.body.style.backgroundColor = '#1E1E1E';
            document.documentElement.style.backgroundColor = '#1E1E1E';
        } else {
            document.body.style.backgroundColor = '#ffffff';
            document.documentElement.style.backgroundColor = '#ffffff';
        }
    }

    // ============= Auto Refresh =============
    startAutoRefresh() {
        // Refresh stats every 30 seconds
        this.statsRefreshTimer = setInterval(() => {
            this.fetchStats().then(data => this.updateStats(data));
        }, 30000);

        // Refresh current panel data every 60 seconds
        setInterval(() => {
            this.loadPanelData(this.currentPanel);
        }, 60000);
    }

    // ============= Dashboard Widgets =============
    loadDashboardWidgets() {
        this.loadLiveCourseRequests();
        this.loadDailyQuota();
        this.loadFireStreak();
        this.loadRecentReviews();
    }

    async loadDailyQuota() {
        const container = document.querySelector('.daily-quota-container');
        if (!container) return;

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/course-management/daily-quota`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                container.innerHTML = `
                    <div class="quota-item flex justify-between">
                        <span>Reviews Processed</span>
                        <span class="font-semibold">${data.reviewsProcessed || 12}/${data.reviewsTarget || 20}</span>
                    </div>
                    <div class="quota-item flex justify-between">
                        <span>Courses Approved</span>
                        <span class="font-semibold">${data.coursesApproved || 3}/${data.coursesTarget || 10}</span>
                    </div>
                    <div class="quota-item flex justify-between">
                        <span>Requests Handled</span>
                        <span class="font-semibold">${data.requestsHandled || 8}/${data.requestsTarget || 15}</span>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading daily quota:', error);
            // Use fallback data
            container.innerHTML = `
                <div class="quota-item flex justify-between">
                    <span>Reviews Processed</span>
                    <span class="font-semibold">12/20</span>
                </div>
                <div class="quota-item flex justify-between">
                    <span>Courses Approved</span>
                    <span class="font-semibold">3/10</span>
                </div>
                <div class="quota-item flex justify-between">
                    <span>Requests Handled</span>
                    <span class="font-semibold">8/15</span>
                </div>
            `;
        }
    }

    async loadFireStreak() {
        const streakDays = document.querySelector('.fire-streak-days');
        const streakPattern = document.querySelector('.fire-streak-pattern');

        if (!streakDays || !streakPattern) return;

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/admin/fire-streak`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                streakDays.textContent = data.days || 15;

                // Update pattern
                if (data.pattern && data.pattern.length === 7) {
                    streakPattern.innerHTML = data.pattern.map(active =>
                        `<div class="w-8 h-8 ${active ? 'bg-orange-500' : 'bg-gray-200'} rounded"></div>`
                    ).join('');
                }
            }
        } catch (error) {
            console.error('Error loading fire streak:', error);
            // Use fallback
            streakDays.textContent = '15';
        }
    }

    // ============= Fallback Data =============
    getFallbackStats() {
        return {
            active: 245,
            pending: 12,
            rejected: 8,
            suspended: 3,
            approvalRate: 92,
            avgProcessing: 2.5,
            satisfaction: 94
        };
    }

    getFallbackCourses() {
        return {
            verified: [
                { id: 'CRS-001', title: 'Advanced Mathematics', category: 'Mathematics', level: 'Grade 11-12', students: 1250, rating: 4.8, notificationSent: true },
                { id: 'CRS-002', title: 'Biology Fundamentals', category: 'Science', level: 'Grade 9-10', students: 890, rating: 4.6, notificationSent: false },
                { id: 'CRS-003', title: 'English Literature', category: 'Languages', level: 'Grade 7-8', students: 1100, rating: 4.7, notificationSent: true }
            ],
            requested: [
                { id: 'REQ-001', title: 'Computer Programming', category: 'Technology', level: 'University', requestedBy: 'Sara Tadesse', submittedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
                { id: 'REQ-002', title: 'Business Management', category: 'Business', level: 'Professional', requestedBy: 'Abebe Kebede', submittedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
            ],
            rejected: [
                { id: 'REJ-001', title: 'Advanced Physics', category: 'Science', level: 'University', date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), reason: 'Incomplete curriculum' }
            ],
            suspended: [
                { id: 'SUS-001', title: 'Chemistry Lab', category: 'Science', level: 'Grade 11-12', date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), reason: 'Quality concerns' }
            ]
        };
    }

    getFallbackReviews() {
        return [
            { id: 1, reviewer: 'John Doe', rating: 5, comment: 'Excellent course management system', date: new Date(), type: 'performance', verified: true },
            { id: 2, reviewer: 'Jane Smith', rating: 4, comment: 'Good response time but could be better', date: new Date(Date.now() - 24 * 60 * 60 * 1000), type: 'efficiency' },
            { id: 3, reviewer: 'Abebe Tadesse', rating: 5, comment: 'Very efficient in processing requests', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), type: 'quality', verified: true },
            { id: 4, reviewer: 'Sara Kebede', rating: 3, comment: 'Average service, needs improvement', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), type: 'instructor_feedback' }
        ];
    }

    loadFallbackProfile() {
        const profile = {
            name: 'Course Management Admin',
            location: 'Addis Ababa, Ethiopia',
            quote: 'Excellence in education management',
            department: 'Course Management',
            employeeId: 'ADM-2024-002',
            rating: 4.8,
            achievements: this.getFallbackAchievements(),
            badges: ['✅ Verified', '⭐ Top Rated', '🏆 Expert']
        };
        this.updateProfileDisplay(profile);
    }

    getFallbackAchievements() {
        return [
            { icon: '🏆', name: 'Top Admin' },
            { icon: '⭐', name: '5-Star' },
            { icon: '🎯', name: 'Goal Getter' },
            { icon: '🚀', name: 'Fast Track' },
            { icon: '💎', name: 'Premium' },
            { icon: '🔥', name: 'On Fire' }
        ];
    }

    // ============= Helper Functions =============
    findCourse(courseId) {
        for (const type in this.coursesData) {
            const course = this.coursesData[type].find(c => c.id === courseId);
            if (course) return { ...course, type };
        }
        return null;
    }

    populateViewModal(course) {
        document.getElementById('view-course-title').textContent = course.title;
        document.getElementById('view-course-id').textContent = `ID: ${course.id}`;
        document.getElementById('view-course-category').textContent = course.category;
        document.getElementById('view-course-level').textContent = course.level;
        document.getElementById('view-course-requester').textContent = course.requestedBy || course.instructor || 'N/A';
        document.getElementById('view-course-description').textContent = course.description || 'No description available.';

        // Show/hide sections based on course type
        const ratingSection = document.getElementById('view-course-rating-section');
        const studentsSection = document.getElementById('view-course-students-section');
        const reasonSection = document.getElementById('view-course-reason-section');
        const notificationSection = document.getElementById('view-course-notification-section');

        if (course.type === 'verified') {
            ratingSection?.classList.remove('hidden');
            studentsSection?.classList.remove('hidden');
            notificationSection?.classList.remove('hidden');
            reasonSection?.classList.add('hidden');

            document.getElementById('view-course-rating').innerHTML = `${this.renderRating(course.rating || 0)}`;
            document.getElementById('view-course-students').textContent = course.students || 0;
            document.getElementById('view-course-notification').innerHTML = this.renderNotificationStatus(course.notificationSent);
        } else if (course.type === 'rejected' || course.type === 'suspended') {
            reasonSection?.classList.remove('hidden');
            ratingSection?.classList.add('hidden');
            studentsSection?.classList.add('hidden');
            notificationSection?.classList.add('hidden');

            document.getElementById('view-course-reason-label').textContent =
                course.type === 'rejected' ? 'Rejection Reason' : 'Suspension Reason';
            document.getElementById('view-course-reason').textContent = course.reason || 'No reason provided';
        } else {
            ratingSection?.classList.add('hidden');
            studentsSection?.classList.add('hidden');
            reasonSection?.classList.add('hidden');
            notificationSection?.classList.add('hidden');
        }

        // Update action buttons
        const actionsContainer = document.getElementById('view-course-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = this.getModalActionButtons(course);
        }
    }

    getModalActionButtons(course) {
        switch(course.type) {
            case 'requested':
                return `
                    <button onclick="manageCourses.approveCourse('${course.id}')"
                        class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                        Approve
                    </button>
                    <button onclick="manageCourses.rejectCourse('${course.id}')"
                        class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                        Reject
                    </button>
                `;
            case 'verified':
                return `
                    <button onclick="manageCourses.sendNotification('${course.id}')"
                        class="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                        Send Notification
                    </button>
                    <button onclick="manageCourses.suspendCourse('${course.id}')"
                        class="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                        Suspend
                    </button>
                `;
            case 'rejected':
                return `
                    <button onclick="manageCourses.reconsiderCourse('${course.id}')"
                        class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        Reconsider
                    </button>
                `;
            case 'suspended':
                return `
                    <button onclick="manageCourses.reinstateCourse('${course.id}')"
                        class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                        Reinstate
                    </button>
                `;
            default:
                return '';
        }
    }

    populateEditModal(course) {
        // Implementation for edit modal population
        console.log('Edit modal for course:', course);
        this.showNotification('Edit feature coming soon', 'info');
    }

    loadPanelData(panelName) {
        switch(panelName) {
            case 'dashboard':
                this.loadDashboardWidgets();
                break;
            case 'reviews':
                this.loadAllReviews();
                break;
            case 'requested':
            case 'verified':
            case 'rejected':
            case 'suspended':
                this.fetchCoursesByType(panelName === 'verified' ? 'active' : panelName)
                    .then(courses => {
                        this.coursesData[panelName] = courses;
                        this.renderCourseTable(panelName);
                        this.updatePanelStatistics(panelName);
                    });
                break;
        }
    }

    // ============= Cleanup =============
    destroy() {
        // Clear timers
        if (this.liveWidgetTimer) {
            clearInterval(this.liveWidgetTimer);
        }
        if (this.statsRefreshTimer) {
            clearInterval(this.statsRefreshTimer);
        }

        // Remove event listeners
        document.removeEventListener('keydown', this.escHandler);
    }
}

// Initialize the controller
let manageCourses;

document.addEventListener('DOMContentLoaded', () => {
    manageCourses = new ManageCoursesController();

    // Make it globally accessible for onclick handlers
    window.manageCourses = manageCourses;

    // Expose necessary functions globally for backward compatibility
    window.switchPanel = (panel) => manageCourses.switchPanel(panel);
    window.openAddCourseModal = () => manageCourses.modal.open('add-course-modal');
    window.closeAddCourseModal = () => manageCourses.modal.close('add-course-modal');
    window.openViewCourseModal = () => manageCourses.modal.open('view-course-modal');
    window.closeViewCourseModal = () => manageCourses.modal.close('view-course-modal');
    window.openSendNotificationModal = () => manageCourses.modal.open('send-notification-modal');
    window.closeSendNotificationModal = () => manageCourses.modal.close('send-notification-modal');
    window.openEditProfileModal = () => manageCourses.modal.open('edit-profile-modal');
    window.closeEditProfileModal = () => manageCourses.modal.close('edit-profile-modal');
    window.openUploadProfileModal = () => manageCourses.modal.open('upload-profile-modal');
    window.closeUploadProfileModal = () => manageCourses.modal.close('upload-profile-modal');
    window.openUploadCoverModal = () => manageCourses.modal.open('upload-cover-modal');
    window.closeUploadCoverModal = () => manageCourses.modal.close('upload-cover-modal');

    // Additional modal functions
    window.saveCourse = async () => {
        const courseData = {
            title: document.getElementById('courseTitle').value,
            category: document.getElementById('courseCategory').value,
            level: document.getElementById('courseLevel').value,
            requestedBy: document.getElementById('requestedBy').value,
            description: document.getElementById('courseDescription').value
        };

        if (!courseData.title || !courseData.category || !courseData.level) {
            manageCourses.showNotification('Please fill in all required fields', 'warning');
            return;
        }

        try {
            const response = await fetch(`${manageCourses.API_BASE_URL}/api/course-management/courses`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(courseData)
            });

            if (response.ok) {
                manageCourses.showNotification('Course added successfully', 'success');
                manageCourses.modal.close('add-course-modal');
                manageCourses.loadPanelData(manageCourses.currentPanel);

                // Clear form
                document.getElementById('courseTitle').value = '';
                document.getElementById('courseCategory').value = '';
                document.getElementById('courseLevel').value = '';
                document.getElementById('requestedBy').value = '';
                document.getElementById('courseDescription').value = '';
            } else {
                throw new Error('Failed to add course');
            }
        } catch (error) {
            manageCourses.showNotification('Failed to add course', 'error');
        }
    };

    window.confirmSendNotification = async () => {
        const notificationData = {
            courseId: manageCourses.currentCourseId,
            targetAudience: document.getElementById('targetAudience').value,
            message: document.getElementById('notificationMessage').value
        };

        if (!notificationData.targetAudience) {
            manageCourses.showNotification('Please select a target audience', 'warning');
            return;
        }

        try {
            const response = await fetch(`${manageCourses.API_BASE_URL}/api/course-management/notifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(notificationData)
            });

            if (response.ok) {
                manageCourses.showNotification('Notification sent successfully', 'success');
                manageCourses.modal.close('send-notification-modal');
                manageCourses.loadPanelData(manageCourses.currentPanel);
            } else {
                throw new Error('Failed to send notification');
            }
        } catch (error) {
            manageCourses.showNotification('Failed to send notification', 'error');
        }
    };

    // Profile update functions
    window.handleProfileUpdate = async (event) => {
        event.preventDefault();

        const profileData = {
            name: document.getElementById('adminNameInput').value,
            department: document.getElementById('departmentInput').value,
            employeeId: document.getElementById('employeeIdInput').value,
            bio: document.getElementById('bioInput').value,
            quote: document.getElementById('quoteInput').value
        };

        try {
            const response = await fetch(`${manageCourses.API_BASE_URL}/api/admin/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                manageCourses.showNotification('Profile updated successfully', 'success');
                manageCourses.modal.close('edit-profile-modal');
                manageCourses.updateProfileDisplay(profileData);
            } else {
                throw new Error('Failed to update profile');
            }
        } catch (error) {
            manageCourses.showNotification('Failed to update profile', 'error');
        }
    };

    // Image upload functions
    window.previewProfilePicture = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('profilePreviewImg').src = e.target.result;
                document.getElementById('profilePreview').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    };

    window.handleProfilePictureUpload = async () => {
        const fileInput = document.getElementById('profilePictureInput');
        const file = fileInput.files[0];

        if (!file) {
            manageCourses.showNotification('Please select a file', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('profile_picture', file);

        try {
            const response = await fetch(`${manageCourses.API_BASE_URL}/api/admin/profile-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                manageCourses.showNotification('Profile picture updated successfully', 'success');
                manageCourses.modal.close('upload-profile-modal');

                // Update profile picture in UI
                document.querySelector('.profile-avatar').src = data.url;
            } else {
                throw new Error('Failed to upload profile picture');
            }
        } catch (error) {
            manageCourses.showNotification('Failed to upload profile picture', 'error');
        }
    };

    window.previewCoverImage = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('coverPreviewImg').src = e.target.result;
                document.getElementById('coverPreview').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    };

    window.handleCoverImageUpload = async () => {
        const fileInput = document.getElementById('coverImageInput');
        const file = fileInput.files[0];

        if (!file) {
            manageCourses.showNotification('Please select a file', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('cover_image', file);

        try {
            const response = await fetch(`${manageCourses.API_BASE_URL}/api/admin/cover-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                manageCourses.showNotification('Cover image updated successfully', 'success');
                manageCourses.modal.close('upload-cover-modal');

                // Update cover image in UI
                document.querySelector('.cover-img').src = data.url;
            } else {
                throw new Error('Failed to upload cover image');
            }
        } catch (error) {
            manageCourses.showNotification('Failed to upload cover image', 'error');
        }
    };

    // Placeholder functions for features not yet implemented
    window.openCourseReports = () => manageCourses.showNotification('Course Analytics coming soon', 'info');
    window.openCurriculumGuidelines = () => manageCourses.showNotification('Curriculum Guidelines coming soon', 'info');
    window.openCourseSettings = () => manageCourses.showNotification('Course Settings coming soon', 'info');
    window.logout = () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login.html';
        }
    };

    // Refresh reviews function
    window.ReviewsManager = {
        loadAll: () => manageCourses.loadAllReviews()
    };
});