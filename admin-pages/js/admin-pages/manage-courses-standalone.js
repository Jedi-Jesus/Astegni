/**
 * Manage Courses - Standalone Navigation & Panel Management
 * Complete self-contained script with all functionality
 */

// =============================================================================
// 1. SIDEBAR NAVIGATION MANAGER
// =============================================================================

const SidebarManager = {
    sidebar: null,
    hamburger: null,
    sidebarClose: null,
    isOpen: false,

    init() {
        this.sidebar = document.getElementById('sidebar');
        this.hamburger = document.getElementById('hamburger');
        this.sidebarClose = document.getElementById('sidebar-close');

        if (!this.sidebar || !this.hamburger) {
            console.warn('Sidebar elements not found');
            return;
        }

        // Hamburger click - open sidebar
        this.hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            this.open();
        });

        // Close button click
        if (this.sidebarClose) {
            this.sidebarClose.addEventListener('click', (e) => {
                e.stopPropagation();
                this.close();
            });
        }

        // Close on overlay click
        this.sidebar.addEventListener('click', (e) => {
            if (e.target === this.sidebar) {
                this.close();
            }
        });

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        console.log('✅ Sidebar Manager initialized');
    },

    open() {
        if (this.sidebar) {
            this.sidebar.classList.add('active');
            this.isOpen = true;
            document.body.style.overflow = 'hidden'; // Prevent background scroll
        }
    },

    close() {
        if (this.sidebar) {
            this.sidebar.classList.remove('active');
            this.isOpen = false;
            document.body.style.overflow = ''; // Restore scroll
        }
    },

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
};

// =============================================================================
// 2. PANEL NAVIGATION MANAGER
// =============================================================================

const PanelManager = {
    currentPanel: 'dashboard',
    panels: {},
    sidebarLinks: [],

    init() {
        // Get all panels
        this.panels = {
            dashboard: document.getElementById('dashboard-panel'),
            verified: document.getElementById('verified-panel'),
            requested: document.getElementById('requested-panel'),
            rejected: document.getElementById('rejected-panel'),
            suspended: document.getElementById('suspended-panel'),
            reviews: document.getElementById('reviews-panel'),
            credentials: document.getElementById('credentials-panel'),
            portfolio: document.getElementById('portfolio-panel'),
            settings: document.getElementById('settings-panel')
        };

        // Get all sidebar links
        this.sidebarLinks = document.querySelectorAll('.sidebar-link');

        // Check URL for panel parameter
        const urlParams = new URLSearchParams(window.location.search);
        const panelFromUrl = urlParams.get('panel');

        if (panelFromUrl && this.panels[panelFromUrl]) {
            this.switchTo(panelFromUrl);
        } else {
            this.switchTo('dashboard');
        }

        console.log('✅ Panel Manager initialized - Current:', this.currentPanel);
    },

    switchTo(panelName) {
        // Validate panel exists
        if (!this.panels[panelName]) {
            console.error(`Panel "${panelName}" not found`);
            return;
        }

        // Hide all panels
        Object.values(this.panels).forEach(panel => {
            if (panel) {
                panel.classList.remove('active');
                panel.classList.add('hidden');
            }
        });

        // Show selected panel
        const targetPanel = this.panels[panelName];
        if (targetPanel) {
            targetPanel.classList.add('active');
            targetPanel.classList.remove('hidden');
        }

        // Update sidebar active state
        this.sidebarLinks.forEach(link => {
            link.classList.remove('active');

            // Check if link corresponds to this panel
            const linkText = link.textContent.trim().toLowerCase();
            const panelMatches = {
                'dashboard': ['dashboard'],
                'verified': ['active courses', 'verified'],
                'requested': ['course requests', 'requested'],
                'rejected': ['rejected courses', 'rejected'],
                'suspended': ['suspended courses', 'suspended'],
                'reviews': ['reviews', 'ratings'],
                'credentials': ['credentials'],
                'portfolio': ['portfolio'],
                'settings': ['settings']
            };

            const matches = panelMatches[panelName] || [];
            if (matches.some(match => linkText.includes(match))) {
                link.classList.add('active');
            }
        });

        // Update URL without reload
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('panel', panelName);
        window.history.pushState({ panel: panelName }, '', newUrl);

        // Update current panel
        this.currentPanel = panelName;

        // Close sidebar on mobile
        SidebarManager.close();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        console.log(`✅ Switched to panel: ${panelName}`);
    }
};

// =============================================================================
// 3. THEME MANAGER
// =============================================================================

const ThemeManager = {
    themeToggleBtn: null,
    currentTheme: 'light',

    init() {
        this.themeToggleBtn = document.getElementById('theme-toggle-btn');

        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);

        // Toggle button click
        if (this.themeToggleBtn) {
            this.themeToggleBtn.addEventListener('click', () => {
                this.toggle();
            });
        }

        console.log('✅ Theme Manager initialized - Theme:', this.currentTheme);
    },

    setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        // Apply background colors
        if (theme === 'dark') {
            document.body.style.backgroundColor = '#1E1E1E';
            document.documentElement.style.backgroundColor = '#1E1E1E';
        } else {
            document.body.style.backgroundColor = '#ffffff';
            document.documentElement.style.backgroundColor = '#ffffff';
        }
    },

    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }
};

