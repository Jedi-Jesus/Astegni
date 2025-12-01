// ============================================
// SESSION REQUEST MANAGER
// ============================================

const SessionRequestManager = {
    currentRequestId: null,

    /**
     * Load and display session requests
     */
    async loadRequests(status = 'pending') {
        const container = document.getElementById('session-requests-list');
        if (!container) return;

        try {
            // Show loading state
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                    <p>Loading requests...</p>
                </div>
            `;

            const token = localStorage.getItem('token');
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
                ? `https://api.astegni.com/api/session-requests/tutor?status=${status}`
                : 'https://api.astegni.com/api/session-requests/tutor';

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
            const response = await fetch(`https://api.astegni.com/api/session-requests/tutor/${requestId}`, {
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
            const response = await fetch(`https://api.astegni.com/api/session-requests/tutor/${this.currentRequestId}`, {
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
            const response = await fetch(`https://api.astegni.com/api/session-requests/tutor/${this.currentRequestId}`, {
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
     * Load My Students (accepted requests)
     */
    async loadMyStudents() {
        const container = document.getElementById('my-students-grid');
        if (!container) return;

        try {
            // Show loading state
            container.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500">
                    <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                    <p>Loading students...</p>
                </div>
            `;

            const token = localStorage.getItem('token');
            if (!token) {
                container.innerHTML = `
                    <div class="col-span-full card p-6 text-center text-gray-500">
                        <i class="fas fa-lock text-3xl mb-3"></i>
                        <p>Please log in to view your students</p>
                    </div>
                `;
                return;
            }

            const response = await fetch('https://api.astegni.com/api/session-requests/tutor/my-students', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load students');
            }

            const students = await response.json();

            if (students.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full card p-6 text-center text-gray-500">
                        <i class="fas fa-user-graduate text-3xl mb-3"></i>
                        <p>No students yet</p>
                        <p class="text-sm mt-2">Accept session requests to add students</p>
                    </div>
                `;
                return;
            }

            // Render student cards
            container.innerHTML = students.map(student => this.renderStudentCard(student)).join('');

        } catch (error) {
            console.error('Error loading students:', error);
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
                        onclick="SessionRequestManager.messageStudent(${student.student_id})"
                        class="btn-secondary"
                        style="padding: 0.625rem 1rem; font-size: 0.875rem; border-radius: 8px;"
                        disabled
                        title="Messaging feature coming in Phase 2">
                        <i class="fas fa-envelope"></i>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Message student (Phase 2)
     */
    messageStudent(studentId) {
        alert('📧 Messaging feature coming in Phase 2!');
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

            const token = localStorage.getItem('token');
            if (!token) {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-lock text-3xl mb-3"></i>
                        <p>Please log in to view parenting invitations</p>
                    </div>
                `;
                return;
            }

            const response = await fetch('https://api.astegni.com/api/parent/pending-invitations', {
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
     * Render a parenting invitation card
     */
    renderInvitationCard(invitation) {
        const studentUrl = `../view-profiles/view-student.html?id=${invitation.student_user_id}`;
        const createdDate = new Date(invitation.created_at);
        const timeAgo = SessionRequestManager.getTimeAgo(createdDate);
        const studentInitial = (invitation.student_name || 'S').charAt(0).toUpperCase();

        return `
            <div class="card p-4" style="border: 2px solid var(--border-color); border-radius: 12px;">
                <div class="flex items-start gap-3 mb-4">
                    <!-- Student Avatar (Initial) -->
                    <div style="width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; font-size: 1.25rem; font-weight: bold;">
                        ${studentInitial}
                    </div>
                    <div class="flex-1">
                        <h4 class="font-bold text-lg">
                            <a href="${studentUrl}" class="hover:text-purple-600 hover:underline" style="color: var(--heading);">
                                ${invitation.student_name || 'Unknown Student'}
                            </a>
                        </h4>
                        <p class="text-sm" style="color: var(--text-secondary);">
                            ${invitation.grade_level || ''} ${invitation.studying_at ? '@ ' + invitation.studying_at : ''}
                        </p>
                    </div>
                </div>

                <div class="mb-4 p-3 rounded-lg" style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.1)); border: 1px solid rgba(139, 92, 246, 0.2);">
                    <p class="text-sm" style="color: var(--text-secondary);">Relationship Type</p>
                    <p class="font-semibold" style="color: #8B5CF6;">${invitation.relationship_type || 'Parent'}</p>
                </div>

                <p class="text-xs mb-4" style="color: var(--text-secondary);">
                    <i class="fas fa-clock"></i> Requested ${timeAgo}
                </p>

                <div class="flex gap-2">
                    <button
                        onclick="ParentingInvitationManager.acceptInvitation(${invitation.id})"
                        class="flex-1 btn-primary"
                        style="padding: 8px 12px; border-radius: 8px; font-size: 0.875rem;">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button
                        onclick="ParentingInvitationManager.rejectInvitation(${invitation.id})"
                        style="flex: 1; padding: 8px 12px; border-radius: 8px; font-size: 0.875rem; background: #EF4444; color: white; border: none; cursor: pointer;">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Accept a parenting invitation
     */
    async acceptInvitation(invitationId) {
        if (!confirm('Are you sure you want to accept this parenting invitation? You will become this student\'s linked parent.')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://api.astegni.com/api/parent/respond-invitation/${invitationId}?accept=true`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to accept invitation');
            }

            alert('Invitation accepted! You are now linked as this student\'s parent.');
            this.loadParentingInvitations();

        } catch (error) {
            console.error('Error accepting invitation:', error);
            alert('Failed to accept invitation. Please try again.');
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
            const response = await fetch(`https://api.astegni.com/api/parent/respond-invitation/${invitationId}?accept=false`, {
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
     * Check for pending parenting invitations count (for badge)
     */
    async updateInvitationCount() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch('https://api.astegni.com/api/parent/pending-invitations', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) return;

            const data = await response.json();
            const invitations = data.invitations || [];

            const countBadge = document.getElementById('parenting-invitation-count');
            if (countBadge) {
                if (invitations.length > 0) {
                    countBadge.textContent = invitations.length;
                    countBadge.classList.remove('hidden');
                } else {
                    countBadge.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error('Error checking parenting invitations count:', error);
        }
    }
};

// ============================================
// REQUEST TYPE FILTER FUNCTIONS
// ============================================

let currentTutorRequestType = 'schools';
let currentTutorRequestStatus = 'all';

/**
 * Filter tutor requests by type (schools, sessions, parenting)
 */
function filterTutorRequestType(type) {
    currentTutorRequestType = type;

    // Update active state on cards
    const cards = document.querySelectorAll('.request-type-card');
    cards.forEach(card => {
        if (card.getAttribute('data-type') === type) {
            card.classList.add('active');
            card.style.borderColor = 'var(--primary-color)';
            card.style.background = 'rgba(139, 92, 246, 0.05)';
        } else {
            card.classList.remove('active');
            card.style.borderColor = 'var(--border-color)';
            card.style.background = 'var(--card-bg)';
        }
    });

    // Load the appropriate content
    if (type === 'parenting') {
        // Hide status tabs for parenting (they only have pending)
        const statusTabs = document.querySelector('.status-tabs');
        if (statusTabs) statusTabs.style.display = 'none';

        ParentingInvitationManager.loadParentingInvitations();
    } else {
        // Show status tabs for schools and sessions
        const statusTabs = document.querySelector('.status-tabs');
        if (statusTabs) statusTabs.style.display = 'flex';

        if (type === 'sessions') {
            SessionRequestManager.loadRequests(currentTutorRequestStatus === 'all' ? null : currentTutorRequestStatus);
        } else {
            // Load school requests (placeholder)
            const container = document.getElementById('tutor-requests-list');
            if (container) {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-school text-3xl mb-3"></i>
                        <p>School requests coming in Phase 2!</p>
                        <p class="text-sm mt-2">Schools will be able to invite you to teach at their institution</p>
                    </div>
                `;
            }
        }
    }
}

/**
 * Filter tutor requests by status
 */
function filterTutorRequestStatus(status) {
    currentTutorRequestStatus = status;

    // Update active state on tabs
    const tabs = document.querySelectorAll('.status-tab');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-status') === status) {
            tab.classList.add('active');
            tab.style.color = 'var(--primary-color)';
            tab.style.fontWeight = '600';
            tab.style.borderBottom = '2px solid var(--primary-color)';
        } else {
            tab.classList.remove('active');
            tab.style.color = 'var(--text-secondary)';
            tab.style.fontWeight = '400';
            tab.style.borderBottom = 'none';
        }
    });

    // Reload content based on current type
    if (currentTutorRequestType === 'sessions') {
        SessionRequestManager.loadRequests(status === 'all' ? null : status);
    }
}

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
