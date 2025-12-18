// ============================================
// STUDENT SESSION REQUESTS MANAGER
// Manages display and filtering of session requests made by the student
// ============================================

const StudentSessionRequestsManager = {
    currentFilter: 'all',
    allRequests: [],

    /**
     * Initialize the manager and load requests
     */
    async initialize() {
        console.log('[StudentSessionRequestsManager] Initializing...');
        await this.loadMyRequests();
    },

    /**
     * Load all session requests made by the current student
     */
    async loadMyRequests() {
        const container = document.getElementById('student-session-requests-list');
        if (!container) {
            console.warn('[StudentSessionRequestsManager] Container not found');
            return;
        }

        try {
            // Show loading state
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                    <p>Loading your session requests...</p>
                </div>
            `;

            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-lock text-3xl mb-3"></i>
                        <p>Please log in to view your session requests</p>
                    </div>
                `;
                return;
            }

            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/session-requests/my-requests', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const requests = await response.json();
            this.allRequests = requests;

            console.log('[StudentSessionRequestsManager] Loaded requests:', requests.length);

            if (requests.length === 0) {
                container.innerHTML = `
                    <div class="card p-8 text-center text-gray-500">
                        <i class="fas fa-inbox text-4xl mb-4"></i>
                        <h3 class="text-xl font-semibold mb-2">No Session Requests Yet</h3>
                        <p class="mb-4">You haven't requested any tutoring sessions yet.</p>
                        <a href="../branch/find-tutors.html" class="btn-primary inline-block">
                            Find Tutors
                        </a>
                    </div>
                `;
                return;
            }

            // Apply current filter
            this.applyFilter();

        } catch (error) {
            console.error('[StudentSessionRequestsManager] Error loading requests:', error);
            container.innerHTML = `
                <div class="card p-6 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                    <p class="font-semibold">Failed to load session requests</p>
                    <p class="text-sm mt-2">${error.message}</p>
                    <button onclick="StudentSessionRequestsManager.loadMyRequests()" class="btn-primary mt-4">
                        Try Again
                    </button>
                </div>
            `;
        }
    },

    /**
     * Filter requests by status
     */
    filterByStatus(status) {
        this.currentFilter = status;

        // Update tab styling
        document.querySelectorAll('.status-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.status === status) {
                tab.classList.add('active');
            }
        });

        this.applyFilter();
    },

    /**
     * Apply current filter and render
     */
    applyFilter() {
        const container = document.getElementById('student-session-requests-list');
        if (!container) return;

        let filteredRequests = this.allRequests;

        // Filter by status
        if (this.currentFilter !== 'all') {
            filteredRequests = this.allRequests.filter(req => req.status === this.currentFilter);
        }

        if (filteredRequests.length === 0) {
            container.innerHTML = `
                <div class="card p-6 text-center text-gray-500">
                    <i class="fas fa-filter text-3xl mb-3"></i>
                    <p>No ${this.currentFilter === 'all' ? '' : this.currentFilter} requests found</p>
                </div>
            `;
            return;
        }

        // Render filtered requests
        this.renderRequests(filteredRequests);
    },

    /**
     * Render requests list
     */
    renderRequests(requests) {
        const container = document.getElementById('student-session-requests-list');
        if (!container) return;

        const requestsHTML = requests.map(request => this.renderRequestCard(request)).join('');
        container.innerHTML = requestsHTML;
    },

    /**
     * Render a single request card
     */
    renderRequestCard(request) {
        const statusConfig = {
            pending: {
                color: 'orange',
                icon: 'fa-clock',
                text: 'Pending'
            },
            accepted: {
                color: 'green',
                icon: 'fa-check-circle',
                text: 'Accepted'
            },
            rejected: {
                color: 'red',
                icon: 'fa-times-circle',
                text: 'Rejected'
            }
        };

        const config = statusConfig[request.status] || statusConfig.pending;
        const formattedDate = this.formatDate(request.created_at);
        const tutorName = request.requester_name || 'Unknown Tutor';
        const tutorPicture = request.requester_profile_picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(tutorName);

        return `
            <div class="card p-6 mb-4 hover:shadow-lg transition-shadow">
                <div class="flex items-start justify-between mb-4">
                    <!-- Tutor Info -->
                    <div class="flex items-center gap-3">
                        <img src="${tutorPicture}"
                             alt="${tutorName}"
                             class="w-12 h-12 rounded-full object-cover"
                             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(tutorName)}'">
                        <div>
                            <h3 class="font-semibold text-lg">Request to ${tutorName}</h3>
                            <p class="text-sm text-gray-500">
                                <i class="far fa-calendar mr-1"></i>
                                Requested ${formattedDate}
                            </p>
                        </div>
                    </div>

                    <!-- Status Badge -->
                    <span class="px-3 py-1 rounded-full text-sm font-semibold"
                          style="background-color: ${config.color}20; color: ${config.color};">
                        <i class="fas ${config.icon} mr-1"></i>
                        ${config.text}
                    </span>
                </div>

                <!-- Request Details -->
                <div class="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                        <p class="text-sm text-gray-500 mb-1">Package</p>
                        <p class="font-semibold">${request.package_name || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 mb-1">Student</p>
                        <p class="font-semibold">${request.student_name} (${request.student_grade})</p>
                    </div>
                    ${request.preferred_schedule ? `
                    <div class="col-span-2">
                        <p class="text-sm text-gray-500 mb-1">Preferred Schedule</p>
                        <p class="font-semibold">${request.preferred_schedule}</p>
                    </div>
                    ` : ''}
                </div>

                <!-- Message -->
                ${request.message ? `
                <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p class="text-sm text-gray-500 mb-1">Your Message:</p>
                    <p class="text-gray-700 dark:text-gray-300">${request.message}</p>
                </div>
                ` : ''}

                <!-- Response Info (for accepted/rejected) -->
                ${request.responded_at ? `
                <div class="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p class="text-sm text-gray-500">
                        <i class="far fa-clock mr-1"></i>
                        ${request.status === 'accepted' ? 'Accepted' : 'Rejected'} on ${this.formatDate(request.responded_at)}
                    </p>
                </div>
                ` : ''}

                <!-- Action Buttons -->
                <div class="flex gap-2 mt-4">
                    <button onclick="StudentSessionRequestsManager.viewRequestDetails(${request.id})"
                            class="btn-secondary flex-1">
                        <i class="fas fa-eye mr-2"></i>
                        View Details
                    </button>
                    ${request.status === 'accepted' ? `
                    <button onclick="StudentSessionRequestsManager.contactTutor(${request.tutor_id})"
                            class="btn-primary flex-1">
                        <i class="fas fa-comment mr-2"></i>
                        Contact Tutor
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Format date to readable string
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            if (diffHours === 0) {
                const diffMins = Math.floor(diffMs / (1000 * 60));
                return diffMins <= 1 ? 'just now' : `${diffMins} minutes ago`;
            }
            return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else if (diffDays === 1) {
            return 'yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    },

    /**
     * View request details (can be enhanced with a modal)
     */
    viewRequestDetails(requestId) {
        const request = this.allRequests.find(r => r.id === requestId);
        if (!request) return;

        // For now, just log to console
        // You can create a modal to show full details
        console.log('[StudentSessionRequestsManager] Request details:', request);

        alert(`Request Details:\n\n` +
              `Tutor: ${request.requester_name}\n` +
              `Package: ${request.package_name}\n` +
              `Status: ${request.status}\n` +
              `Student: ${request.student_name} (${request.student_grade})\n` +
              `Message: ${request.message || 'No message'}\n` +
              `Requested: ${this.formatDate(request.created_at)}`
        );
    },

    /**
     * Contact tutor (redirect to chat or tutor profile)
     */
    contactTutor(tutorId) {
        // Redirect to tutor's view profile page
        window.location.href = `../view-profiles/view-tutor.html?id=${tutorId}`;
    }
};

// Auto-initialize when panel is switched to
document.addEventListener('DOMContentLoaded', () => {
    // Listen for panel switches
    const originalSwitchPanel = window.switchPanel;
    window.switchPanel = function(panelId) {
        if (typeof originalSwitchPanel === 'function') {
            originalSwitchPanel(panelId);
        }

        // If switching to my-requests panel, load requests
        if (panelId === 'my-requests') {
            StudentSessionRequestsManager.initialize();
        }
    };
});

// Export to window for onclick handlers
window.StudentSessionRequestsManager = StudentSessionRequestsManager;