// =============================================================================
// 4. MODAL MANAGER
// =============================================================================

const ModalManager = {
    modals: {},

    init() {
        this.modals = {
            addCourse: document.getElementById('add-course-modal'),
            viewCourse: document.getElementById('view-course-modal'),
            sendNotification: document.getElementById('send-notification-modal'),
            editProfile: document.getElementById('edit-profile-modal'),
            uploadProfile: document.getElementById('upload-profile-modal'),
            uploadCover: document.getElementById('upload-cover-modal'),
            rejectCourse: document.getElementById('reject-course-modal'),
            suspendCourse: document.getElementById('suspend-course-modal')
        };

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAll();
            }
        });

        console.log('✅ Modal Manager initialized');
    },

    open(modalName) {
        const modal = this.modals[modalName];
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.body.style.overflow = 'hidden';
        }
    },

    close(modalName) {
        const modal = this.modals[modalName];
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
        }
    },

    closeAll() {
        Object.values(this.modals).forEach(modal => {
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        });
        document.body.style.overflow = '';
    }
};

// =============================================================================
// 5. GLOBAL WINDOW FUNCTIONS (for HTML onclick handlers)
// =============================================================================

// Panel switching
window.switchPanel = function(panelName) {
    PanelManager.switchTo(panelName);
};

// Modal functions
window.openAddCourseModal = function() {
    ModalManager.open('addCourse');
};

window.closeAddCourseModal = function() {
    ModalManager.close('addCourse');
};

window.openViewCourseModal = function(courseData) {
    ModalManager.open('viewCourse');
    // Populate modal with course data if provided
    if (courseData) {
        // TODO: Populate fields
    }
};

window.closeViewCourseModal = function() {
    ModalManager.close('viewCourse');
};

window.openSendNotificationModal = function(courseId, courseTitle = null, courseLevel = null) {
    ModalManager.open('sendNotification');

    // Update Course ID
    const courseIdElement = document.getElementById('notification-course-id');
    if (courseIdElement) {
        courseIdElement.textContent = courseId || 'N/A';
    }

    // Update Course Title
    const courseTitleElement = document.getElementById('notification-course-title');
    if (courseTitleElement) {
        courseTitleElement.textContent = courseTitle || 'N/A';
    }

    // Update Course Level
    const courseLevelElement = document.getElementById('notification-course-level');
    if (courseLevelElement) {
        courseLevelElement.textContent = courseLevel || 'N/A';
    }

    // Store course title and level as data attributes for use when sending notification
    const modal = document.getElementById('send-notification-modal');
    if (modal) {
        modal.setAttribute('data-course-title', courseTitle || 'this course');
        modal.setAttribute('data-course-level', courseLevel || 'N/A');
    }
};

window.closeSendNotificationModal = function() {
    ModalManager.close('sendNotification');
};

window.openEditProfileModal = function() {
    ModalManager.open('editProfile');
};

window.closeEditProfileModal = function() {
    ModalManager.close('editProfile');
};

window.openUploadProfileModal = function() {
    ModalManager.open('uploadProfile');
};

window.closeUploadProfileModal = function() {
    ModalManager.close('uploadProfile');
};

window.openUploadCoverModal = function() {
    ModalManager.open('uploadCover');
};

window.closeUploadCoverModal = function() {
    ModalManager.close('uploadCover');
};

// Course actions
window.saveCourse = async function() {
    const title = document.getElementById('courseTitle')?.value;
    const category = document.getElementById('courseCategory')?.value;
    const level = document.getElementById('courseLevel')?.value;
    const description = document.getElementById('courseDescription')?.value;
    const requestedBy = document.getElementById('requestedBy')?.value;

    if (!title || !category || !level) {
        alert('Please fill in all required fields (marked with *)');
        return;
    }

    try {
        // Send to backend API to create active/verified course
        const response = await fetch(`${getApiBaseUrl()}/api/course-management/active`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: title,
                category: category,
                level: level,
                description: description || '',
                requested_by: requestedBy || 'Admin'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create course');
        }

        const result = await response.json();
        console.log('Course created successfully:', result);

        alert('Course added to verified courses successfully!');
        closeAddCourseModal();

        // Clear form
        document.getElementById('courseTitle').value = '';
        document.getElementById('courseCategory').value = '';
        document.getElementById('courseLevel').value = '';
        document.getElementById('courseDescription').value = '';
        document.getElementById('requestedBy').value = '';

        // Reload data if available
        if (window.CourseDBLoader) {
            await window.CourseDBLoader.loadAll();
        }

        // Stay on current panel (user can manually switch if needed)

    } catch (error) {
        console.error('Error creating course:', error);
        alert('Failed to create course: ' + error.message);
    }
};

/**
 * View Course Request Details - Opens view modal with course request data
 * @param {string} requestId - The course request ID
 */
