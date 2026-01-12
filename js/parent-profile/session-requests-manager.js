// ============================================
// PARENT REQUESTS MANAGER
// Manages display and filtering of all request types for the parent:
// - Courses (from courses table)
// - Schools (from schools table)
// - Sessions (from requested_sessions table)
// - Parenting Invitations (from parent_invitations table)
// ============================================

const ParentRequestsManager = {
    currentType: 'courses',     // courses, schools, sessions, parenting
    currentStatus: 'all',       // all, pending, accepted/verified, rejected
    allData: {
        courses: [],
        schools: [],
        sessions: [],
        parenting: []
    },

    /**
     * Initialize the manager and load all data
     */
    async initialize() {
        console.log('[ParentRequestsManager] Initializing...');

        // Load all data types in parallel
        await Promise.all([
            this.loadCourses(),
            this.loadSchools(),
            this.loadSessions(),
            this.loadParentingInvitations()
        ]);

        // Update counts on filter cards
        this.updateCounts();

        // Render initial view (courses by default)
        this.renderCurrentView();
    },

    /**
     * Load courses from courses table
     */
    async loadCourses() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('[ParentRequestsManager] No token found, skipping courses load');
                return;
            }

            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/my-courses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.allData.courses = data.courses || data || [];
            } else {
                // Log detailed error for debugging
                const errorText = await response.text();
                console.error(`[ParentRequestsManager] Courses API error ${response.status}:`, errorText);
                this.allData.courses = [];
            }
        } catch (error) {
            console.error('[ParentRequestsManager] Error loading courses:', error);
            this.allData.courses = [];
        }
    },

    /**
     * Load schools from schools table
     */
    async loadSchools() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('[ParentRequestsManager] No token found, skipping schools load');
                return;
            }

            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/my-schools`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.allData.schools = data.schools || data || [];
            } else {
                // Log detailed error for debugging
                const errorText = await response.text();
                console.error(`[ParentRequestsManager] Schools API error ${response.status}:`, errorText);
                this.allData.schools = [];
            }
        } catch (error) {
            console.error('[ParentRequestsManager] Error loading schools:', error);
            this.allData.schools = [];
        }
    },

    /**
     * Load session requests from requested_sessions table
     */
    async loadSessions() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/session-requests/my-requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.allData.sessions = data || [];
            }
        } catch (error) {
            console.error('[ParentRequestsManager] Error loading sessions:', error);
            this.allData.sessions = [];
        }
    },

    /**
     * Load parenting invitations from parent_invitations table
     */
    async loadParentingInvitations() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('[ParentRequestsManager] ⚠️ No auth token found - cannot load parenting invitations');
                return;
            }

            console.log('[ParentRequestsManager] 🔄 Loading parenting invitations...');
            const apiUrl = `${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/pending-invitations`;
            console.log('[ParentRequestsManager] API URL:', apiUrl);

            const response = await fetch(apiUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            console.log('[ParentRequestsManager] API response status:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                console.log('[ParentRequestsManager] ✅ API response data:', data);
                console.log('[ParentRequestsManager] Total invitations received:', (data.invitations || []).length);

                this.allData.parenting = data.invitations || [];
                console.log('[ParentRequestsManager] Parenting invitations stored:', this.allData.parenting.length);
                console.log('[ParentRequestsManager] Invitation details:', this.allData.parenting);
            } else {
                const errorText = await response.text();
                console.error('[ParentRequestsManager] ❌ API error response:', errorText);
                console.error('[ParentRequestsManager] Status:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('[ParentRequestsManager] ❌ Error loading parenting invitations:', error);
            console.error('[ParentRequestsManager] Error details:', error.message, error.stack);
            this.allData.parenting = [];
        }
    },

    /**
     * Update counts on filter cards
     */
    updateCounts() {
        const coursesCount = this.allData.courses.length;
        const schoolsCount = this.allData.schools.length;
        const sessionsCount = this.allData.sessions.length;
        const parentingCount = this.allData.parenting.length;

        // Update count badges
        this.updateCountBadge('parent-courses-count', coursesCount);
        this.updateCountBadge('parent-schools-count', schoolsCount);
        this.updateCountBadge('parent-sessions-count', sessionsCount);
        this.updateCountBadge('parent-parenting-invitation-count', parentingCount);
    },

    /**
     * Update a specific count badge
     */
    updateCountBadge(elementId, count) {
        const badge = document.getElementById(elementId);
        if (badge) {
            badge.textContent = count;
            if (count > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    },

    /**
     * Filter by request type (courses, schools, sessions, parenting)
     */
    filterByType(type) {
        this.currentType = type;
        this.currentStatus = 'all'; // Reset status filter

        // Update card styling
        document.querySelectorAll('.request-type-card').forEach(card => {
            card.classList.remove('active');
            if (card.dataset.type === type) {
                card.classList.add('active');
            }
        });

        // Reset status tabs
        document.querySelectorAll('.status-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.status === 'all') {
                tab.classList.add('active');
            }
        });

        this.renderCurrentView();
    },

    /**
     * Filter by status (all, pending, accepted/verified, rejected)
     */
    filterByStatus(status) {
        this.currentStatus = status;

        // Update tab styling
        document.querySelectorAll('.status-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.status === status) {
                tab.classList.add('active');
            }
        });

        this.renderCurrentView();
    },

    /**
     * Get filtered data based on current type and status
     */
    getFilteredData() {
        let data = this.allData[this.currentType] || [];

        if (this.currentStatus !== 'all') {
            data = data.filter(item => {
                const itemStatus = (item.status || '').toLowerCase();
                const filterStatus = this.currentStatus.toLowerCase();

                // Handle different status naming conventions
                if (filterStatus === 'accepted') {
                    return itemStatus === 'accepted' || itemStatus === 'verified';
                }
                return itemStatus === filterStatus;
            });
        }

        return data;
    },

    /**
     * Render current view based on type and status
     */
    renderCurrentView() {
        const container = document.getElementById('parent-requests-list');
        if (!container) return;

        const data = this.getFilteredData();

        if (data.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        let html = '';
        switch (this.currentType) {
            case 'courses':
                html = data.map(item => this.renderCourseCard(item)).join('');
                break;
            case 'schools':
                html = data.map(item => this.renderSchoolCard(item)).join('');
                break;
            case 'sessions':
                html = data.map(item => this.renderSessionCard(item)).join('');
                break;
            case 'parenting':
                html = data.map(item => this.renderParentingCard(item)).join('');
                break;
        }

        container.innerHTML = html;
    },

    /**
     * Render empty state
     */
    renderEmptyState() {
        const messages = {
            courses: {
                icon: 'fa-book',
                title: 'No Course Requests',
                text: 'You haven\'t requested any courses yet.',
                action: 'Browse Courses',
                link: '../branch/courses.html'
            },
            schools: {
                icon: 'fa-school',
                title: 'No School Requests',
                text: 'You haven\'t requested any schools yet.',
                action: 'Browse Schools',
                link: '../branch/schools.html'
            },
            sessions: {
                icon: 'fa-chalkboard-teacher',
                title: 'No Session Requests',
                text: 'You haven\'t requested any tutoring sessions.',
                action: 'Find Tutors',
                link: '../branch/find-tutors.html'
            },
            parenting: {
                icon: 'fa-users',
                title: 'No Parenting Invitations',
                text: 'No students have invited you as their parent yet.',
                action: null,
                link: null
            }
        };

        const msg = messages[this.currentType];
        const statusText = this.currentStatus !== 'all' ? ` (${this.currentStatus})` : '';

        return `
            <div class="card p-8 text-center text-gray-500">
                <i class="fas ${msg.icon} text-4xl mb-4"></i>
                <h3 class="text-xl font-semibold mb-2">${msg.title}${statusText}</h3>
                <p class="mb-4">${msg.text}</p>
                ${msg.action ? `
                <a href="${msg.link}" class="btn-primary inline-block">
                    ${msg.action}
                </a>
                ` : ''}
            </div>
        `;
    },

    /**
     * Render course card
     */
    renderCourseCard(course) {
        const statusConfig = this.getStatusConfig(course.status);
        const formattedDate = this.formatDate(course.created_at);

        return `
            <div class="card p-6 mb-4 hover:shadow-lg transition-shadow">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-4">
                        <img src="${course.thumbnail || '../uploads/system_images/default-course.jpg'}"
                             alt="${course.course_name}"
                             class="w-20 h-20 rounded-lg object-cover"
                             onerror="this.src='../uploads/system_images/default-course.jpg'">
                        <div>
                            <h3 class="font-semibold text-lg">${course.course_name || 'Unnamed Course'}</h3>
                            <p class="text-sm text-gray-500">${course.course_category || 'General'}</p>
                            <p class="text-xs text-gray-400 mt-1">
                                <i class="far fa-calendar mr-1"></i> Requested ${formattedDate}
                            </p>
                        </div>
                    </div>
                    ${this.renderStatusBadge(statusConfig)}
                </div>

                <div class="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                    <div>
                        <p class="text-gray-500">Level</p>
                        <p class="font-semibold">${course.course_level || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-gray-500">Duration</p>
                        <p class="font-semibold">${course.duration ? course.duration + ' hrs' : 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-gray-500">Lessons</p>
                        <p class="font-semibold">${course.lessons || 'N/A'}</p>
                    </div>
                </div>

                ${course.course_description ? `
                <p class="text-sm text-gray-600 mb-4 line-clamp-2">${course.course_description}</p>
                ` : ''}

                <div class="flex gap-2">
                    <button onclick="ParentRequestsManager.viewCourseDetails(${course.id})"
                            class="btn-secondary flex-1">
                        <i class="fas fa-eye mr-2"></i> View Details
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Render school card
     */
    renderSchoolCard(school) {
        const statusConfig = this.getStatusConfig(school.status);
        const formattedDate = this.formatDate(school.created_at);
        const location = school.location ? (typeof school.location === 'object' ?
            `${school.location.city || ''}, ${school.location.region || ''}` : school.location) : 'N/A';

        return `
            <div class="card p-6 mb-4 hover:shadow-lg transition-shadow">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-4">
                        <div class="w-16 h-16 rounded-lg bg-green-100 flex items-center justify-center">
                            <i class="fas fa-school text-2xl text-green-600"></i>
                        </div>
                        <div>
                            <h3 class="font-semibold text-lg">${school.name || 'Unnamed School'}</h3>
                            <p class="text-sm text-gray-500">${school.type || 'School'}</p>
                            <p class="text-xs text-gray-400 mt-1">
                                <i class="fas fa-map-marker-alt mr-1"></i> ${location}
                            </p>
                        </div>
                    </div>
                    ${this.renderStatusBadge(statusConfig)}
                </div>

                <div class="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                    <div>
                        <p class="text-gray-500">Established</p>
                        <p class="font-semibold">${school.established_year || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-gray-500">Students</p>
                        <p class="font-semibold">${school.student_count || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-gray-500">Rating</p>
                        <p class="font-semibold">${school.rating ? school.rating + ' ⭐' : 'N/A'}</p>
                    </div>
                </div>

                ${school.principal ? `
                <p class="text-sm text-gray-600 mb-4">
                    <i class="fas fa-user-tie mr-2"></i> Principal: ${school.principal}
                </p>
                ` : ''}

                <p class="text-xs text-gray-400 mb-4">
                    <i class="far fa-calendar mr-1"></i> Requested ${formattedDate}
                </p>

                <div class="flex gap-2">
                    <button onclick="ParentRequestsManager.viewSchoolDetails(${school.id})"
                            class="btn-secondary flex-1">
                        <i class="fas fa-eye mr-2"></i> View Details
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Render session request card
     */
    renderSessionCard(session) {
        const statusConfig = this.getStatusConfig(session.status);
        const formattedDate = this.formatDate(session.created_at);
        const tutorName = session.requester_name || 'Unknown Tutor';
        const tutorPicture = session.requester_profile_picture ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(tutorName)}&background=6366f1&color=fff`;

        return `
            <div class="card p-6 mb-4 hover:shadow-lg transition-shadow">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <img src="${tutorPicture}"
                             alt="${tutorName}"
                             class="w-14 h-14 rounded-full object-cover"
                             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(tutorName)}&background=6366f1&color=fff'">
                        <div>
                            <h3 class="font-semibold text-lg">Session with ${tutorName}</h3>
                            <p class="text-sm text-gray-500">
                                <i class="far fa-calendar mr-1"></i> Requested ${formattedDate}
                            </p>
                        </div>
                    </div>
                    ${this.renderStatusBadge(statusConfig)}
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                        <p class="text-sm text-gray-500 mb-1">Package</p>
                        <p class="font-semibold">${session.package_name || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 mb-1">Student</p>
                        <p class="font-semibold">${session.student_name || 'N/A'} ${session.student_grade ? `(${session.student_grade})` : ''}</p>
                    </div>
                    ${session.preferred_schedule ? `
                    <div class="col-span-2">
                        <p class="text-sm text-gray-500 mb-1">Preferred Schedule</p>
                        <p class="font-semibold">${session.preferred_schedule}</p>
                    </div>
                    ` : ''}
                </div>

                ${session.message ? `
                <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p class="text-sm text-gray-500 mb-1">Your Message:</p>
                    <p class="text-gray-700 dark:text-gray-300">${session.message}</p>
                </div>
                ` : ''}

                ${session.responded_at ? `
                <div class="pt-3 border-t border-gray-200 dark:border-gray-700 mb-4">
                    <p class="text-sm text-gray-500">
                        <i class="far fa-clock mr-1"></i>
                        ${session.status === 'accepted' ? 'Accepted' : 'Responded'} on ${this.formatDate(session.responded_at)}
                    </p>
                </div>
                ` : ''}

                <div class="flex gap-2">
                    <button onclick="ParentRequestsManager.viewSessionDetails(${session.id})"
                            class="btn-secondary flex-1">
                        <i class="fas fa-eye mr-2"></i> View Details
                    </button>
                    ${session.status === 'accepted' ? `
                    <button onclick="ParentRequestsManager.contactTutor(${session.tutor_id})"
                            class="btn-primary flex-1">
                        <i class="fas fa-comment mr-2"></i> Contact Tutor
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Render parenting invitation card
     * UPDATED: Now uses inviter_name, inviter_type (USER-ID SYSTEM)
     */
    renderParentingCard(invitation) {
        const statusConfig = this.getStatusConfig(invitation.status);
        const formattedDate = this.formatDate(invitation.created_at);
        // UPDATED: Use inviter_name instead of student_name
        const inviterName = invitation.inviter_name || 'Unknown User';
        const inviterType = invitation.inviter_type || 'student';
        const inviterPicture = invitation.student_profile_picture ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(inviterName)}&background=8b5cf6&color=fff`;

        // Determine inviter type badge
        const inviterTypeBadge = inviterType === 'student' ? '👨‍🎓 Student' :
                                 inviterType === 'parent' ? '👨‍👩‍👧 Parent' :
                                 inviterType === 'tutor' ? '👨‍🏫 Tutor' : inviterType;

        return `
            <div class="card p-6 mb-4 hover:shadow-lg transition-shadow">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <img src="${inviterPicture}"
                             alt="${inviterName}"
                             class="w-14 h-14 rounded-full object-cover"
                             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(inviterName)}&background=8b5cf6&color=fff'">
                        <div>
                            <h3 class="font-semibold text-lg">${inviterName}</h3>
                            <p class="text-sm text-gray-500">
                                <span class="px-2 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 mr-1">${inviterTypeBadge}</span>
                                wants you as their <span class="font-semibold text-purple-600">${invitation.relationship_type || 'Parent'}</span>
                            </p>
                            <p class="text-xs text-gray-400 mt-1">
                                <i class="far fa-calendar mr-1"></i> Received ${formattedDate}
                            </p>
                        </div>
                    </div>
                    ${this.renderStatusBadge(statusConfig)}
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div>
                        <p class="text-sm text-gray-500 mb-1">Grade Level</p>
                        <p class="font-semibold">${invitation.grade_level || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 mb-1">School</p>
                        <p class="font-semibold">${invitation.studying_at || 'N/A'}</p>
                    </div>
                </div>

                ${invitation.status === 'pending' ? `
                <div class="flex gap-2">
                    <button onclick="ParentRequestsManager.acceptParentingInvitation(${invitation.id})"
                            class="btn-primary flex-1">
                        <i class="fas fa-check mr-2"></i> Accept
                    </button>
                    <button onclick="ParentRequestsManager.rejectParentingInvitation(${invitation.id})"
                            class="btn-secondary flex-1 text-red-500 border-red-500 hover:bg-red-50">
                        <i class="fas fa-times mr-2"></i> Decline
                    </button>
                </div>
                ` : `
                <div class="flex gap-2">
                    <button onclick="ParentRequestsManager.viewStudentProfile(${invitation.student_profile_id})"
                            class="btn-secondary flex-1">
                        <i class="fas fa-eye mr-2"></i> View Student Profile
                    </button>
                </div>
                `}
            </div>
        `;
    },

    /**
     * Get status configuration for badges
     */
    getStatusConfig(status) {
        const configs = {
            pending: { color: '#f59e0b', bgColor: '#fef3c7', icon: 'fa-clock', text: 'Pending' },
            accepted: { color: '#10b981', bgColor: '#d1fae5', icon: 'fa-check-circle', text: 'Accepted' },
            verified: { color: '#10b981', bgColor: '#d1fae5', icon: 'fa-check-circle', text: 'Verified' },
            rejected: { color: '#ef4444', bgColor: '#fee2e2', icon: 'fa-times-circle', text: 'Rejected' },
            approved: { color: '#10b981', bgColor: '#d1fae5', icon: 'fa-check-circle', text: 'Approved' }
        };
        return configs[status?.toLowerCase()] || configs.pending;
    },

    /**
     * Render status badge HTML
     */
    renderStatusBadge(config) {
        return `
            <span class="px-3 py-1 rounded-full text-sm font-semibold"
                  style="background-color: ${config.bgColor}; color: ${config.color};">
                <i class="fas ${config.icon} mr-1"></i>
                ${config.text}
            </span>
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

    // ============================================
    // ACTION HANDLERS
    // ============================================

    viewCourseDetails(courseId) {
        const course = this.allData.courses.find(c => c.id === courseId);
        if (course) {
            console.log('[ParentRequestsManager] Course details:', course);
            // You can implement a modal here
            window.location.href = `../branch/course-details.html?id=${courseId}`;
        }
    },

    viewSchoolDetails(schoolId) {
        const school = this.allData.schools.find(s => s.id === schoolId);
        if (school) {
            console.log('[ParentRequestsManager] School details:', school);
            // You can implement a modal here
            window.location.href = `../branch/school-details.html?id=${schoolId}`;
        }
    },

    viewSessionDetails(sessionId) {
        const session = this.allData.sessions.find(s => s.id === sessionId);
        if (!session) return;

        alert(`Session Request Details:\n\n` +
              `Tutor: ${session.requester_name}\n` +
              `Package: ${session.package_name || 'N/A'}\n` +
              `Status: ${session.status}\n` +
              `Student: ${session.student_name || 'N/A'}\n` +
              `Message: ${session.message || 'No message'}\n` +
              `Requested: ${this.formatDate(session.created_at)}`
        );
    },

    contactTutor(tutorId) {
        window.location.href = `../view-profiles/view-tutor.html?id=${tutorId}`;
    },

    viewStudentProfile(studentProfileId) {
        window.location.href = `../view-profiles/view-student.html?id=${studentProfileId}`;
    },

    async acceptParentingInvitation(invitationId) {
        if (!confirm('Are you sure you want to accept this parenting invitation?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/respond-invitation/${invitationId}?accept=true`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                alert('Invitation accepted successfully! You are now linked as this student\'s parent.');
                await this.loadParentingInvitations();
                this.updateCounts();
                this.renderCurrentView();
            } else {
                const error = await response.json();
                alert('Failed to accept invitation: ' + (error.detail || 'Unknown error'));
            }
        } catch (error) {
            console.error('[ParentRequestsManager] Error accepting invitation:', error);
            alert('Failed to accept invitation. Please try again.');
        }
    },

    async rejectParentingInvitation(invitationId) {
        if (!confirm('Are you sure you want to decline this parenting invitation?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/respond-invitation/${invitationId}?accept=false`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                alert('Invitation declined.');
                await this.loadParentingInvitations();
                this.updateCounts();
                this.renderCurrentView();
            } else {
                const error = await response.json();
                alert('Failed to decline invitation: ' + (error.detail || 'Unknown error'));
            }
        } catch (error) {
            console.error('[ParentRequestsManager] Error declining invitation:', error);
            alert('Failed to decline invitation. Please try again.');
        }
    }
};

// ============================================
// GLOBAL FUNCTIONS FOR ONCLICK HANDLERS
// ============================================

function filterParentRequestType(type) {
    console.log('[filterParentRequestType] Called with type:', type);

    // Show/hide parenting direction tabs
    const parentingDirectionTabs = document.getElementById('parent-parenting-direction-tabs');
    const statusTabs = document.querySelector('#my-requests-panel .status-tabs');

    console.log('[filterParentRequestType] parentingDirectionTabs:', parentingDirectionTabs);
    console.log('[filterParentRequestType] statusTabs:', statusTabs);

    if (type === 'parenting') {
        // Show parenting direction tabs
        if (parentingDirectionTabs) {
            parentingDirectionTabs.classList.remove('hidden');
            parentingDirectionTabs.style.display = 'block';
            console.log('[filterParentRequestType] Showing parenting direction tabs');
        }
        // Hide status tabs for parenting
        if (statusTabs) {
            statusTabs.style.display = 'none';
            console.log('[filterParentRequestType] Hiding status tabs');
        }
        // Load parenting invitations using the function from parent-profile.js
        if (typeof loadParentParentingInvitations === 'function') {
            loadParentParentingInvitations();
        }
    } else if (type === 'child-invitations') {
        // Hide parenting direction tabs for child invitations
        if (parentingDirectionTabs) {
            parentingDirectionTabs.classList.add('hidden');
            parentingDirectionTabs.style.display = 'none';
        }
        // Show status tabs for child invitations
        if (statusTabs) {
            statusTabs.style.display = 'flex';
        }
        // Load child invitations
        loadParentChildInvitations();
    } else {
        // Hide parenting direction tabs for other types
        if (parentingDirectionTabs) {
            parentingDirectionTabs.classList.add('hidden');
            parentingDirectionTabs.style.display = 'none';
        }
        // Show status tabs for other types
        if (statusTabs) {
            statusTabs.style.display = 'flex';
        }
    }

    // Also call the original manager filter
    ParentRequestsManager.filterByType(type);
}

/**
 * Load child invitations for parent profile - Parents inviting you as their child
 */
async function loadParentChildInvitations() {
    const container = document.getElementById('parent-requests-list');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-8 text-gray-500">
            <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
            <p>Loading child invitations...</p>
        </div>
    `;

    // Use the child invitation manager
    if (typeof childInvitationManager !== 'undefined') {
        await childInvitationManager.loadChildInvitations();
        childInvitationManager.renderChildInvitations('parent-requests-list', 'all');
    } else {
        container.innerHTML = `
            <div class="card p-6 text-center text-gray-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Child invitation manager not loaded</p>
            </div>
        `;
    }
}

function filterParentRequestStatus(status) {
    ParentRequestsManager.filterByStatus(status);
}

// ============================================
// INITIALIZATION
// ============================================

// Auto-initialize when panel is switched to
document.addEventListener('DOMContentLoaded', () => {
    // Listen for panel switches
    const originalSwitchPanel = window.switchPanel;
    window.switchPanel = function(panelId) {
        if (typeof originalSwitchPanel === 'function') {
            originalSwitchPanel(panelId);
        }

        // If switching to my-requests panel, initialize the manager
        if (panelId === 'my-requests') {
            ParentRequestsManager.initialize();
        }
    };
});

// Export to window for onclick handlers
window.ParentRequestsManager = ParentRequestsManager;
window.filterParentRequestType = filterParentRequestType;
window.filterParentRequestStatus = filterParentRequestStatus;

// Also keep old name for backward compatibility
window.ParentSessionRequestsManager = ParentRequestsManager;
