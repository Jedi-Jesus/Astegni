/**
 * Unified Manage Courses Module
 * Consolidates all functionality for the manage-courses page
 */

class ManageCoursesController {
    constructor() {
        this.currentPanel = 'dashboard';
        this.currentCourseId = null;
        this.filters = {
            search: '',
            category: '',
            level: '',
            rating: '',
            type: ''
        };
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
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialData();
        this.initializeTheme();
        this.restorePanel();
        this.startAutoRefresh();
    }

    // ============= Event Listeners =============
    setupEventListeners() {
        // Panel switching
        document.querySelectorAll('[data-panel]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPanel(link.dataset.panel);
            });
        });

        // Search inputs
        document.querySelectorAll('.search-input').forEach(input => {
            input.addEventListener('input', this.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
        });

        // Filter selects
        document.querySelectorAll('.filter-select').forEach(select => {
            select.addEventListener('change', (e) => {
                this.handleFilter(e.target.name, e.target.value);
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

        // ESC key for modals
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
            // Load all data concurrently
            const [statsData, coursesData, reviewsData] = await Promise.all([
                this.fetchStats(),
                this.fetchCourses(),
                this.fetchReviews()
            ]);

            this.updateStats(statsData);
            this.updateCourses(coursesData);
            this.updateReviews(reviewsData);

            // Load dashboard specific data
            if (this.currentPanel === 'dashboard') {
                this.loadDashboardWidgets();
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.loadFallbackData();
        }
    }

    async fetchStats() {
        try {
            const response = await fetch('/api/admin/course-stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
        return this.getFallbackStats();
    }

    async fetchCourses() {
        try {
            const response = await fetch('/api/admin/courses', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
        return this.getFallbackCourses();
    }

    async fetchReviews() {
        try {
            const response = await fetch('/api/admin/reviews', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        }
        return this.getFallbackReviews();
    }

    // ============= UI Updates =============
    updateStats(data) {
        this.stats = data;

        // Update all stat cards
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

    updateCourses(data) {
        this.coursesData = data;
        this.renderCourseTable(this.currentPanel);
    }

    updateReviews(data) {
        this.reviews = data;
        this.renderReviews();
    }

    renderCourseTable(panelType) {
        const tableBody = document.querySelector(`#${panelType}-panel tbody`);
        if (!tableBody) return;

        const courses = this.getFilteredCourses(panelType);

        if (courses.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-8 text-gray-500">
                        No courses found
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = courses.map(course => this.createCourseRow(course, panelType)).join('');
    }

    createCourseRow(course, type) {
        const actionButtons = this.getActionButtons(course, type);

        return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="p-4">
                    <div class="font-semibold">${course.title}</div>
                    <div class="text-sm text-gray-500">ID: ${course.id}</div>
                </td>
                <td class="p-4">${course.category}</td>
                <td class="p-4">${course.level}</td>
                ${type === 'verified' ? `
                    <td class="p-4">${course.students || 0}</td>
                    <td class="p-4">${this.renderRating(course.rating)}</td>
                    <td class="p-4">${this.renderNotificationStatus(course.notificationSent)}</td>
                ` : type === 'requested' ? `
                    <td class="p-4">${course.requestedBy || 'N/A'}</td>
                    <td class="p-4">${this.formatDate(course.submittedDate)}</td>
                ` : `
                    <td class="p-4">${this.formatDate(course.date)}</td>
                    <td class="p-4">${course.reason || 'N/A'}</td>
                `}
                <td class="p-4">
                    <div class="flex gap-2">
                        ${actionButtons}
                    </div>
                </td>
            </tr>
        `;
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
            reinstate: `<button onclick="manageCourses.reinstateCourse('${course.id}')" class="text-green-500 hover:text-green-700" title="Reinstate"><i class="fas fa-play"></i></button>`
        };

        switch(type) {
            case 'verified':
                return `${buttons.view} ${buttons.edit} ${buttons.notify} ${buttons.suspend}`;
            case 'requested':
                return `${buttons.view} ${buttons.approve} ${buttons.reject}`;
            case 'rejected':
                return `${buttons.view} ${buttons.approve} ${buttons.delete}`;
            case 'suspended':
                return `${buttons.view} ${buttons.reinstate} ${buttons.delete}`;
            default:
                return buttons.view;
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
                const response = await fetch(`/api/admin/courses/${courseId}/approve`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    this.showNotification('Course approved successfully', 'success');
                    this.loadPanelData(this.currentPanel);
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
                const response = await fetch(`/api/admin/courses/${courseId}/reject`, {
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
                }
            } catch (error) {
                this.showNotification('Failed to reject course', 'error');
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

    // ============= Search & Filter =============
    handleSearch(query) {
        this.filters.search = query.toLowerCase();
        this.renderCourseTable(this.currentPanel);
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
                course.title.toLowerCase().includes(this.filters.search) ||
                course.category.toLowerCase().includes(this.filters.search) ||
                course.id.toLowerCase().includes(this.filters.search)
            );
        }

        // Apply category filter
        if (this.filters.category) {
            courses = courses.filter(course =>
                course.category === this.filters.category
            );
        }

        // Apply level filter
        if (this.filters.level) {
            courses = courses.filter(course =>
                course.level === this.filters.level
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

    renderRating(rating) {
        const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
        return `<span class="text-yellow-500">${stars}</span> <span class="text-sm">(${rating})</span>`;
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
            'bg-blue-500'
        }`;
        notificationDiv.textContent = message;

        document.body.appendChild(notificationDiv);

        setTimeout(() => {
            notificationDiv.classList.add('animate-fadeOut');
            setTimeout(() => notificationDiv.remove(), 500);
        }, 3000);
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
        setInterval(() => {
            this.fetchStats().then(data => this.updateStats(data));
        }, 30000);

        // Refresh current panel data every 60 seconds
        setInterval(() => {
            this.loadPanelData(this.currentPanel);
        }, 60000);
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
            { id: 1, reviewer: 'John Doe', rating: 5, comment: 'Excellent course management system', date: new Date(), type: 'performance' },
            { id: 2, reviewer: 'Jane Smith', rating: 4, comment: 'Good response time but could be better', date: new Date(Date.now() - 24 * 60 * 60 * 1000), type: 'efficiency' }
        ];
    }

    // ============= Helper Functions =============
    findCourse(courseId) {
        for (const type in this.coursesData) {
            const course = this.coursesData[type].find(c => c.id === courseId);
            if (course) return course;
        }
        return null;
    }

    populateViewModal(course) {
        document.getElementById('view-course-title').textContent = course.title;
        document.getElementById('view-course-id').textContent = `ID: ${course.id}`;
        document.getElementById('view-course-category').textContent = course.category;
        document.getElementById('view-course-level').textContent = course.level;
        // Add more fields as needed
    }

    loadPanelData(panelName) {
        // Load specific data for the panel
        switch(panelName) {
            case 'dashboard':
                this.loadDashboardWidgets();
                break;
            case 'reviews':
                this.loadAllReviews();
                break;
            default:
                this.renderCourseTable(panelName);
        }
    }

    loadDashboardWidgets() {
        // Load live course requests widget
        this.loadLiveCourseRequests();
        // Load daily quota widget
        this.loadDailyQuota();
        // Load fire streak widget
        this.loadFireStreak();
    }

    async loadLiveCourseRequests() {
        // Implementation for live course requests
        const container = document.querySelector('.course-requests-scroll');
        if (container) {
            container.innerHTML = `
                <div class="course-request-item">
                    <div class="text-sm font-semibold">Mathematics Grade 12</div>
                    <div class="text-xs text-gray-500">2 minutes ago</div>
                </div>
            `;
        }
    }

    async loadDailyQuota() {
        // Implementation for daily quota
        const container = document.querySelector('.daily-quota-container');
        if (container) {
            container.innerHTML = `
                <div class="quota-item">
                    <span>Reviews Processed</span>
                    <span>12/20</span>
                </div>
            `;
        }
    }

    async loadFireStreak() {
        // Implementation for fire streak
        const streakElement = document.querySelector('.fire-streak-days');
        if (streakElement) {
            streakElement.textContent = '15';
        }
    }

    async loadAllReviews() {
        // Load all reviews for the reviews panel
        const container = document.getElementById('reviews-list-container');
        if (container) {
            container.innerHTML = this.reviews.map(review => `
                <div class="review-item border rounded-lg p-4">
                    <div class="flex justify-between mb-2">
                        <span class="font-semibold">${review.reviewer}</span>
                        <span class="text-yellow-500">${'★'.repeat(review.rating)}</span>
                    </div>
                    <p class="text-gray-600">${review.comment}</p>
                    <span class="text-xs text-gray-500">${this.formatDate(review.date)}</span>
                </div>
            `).join('');
        }
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

        try {
            const response = await fetch('/api/admin/courses', {
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

        try {
            const response = await fetch('/api/admin/notifications', {
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
            const response = await fetch('/api/admin/profile', {
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
                // Update UI with new data
                document.getElementById('adminName').textContent = profileData.name;
            }
        } catch (error) {
            manageCourses.showNotification('Failed to update profile', 'error');
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
});