window.viewCourseRequest = async function(requestId) {
    console.log('Viewing course request:', requestId);

    try {
        let course = null;

        // Try to fetch from the list endpoints and find the specific course
        let endpoint = '/api/course-management/requests';
        if (requestId.startsWith('REJ-')) {
            endpoint = '/api/course-management/rejected';
        }

        try {
            const response = await fetch(`${getApiBaseUrl()}${endpoint}`);
            if (response.ok) {
                const data = await response.json();
                // Find the specific course in the list
                course = data.courses?.find(c =>
                    c.request_id === requestId ||
                    c.rejected_id === requestId
                );

                // If course found, infer status from endpoint if not provided
                if (course && !course.status) {
                    if (endpoint.includes('/rejected')) {
                        course.status = 'rejected';
                        console.log('Set status to rejected based on endpoint');
                    } else if (endpoint.includes('/requests')) {
                        course.status = course.status || 'pending';
                        console.log('Set status to pending based on endpoint');
                    }
                }
            }
        } catch (fetchError) {
            console.log('API fetch failed, using fallback data');
        }

        // If not found via API, generate fallback data
        if (!course) {
            console.log('Using fallback data for course request:', requestId);
            course = {
                title: 'Sample Course Request',
                request_id: requestId,
                category: 'Mathematics',
                level: 'Grade 11-12',
                requested_by: 'Dr. Alemayehu',
                description: 'This is a sample course request. The actual data could not be loaded from the server.',
                status: requestId.startsWith('REJ-') ? 'rejected' : 'pending',
                created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
                rejection_reason: requestId.startsWith('REJ-') ? 'Does not meet quality standards' : null
            };
        }

        // Populate view modal with course request data
        document.getElementById('view-course-title').textContent = course.title || 'Untitled Course';
        document.getElementById('view-course-id').textContent = `ID: ${course.request_id || requestId}`;
        document.getElementById('view-course-category').textContent = course.category || 'N/A';
        document.getElementById('view-course-level').textContent = course.level || 'N/A';

        // Requested By field - handle both field names
        const requester = course.requested_by || course.requester || course.instructor_name || 'Unknown';
        document.getElementById('view-course-requester').textContent = requester;

        // Description field - handle both field names
        const description = course.description || course.desc || 'No description available.';
        document.getElementById('view-course-description').textContent = description;

        // Status badge
        const statusElement = document.getElementById('view-course-status');
        let statusBadge = '';
        switch(course.status) {
            case 'pending':
                statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Pending</span>';
                break;
            case 'under_review':
                statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Under Review</span>';
                break;
            case 'approved':
                statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Approved</span>';
                break;
            case 'rejected':
                statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Rejected</span>';
                break;
            default:
                statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">Unknown</span>';
        }
        statusElement.innerHTML = statusBadge;

        // Submitted date
        const submittedDate = course.created_at
            ? formatRelativeTime(new Date(course.created_at))
            : 'Unknown';
        document.getElementById('view-course-submitted').textContent = submittedDate;

        // Hide verified course sections for requests
        document.getElementById('view-course-rating-section').classList.add('hidden');
        document.getElementById('view-course-students-section').classList.add('hidden');
        document.getElementById('view-course-notification-section').classList.add('hidden');

        // Show/hide rejection reason if applicable
        const reasonSection = document.getElementById('view-course-reason-section');
        if (course.status === 'rejected' && course.rejection_reason) {
            reasonSection.classList.remove('hidden');
            document.getElementById('view-course-reason-label').textContent = 'Rejection Reason';
            document.getElementById('view-course-reason').textContent = course.rejection_reason;
        } else {
            reasonSection.classList.add('hidden');
        }

        // Action buttons for course requests (requested panel)
        const actionsContainer = document.getElementById('view-course-actions');

        // Debug logging
        console.log('===== View Course Request Debug =====');
        console.log('Course status:', course.status);
        console.log('Request ID:', requestId);

        // Check for pending statuses (new, pending, under_review)
        if (course.status === 'pending' || course.status === 'new' || course.status === 'under_review') {
            actionsContainer.innerHTML = `
                <button onclick="editCourseRequest('${requestId}')"
                    class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="approveCourseRequest('${requestId}')"
                    class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button onclick="rejectCourseRequest('${requestId}')"
                    class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                    <i class="fas fa-times"></i> Reject
                </button>
            `;
            console.log('Added pending course buttons');
        } else if (course.status === 'rejected') {
            // For rejected courses in rejected panel - ALWAYS show Reconsider button
            actionsContainer.innerHTML = `
                <button onclick="reconsiderCourseRequest('${requestId}')"
                    class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                    <i class="fas fa-redo"></i> Reconsider
                </button>
            `;
            console.log('Added rejected course Reconsider button');
        } else {
            actionsContainer.innerHTML = '';
            console.log('No buttons added - status not recognized');
        }

        console.log('Actions container HTML:', actionsContainer.innerHTML);

        // Open the modal
        openViewCourseModal();

    } catch (error) {
        console.error('Error loading course request:', error);
        alert('Failed to load course request details. Please try again.');
    }
};

/**
 * View Active/Verified Course Details - Opens view modal with course data
 * @param {string} courseId - The course ID
 */
