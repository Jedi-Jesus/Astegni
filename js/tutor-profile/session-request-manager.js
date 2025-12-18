// ============================================
// SESSION REQUEST MANAGER
// ============================================

const SessionRequestManager = {
    currentRequestId: null,
    allStudents: [], // Store all students for search filtering

    /**
     * Load and display session requests
     */
    async loadRequests(status = 'pending') {
        // Try both container IDs for compatibility
        const container = document.getElementById('tutor-requests-list') || document.getElementById('session-requests-list');
        if (!container) {
            console.error('[SessionRequestManager] No container found (tutor-requests-list or session-requests-list)');
            return;
        }

        try {
            // Show loading state
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                    <p>Loading requests...</p>
                </div>
            `;

            // Wait for auth to be ready before checking token
            if (window.TutorAuthReady) {
                await window.TutorAuthReady.waitForAuth();
            }

            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-lock text-3xl mb-3"></i>
                        <p>Please log in to view session requests</p>
                    </div>
                `;
                return;
            }

            const url = status
                ? `http://localhost:8000/api/session-requests/tutor?status=${status}`
                : 'http://localhost:8000/api/session-requests/tutor';

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load session requests');
            }

            const requests = await response.json();

            if (requests.length === 0) {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-inbox text-3xl mb-3"></i>
                        <p>No ${status} session requests</p>
                        <p class="text-sm mt-2">Students and parents can request sessions from your profile page</p>
                    </div>
                `;
                return;
            }

            // Create table
            const tableHTML = `
                <div class="overflow-x-auto card p-6">
                    <table class="w-full" style="border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: var(--bg-secondary); border-bottom: 2px solid var(--border-color);">
                                <th style="padding: 12px; text-align: left; font-weight: 600;">Requester</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600;">Type</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600;">Package</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600;">Student Info</th>
                                <th style="padding: 12px; text-align: left; font-weight: 600;">Requested</th>
                                <th style="padding: 12px; text-align: center; font-weight: 600;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${requests.map(request => this.renderRequestRow(request)).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            container.innerHTML = tableHTML;

        } catch (error) {
            console.error('Error loading session requests:', error);
            container.innerHTML = `
                <div class="card p-6 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                    <p>Failed to load session requests</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * Render a single request row
     */
    renderRequestRow(request) {
        const requesterUrl = request.requester_type === 'student'
            ? `../view-profiles/view-student.html?id=${request.requester_id}`
            : `../view-profiles/view-parent.html?id=${request.requester_id}`;

        const statusBadge = request.status === 'pending'
            ? '<span class="badge" style="background: #FFA500; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Pending</span>'
            : request.status === 'accepted'
            ? '<span class="badge" style="background: #10B981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Accepted</span>'
            : '<span class="badge" style="background: #EF4444; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">Rejected</span>';

        const requestDate = new Date(request.created_at);
        const timeAgo = this.getTimeAgo(requestDate);

        return `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px;">
                    <div class="flex items-center gap-3">
                        <img src="${request.requester_profile_picture || '/uploads/system_images/system_profile_pictures/woman-user.jpg'}"
                            alt="${request.requester_name}"
                            class="w-10 h-10 rounded-full object-cover">
                        <div>
                            <a href="${requesterUrl}"
                               class="font-medium hover:text-blue-600 hover:underline"
                               style="color: var(--primary-color);">
                                ${request.requester_name || 'Unknown User'}
                            </a>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">
                                ${statusBadge}
                            </div>
                        </div>
                    </div>
                </td>
                <td style="padding: 12px;">
                    <span class="badge" style="background: ${request.requester_type === 'student' ? '#3B82F6' : '#8B5CF6'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem;">
                        ${request.requester_type === 'student' ? '🎓 Student' : '👨‍👩‍👧 Parent'}
                    </span>
                </td>
                <td style="padding: 12px;">
                    <div style="font-weight: 500;">${request.package_name}</div>
                </td>
                <td style="padding: 12px;">
                    <div style="font-weight: 500;">${request.student_name}</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">${request.student_grade}</div>
                </td>
                <td style="padding: 12px; font-size: 0.875rem; color: var(--text-secondary);">
                    ${timeAgo}
                </td>
                <td style="padding: 12px; text-align: center;">
                    <button
                        onclick="SessionRequestManager.viewRequest(${request.id})"
                        class="btn-secondary"
                        style="padding: 6px 12px; font-size: 0.875rem; border-radius: 6px;">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `;
    },

    /**
     * View request details
     */
    async viewRequest(requestId) {
        this.currentRequestId = requestId;

        const modal = document.getElementById('viewRequestModal');
        const content = document.getElementById('viewRequestContent');

        if (!modal || !content) {
            console.error('Modal or content element not found!');
            return;
        }

        try {
            // Show loading state
            content.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                    <p>Loading request details...</p>
                </div>
            `;

            modal.classList.remove('hidden');

            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/api/session-requests/tutor/${requestId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load request details');
            }

            const request = await response.json();

            // Render request details
            content.innerHTML = this.renderRequestDetails(request);

        } catch (error) {
            console.error('Error viewing request:', error);
            content.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                    <p>Failed to load request details</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * Render request details modal content
     */
    renderRequestDetails(request) {
        const requesterUrl = request.requester_type === 'student'
            ? `../view-profiles/view-student.html?id=${request.requester_id}`
            : `../view-profiles/view-parent.html?id=${request.requester_id}`;

        const statusBadge = request.status === 'pending'
            ? '<span class="badge" style="background: #FFA500; color: white; padding: 6px 16px; border-radius: 12px;">Pending</span>'
            : request.status === 'accepted'
            ? '<span class="badge" style="background: #10B981; color: white; padding: 6px 16px; border-radius: 12px;">Accepted</span>'
            : '<span class="badge" style="background: #EF4444; color: white; padding: 6px 16px; border-radius: 12px;">Rejected</span>';

        const showActionButtons = request.status === 'pending';

        return `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex items-start justify-between">
                    <div class="flex items-center gap-4">
                        <img src="${request.requester_profile_picture || '/uploads/system_images/system_profile_pictures/woman-user.jpg'}"
                            alt="${request.requester_name}"
                            class="w-16 h-16 rounded-full object-cover">
                        <div>
                            <h3 class="text-xl font-bold">
                                <a href="${requesterUrl}"
                                   class="hover:text-blue-600 hover:underline"
                                   target="_blank"
                                   style="color: var(--primary-color);">
                                    ${request.requester_name || 'Unknown User'}
                                </a>
                            </h3>
                            <p style="color: var(--text-secondary);">
                                ${request.requester_type === 'student' ? '🎓 Student' : '👨‍👩‍👧 Parent'}
                            </p>
                        </div>
                    </div>
                    ${statusBadge}
                </div>

                <hr style="border-color: var(--border-color);">

                <!-- Package Info -->
                <div>
                    <h4 class="font-semibold mb-2">Requested Package</h4>
                    <div class="card p-4" style="background: var(--bg-secondary);">
                        <p class="font-medium text-lg">${request.package_name}</p>
                    </div>
                </div>

                <!-- Student Information -->
                <div>
                    <h4 class="font-semibold mb-2">Student Information</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p style="color: var(--text-secondary); font-size: 0.875rem;">Name</p>
                            <p class="font-medium">${request.student_name}</p>
                        </div>
                        <div>
                            <p style="color: var(--text-secondary); font-size: 0.875rem;">Grade Level</p>
                            <p class="font-medium">${request.student_grade}</p>
                        </div>
                    </div>
                </div>

                <!-- Contact Information -->
                <div>
                    <h4 class="font-semibold mb-2">Contact Information</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p style="color: var(--text-secondary); font-size: 0.875rem;">Phone</p>
                            <p class="font-medium">${request.contact_phone || 'Not provided'}</p>
                        </div>
                        <div>
                            <p style="color: var(--text-secondary); font-size: 0.875rem;">Email</p>
                            <p class="font-medium">${request.contact_email || 'Not provided'}</p>
                        </div>
                    </div>
                </div>

                <!-- Schedule Preferences -->
                ${request.schedule_type || request.preferred_schedule ? `
                    <div>
                        <h4 class="font-semibold mb-2">Schedule Preferences</h4>
                        <div class="card p-4" style="background: #f0f9ff; border: 1px solid #bae6fd;">
                            ${request.schedule_type ? `
                                <div style="margin-bottom: 12px;">
                                    <span style="font-weight: 600; color: #0369a1;">
                                        <i class="fas fa-calendar-alt"></i>
                                        Type: ${request.schedule_type === 'recurring' ? 'Recurring Schedule' : 'Specific Dates'}
                                    </span>
                                </div>
                            ` : ''}

                            ${request.schedule_type === 'recurring' ? `
                                ${request.year_range && request.year_range.length > 0 ? `
                                    <div style="margin-bottom: 8px;">
                                        <span style="font-weight: 500;">📅 Year(s):</span>
                                        <span style="margin-left: 8px;">${request.year_range.join(', ')}</span>
                                    </div>
                                ` : ''}
                                ${request.months && request.months.length > 0 ? `
                                    <div style="margin-bottom: 8px;">
                                        <span style="font-weight: 500;">📆 Month(s):</span>
                                        <span style="margin-left: 8px;">${request.months.join(', ')}</span>
                                    </div>
                                ` : ''}
                                ${request.days && request.days.length > 0 ? `
                                    <div style="margin-bottom: 8px;">
                                        <span style="font-weight: 500;">📋 Day(s):</span>
                                        <span style="margin-left: 8px;">${request.days.join(', ')}</span>
                                    </div>
                                ` : ''}
                            ` : ''}

                            ${request.schedule_type === 'specific_dates' && request.specific_dates && request.specific_dates.length > 0 ? `
                                <div style="margin-bottom: 8px;">
                                    <span style="font-weight: 500;">📌 Specific Dates:</span>
                                    <span style="margin-left: 8px;">${request.specific_dates.join(', ')}</span>
                                </div>
                            ` : ''}

                            ${request.start_time || request.end_time ? `
                                <div style="margin-bottom: 8px;">
                                    <span style="font-weight: 500;">⏰ Time:</span>
                                    <span style="margin-left: 8px;">
                                        ${request.start_time ? request.start_time.substring(0, 5) : '?'} - ${request.end_time ? request.end_time.substring(0, 5) : '?'}
                                    </span>
                                </div>
                            ` : ''}

                            ${request.preferred_schedule && !request.schedule_type ? `
                                <p>${request.preferred_schedule}</p>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                <!-- Message -->
                ${request.message ? `
                    <div>
                        <h4 class="font-semibold mb-2">Message from Requester</h4>
                        <div class="card p-4" style="background: var(--bg-secondary);">
                            <p>${request.message}</p>
                        </div>
                    </div>
                ` : ''}

                <!-- Request Date -->
                <div>
                    <p style="color: var(--text-secondary); font-size: 0.875rem;">
                        Requested on ${new Date(request.created_at).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                </div>

                <!-- Rejection Info (if rejected) -->
                ${request.status === 'rejected' && request.rejected_reason ? `
                    <div>
                        <h4 class="font-semibold mb-2" style="color: #EF4444;">Rejection Reason</h4>
                        <div class="card p-4" style="background: #FEF2F2; border: 1px solid #FECACA;">
                            <p style="color: #991B1B;">${request.rejected_reason}</p>
                            ${request.rejected_at ? `
                                <p style="color: #B91C1C; font-size: 0.75rem; margin-top: 8px;">
                                    Rejected on ${new Date(request.rejected_at).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </p>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

                <!-- Action Buttons -->
                <div class="flex gap-3 pt-4" style="border-top: 1px solid var(--border-color);">
                    ${showActionButtons ? `
                        <button
                            onclick="SessionRequestManager.acceptRequest()"
                            class="flex-1 btn-primary"
                            style="padding: 12px; border-radius: 8px;">
                            <i class="fas fa-check"></i> Accept Request
                        </button>
                        <button
                            onclick="SessionRequestManager.rejectRequest()"
                            class="flex-1"
                            style="padding: 12px; border-radius: 8px; background: #EF4444; color: white; border: none;">
                            <i class="fas fa-times"></i> Reject Request
                        </button>
                        <button
                            onclick="SessionRequestManager.messageRequester(${request.requester_id})"
                            class="btn-secondary"
                            style="padding: 12px; border-radius: 8px;"
                            disabled
                            title="Messaging feature coming in Phase 2">
                            <i class="fas fa-envelope"></i> Message
                        </button>
                    ` : `
                        <p style="color: var(--text-secondary); font-style: italic;">
                            This request has already been ${request.status}
                            ${request.responded_at ? `on ${new Date(request.responded_at).toLocaleDateString()}` : ''}
                        </p>
                    `}
                    <button
                        onclick="SessionRequestManager.closeModal()"
                        class="btn-secondary"
                        style="padding: 12px; border-radius: 8px;">
                        Close
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Accept a session request
     */
    async acceptRequest() {
        if (!this.currentRequestId) return;

        if (!confirm('Are you sure you want to accept this session request?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/api/session-requests/tutor/${this.currentRequestId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'accepted' })
            });

            if (!response.ok) {
                throw new Error('Failed to accept request');
            }

            // Show success message
            alert('✅ Session request accepted! The student has been added to "My Students".');

            // Close modal and refresh lists
            this.closeModal();
            this.loadRequests('pending');

            // If on My Students panel, reload that too
            if (typeof this.loadMyStudents === 'function') {
                this.loadMyStudents();
            }

        } catch (error) {
            console.error('Error accepting request:', error);
            alert('❌ Failed to accept request. Please try again.');
        }
    },

    /**
     * Reject a session request
     */
    async rejectRequest() {
        if (!this.currentRequestId) return;

        // Prompt for rejection reason
        const rejectedReason = prompt('Please provide a reason for rejecting this request (optional):');

        // User clicked cancel on prompt
        if (rejectedReason === null) {
            return;
        }

        if (!confirm('Are you sure you want to reject this session request?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/api/session-requests/tutor/${this.currentRequestId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'rejected',
                    rejected_reason: rejectedReason || null
                })
            });

            if (!response.ok) {
                throw new Error('Failed to reject request');
            }

            // Show success message
            alert('Request has been rejected.');

            // Close modal and refresh list
            this.closeModal();
            this.loadRequests('pending');

        } catch (error) {
            console.error('Error rejecting request:', error);
            alert('❌ Failed to reject request. Please try again.');
        }
    },

    /**
     * Message requester (Phase 2)
     */
    messageRequester(requesterId) {
        alert('📧 Messaging feature coming in Phase 2!\n\nFor now, please use the provided contact information (phone/email) to communicate with the requester.');
    },

    /**
     * Close the view request modal
     */
    closeModal() {
        const modal = document.getElementById('viewRequestModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        this.currentRequestId = null;
    },

    /**
     * Load My Students from enrolled_students table
     */
    async loadMyStudents() {
        const container = document.getElementById('my-students-grid');
        if (!container) {
            console.warn('[SessionRequestManager] my-students-grid container not found');
            return;
        }

        console.log('[SessionRequestManager] Loading my students from enrolled_students...');

        try {
            // Show loading state
            container.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500">
                    <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                    <p>Loading students...</p>
                </div>
            `;

            // Wait for auth to be ready before checking token
            if (window.TutorAuthReady) {
                await window.TutorAuthReady.waitForAuth();
            }

            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                container.innerHTML = `
                    <div class="col-span-full card p-6 text-center text-gray-500">
                        <i class="fas fa-lock text-3xl mb-3"></i>
                        <p>Please log in to view your students</p>
                    </div>
                `;
                return;
            }

            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/session-requests/tutor/my-students', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[SessionRequestManager] API Error:', response.status, errorText);
                throw new Error('Failed to load students');
            }

            const students = await response.json();
            console.log('[SessionRequestManager] Loaded', students.length, 'students from enrolled_students');

            // Store for search filtering
            this.allStudents = students;

            // Update student count badge
            this.updateStudentCount(students.length);

            if (students.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full card p-6 text-center text-gray-500">
                        <i class="fas fa-user-graduate text-3xl mb-3"></i>
                        <p>No students yet</p>
                        <p class="text-sm mt-2">Accept session requests to add students to your enrolled list</p>
                    </div>
                `;
                return;
            }

            // Render student cards
            this.renderStudents(students);

            // Clear and setup search functionality
            const searchInput = document.getElementById('student-search');
            if (searchInput) {
                searchInput.value = '';
            }
            this.setupStudentSearch();

        } catch (error) {
            console.error('[SessionRequestManager] Error loading students:', error);
            container.innerHTML = `
                <div class="col-span-full card p-6 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                    <p>Failed to load students</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * Render students to the grid
     */
    renderStudents(students) {
        const container = document.getElementById('my-students-grid');
        if (!container) return;

        if (students.length === 0) {
            container.innerHTML = `
                <div class="col-span-full card p-6 text-center text-gray-500">
                    <i class="fas fa-search text-3xl mb-3"></i>
                    <p>No students found matching your search</p>
                </div>
            `;
            return;
        }

        container.innerHTML = students.map(student => this.renderStudentCard(student)).join('');
    },

    /**
     * Setup search functionality for students
     */
    setupStudentSearch() {
        const searchInput = document.getElementById('student-search');
        if (!searchInput) {
            console.warn('[SessionRequestManager] student-search input not found');
            return;
        }

        // Remove existing listener if any
        searchInput.removeEventListener('input', this.handleStudentSearch);

        // Add debounced search
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filterStudents(e.target.value);
            }, 300);
        });

        console.log('[SessionRequestManager] Student search setup complete');
    },

    /**
     * Filter students by search term
     */
    filterStudents(searchTerm) {
        const term = searchTerm.toLowerCase().trim();

        if (!term) {
            // Show all students if search is empty
            this.renderStudents(this.allStudents);
            return;
        }

        const filtered = this.allStudents.filter(student => {
            const name = (student.student_name || '').toLowerCase();
            const grade = (student.student_grade || '').toLowerCase();
            const packageName = (student.package_name || '').toLowerCase();
            const email = (student.contact_email || '').toLowerCase();

            return name.includes(term) ||
                   grade.includes(term) ||
                   packageName.includes(term) ||
                   email.includes(term);
        });

        console.log(`[SessionRequestManager] Search "${term}" found ${filtered.length} students`);
        this.renderStudents(filtered);
    },

    /**
     * Update student count badge
     */
    updateStudentCount(count) {
        const badge = document.getElementById('student-count-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = `${count} student${count !== 1 ? 's' : ''}`;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    },

    /**
     * Render a student card with enhanced details
     */
    renderStudentCard(student) {
        const studentUrl = student.requester_type === 'student'
            ? `../view-profiles/view-student.html?id=${student.student_id}`
            : `../view-profiles/view-parent.html?id=${student.student_id}`;

        const enrolledDate = new Date(student.accepted_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        // Calculate days enrolled
        const daysEnrolled = Math.floor((new Date() - new Date(student.accepted_at)) / (1000 * 60 * 60 * 24));

        // Mock data for assignments, progress, attendance, improvement (these will be real in Phase 2)
        const totalAssignments = Math.floor(Math.random() * 8) + 3; // 3-10 assignments
        const completedAssignments = Math.floor(totalAssignments * (Math.random() * 0.3 + 0.6)); // 60-90% completed
        const progress = Math.floor(Math.random() * 30) + 60; // 60-90%
        const attendance = Math.floor(Math.random() * 20) + 80; // 80-100%
        const improvement = Math.floor(Math.random() * 30) + 10; // +10-40%

        // Progress bar color based on percentage (using CSS variables)
        const getProgressColor = (percent) => {
            if (percent >= 80) return 'var(--success)'; // green
            if (percent >= 60) return 'var(--primary-color)'; // amber/yellow
            return 'var(--error)'; // red
        };

        return `
            <div class="card" style="padding: 1.5rem; border-radius: 12px; background: var(--card-bg); border: 1px solid var(--border-color); transition: var(--transition); box-shadow: var(--shadow-sm); hover: var(--shadow-md);">
                <!-- Student Header -->
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                    <img src="${student.profile_picture || '/uploads/system_images/system_profile_pictures/woman-user.jpg'}"
                        alt="${student.student_name || 'Student'}"
                        style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-color); box-shadow: var(--shadow-sm);">
                    <div style="flex: 1;">
                        <h4 style="font-weight: 700; font-size: 1.125rem; margin: 0 0 0.25rem 0; color: var(--heading);">
                            <a href="${studentUrl}" style="color: inherit; text-decoration: none; cursor: pointer; transition: var(--transition-fast);"
                               onmouseover="this.style.color='var(--primary-color)'"
                               onmouseout="this.style.color='var(--heading)'">
                                ${student.student_name || 'Unknown Student'}
                            </a>
                        </h4>
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                            <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: var(--text-secondary);">
                                <i class="fas fa-graduation-cap" style="color: var(--primary-color);"></i>
                                ${student.student_grade || 'N/A'}
                            </span>
                            <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: var(--text-secondary);">
                                <i class="fas fa-calendar-alt" style="color: var(--primary-color);"></i>
                                ${daysEnrolled} days
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Package & Assignments Info -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                    <div style="background: var(--activity-bg); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.25rem 0; font-weight: 500;">Package</p>
                        <p style="font-weight: 600; margin: 0; color: var(--text-primary); font-size: 0.875rem;">${student.package_name || 'N/A'}</p>
                    </div>
                    <div style="background: var(--activity-bg); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.25rem 0; font-weight: 500;">Assignments</p>
                        <p style="font-weight: 600; margin: 0; color: var(--text-primary); font-size: 0.875rem;">${completedAssignments}/${totalAssignments} Completed</p>
                    </div>
                </div>

                <!-- Stats Grid (Attendance & Improvement) -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1.25rem;">
                    <div style="text-align: center; padding: 0.75rem; background: var(--activity-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-color); margin-bottom: 0.25rem;">${attendance}%</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">Attendance</div>
                    </div>
                    <div style="text-align: center; padding: 0.75rem; background: var(--activity-bg); border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--success); margin-bottom: 0.25rem;">+${improvement}%</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); font-weight: 500;">Improvement</div>
                    </div>
                </div>

                <!-- Overall Progress Section -->
                <div style="margin-bottom: 1.25rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">Overall Progress</span>
                        <span style="font-size: 0.875rem; font-weight: 700; color: ${getProgressColor(progress)};">${progress}%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: var(--activity-bg); border-radius: 999px; overflow: hidden; border: 1px solid var(--border-color);">
                        <div style="height: 100%; width: ${progress}%; background: ${getProgressColor(progress)}; border-radius: 999px; transition: width 0.5s ease;"></div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div style="display: flex; gap: 0.5rem;">
                    <button
                        onclick="openStudentDetails(${student.student_id})"
                        class="btn-primary"
                        style="flex: 1; padding: 0.625rem; font-size: 0.875rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600;">
                        <i class="fas fa-chart-line"></i> View Details
                    </button>
                    <button
                        onclick="SessionRequestManager.messageStudent(JSON.parse(this.dataset.student))"
                        data-student="${this.encodeStudentDataForChat(student)}"
                        class="btn-secondary"
                        style="padding: 0.625rem 1rem; font-size: 0.875rem; border-radius: 8px;"
                        title="Message this student">
                        <i class="fas fa-envelope"></i>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Encode student data for onclick handler
     */
    encodeStudentDataForChat(student) {
        const chatData = {
            id: student.student_user_id,  // users.id for chat
            user_id: student.student_user_id,  // users.id for chat
            profile_id: student.student_id,  // student_profiles.id
            full_name: student.student_name || 'Unknown Student',
            name: student.student_name || 'Unknown Student',
            profile_picture: student.profile_picture,
            avatar: student.profile_picture,
            role: student.requester_type || 'student',
            profile_type: student.requester_type || 'student',
            is_online: false,
            grade: student.student_grade,
            package_name: student.package_name
        };
        return JSON.stringify(chatData).replace(/"/g, '&quot;');
    },

    /**
     * Message student - opens chat modal with student highlighted
     */
    messageStudent(studentData) {
        console.log('[SessionRequestManager] Opening chat with student:', studentData);

        // Check if user is authenticated
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            if (window.openAuthModal) {
                window.openAuthModal('login');
            } else {
                alert('Please log in to message students');
            }
            return;
        }

        // Build target user object for chat modal
        const targetUser = {
            id: studentData.user_id || studentData.id,
            user_id: studentData.user_id || studentData.id,
            profile_id: studentData.profile_id,
            full_name: studentData.full_name || studentData.name,
            name: studentData.full_name || studentData.name,
            profile_picture: studentData.profile_picture || studentData.avatar,
            avatar: studentData.profile_picture || studentData.avatar,
            role: studentData.role || studentData.profile_type || 'student',
            profile_type: studentData.role || studentData.profile_type || 'student',
            is_online: studentData.is_online || false
        };

        console.log('[SessionRequestManager] Target user for chat:', targetUser);

        // Open chat modal with the student
        if (typeof openChatModal === 'function') {
            openChatModal(targetUser);
            console.log('[SessionRequestManager] Chat modal opened for student:', targetUser.full_name);
        } else if (typeof ChatModalManager !== 'undefined') {
            // Initialize if needed
            if (typeof ChatModalManager.init === 'function' && !ChatModalManager.state?.isOpen) {
                ChatModalManager.init();
            }
            // Open with the student
            if (typeof ChatModalManager.open === 'function') {
                ChatModalManager.open(targetUser);
                console.log('[SessionRequestManager] Chat modal opened via ChatModalManager for:', targetUser.full_name);
            }
        } else {
            console.error('[SessionRequestManager] Chat modal not available');
            alert('Chat feature is not available. Please refresh the page.');
        }
    },

    /**
     * Get time ago string
     */
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
            }
        }

        return 'Just now';
    }
};

// Global refresh function
function refreshRequests() {
    SessionRequestManager.loadRequests('pending');
}

// ============================================
// PARENTING INVITATIONS MANAGEMENT
// ============================================

const ParentingInvitationManager = {
    currentInvitationId: null,
    currentInvitation: null,

    /**
     * Load parenting invitations for the current user
     */
    async loadParentingInvitations() {
        const container = document.getElementById('tutor-requests-list');
        if (!container) return;

        try {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                    <p>Loading parenting invitations...</p>
                </div>
            `;

            // Wait for auth to be ready before checking token
            if (window.TutorAuthReady) {
                await window.TutorAuthReady.waitForAuth();
            }

            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-lock text-3xl mb-3"></i>
                        <p>Please log in to view parenting invitations</p>
                    </div>
                `;
                return;
            }

            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/pending-invitations', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 403) {
                    container.innerHTML = `
                        <div class="card p-6 text-center text-gray-500">
                            <i class="fas fa-info-circle text-3xl mb-3"></i>
                            <p>No parenting invitations</p>
                            <p class="text-sm mt-2">You'll see invitations here when students invite you to be their parent</p>
                        </div>
                    `;
                    return;
                }
                throw new Error('Failed to load parenting invitations');
            }

            const data = await response.json();
            const invitations = data.invitations || [];

            // Update count badge
            const countBadge = document.getElementById('parenting-invitation-count');
            if (countBadge) {
                if (invitations.length > 0) {
                    countBadge.textContent = invitations.length;
                    countBadge.classList.remove('hidden');
                } else {
                    countBadge.classList.add('hidden');
                }
            }

            if (invitations.length === 0) {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-user-friends text-3xl mb-3"></i>
                        <p>No pending parenting invitations</p>
                        <p class="text-sm mt-2">You'll see invitations here when students invite you to be their parent</p>
                    </div>
                `;
                return;
            }

            // Render invitations as cards
            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${invitations.map(inv => this.renderInvitationCard(inv)).join('')}
                </div>
            `;

        } catch (error) {
            console.error('Error loading parenting invitations:', error);
            container.innerHTML = `
                <div class="card p-6 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                    <p>Failed to load parenting invitations</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * Render a parenting invitation card with full profile info
     */
    renderInvitationCard(invitation) {
        const studentUrl = `../view-profiles/view-student.html?id=${invitation.student_user_id}`;
        const createdDate = new Date(invitation.created_at);
        const timeAgo = SessionRequestManager.getTimeAgo(createdDate);
        const profilePic = invitation.student_profile_picture || '/uploads/system_images/system_profile_pictures/woman-user.jpg';

        // Mask email for privacy (show first 3 chars and domain)
        const maskEmail = (email) => {
            if (!email) return null;
            const [local, domain] = email.split('@');
            return local.substring(0, 3) + '***@' + domain;
        };

        // Mask phone for privacy (show last 4 digits)
        const maskPhone = (phone) => {
            if (!phone) return null;
            return '***' + phone.slice(-4);
        };

        return `
            <div class="card p-5" style="border: 2px solid var(--border-color); border-radius: 16px; transition: all 0.2s; background: var(--card-bg);"
                 onmouseover="this.style.borderColor='#8B5CF6'; this.style.boxShadow='0 8px 24px rgba(139, 92, 246, 0.15)'"
                 onmouseout="this.style.borderColor='var(--border-color)'; this.style.boxShadow='none'">

                <!-- Student Header with Profile Pic -->
                <div class="flex items-start gap-4 mb-4 pb-4" style="border-bottom: 1px solid var(--border-color);">
                    <img src="${profilePic}"
                         alt="${invitation.student_name}"
                         style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #8B5CF6; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);">
                    <div class="flex-1">
                        <h4 class="font-bold text-lg mb-1">
                            <a href="${studentUrl}" class="hover:text-purple-600 hover:underline" style="color: var(--heading);">
                                ${invitation.student_name || 'Unknown Student'}
                            </a>
                        </h4>
                        <p class="text-sm" style="color: var(--text-secondary);">
                            ${invitation.grade_level || ''} ${invitation.studying_at ? '@ ' + invitation.studying_at : ''}
                        </p>
                        <span style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; margin-top: 4px;">
                            ${invitation.relationship_type || 'Parent'}
                        </span>
                    </div>
                </div>

                <!-- Contact Info -->
                <div class="mb-4 space-y-2">
                    ${invitation.student_email ? `
                        <div class="flex items-center gap-2" style="color: var(--text-secondary); font-size: 0.85rem;">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #8B5CF6;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                            <span>${maskEmail(invitation.student_email)}</span>
                        </div>
                    ` : ''}
                    ${invitation.student_phone ? `
                        <div class="flex items-center gap-2" style="color: var(--text-secondary); font-size: 0.85rem;">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #8B5CF6;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                            </svg>
                            <span>${maskPhone(invitation.student_phone)}</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Time Ago -->
                <p class="text-xs mb-4" style="color: var(--text-secondary);">
                    <svg class="w-3 h-3" style="display: inline-block; vertical-align: middle; margin-right: 4px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Requested ${timeAgo}
                </p>

                <!-- Action Buttons -->
                <div class="flex gap-2">
                    <button
                        onclick="ParentingInvitationManager.openAcceptModal(${invitation.id}, '${invitation.student_name}', '${profilePic}', '${invitation.relationship_type || 'Parent'}')"
                        class="flex-1 btn-primary"
                        style="padding: 10px 12px; border-radius: 10px; font-size: 0.875rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Accept
                    </button>
                    <button
                        onclick="ParentingInvitationManager.rejectInvitation(${invitation.id})"
                        style="flex: 1; padding: 10px 12px; border-radius: 10px; font-size: 0.875rem; font-weight: 600; background: #EF4444; color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;"
                        onmouseover="this.style.background='#DC2626'"
                        onmouseout="this.style.background='#EF4444'">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                        Reject
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Open the OTP verification modal for accepting an invitation
     */
    async openAcceptModal(invitationId, studentName, profilePic, relationshipType) {
        this.currentInvitationId = invitationId;

        // Load the modal if not already loaded
        let modal = document.getElementById('accept-parent-invitation-modal');
        if (!modal) {
            // Try to load via modal loader
            if (typeof ModalLoader !== 'undefined') {
                await ModalLoader.load('accept-parent-invitation-modal.html');
                modal = document.getElementById('accept-parent-invitation-modal');
            }

            if (!modal) {
                // Fallback: Create modal dynamically
                const modalHTML = `
                    <div id="accept-parent-invitation-modal" class="modal hidden">
                        <div class="modal-content enhanced" style="max-width: 480px; background: var(--card-bg); border-radius: 16px; padding: 0;">
                            <button class="modal-close-enhanced" onclick="ParentingInvitationManager.closeAcceptModal()" style="position: absolute; top: 16px; right: 16px; background: var(--bg-secondary); border: none; border-radius: 50%; padding: 8px; cursor: pointer; z-index: 10;">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                            <div class="modal-header" style="text-align: center; padding: 24px 24px 0;">
                                <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1)); width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                                    <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #8B5CF6;">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                    </svg>
                                </div>
                                <h3 class="modal-title" style="font-size: 1.5rem; font-weight: 700; color: var(--heading); margin-bottom: 8px;">Accept Parent Invitation</h3>
                                <p class="modal-subtitle" style="color: var(--text-secondary); font-size: 0.875rem;">Enter the OTP code sent to your email to verify</p>
                            </div>
                            <div id="invitation-student-info" style="padding: 16px 24px; margin: 16px 24px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(99, 102, 241, 0.05)); border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.2);">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <img id="invitation-student-pic" src="/uploads/system_images/system_profile_pictures/woman-user.jpg" alt="Student" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #8B5CF6;">
                                    <div>
                                        <p style="font-weight: 600; color: var(--heading); margin: 0;" id="invitation-student-name">Student Name</p>
                                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 4px 0 0;">
                                            Wants you as their <span id="invitation-relationship" style="color: #8B5CF6; font-weight: 600;">Parent</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div style="padding: 0 24px 24px;">
                                <div class="form-group" style="margin-bottom: 20px;">
                                    <label style="font-weight: 600; color: var(--text-primary); margin-bottom: 8px; display: block; font-size: 0.875rem;">Enter OTP Code</label>
                                    <input type="text" id="parent-invitation-otp-input" maxlength="6" placeholder="000000"
                                           style="text-align: center; font-size: 28px; letter-spacing: 10px; padding: 16px; font-weight: 700; width: 100%; border: 2px solid var(--border-color); border-radius: 12px; background: var(--input-bg); color: var(--text-primary);"
                                           pattern="[0-9]*" inputmode="numeric" required>
                                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 8px; text-align: center;">Code valid for 7 days from invitation</p>
                                </div>
                                <div id="parent-invitation-otp-error" class="hidden" style="background: #FEE2E2; border: 1px solid #FECACA; color: #DC2626; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 0.875rem; text-align: center;">
                                    Invalid OTP code. Please try again.
                                </div>
                                <button onclick="ParentingInvitationManager.submitAcceptWithOTP()" id="accept-invitation-submit-btn"
                                        style="width: 100%; padding: 14px 24px; background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%); color: white; font-weight: 600; font-size: 1rem; border: none; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    Verify & Accept Invitation
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHTML);
                modal = document.getElementById('accept-parent-invitation-modal');
            }
        }

        // Update modal content with invitation details
        const studentPicEl = document.getElementById('invitation-student-pic');
        const studentNameEl = document.getElementById('invitation-student-name');
        const relationshipEl = document.getElementById('invitation-relationship');
        const otpInput = document.getElementById('parent-invitation-otp-input');
        const errorEl = document.getElementById('parent-invitation-otp-error');

        if (studentPicEl) studentPicEl.src = profilePic;
        if (studentNameEl) studentNameEl.textContent = studentName;
        if (relationshipEl) relationshipEl.textContent = relationshipType;
        if (otpInput) otpInput.value = '';
        if (errorEl) errorEl.classList.add('hidden');

        // Show modal
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Focus on OTP input
        if (otpInput) {
            setTimeout(() => otpInput.focus(), 100);
        }
    },

    /**
     * Close the accept invitation modal
     */
    closeAcceptModal() {
        const modal = document.getElementById('accept-parent-invitation-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
        this.currentInvitationId = null;
    },

    /**
     * Submit accept with OTP verification
     */
    async submitAcceptWithOTP() {
        const otpInput = document.getElementById('parent-invitation-otp-input');
        const errorEl = document.getElementById('parent-invitation-otp-error');
        const submitBtn = document.getElementById('accept-invitation-submit-btn');

        const otpCode = otpInput ? otpInput.value.trim() : '';

        if (!otpCode || otpCode.length !== 6) {
            if (errorEl) {
                errorEl.textContent = 'Please enter a valid 6-digit OTP code';
                errorEl.classList.remove('hidden');
            }
            return;
        }

        if (!this.currentInvitationId) {
            alert('Error: No invitation selected');
            return;
        }

        // Show loading state
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
            `;
        }

        try {
            // Try both possible token keys
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');

            console.log('[AcceptInvitation] Token present:', !!token);
            console.log('[AcceptInvitation] Token length:', token ? token.length : 0);
            console.log('[AcceptInvitation] Invitation ID:', this.currentInvitationId);
            console.log('[AcceptInvitation] OTP Code:', otpCode);

            if (!token) {
                throw new Error('Not authenticated. Please log in and try again.');
            }

            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/accept-invitation-otp', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    invitation_id: this.currentInvitationId,
                    otp_code: otpCode
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to verify OTP');
            }

            // Success!
            this.closeAcceptModal();
            alert('Invitation accepted successfully! You are now linked as this student\'s parent.');
            this.loadParentingInvitations();

        } catch (error) {
            console.error('Error accepting invitation with OTP:', error);
            if (errorEl) {
                errorEl.textContent = error.message || 'Invalid OTP code. Please try again.';
                errorEl.classList.remove('hidden');
            }
        } finally {
            // Reset button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Verify & Accept Invitation
                `;
            }
        }
    },

    /**
     * Reject a parenting invitation
     */
    async rejectInvitation(invitationId) {
        if (!confirm('Are you sure you want to reject this parenting invitation?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/api/parent/respond-invitation/${invitationId}?accept=false`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to reject invitation');
            }

            alert('Invitation rejected.');
            this.loadParentingInvitations();

        } catch (error) {
            console.error('Error rejecting invitation:', error);
            alert('Failed to reject invitation. Please try again.');
        }
    },

    /**
     * Load sent parenting invitations (invitations the current user sent to others)
     */
    async loadSentInvitations() {
        const container = document.getElementById('tutor-requests-list');
        if (!container) return;

        try {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                    <p>Loading sent invitations...</p>
                </div>
            `;

            // Wait for auth to be ready before checking token
            if (window.TutorAuthReady) {
                await window.TutorAuthReady.waitForAuth();
            }

            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-lock text-3xl mb-3"></i>
                        <p>Please log in to view sent invitations</p>
                    </div>
                `;
                return;
            }

            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/sent-invitations', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    container.innerHTML = `
                        <div class="card p-6 text-center text-gray-500">
                            <i class="fas fa-paper-plane text-3xl mb-3"></i>
                            <p>No sent invitations</p>
                            <p class="text-sm mt-2">You haven't invited anyone to be your parent yet</p>
                        </div>
                    `;
                    return;
                }
                throw new Error('Failed to load sent invitations');
            }

            const data = await response.json();
            const invitations = data.invitations || [];

            // Update count badge for invites tab
            const countBadge = document.getElementById('parenting-invites-count');
            if (countBadge) {
                if (invitations.length > 0) {
                    countBadge.textContent = invitations.length;
                    countBadge.classList.remove('hidden');
                } else {
                    countBadge.classList.add('hidden');
                }
            }

            if (invitations.length === 0) {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-paper-plane text-3xl mb-3"></i>
                        <p>No sent invitations</p>
                        <p class="text-sm mt-2">You haven't invited anyone to be your parent yet</p>
                    </div>
                `;
                return;
            }

            // Render sent invitations as cards
            container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${invitations.map(inv => this.renderSentInvitationCard(inv)).join('')}
                </div>
            `;

        } catch (error) {
            console.error('Error loading sent invitations:', error);
            container.innerHTML = `
                <div class="card p-6 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                    <p>Failed to load sent invitations</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * Render a sent invitation card (invitation the user sent to someone else)
     */
    renderSentInvitationCard(invitation) {
        const createdDate = new Date(invitation.created_at);
        const timeAgo = SessionRequestManager.getTimeAgo(createdDate);

        // Determine status badge
        let statusBadge = '';
        let statusColor = '';
        if (invitation.status === 'pending') {
            statusBadge = 'Pending';
            statusColor = '#FFA500';
        } else if (invitation.status === 'accepted') {
            statusBadge = 'Accepted';
            statusColor = '#10B981';
        } else if (invitation.status === 'rejected') {
            statusBadge = 'Rejected';
            statusColor = '#EF4444';
        } else if (invitation.status === 'expired') {
            statusBadge = 'Expired';
            statusColor = '#6B7280';
        }

        // Mask email for privacy
        const maskEmail = (email) => {
            if (!email) return 'No email provided';
            const [local, domain] = email.split('@');
            return local.substring(0, 3) + '***@' + domain;
        };

        return `
            <div class="card p-5" style="border: 2px solid var(--border-color); border-radius: 16px; transition: all 0.2s; background: var(--card-bg);"
                 onmouseover="this.style.borderColor='#3B82F6'; this.style.boxShadow='0 8px 24px rgba(59, 130, 246, 0.15)'"
                 onmouseout="this.style.borderColor='var(--border-color)'; this.style.boxShadow='none'">

                <!-- Header with Status Badge -->
                <div class="flex items-start justify-between mb-4 pb-4" style="border-bottom: 1px solid var(--border-color);">
                    <div class="flex items-center gap-3">
                        <div style="background: linear-gradient(135deg, #3B82F6, #1D4ED8); width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-paper-plane text-white text-lg"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-lg" style="color: var(--heading);">
                                Invitation Sent
                            </h4>
                            <p class="text-sm" style="color: var(--text-secondary);">
                                to ${invitation.invitee_email ? maskEmail(invitation.invitee_email) : 'Unknown'}
                            </p>
                        </div>
                    </div>
                    <span style="display: inline-block; background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                        ${statusBadge}
                    </span>
                </div>

                <!-- Invitation Details -->
                <div class="mb-4 space-y-2">
                    <div class="flex items-center gap-2" style="color: var(--text-secondary); font-size: 0.85rem;">
                        <i class="fas fa-user-friends" style="color: #3B82F6; width: 16px;"></i>
                        <span>Relationship: <strong style="color: var(--text-primary);">${invitation.relationship_type || 'Parent'}</strong></span>
                    </div>
                    ${invitation.invitee_name ? `
                        <div class="flex items-center gap-2" style="color: var(--text-secondary); font-size: 0.85rem;">
                            <i class="fas fa-user" style="color: #3B82F6; width: 16px;"></i>
                            <span>Name: <strong style="color: var(--text-primary);">${invitation.invitee_name}</strong></span>
                        </div>
                    ` : ''}
                </div>

                <!-- Time Ago -->
                <p class="text-xs mb-4" style="color: var(--text-secondary);">
                    <i class="fas fa-clock" style="margin-right: 4px;"></i>
                    Sent ${timeAgo}
                </p>

                <!-- Action Buttons -->
                <div class="flex gap-2">
                    ${invitation.status === 'pending' ? `
                        <button
                            onclick="ParentingInvitationManager.resendInvitation(${invitation.id})"
                            class="flex-1 btn-secondary"
                            style="padding: 10px 12px; border-radius: 10px; font-size: 0.875rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px;">
                            <i class="fas fa-redo"></i>
                            Resend
                        </button>
                        <button
                            onclick="ParentingInvitationManager.cancelInvitation(${invitation.id})"
                            style="flex: 1; padding: 10px 12px; border-radius: 10px; font-size: 0.875rem; font-weight: 600; background: #EF4444; color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s;"
                            onmouseover="this.style.background='#DC2626'"
                            onmouseout="this.style.background='#EF4444'">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                    ` : `
                        <div class="flex-1 text-center py-2" style="color: var(--text-secondary); font-style: italic;">
                            ${invitation.status === 'accepted' ? '✅ Parent accepted this invitation' :
                              invitation.status === 'rejected' ? '❌ Invitation was rejected' :
                              '⏰ Invitation has expired'}
                        </div>
                    `}
                </div>
            </div>
        `;
    },

    /**
     * Cancel a sent invitation
     */
    async cancelInvitation(invitationId) {
        if (!confirm('Are you sure you want to cancel this invitation?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/api/parent/cancel-invitation/${invitationId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to cancel invitation');
            }

            alert('Invitation cancelled successfully.');
            this.loadSentInvitations();

        } catch (error) {
            console.error('Error cancelling invitation:', error);
            alert('Failed to cancel invitation: ' + error.message);
        }
    },

    /**
     * Resend an invitation (placeholder - needs backend endpoint)
     */
    async resendInvitation(invitationId) {
        alert('📧 Resend invitation feature coming soon!\n\nThe invitation OTP is valid for 7 days.');
    },

    /**
     * Check for pending parenting invitations count (for badges on both tabs)
     */
    async updateInvitationCount() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            // Fetch received invitations count (Invited tab)
            const receivedResponse = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/pending-invitations', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (receivedResponse.ok) {
                const receivedData = await receivedResponse.json();
                const receivedInvitations = receivedData.invitations || [];

                // Update the main parenting card badge
                const mainCountBadge = document.getElementById('parenting-invitation-count');
                if (mainCountBadge) {
                    if (receivedInvitations.length > 0) {
                        mainCountBadge.textContent = receivedInvitations.length;
                        mainCountBadge.classList.remove('hidden');
                    } else {
                        mainCountBadge.classList.add('hidden');
                    }
                }

                // Update the Invited tab badge
                const invitedCountBadge = document.getElementById('parenting-invited-count');
                if (invitedCountBadge) {
                    if (receivedInvitations.length > 0) {
                        invitedCountBadge.textContent = receivedInvitations.length;
                        invitedCountBadge.classList.remove('hidden');
                    } else {
                        invitedCountBadge.classList.add('hidden');
                    }
                }
            }

            // Fetch sent invitations count (Invites tab)
            const sentResponse = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/sent-invitations', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (sentResponse.ok) {
                const sentData = await sentResponse.json();
                const sentInvitations = sentData.invitations || [];

                // Update the Invites tab badge
                const invitesCountBadge = document.getElementById('parenting-invites-count');
                if (invitesCountBadge) {
                    if (sentInvitations.length > 0) {
                        invitesCountBadge.textContent = sentInvitations.length;
                        invitesCountBadge.classList.remove('hidden');
                    } else {
                        invitesCountBadge.classList.add('hidden');
                    }
                }
            }
        } catch (error) {
            console.error('Error checking parenting invitations count:', error);
        }
    }
};