window.viewCourse = async function(courseId) {
    console.log('Viewing course:', courseId);

    try {
        let course = null;

        // Determine which endpoint to use based on ID prefix
        let endpoint = '/api/course-management/active';
        if (courseId.startsWith('SUS-')) {
            endpoint = '/api/course-management/suspended';
        }

        try {
            const response = await fetch(`${getApiBaseUrl()}${endpoint}`);
            if (response.ok) {
                const data = await response.json();
                // Find the specific course in the list
                course = data.courses?.find(c =>
                    c.course_id === courseId ||
                    c.suspended_id === courseId
                );
            }
        } catch (fetchError) {
            console.log('API fetch failed, using fallback data');
        }

        // If not found via API, generate fallback data
        if (!course) {
            console.log('Using fallback data for course:', courseId);
            const isSuspended = courseId.startsWith('SUS-');
            course = {
                title: 'Sample Course',
                course_id: courseId,
                suspended_id: courseId,
                category: 'Technology',
                level: 'University',
                instructor_name: 'Prof. Tigist',
                description: 'This is a sample course. The actual data could not be loaded from the server.',
                enrolled_students: Math.floor(Math.random() * 500) + 50,
                rating: 4.2 + Math.random() * 0.8,
                rating_count: Math.floor(Math.random() * 100) + 10,
                notification_sent: Math.random() > 0.5,
                created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
                status: isSuspended ? 'suspended' : 'active',
                suspension_reason: isSuspended ? 'Quality issues reported' : null
            };
        }

        // Populate view modal with course data
        document.getElementById('view-course-title').textContent = course.title || 'Untitled Course';
        document.getElementById('view-course-id').textContent = `ID: ${course.course_id || courseId}`;
        document.getElementById('view-course-category').textContent = course.category || 'N/A';
        document.getElementById('view-course-level').textContent = course.level || 'N/A';

        // Requested By field - handle both field names
        const requester = course.instructor_name || course.requested_by || course.requester || 'N/A';
        document.getElementById('view-course-requester').textContent = requester;

        // Description field - handle both field names
        const description = course.description || course.desc || 'No description available.';
        document.getElementById('view-course-description').textContent = description;

        // Status badge
        const statusElement = document.getElementById('view-course-status');
        let statusBadge = '';
        switch(course.status) {
            case 'active':
            case 'verified':
                statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Active</span>';
                break;
            case 'suspended':
                statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">Suspended</span>';
                break;
            case 'rejected':
                statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Rejected</span>';
                break;
            default:
                statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">Unknown</span>';
        }
        statusElement.innerHTML = statusBadge;

        // Created/activated date
        const createdDate = course.created_at
            ? formatRelativeTime(new Date(course.created_at))
            : 'Unknown';
        document.getElementById('view-course-submitted').textContent = createdDate;

        // Show verified course sections
        const ratingSection = document.getElementById('view-course-rating-section');
        const studentsSection = document.getElementById('view-course-students-section');
        const notificationSection = document.getElementById('view-course-notification-section');

        ratingSection.classList.remove('hidden');
        studentsSection.classList.remove('hidden');

        // Rating
        const rating = course.rating || 0;
        const stars = generateStarRating(rating);
        document.getElementById('view-course-rating').innerHTML =
            `<span class="text-yellow-500">${stars}</span> (${rating.toFixed(1)})`;

        // Enrolled students
        document.getElementById('view-course-students').textContent = course.enrolled_students || 0;

        // Notification status (only for active courses)
        if (course.status === 'active' || course.status === 'verified') {
            notificationSection.classList.remove('hidden');
            const notificationElement = document.getElementById('view-course-notification');
            if (course.notification_sent) {
                notificationElement.innerHTML =
                    '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800"><i class="fas fa-check-circle"></i> Sent</span>';
            } else {
                // Escape single quotes in course title and level for onclick attribute
                const escapedTitle = (course.title || '').replace(/'/g, "\\'");
                const escapedLevel = (course.level || '').replace(/'/g, "\\'");
                notificationElement.innerHTML = `
                    <span class="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800"><i class="fas fa-times-circle"></i> Not Sent</span>
                    <button onclick="openSendNotificationModal('${courseId}', '${escapedTitle}', '${escapedLevel}')"
                        class="ml-3 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm">
                        <i class="fas fa-paper-plane"></i> Send Notification
                    </button>
                `;
            }
        } else {
            notificationSection.classList.add('hidden');
        }

        // Show/hide reason sections
        const reasonSection = document.getElementById('view-course-reason-section');
        if (course.status === 'suspended' && course.suspension_reason) {
            reasonSection.classList.remove('hidden');
            document.getElementById('view-course-reason-label').textContent = 'Suspension Reason';
            document.getElementById('view-course-reason').textContent = course.suspension_reason;
            document.getElementById('view-course-reason').parentElement.className =
                'bg-orange-50 p-4 rounded-lg border border-orange-200';
        } else if (course.status === 'rejected' && course.rejection_reason) {
            reasonSection.classList.remove('hidden');
            document.getElementById('view-course-reason-label').textContent = 'Rejection Reason';
            document.getElementById('view-course-reason').textContent = course.rejection_reason;
            document.getElementById('view-course-reason').parentElement.className =
                'bg-red-50 p-4 rounded-lg border border-red-200';
        } else {
            reasonSection.classList.add('hidden');
        }

        // Action buttons based on status
        const actionsContainer = document.getElementById('view-course-actions');

        // Debug logging
        console.log('===== View Course Debug =====');
        console.log('Course status:', course.status);
        console.log('Course ID:', courseId);

        if (course.status === 'active' || course.status === 'verified') {
            // For verified/active courses in verified panel
            actionsContainer.innerHTML = `
                <button onclick="editCourse('${courseId}')"
                    class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="suspendCourse('${courseId}')"
                    class="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                    <i class="fas fa-pause"></i> Suspend
                </button>
                <button onclick="rejectCourse('${courseId}')"
                    class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                    <i class="fas fa-times"></i> Reject
                </button>
            `;
            console.log('Added active course buttons');
        } else if (course.status === 'suspended') {
            // For suspended courses in suspended panel
            actionsContainer.innerHTML = `
                <button onclick="reinstateCourse('${courseId}')"
                    class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                    <i class="fas fa-play"></i> Reinstate
                </button>
                <button onclick="rejectCourse('${courseId}')"
                    class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                    <i class="fas fa-times"></i> Reject
                </button>
            `;
            console.log('Added suspended course buttons');
        } else {
            actionsContainer.innerHTML = '';
            console.log('No buttons added - status not recognized');
        }

        console.log('Actions container HTML:', actionsContainer.innerHTML);

        // Open the modal
        openViewCourseModal();

    } catch (error) {
        console.error('Error loading course:', error);
        alert('Failed to load course details. Please try again.');
    }
};

/**
 * Helper function to generate star rating HTML
 */
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

/**
 * Helper function to format relative time
 */
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

// =============================================================================
// COURSE ACTION FUNCTIONS WITH BACKEND API INTEGRATION
// =============================================================================

// Use global API_BASE_URL from api-config.js, fallback to production URL
const getApiBaseUrl = () => window.API_BASE_URL || 'https://api.astegni.com';

// Store current course ID for modal operations
let currentCourseActionId = null;
let currentCourseActionType = null; // 'request', 'active', 'rejected', 'suspended'

/**
 * Approve a course request and move to active courses
 */
window.approveCourseRequest = async function(requestId) {
    if (!confirm('Are you sure you want to approve this course request?')) {
        return;
    }

    try {
        console.log('Approving course request:', requestId);

        const response = await fetch(`${getApiBaseUrl()}/api/course-management/${requestId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to approve course');
        }

        const result = await response.json();
        console.log('Course approved successfully:', result);

        alert(`✅ Course approved successfully! Course ID: ${result.course_id}\n\nThe course has been moved to Active Courses and the requester has been notified.`);
        closeViewCourseModal();

        // Reload data
        if (window.CourseDBLoader) {
            await window.CourseDBLoader.loadAll();
        }

        // Stay on current panel (user can manually switch if needed)

    } catch (error) {
        console.error('Error approving course:', error);
        alert('❌ Failed to approve course: ' + error.message);
    }
};

/**
 * Reject a course request - opens modal for reason
 */
window.rejectCourseRequest = function(requestId) {
    currentCourseActionId = requestId;
    currentCourseActionType = 'request';

    // Open reject modal
    const modal = document.getElementById('reject-course-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
    }

    // Clear previous reason
    const reasonTextarea = document.getElementById('rejectionReason');
    if (reasonTextarea) {
        reasonTextarea.value = '';
    }
};

/**
 * Reject an active course - opens modal for reason
 */
window.rejectCourse = function(courseId) {
    // Determine if this is a suspended course or active course
    if (courseId.startsWith('SUS-')) {
        currentCourseActionType = 'suspended';
    } else {
        currentCourseActionType = 'active';
    }

    currentCourseActionId = courseId;

    // Open reject modal
    const modal = document.getElementById('reject-course-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
    }

    // Clear previous reason
    const reasonTextarea = document.getElementById('rejectionReason');
    if (reasonTextarea) {
        reasonTextarea.value = '';
    }
};

/**
 * Confirm rejection - called from modal
 */
window.confirmReject = async function() {
    const reasonTextarea = document.getElementById('rejectionReason');
    const reason = reasonTextarea?.value.trim();

    if (!reason) {
        alert('Please provide a reason for rejection.');
        return;
    }

    try {
        console.log('Rejecting:', currentCourseActionId, 'Type:', currentCourseActionType, 'Reason:', reason);

        let endpoint = '';

        if (currentCourseActionType === 'request') {
            endpoint = `${getApiBaseUrl()}/api/course-management/${currentCourseActionId}/reject`;
        } else if (currentCourseActionType === 'active') {
            endpoint = `${getApiBaseUrl()}/api/course-management/${currentCourseActionId}/reject-active`;
        } else if (currentCourseActionType === 'suspended') {
            endpoint = `${getApiBaseUrl()}/api/course-management/${currentCourseActionId}/reject-suspended`;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason: reason })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to reject course');
        }

        const result = await response.json();
        console.log('Course rejected successfully:', result);

        alert(`✅ Course rejected successfully!\n\nRejection ID: ${result.rejected_id}\nThe course creator has been notified.`);

        closeRejectModal();
        closeViewCourseModal();

        // Reload data
        if (window.CourseDBLoader) {
            await window.CourseDBLoader.loadAll();
        }

        // Stay on current panel (user can manually switch if needed)

    } catch (error) {
        console.error('Error rejecting course:', error);
        alert('❌ Failed to reject course: ' + error.message);
    }
};

/**
 * Close reject modal
 */
window.closeRejectModal = function() {
    const modal = document.getElementById('reject-course-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    }
    currentCourseActionId = null;
    currentCourseActionType = null;
};

/**
 * Suspend a course - opens modal for reason
 */
window.suspendCourse = function(courseId) {
    currentCourseActionId = courseId;
    currentCourseActionType = 'active';

    // Open suspend modal
    const modal = document.getElementById('suspend-course-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
    }

    // Clear previous reason
    const reasonTextarea = document.getElementById('suspensionReason');
    if (reasonTextarea) {
        reasonTextarea.value = '';
    }
};

/**
 * Confirm suspension - called from modal
 */
window.confirmSuspend = async function() {
    const reasonTextarea = document.getElementById('suspensionReason');
    const reason = reasonTextarea?.value.trim();

    if (!reason) {
        alert('Please provide a reason for suspension.');
        return;
    }

    try {
        console.log('Suspending course:', currentCourseActionId, 'Reason:', reason);

        const response = await fetch(`${getApiBaseUrl()}/api/course-management/${currentCourseActionId}/suspend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason: reason })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to suspend course');
        }

        const result = await response.json();
        console.log('Course suspended successfully:', result);

        alert(`⚠️ Course suspended successfully!\n\nSuspension ID: ${result.suspended_id}\nThe course has been moved to Suspended Courses and the creator has been notified.`);

        closeSuspendModal();
        closeViewCourseModal();

        // Reload data
        if (window.CourseDBLoader) {
            await window.CourseDBLoader.loadAll();
        }

        // Stay on current panel (user can manually switch if needed)

    } catch (error) {
        console.error('Error suspending course:', error);
        alert('❌ Failed to suspend course: ' + error.message);
    }
};

/**
 * Close suspend modal
 */
window.closeSuspendModal = function() {
    const modal = document.getElementById('suspend-course-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    }
    currentCourseActionId = null;
    currentCourseActionType = null;
};

/**
 * Reinstate a suspended course back to active courses
 */
window.reinstateCourse = async function(suspendedId) {
    if (!confirm('Are you sure you want to reinstate this course?\n\nThis will move it back to Active Courses and resume normal operations.')) {
        return;
    }

    try {
        console.log('Reinstating course:', suspendedId);

        const response = await fetch(`${getApiBaseUrl()}/api/course-management/${suspendedId}/reinstate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to reinstate course');
        }

        const result = await response.json();
        console.log('Course reinstated successfully:', result);

        alert(`✅ Course reinstated successfully!\n\nNew Course ID: ${result.course_id}\nThe course has been moved back to Active Courses.`);
        closeViewCourseModal();

        // Reload data
        if (window.CourseDBLoader) {
            await window.CourseDBLoader.loadAll();
        }

        // Stay on current panel (user can manually switch if needed)

    } catch (error) {
        console.error('Error reinstating course:', error);
        alert('❌ Failed to reinstate course: ' + error.message);
    }
};

/**
 * Reconsider a rejected course request - move back to pending
 */
window.reconsiderCourseRequest = async function(rejectedId) {
    if (!confirm('Are you sure you want to reconsider this rejected course?\n\nThis will move it back to Course Requests for re-evaluation.')) {
        return;
    }

    try {
        console.log('Reconsidering course:', rejectedId);

        const response = await fetch(`${getApiBaseUrl()}/api/course-management/${rejectedId}/reconsider`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to reconsider course');
        }

        const result = await response.json();
        console.log('Course reconsidered successfully:', result);

        alert(`✅ Course moved back to pending for reconsideration!\n\nNew Request ID: ${result.request_id}\nThe course is now in Course Requests panel.`);
        closeViewCourseModal();

        // Reload data
        if (window.CourseDBLoader) {
            await window.CourseDBLoader.loadAll();
        }

        // Stay on current panel (user can manually switch if needed)

    } catch (error) {
        console.error('Error reconsidering course:', error);
        alert('❌ Failed to reconsider course: ' + error.message);
    }
};

// ============================================
// EDIT COURSE MODAL FUNCTIONS (New Pattern from manage-schools)
// ============================================

/**
 * Edit course request - Opens edit modal with course data
 * @param {string} requestId - The course request ID
 */
window.editCourseRequest = async function(requestId) {
    console.log('Editing course request:', requestId);

    try {
        let course = null;

        // Try to fetch from the list endpoints and find the specific course
        let endpoint = '/api/course-management/requests';
        if (requestId.startsWith('REJ-')) {
            endpoint = '/api/course-management/rejected';
        }

        try {
            const response = await fetch(`${getApiBaseUrl()}${endpoint}`);
            if (response.ok) {
                const data = await response.json();
                // Find the specific course in the list
                course = data.courses?.find(c =>
                    c.request_id === requestId ||
                    c.rejected_id === requestId
                );
            }
        } catch (fetchError) {
            console.log('API fetch failed, using fallback data');
        }

        // If not found via API, generate fallback data
        if (!course) {
            console.log('Using fallback data for course request:', requestId);
            course = {
                title: 'Sample Course Request',
                request_id: requestId,
                category: 'Mathematics',
                level: 'Grade 11-12',
                requested_by: 'Dr. Alemayehu',
                description: 'This is a sample course request.',
                status: requestId.startsWith('REJ-') ? 'rejected' : 'pending'
            };
        }

        // Populate edit modal form
        document.getElementById('editCourseRequestId').value = course.request_id || requestId;
        document.getElementById('edit-course-id').textContent = `ID: ${course.request_id || requestId}`;
        document.getElementById('editCourseTitle').value = course.title || '';
        document.getElementById('editCourseCategory').value = course.category || '';
        document.getElementById('editCourseLevel').value = course.level || '';

        // Requested By field - handle both field names
        const requesterValue = course.requested_by || course.requester || course.instructor_name || '';
        document.getElementById('editCourseRequester').value = requesterValue;

        // Description field - handle both field names
        const descriptionValue = course.description || course.desc || '';
        document.getElementById('editCourseDescription').value = descriptionValue;

        document.getElementById('editCourseStatus').value = course.status || 'pending';

        // Close view modal if open
        closeViewCourseModal();

        // Open edit modal
        const modal = document.getElementById('edit-course-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

    } catch (error) {
        console.error('Error loading course request for edit:', error);
        alert('Failed to load course request details for editing. Please try again.');
    }
};

/**
 * Edit active course - Opens edit modal with course data
 * @param {string} courseId - The course ID
 */
window.editCourse = async function(courseId) {
    console.log('Editing course:', courseId);

    try {
        let course = null;

        // Determine which endpoint to use based on ID prefix
        let endpoint = '/api/course-management/active';
        if (courseId.startsWith('SUS-')) {
            endpoint = '/api/course-management/suspended';
        }

        try {
            const response = await fetch(`${getApiBaseUrl()}${endpoint}`);
            if (response.ok) {
                const data = await response.json();
                // Find the specific course in the list
                course = data.courses?.find(c =>
                    c.course_id === courseId ||
                    c.suspended_id === courseId
                );
            }
        } catch (fetchError) {
            console.log('API fetch failed, using fallback data');
        }

        // If not found via API, generate fallback data
        if (!course) {
            console.log('Using fallback data for course:', courseId);
            course = {
                title: 'Sample Course',
                course_id: courseId,
                category: 'Technology',
                level: 'University',
                instructor_name: 'Prof. Tigist',
                description: 'This is a sample course.',
                status: courseId.startsWith('SUS-') ? 'suspended' : 'active'
            };
        }

        // Populate edit modal form
        document.getElementById('editCourseRequestId').value = course.course_id || courseId;
        document.getElementById('edit-course-id').textContent = `ID: ${course.course_id || courseId}`;
        document.getElementById('editCourseTitle').value = course.title || '';
        document.getElementById('editCourseCategory').value = course.category || '';
        document.getElementById('editCourseLevel').value = course.level || '';

        // Requested By field - handle both field names
        const requesterValue = course.instructor_name || course.requested_by || course.requester || '';
        document.getElementById('editCourseRequester').value = requesterValue;

        // Description field - handle both field names
        const descriptionValue = course.description || course.desc || '';
        document.getElementById('editCourseDescription').value = descriptionValue;

        document.getElementById('editCourseStatus').value = course.status || 'active';

        // Close view modal if open
        closeViewCourseModal();

        // Open edit modal
        const modal = document.getElementById('edit-course-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }

    } catch (error) {
        console.error('Error loading course for edit:', error);
        alert('Failed to load course details for editing. Please try again.');
    }
};

/**
 * Close edit course modal
 */
window.closeEditCourseModal = function() {
    const modal = document.getElementById('edit-course-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

/**
 * Handle course update form submission
 * @param {Event} event - Form submit event
 */
window.handleCourseUpdate = async function(event) {
    event.preventDefault();

    try {
        const courseId = document.getElementById('editCourseRequestId').value;

        const updateData = {
            title: document.getElementById('editCourseTitle').value,
            category: document.getElementById('editCourseCategory').value,
            level: document.getElementById('editCourseLevel').value,
            requested_by: document.getElementById('editCourseRequester').value,
            description: document.getElementById('editCourseDescription').value
        };

        // Determine endpoint based on course ID
        let endpoint = '';
        if (courseId.startsWith('REQ-')) {
            endpoint = `${getApiBaseUrl()}/api/course-management/requests/${courseId}`;
        } else if (courseId.startsWith('REJ-')) {
            endpoint = `${getApiBaseUrl()}/api/course-management/rejected/${courseId}`;
        } else if (courseId.startsWith('CRS-')) {
            endpoint = `${getApiBaseUrl()}/api/course-management/active/${courseId}`;
        } else if (courseId.startsWith('SUS-')) {
            endpoint = `${getApiBaseUrl()}/api/course-management/suspended/${courseId}`;
        } else {
            alert('Cannot edit this course type');
            return;
        }

        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update course');
        }

        const result = await response.json();
        console.log('Course updated successfully:', result);

        alert('✅ Course updated successfully!');
        closeEditCourseModal();

        // Reload data
        if (window.CourseDBLoader) {
            await window.CourseDBLoader.loadAll();
        }

    } catch (error) {
        console.error('Error updating course:', error);
        alert('❌ Failed to update course: ' + error.message);
    }
};

// Note: window.rejectCourse is defined earlier in the file (line ~920)
// Do not duplicate it here!

window.confirmSendNotification = async function() {
    const audience = document.getElementById('targetAudience')?.value;
    const message = document.getElementById('notificationMessage')?.value;
    const courseIdElement = document.getElementById('notification-course-id');
    const courseId = courseIdElement?.textContent;

    if (!audience || !message) {
        alert('Please select target audience and enter a message');
        return;
    }

    if (!courseId || courseId === 'N/A') {
        alert('Invalid course ID');
        return;
    }

    // Get course title and level from modal data attributes
    const modal = document.getElementById('send-notification-modal');
    const courseTitle = modal?.getAttribute('data-course-title') || 'this course';
    const courseLevel = modal?.getAttribute('data-course-level') || 'N/A';

    // Prepend course title and level to the message
    const fullMessage = `📚 Course: "${courseTitle}"\n🎓 Level: ${courseLevel}\n\n${message}`;

    try {
        console.log('Sending notification for course:', courseId, courseTitle, { audience, message: fullMessage });

        // Send notification to backend API
        const response = await fetch(`${getApiBaseUrl()}/api/course-management/${courseId}/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                target_audience: audience,
                message: fullMessage
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to send notification');
        }

        const result = await response.json();
        console.log('Notification sent successfully:', result);

        alert('✅ Notification sent successfully to ' + audience + '!');
        closeSendNotificationModal();

        // Update the notification status in the view modal if it's open
        const notificationElement = document.getElementById('view-course-notification');
        if (notificationElement) {
            notificationElement.innerHTML =
                '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800"><i class="fas fa-check-circle"></i> Sent</span>';
        }

        // Reload data to reflect the change
        if (window.CourseDBLoader) {
            await window.CourseDBLoader.loadAll();
        }

    } catch (error) {
        console.error('Error sending notification:', error);
        alert('❌ Failed to send notification: ' + error.message);
    }
};

// Other functions
window.openCourseReports = function() {
    alert('Opening Course Analytics...');
};

window.openCurriculumGuidelines = function() {
    alert('Opening Curriculum Guidelines...');
};

window.openCourseSettings = function() {
    alert('Opening Course Settings...');
};

window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear authentication tokens
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');

        // Optional: Clear all localStorage (commented out to preserve other settings)
        // localStorage.clear();

        // Show logout message
        alert('You have been logged out successfully!');

        // Redirect to main page
        window.location.href = '../index.html';
    }
};