// ============================================
// REQUEST TYPE FILTER FUNCTIONS
// Note: The filter variables and functions are defined in global-functions.js
// to avoid duplicate declarations. This section is kept for reference only.
// ============================================

// Listen for panel switch events
window.addEventListener('panelSwitch', (event) => {
    const panelName = event.detail.panelName;

    if (panelName === 'requested-sessions') {
        SessionRequestManager.loadRequests('pending');
    } else if (panelName === 'my-students') {
        SessionRequestManager.loadMyStudents();
    }
});

// Initialize on page load if we're already on a relevant panel
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const panel = urlParams.get('panel');

    if (panel === 'requested-sessions') {
        setTimeout(() => SessionRequestManager.loadRequests('pending'), 500);
    } else if (panel === 'my-students') {
        setTimeout(() => SessionRequestManager.loadMyStudents(), 500);
    }
});

// ============================================
// GLOBAL FUNCTION: openStudentDetails
// Exposed to window for onclick handlers in student cards
// ============================================
async function openStudentDetails(studentId) {
    console.log('[SessionRequestManager] Opening student details for ID:', studentId);

    // Ensure modal is loaded first
    if (!document.getElementById('studentDetailsModal')) {
        console.log('[SessionRequestManager] Student details modal not found, loading...');
        if (typeof ModalLoader !== 'undefined') {
            await ModalLoader.load('student-details-modal.html');
        } else {
            console.error('[SessionRequestManager] ModalLoader not available');
            alert('Unable to load student details modal. Please refresh the page.');
            return;
        }
    }

    // Use TutorModalManager if available
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.openStudentDetails(studentId);
    } else {
        // Fallback: open modal directly
        const modal = document.getElementById('studentDetailsModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }
}

// ============================================
// GLOBAL FUNCTION: closeStudentDetailsModal
// ============================================
function closeStudentDetailsModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.closeStudentDetails();
    } else {
        // Fallback: close modal directly
        const modal = document.getElementById('studentDetailsModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
}

// ============================================
// GLOBAL FUNCTION: switchSection
// Switch sections in student details modal
// ============================================
function switchSection(section) {
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });

    // Show selected section
    const selectedSection = document.getElementById(section);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }

    // Update sidebar menu active state
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.classList.remove('active');
    });

    const activeItem = document.querySelector(`.sidebar-menu-item[onclick*="${section}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }

    // Load section data when switching to specific sections
    if (section === 'digital-whiteboard') {
        if (typeof StudentWhiteboardManager !== 'undefined') {
            StudentWhiteboardManager.loadSessions();
        }
    } else if (section === 'quiz-tests') {
        if (typeof StudentQuizManager !== 'undefined') {
            StudentQuizManager.loadQuizzes('active');
        }
    }
}

// Expose to window for HTML onclick handlers
window.openStudentDetails = openStudentDetails;
window.closeStudentDetailsModal = closeStudentDetailsModal;
window.switchSection = switchSection;