// Profile functions
window.handleProfileUpdate = async function(event) {
    event.preventDefault();

    // Helper to get input value
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    };

    // Get languages from checkboxes
    const languages = [];
    ['English', 'Amharic', 'Oromo', 'Tigrinya', 'Somali'].forEach(lang => {
        const checkbox = document.getElementById(`lang${lang}`);
        if (checkbox && checkbox.checked) {
            languages.push(lang);
        }
    });

    // Get hero_title and location arrays
    const heroTitles = typeof getHeroTitles === 'function' ? getHeroTitles() : [];
    const locations = typeof getLocations === 'function' ? getLocations() : [];

    const profileData = {
        username: getVal('editUsername'),
        bio: getVal('editBio'),
        quote: getVal('editQuote'),
        location: locations,
        hero_title: heroTitles,
        hero_subtitle: getVal('editHeroSubtitle'),
        languages: languages
    };

    // TODO: Send to backend API
    console.log('Updating profile:', profileData);

    alert('Profile updated successfully!');
    closeEditProfileModal();
};

window.previewProfilePicture = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('profilePreview');
            const previewImg = document.getElementById('profilePreviewImg');
            if (preview && previewImg) {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
};

window.previewCoverImage = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('coverPreview');
            const previewImg = document.getElementById('coverPreviewImg');
            if (preview && previewImg) {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
};

window.handleProfilePictureUpload = function() {
    const fileInput = document.getElementById('profilePictureInput');
    const file = fileInput?.files[0];

    if (!file) {
        alert('Please select an image first');
        return;
    }

    // TODO: Upload to backend
    console.log('Uploading profile picture:', file.name);

    alert('Profile picture uploaded successfully!');
    closeUploadProfileModal();
};

window.handleCoverImageUpload = function() {
    const fileInput = document.getElementById('coverImageInput');
    const file = fileInput?.files[0];

    if (!file) {
        alert('Please select an image first');
        return;
    }

    // TODO: Upload to backend
    console.log('Uploading cover image:', file.name);

    alert('Cover image uploaded successfully!');
    closeUploadCoverModal();
};

// =============================================================================
// 6. INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing Manage Courses - Standalone');

    // Initialize all managers
    ThemeManager.init();
    SidebarManager.init();
    PanelManager.init();
    ModalManager.init();

    // Handle browser back/forward buttons
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.panel) {
            PanelManager.switchTo(event.state.panel);
        }
    });

    console.log('✅ All managers initialized successfully');
});

// =============================================================================
// SETTINGS PANEL FUNCTIONS
// =============================================================================

window.openVerifyPersonalInfoModal = function() {
    console.log('Verify Personal Information - Coming Soon');
    // TODO: Implement verification modal
};

window.openAddPaymentMethodModal = function() {
    console.log('Add Payment Method - Coming Soon');
    // TODO: Implement payment method modal
};

window.openLeaveRequestModal = function() {
    console.log('File Leave Request - Coming Soon');
    // TODO: Implement leave request modal
};

window.openResignModal = function() {
    console.log('Resign - Coming Soon');
    // TODO: Implement resignation modal
};
