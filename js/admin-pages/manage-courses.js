// manage-courses.js - Course Management Module
// Handles all course management functionality for the admin panel

(function() {
    'use strict';

    // API Configuration
    const API_BASE_URL = 'https://api.astegni.com';

    // Course management specific functions
    window.openAddCourseModal = function() {
        const modal = document.getElementById('add-course-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    window.closeAddCourseModal = function() {
        const modal = document.getElementById('add-course-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    window.saveCourse = async function() {
        // Get form values
        const courseTitle = document.getElementById('courseTitle')?.value;
        const courseCategory = document.getElementById('courseCategory')?.value;
        const courseLevel = document.getElementById('courseLevel')?.value;
        const requestedBy = document.getElementById('requestedBy')?.value || 'Admin';
        const courseDescription = document.getElementById('courseDescription')?.value;

        // Validate required fields
        if (!courseTitle || !courseCategory || !courseLevel) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }

        const courseData = {
            title: courseTitle,
            category: courseCategory,
            level: courseLevel,
            requested_by: requestedBy,
            description: courseDescription
        };

        console.log('Saving course:', courseData);

        try {
            const response = await fetch(`${API_BASE_URL}/api/course-management/requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(courseData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create course');
            }

            const result = await response.json();
            console.log('Course created:', result);

            // Add to table
            addCourseToRequestsTable(result.request_id, courseData);

            closeAddCourseModal();
            showNotification(`Course request ${result.request_id} created successfully!`, 'success');

            // Clear form
            document.getElementById('courseTitle').value = '';
            document.getElementById('courseCategory').value = '';
            document.getElementById('courseLevel').value = '';
            document.getElementById('requestedBy').value = '';
            document.getElementById('courseDescription').value = '';

        } catch (error) {
            console.error('Error creating course:', error);
            showNotification('Failed to create course: ' + error.message, 'error');
        }
    };

    // Helper function to add course to requests table
    function addCourseToRequestsTable(requestId, courseData) {
        const requestsTableBody = document.querySelector('#requested-panel table tbody');
        if (!requestsTableBody) return;

        const newRow = document.createElement('tr');
        newRow.className = 'hover:bg-gray-50';
        newRow.innerHTML = `
            <td class="p-4">
                <div>
                    <div class="font-semibold">${courseData.title}</div>
                    <div class="text-sm text-gray-500">${requestId}</div>
                </div>
            </td>
            <td class="p-4">${courseData.requested_by}</td>
            <td class="p-4">${courseData.category}</td>
            <td class="p-4">${courseData.level}</td>
            <td class="p-4">Just now</td>
            <td class="p-4">
                <button onclick="viewCourseRequest('${requestId}')"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </td>
        `;

        requestsTableBody.insertBefore(newRow, requestsTableBody.firstChild);
    }

    // Store course data globally for modal access
    window.courseDataStore = {};

    // View course request details
    window.viewCourseRequest = async function(requestId) {
        console.log('Viewing course request:', requestId);

        try {
            // Fetch from API - this will auto-update status from 'new' to 'under_review'
            const API_BASE_URL = 'https://api.astegni.com';
            const response = await fetch(`${API_BASE_URL}/api/course-management/requests/${requestId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch course request');
            }

            const courseData = await response.json();
            console.log('Fetched course data:', courseData);

            // Store for later use
            window.courseDataStore[requestId] = courseData;

            // Populate modal
            document.getElementById('view-course-title').textContent = courseData.title;
            document.getElementById('view-course-id').textContent = `ID: ${requestId}`;
            document.getElementById('view-course-category').textContent = courseData.category;
            document.getElementById('view-course-level').textContent = courseData.level || 'N/A';
            document.getElementById('view-course-requester').textContent = courseData.requested_by || 'System';

            // Format submission date
            const submitted = courseData.created_at ? new Date(courseData.created_at).toLocaleDateString() : 'N/A';
            document.getElementById('view-course-submitted').textContent = submitted;
            document.getElementById('view-course-description').textContent = courseData.description || 'No description available for this course.';

            // Set status badge
            const statusElement = document.getElementById('view-course-status');
            const statusBadge = getStatusBadge(courseData.status || 'new');
            statusElement.innerHTML = statusBadge;

            // Show/hide sections based on course type
            const ratingSection = document.getElementById('view-course-rating-section');
            const studentsSection = document.getElementById('view-course-students-section');
            const reasonSection = document.getElementById('view-course-reason-section');
            const notificationSection = document.getElementById('view-course-notification-section');

            // Hide all optional sections first
            ratingSection.classList.add('hidden');
            studentsSection.classList.add('hidden');
            reasonSection.classList.add('hidden');
            notificationSection.classList.add('hidden');

            // Add action buttons to modal
            const actionsContainer = document.getElementById('view-course-actions');
            actionsContainer.innerHTML = `
                <button onclick="approveCourseFromModal('${requestId}')"
                    class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                    Approve Course
                </button>
                <button onclick="openRejectModal('${requestId}')"
                    class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                    Reject Course
                </button>
            `;

            // Open modal
            const modal = document.getElementById('view-course-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            // IMPORTANT: Refresh stats after viewing (status changed from 'new' to 'under_review')
            setTimeout(() => {
                if (window.DashboardLoader && typeof window.DashboardLoader.loadPanelStats === 'function') {
                    window.DashboardLoader.loadPanelStats('requested');
                }
            }, 500);

        } catch (error) {
            console.error('Error viewing course request:', error);
            showNotification('Failed to load course details', 'error');
        }
    };

    // Helper function to get status badge HTML
    function getStatusBadge(status) {
        const badges = {
            'new': '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">New</span>',
            'under_review': '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Under Review</span>',
            'pending': '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Pending</span>'
        };
        return badges[status] || badges['pending'];
    }

    // Close view course modal
    window.closeViewCourseModal = function() {
        const modal = document.getElementById('view-course-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');

        // Refresh stats when closing modal (in case status changed)
        if (window.DashboardLoader && typeof window.DashboardLoader.loadPanelStats === 'function') {
            window.DashboardLoader.loadPanelStats('requested');
        }
    };

    // Helper function to find course row by ID
    function findCourseRow(courseId) {
        const tables = document.querySelectorAll('table tbody');
        for (const tbody of tables) {
            const rows = tbody.querySelectorAll('tr');
            for (const row of rows) {
                const idElement = row.querySelector('.text-sm.text-gray-500');
                if (idElement && idElement.textContent.includes(courseId)) {
                    return row;
                }
            }
        }
        return null;
    }

    // Helper function to extract course data from row
    function extractCourseData(row, courseId) {
        const cells = row.querySelectorAll('td');
        const data = {
            title: row.querySelector('.font-semibold')?.textContent || 'Unknown Course',
            category: '',
            level: '',
            submitted: '',
            requester: '',
            students: '',
            rating: '',
            reason: '',
            reasonLabel: '',
            statusBadge: '',
            notification: '',
            description: 'This is a sample course description. In a real implementation, this would be fetched from the database.',
            modalActions: ''
        };

        // Determine which table this row is in
        const table = row.closest('table');
        const tableHeader = table.querySelector('thead tr');
        const headers = Array.from(tableHeader.querySelectorAll('th')).map(th => th.textContent.trim());

        // Extract data based on column positions
        headers.forEach((header, index) => {
            const cellText = cells[index]?.textContent.trim() || '';

            if (header === 'Category') data.category = cellText;
            else if (header === 'Level') data.level = cellText;
            else if (header === 'Requested By') data.requester = cellText;
            else if (header === 'Submitted') data.submitted = cellText;
            else if (header === 'Students') data.students = cellText;
            else if (header === 'Rejected Date' || header === 'Suspended Date') data.submitted = cellText;
        });

        // Get rating if present
        const ratingElement = row.querySelector('.text-yellow-500');
        if (ratingElement) {
            const ratingText = ratingElement.textContent;
            const ratingCount = row.querySelector('.text-sm')?.textContent || '';
            data.rating = `${ratingElement.textContent} ${ratingCount}`;
        }

        // Get notification status if present
        const notificationBadge = row.querySelector('td:nth-child(6) span');
        if (notificationBadge && notificationBadge.innerHTML.includes('fa-check-circle')) {
            data.notification = notificationBadge.outerHTML;
        } else if (notificationBadge && notificationBadge.innerHTML.includes('fa-times-circle')) {
            data.notification = notificationBadge.outerHTML;
        }

        // Determine status and actions based on table
        if (table.closest('#requested-panel')) {
            // Pending Course Requests: Approve, Reject
            data.statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Pending Review</span>';
            data.modalActions = `
                <button onclick="closeViewCourseModal(); approveCourse('${courseId}');" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button onclick="closeViewCourseModal(); rejectCourse('${courseId}');" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                    <i class="fas fa-times"></i> Reject
                </button>
            `;
        } else if (table.closest('#verified-panel')) {
            // Active Courses: Send Notification, Suspend, Reject, Reconsider
            data.statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Active</span>';
            data.modalActions = `
                <button onclick="closeViewCourseModal(); sendCourseNotification('${courseId}');" class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                    <i class="fas fa-bell"></i> Send Notification
                </button>
                <button onclick="closeViewCourseModal(); suspendCourse('${courseId}');" class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                    <i class="fas fa-pause"></i> Suspend
                </button>
                <button onclick="closeViewCourseModal(); rejectActiveCourse('${courseId}');" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                    <i class="fas fa-times"></i> Reject
                </button>
                <button onclick="closeViewCourseModal(); reconsiderActiveCourse('${courseId}');" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    <i class="fas fa-redo"></i> Reconsider
                </button>
            `;
        } else if (table.closest('#rejected-panel')) {
            // Rejected Courses: Reconsider only
            data.statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Rejected</span>';
            data.reason = row.querySelector('.bg-red-100')?.textContent.trim() || 'No reason provided';
            data.reasonLabel = 'Rejection Reason';
            data.modalActions = `
                <button onclick="closeViewCourseModal(); reconsiderCourse('${courseId}');" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                    <i class="fas fa-redo"></i> Reconsider
                </button>
            `;
        } else if (table.closest('#suspended-panel')) {
            // Suspended Courses: Reinstate, Reject, Reconsider
            data.statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">Suspended</span>';
            data.reason = row.querySelector('.bg-orange-100')?.textContent.trim() || 'No reason provided';
            data.reasonLabel = 'Suspension Reason';
            data.modalActions = `
                <button onclick="closeViewCourseModal(); reinstateCourse('${courseId}');" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                    <i class="fas fa-play"></i> Reinstate
                </button>
                <button onclick="closeViewCourseModal(); rejectSuspendedCourse('${courseId}');" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                    <i class="fas fa-times"></i> Reject
                </button>
                <button onclick="closeViewCourseModal(); reconsiderSuspendedCourse('${courseId}');" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    <i class="fas fa-redo"></i> Reconsider
                </button>
            `;
        }

        return data;
    }

    // Approve course from modal (wrapper that closes modal first)
    window.approveCourseFromModal = async function(requestId) {
        closeViewCourseModal();
        await approveCourse(requestId);
    };

    // Approve course request
    window.approveCourse = async function(requestId) {
        if (confirm(`Are you sure you want to approve course request ${requestId}?`)) {
            console.log('Approving course:', requestId);

            try {
                const response = await fetch(`${API_BASE_URL}/api/course-management/${requestId}/approve`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to approve course');
                }

                const result = await response.json();
                console.log('Course approved:', result);

                // Find the row in pending requests
                const row = findCourseRow(requestId);
                if (row) {
                    // Extract course data before removing row
                    const courseData = extractCourseData(row, requestId);

                    // Remove from pending requests table
                    row.remove();

                    // Add to verified courses table
                    addCourseToActiveTable(result.course_id, courseData);
                }

                // Update stats
                await refreshPanelStats();

                showNotification(`Course approved successfully! New ID: ${result.course_id}. Requester notified.`, 'success');

            } catch (error) {
                console.error('Error approving course:', error);
                showNotification('Failed to approve course: ' + error.message, 'error');
            }
        }
    };

    // Helper function to add course to active courses table
    function addCourseToActiveTable(courseId, courseData) {
        const verifiedTableBody = document.querySelector('#verified-panel table tbody');
        if (!verifiedTableBody) return;

        const newRow = document.createElement('tr');
        newRow.className = 'hover:bg-gray-50';
        newRow.innerHTML = `
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23e5e7eb'/%3E%3C/svg%3E" alt="Course" class="w-10 h-10 rounded">
                    <div>
                        <div class="font-semibold">${courseData.title}</div>
                        <div class="text-sm text-gray-500">ID: ${courseId}</div>
                    </div>
                </div>
            </td>
            <td class="p-4">${courseData.category}</td>
            <td class="p-4">${courseData.level}</td>
            <td class="p-4">0</td>
            <td class="p-4">
                <div class="flex items-center gap-1">
                    <span class="text-yellow-500">☆☆☆☆☆</span>
                    <span class="text-sm">(0)</span>
                </div>
            </td>
            <td class="p-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                    <i class="fas fa-times-circle"></i> Unsent
                </span>
            </td>
            <td class="p-4">
                <button onclick="viewCourse('${courseId}')"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </td>
        `;

        verifiedTableBody.insertBefore(newRow, verifiedTableBody.firstChild);
    }

    // Reject course request
    window.rejectCourse = async function(requestId) {
        const reason = prompt(`Please provide a reason for rejecting course request ${requestId}:`);
        if (reason && reason.trim()) {
            console.log('Rejecting course:', requestId, 'Reason:', reason);

            try {
                const response = await fetch(`${API_BASE_URL}/api/course-management/${requestId}/reject`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reason: reason.trim() })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to reject course');
                }

                const result = await response.json();
                console.log('Course rejected:', result);

                // Find the row
                const row = findCourseRow(requestId);
                if (row) {
                    // Extract course data before removing row
                    const courseData = extractCourseData(row, requestId);

                    // Remove from pending requests table
                    row.remove();

                    // Add to rejected courses table
                    addCourseToRejectedTable(result.rejected_id, courseData, reason);
                }

                // Update stats
                await refreshPanelStats();

                showNotification(`Course rejected: ${result.rejected_id}. Requester notified.`, 'warning');

            } catch (error) {
                console.error('Error rejecting course:', error);
                showNotification('Failed to reject course: ' + error.message, 'error');
            }
        }
    };

    // Helper function to add course to rejected courses table
    function addCourseToRejectedTable(rejectedId, courseData, reason) {
        const rejectedTableBody = document.querySelector('#rejected-panel table tbody');
        if (!rejectedTableBody) return;

        const newRow = document.createElement('tr');
        newRow.className = 'hover:bg-gray-50';
        newRow.innerHTML = `
            <td class="p-4">
                <div>
                    <div class="font-semibold">${courseData.title}</div>
                    <div class="text-sm text-gray-500">${rejectedId}</div>
                </div>
            </td>
            <td class="p-4">${courseData.category}</td>
            <td class="p-4">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
            <td class="p-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    ${reason}
                </span>
            </td>
            <td class="p-4">
                <button onclick="viewCourseRequest('${rejectedId}')"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </td>
        `;

        rejectedTableBody.insertBefore(newRow, rejectedTableBody.firstChild);
    }

    // Reconsider rejected course
    window.reconsiderCourse = async function(rejectedId) {
        if (confirm(`Reconsider rejected course ${rejectedId}? This will move it back to pending requests.`)) {
            console.log('Reconsidering course:', rejectedId);

            try {
                const response = await fetch(`${API_BASE_URL}/api/course-management/${rejectedId}/reconsider`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to reconsider course');
                }

                const result = await response.json();
                console.log('Course reconsidered:', result);

                // Find the row
                const row = findCourseRow(rejectedId);
                if (row) {
                    // Extract course data before removing row
                    const courseData = extractCourseData(row, rejectedId);

                    // Remove from rejected table
                    row.remove();

                    // Add back to pending requests table
                    addCourseToRequestsTable(result.request_id, courseData);
                }

                // Update stats
                await refreshPanelStats();

                showNotification(`Course moved back to pending: ${result.request_id}`, 'success');

            } catch (error) {
                console.error('Error reconsidering course:', error);
                showNotification('Failed to reconsider course: ' + error.message, 'error');
            }
        }
    };

    // View course details (verified/active/suspended courses)
    window.viewCourse = async function(courseId) {
        console.log('Viewing active/verified course:', courseId);

        try {
            // Determine endpoint based on course ID prefix
            const API_BASE_URL = 'https://api.astegni.com';
            let endpoint;
            let courseData;

            if (courseId.startsWith('CRS-')) {
                // Active course
                endpoint = `${API_BASE_URL}/api/course-management/active/${courseId}`;
            } else if (courseId.startsWith('SUS-CRS-')) {
                // Suspended course
                endpoint = `${API_BASE_URL}/api/course-management/suspended/${courseId}`;
            } else if (courseId.startsWith('REJ-CRS-')) {
                // Rejected course
                endpoint = `${API_BASE_URL}/api/course-management/rejected/${courseId}`;
            } else {
                throw new Error('Unknown course ID format');
            }

            const response = await fetch(endpoint);

            if (!response.ok) {
                throw new Error('Failed to fetch course details');
            }

            courseData = await response.json();
            console.log('Fetched course data:', courseData);

            // Store for later use
            window.courseDataStore[courseId] = courseData;

            // Populate modal
            document.getElementById('view-course-title').textContent = courseData.title;
            document.getElementById('view-course-id').textContent = `ID: ${courseId}`;
            document.getElementById('view-course-category').textContent = courseData.category;
            document.getElementById('view-course-level').textContent = courseData.level || 'N/A';
            document.getElementById('view-course-requester').textContent = courseData.requested_by || 'System';

            // Format submission date
            const submitted = courseData.created_at ? new Date(courseData.created_at).toLocaleDateString() : 'N/A';
            document.getElementById('view-course-submitted').textContent = submitted;
            document.getElementById('view-course-description').textContent = courseData.description || 'No description available for this course.';

            // Set status badge based on course type
            const statusElement = document.getElementById('view-course-status');
            let statusBadge;
            if (courseId.startsWith('CRS-')) {
                statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Active</span>';
            } else if (courseId.startsWith('SUS-CRS-')) {
                statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">Suspended</span>';
            } else if (courseId.startsWith('REJ-CRS-')) {
                statusBadge = '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Rejected</span>';
            }
            statusElement.innerHTML = statusBadge;

            // Show/hide sections based on course type
            const ratingSection = document.getElementById('view-course-rating-section');
            const studentsSection = document.getElementById('view-course-students-section');
            const reasonSection = document.getElementById('view-course-reason-section');
            const notificationSection = document.getElementById('view-course-notification-section');

            // Hide all optional sections first
            ratingSection.classList.add('hidden');
            studentsSection.classList.add('hidden');
            reasonSection.classList.add('hidden');
            notificationSection.classList.add('hidden');

            // Show relevant sections for active courses
            if (courseId.startsWith('CRS-')) {
                // Show rating and students for active courses
                if (courseData.rating) {
                    ratingSection.classList.remove('hidden');
                    const stars = '★'.repeat(Math.floor(courseData.rating)) + '☆'.repeat(5 - Math.floor(courseData.rating));
                    document.getElementById('view-course-rating').textContent = `${stars} (${courseData.rating})`;
                }
                if (courseData.enrolled_students !== undefined) {
                    studentsSection.classList.remove('hidden');
                    document.getElementById('view-course-students').textContent = courseData.enrolled_students;
                }
                if (courseData.notification_sent !== undefined) {
                    notificationSection.classList.remove('hidden');
                    const notifStatus = courseData.notification_sent ?
                        '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800"><i class="fas fa-check-circle"></i> Sent</span>' :
                        '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800"><i class="fas fa-times-circle"></i> Not Sent</span>';
                    document.getElementById('view-course-notification').innerHTML = notifStatus;
                }
            }

            // Show reason for rejected/suspended courses
            if (courseData.rejection_reason || courseData.suspension_reason) {
                reasonSection.classList.remove('hidden');
                const reason = courseData.rejection_reason || courseData.suspension_reason;
                const reasonLabel = courseData.rejection_reason ? 'Rejection Reason' : 'Suspension Reason';
                document.getElementById('view-course-reason').textContent = reason;
                document.getElementById('view-course-reason-label').textContent = reasonLabel;
            }

            // Add action buttons based on course type
            const actionsContainer = document.getElementById('view-course-actions');
            if (courseId.startsWith('CRS-')) {
                // Active course actions
                actionsContainer.innerHTML = `
                    <button onclick="openSendNotificationModal('${courseId}')"
                        class="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                        <i class="fas fa-paper-plane"></i> Send Notification
                    </button>
                    <button onclick="suspendCourseFromModal('${courseId}')"
                        class="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                        <i class="fas fa-pause"></i> Suspend Course
                    </button>
                `;
            } else if (courseId.startsWith('SUS-CRS-')) {
                // Suspended course actions
                actionsContainer.innerHTML = `
                    <button onclick="reinstateCourseFromModal('${courseId}')"
                        class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                        <i class="fas fa-play"></i> Reinstate
                    </button>
                `;
            } else if (courseId.startsWith('REJ-CRS-')) {
                // Rejected course actions
                actionsContainer.innerHTML = `
                    <button onclick="reconsiderCourseFromModal('${courseId}')"
                        class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        <i class="fas fa-redo"></i> Reconsider
                    </button>
                `;
            }

            // Open modal
            const modal = document.getElementById('view-course-modal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');

        } catch (error) {
            console.error('Error viewing course:', error);
            showNotification('Failed to load course details: ' + error.message, 'error');
        }
    };

    // Helper functions for modal actions
    window.suspendCourseFromModal = async function(courseId) {
        closeViewCourseModal();
        const reason = prompt('Enter suspension reason:');
        if (reason && reason.trim()) {
            await suspendCourse(courseId, reason.trim());
        }
    };

    window.reinstateCourseFromModal = async function(courseId) {
        closeViewCourseModal();
        await reinstateCourse(courseId);
    };

    window.reconsiderCourseFromModal = async function(courseId) {
        closeViewCourseModal();
        await reconsiderCourse(courseId);
    };

    // Edit course details
    window.editCourse = function(courseId) {
        console.log('Editing course:', courseId);
        // TODO: Open edit modal pre-filled with course data
        showNotification(`Opening editor for course ${courseId}`, 'info');
    };

    // Suspend course
    window.suspendCourse = async function(courseId) {
        const reason = prompt(`Please provide a reason for suspending course ${courseId}:`);
        if (reason && reason.trim()) {
            console.log('Suspending course:', courseId, 'Reason:', reason);

            try {
                const response = await fetch(`${API_BASE_URL}/api/course-management/${courseId}/suspend`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reason: reason.trim() })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to suspend course');
                }

                const result = await response.json();
                console.log('Course suspended:', result);

                // Find the row
                const row = findCourseRow(courseId);
                if (row) {
                    // Extract course data before removing row
                    const courseData = extractCourseData(row, courseId);

                    // Remove from active courses table
                    row.remove();

                    // Add to suspended courses table
                    addCourseToSuspendedTable(result.suspended_id, courseData, reason);
                }

                // Update stats
                await refreshPanelStats();

                showNotification(`Course suspended: ${result.suspended_id}. Requester notified.`, 'warning');

            } catch (error) {
                console.error('Error suspending course:', error);
                showNotification('Failed to suspend course: ' + error.message, 'error');
            }
        }
    };

    // Helper function to add course to suspended courses table
    function addCourseToSuspendedTable(suspendedId, courseData, reason) {
        const suspendedTableBody = document.querySelector('#suspended-panel table tbody');
        if (!suspendedTableBody) return;

        const newRow = document.createElement('tr');
        newRow.className = 'hover:bg-gray-50';
        newRow.innerHTML = `
            <td class="p-4">
                <div>
                    <div class="font-semibold">${courseData.title}</div>
                    <div class="text-sm text-gray-500">${suspendedId}</div>
                </div>
            </td>
            <td class="p-4">${courseData.category}</td>
            <td class="p-4">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
            <td class="p-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                    ${reason}
                </span>
            </td>
            <td class="p-4">
                <button onclick="viewCourse('${suspendedId}')"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </td>
        `;

        suspendedTableBody.insertBefore(newRow, suspendedTableBody.firstChild);
    }

    // Reject an active course
    window.rejectActiveCourse = async function(courseId) {
        const reason = prompt(`Please provide a reason for rejecting active course ${courseId}:`);
        if (reason && reason.trim()) {
            console.log('Rejecting active course:', courseId, 'Reason:', reason);

            try {
                const response = await fetch(`${API_BASE_URL}/api/course-management/${courseId}/reject-active`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reason: reason.trim() })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to reject active course');
                }

                const result = await response.json();
                console.log('Active course rejected:', result);

                // Find the row
                const row = findCourseRow(courseId);
                if (row) {
                    const courseData = extractCourseData(row, courseId);
                    row.remove();
                    addCourseToRejectedTable(result.rejected_id, courseData, reason);
                }

                // Update stats
                await refreshPanelStats();

                showNotification(`Course rejected: ${result.rejected_id}. Requester notified.`, 'warning');

            } catch (error) {
                console.error('Error rejecting active course:', error);
                showNotification('Failed to reject course: ' + error.message, 'error');
            }
        }
    };

    // Reconsider an active course (move back to pending)
    window.reconsiderActiveCourse = async function(courseId) {
        if (confirm(`Reconsider active course ${courseId}? This will move it back to pending requests for re-review.`)) {
            console.log('Reconsidering active course:', courseId);

            try {
                const response = await fetch(`${API_BASE_URL}/api/course-management/${courseId}/reconsider-active`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to reconsider active course');
                }

                const result = await response.json();
                console.log('Active course reconsidered:', result);

                // Find the row
                const row = findCourseRow(courseId);
                if (row) {
                    const courseData = extractCourseData(row, courseId);
                    row.remove();
                    addCourseToRequestsTable(result.request_id, courseData);
                }

                // Update stats
                await refreshPanelStats();

                showNotification(`Course moved back to pending: ${result.request_id}`, 'success');

            } catch (error) {
                console.error('Error reconsidering active course:', error);
                showNotification('Failed to reconsider course: ' + error.message, 'error');
            }
        }
    };

    // Reject a suspended course
    window.rejectSuspendedCourse = async function(suspendedId) {
        const reason = prompt(`Please provide a reason for rejecting suspended course ${suspendedId}:`);
        if (reason && reason.trim()) {
            console.log('Rejecting suspended course:', suspendedId, 'Reason:', reason);

            try {
                const response = await fetch(`${API_BASE_URL}/api/course-management/${suspendedId}/reject-suspended`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reason: reason.trim() })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to reject suspended course');
                }

                const result = await response.json();
                console.log('Suspended course rejected:', result);

                // Find the row
                const row = findCourseRow(suspendedId);
                if (row) {
                    const courseData = extractCourseData(row, suspendedId);
                    row.remove();
                    addCourseToRejectedTable(result.rejected_id, courseData, reason);
                }

                // Update stats
                await refreshPanelStats();

                showNotification(`Course rejected: ${result.rejected_id}. Requester notified.`, 'warning');

            } catch (error) {
                console.error('Error rejecting suspended course:', error);
                showNotification('Failed to reject course: ' + error.message, 'error');
            }
        }
    };

    // Reconsider a suspended course (move back to pending)
    window.reconsiderSuspendedCourse = async function(suspendedId) {
        if (confirm(`Reconsider suspended course ${suspendedId}? This will move it back to pending requests for re-review.`)) {
            console.log('Reconsidering suspended course:', suspendedId);

            try {
                const response = await fetch(`${API_BASE_URL}/api/course-management/${suspendedId}/reconsider-suspended`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to reconsider suspended course');
                }

                const result = await response.json();
                console.log('Suspended course reconsidered:', result);

                // Find the row
                const row = findCourseRow(suspendedId);
                if (row) {
                    const courseData = extractCourseData(row, suspendedId);
                    row.remove();
                    addCourseToRequestsTable(result.request_id, courseData);
                }

                // Update stats
                await refreshPanelStats();

                showNotification(`Course moved back to pending: ${result.request_id}`, 'success');

            } catch (error) {
                console.error('Error reconsidering suspended course:', error);
                showNotification('Failed to reconsider course: ' + error.message, 'error');
            }
        }
    };

    // Reinstate suspended course
    window.reinstateCourse = async function(suspendedId) {
        if (confirm(`Reinstate course ${suspendedId}? This will make it active again.`)) {
            console.log('Reinstating course:', suspendedId);

            try {
                const response = await fetch(`${API_BASE_URL}/api/course-management/${suspendedId}/reinstate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to reinstate course');
                }

                const result = await response.json();
                console.log('Course reinstated:', result);

                // Find the row
                const row = findCourseRow(suspendedId);
                if (row) {
                    // Extract course data before removing row
                    const courseData = extractCourseData(row, suspendedId);

                    // Remove from suspended table
                    row.remove();

                    // Add back to active courses table
                    addCourseToActiveTable(result.course_id, courseData);
                }

                // Update stats
                await refreshPanelStats();

                showNotification(`Course reinstated: ${result.course_id}`, 'success');

            } catch (error) {
                console.error('Error reinstating course:', error);
                showNotification('Failed to reinstate course: ' + error.message, 'error');
            }
        }
    };

    // Note: No delete functions - courses should never be permanently deleted
    // They can only be moved between states via approve/reject/suspend/reinstate

    window.openCourseReports = function() {
        console.log('Opening course reports');
        showNotification('Course Analytics feature coming soon!', 'info');
    };

    window.openCurriculumGuidelines = function() {
        console.log('Opening curriculum guidelines');
        showNotification('Curriculum Guidelines feature coming soon!', 'info');
    };

    window.openCourseSettings = function() {
        console.log('Opening course settings');
        showNotification('Course Settings feature coming soon!', 'info');
    };

    // Send notification to tutors about course need
    window.sendCourseNotification = function(courseId) {
        console.log('Opening notification modal for course:', courseId);

        // Store current course ID
        window.currentNotificationCourseId = courseId;

        // Find the course name from the table
        let courseName = 'this course';
        let courseCategory = '';
        const rows = document.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const courseIdElement = row.querySelector('.text-sm.text-gray-500');
            if (courseIdElement && courseIdElement.textContent.includes(courseId)) {
                const courseNameElement = row.querySelector('.font-semibold');
                const categoryElement = row.querySelectorAll('td')[1]; // Category is 2nd column
                if (courseNameElement) {
                    courseName = courseNameElement.textContent.trim();
                }
                if (categoryElement) {
                    courseCategory = categoryElement.textContent.trim();
                }
            }
        });

        // Open the notification modal
        const modal = document.getElementById('send-notification-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            // Set course ID in modal
            const courseIdDisplay = document.getElementById('notification-course-id');
            if (courseIdDisplay) {
                courseIdDisplay.textContent = courseId;
            }

            // Set the notification message with course name in bold
            const messageTextarea = document.getElementById('notificationMessage');
            if (messageTextarea) {
                messageTextarea.value = `Dear Tutors,

We've identified a market need for **${courseName}** (${courseCategory}). Students are actively searching for this course. If you have expertise in this area, please consider creating course content to meet this demand.

This is an excellent opportunity to expand your teaching portfolio and connect with students seeking quality education in this subject.

Best regards,
Astegni Team`;
            }

            // Pre-select target audience based on category if possible
            const targetAudienceSelect = document.getElementById('targetAudience');
            if (targetAudienceSelect && courseCategory) {
                const categoryMapping = {
                    'Mathematics': 'Mathematics Tutors',
                    'Science': 'Science Tutors',
                    'Technology': 'Technology Tutors',
                    'Languages': 'Language Tutors',
                    'Business': 'Business Tutors',
                    'Arts': 'Arts Tutors'
                };

                const targetValue = categoryMapping[courseCategory];
                if (targetValue) {
                    targetAudienceSelect.value = targetValue;
                }
            }
        }
    };

    window.closeSendNotificationModal = function() {
        const modal = document.getElementById('send-notification-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    window.confirmSendNotification = async function() {
        const courseId = window.currentNotificationCourseId;
        const notificationMessage = document.getElementById('notificationMessage')?.value;
        const targetAudience = document.getElementById('targetAudience')?.value;

        if (!notificationMessage || !targetAudience) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        console.log('Sending notification:', {
            courseId: courseId,
            message: notificationMessage,
            audience: targetAudience
        });

        try {
            const response = await fetch(`${API_BASE_URL}/api/course-management/${courseId}/notify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: notificationMessage,
                    target_audience: targetAudience
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to send notification');
            }

            const result = await response.json();
            console.log('Notification sent:', result);

            // Update the notification status in the table (visual feedback)
            updateNotificationStatus(courseId, 'sent');

            closeSendNotificationModal();
            showNotification(`Notification sent to ${targetAudience}!`, 'success');

        } catch (error) {
            console.error('Error sending notification:', error);
            showNotification('Failed to send notification: ' + error.message, 'error');
        }
    };

    // Helper function to update notification status in the table
    function updateNotificationStatus(courseId, status) {
        // Find all table rows and update the notification badge for matching course
        const rows = document.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const courseIdElement = row.querySelector('.text-sm.text-gray-500');
            if (courseIdElement && courseIdElement.textContent.includes(courseId)) {
                const notificationCell = row.querySelector('td:nth-child(6) span');
                if (notificationCell) {
                    if (status === 'sent') {
                        notificationCell.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800';
                        notificationCell.innerHTML = '<i class="fas fa-check-circle"></i> Sent';
                    } else {
                        notificationCell.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800';
                        notificationCell.innerHTML = '<i class="fas fa-times-circle"></i> Unsent';
                    }
                }
            }
        });
    }

    window.openEditProfileModal = async function() {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            // Load profile data from database
            try {
                const response = await fetch(`${API_BASE_URL}/api/admin-dashboard/profile-stats?admin_id=1`);
                if (response.ok) {
                    const profile = await response.json();

                    // Populate form fields
                    document.getElementById('adminNameInput').value = profile.display_name || 'Course Management';
                    document.getElementById('departmentInput').value = profile.department || 'Educational Services';
                    document.getElementById('employeeIdInput').value = profile.employee_id || 'ADM-2024-003';
                    document.getElementById('bioInput').value = profile.bio || '';
                    document.getElementById('quoteInput').value = profile.profile_quote || '';
                }
            } catch (error) {
                console.error('Error loading profile:', error);
                showNotification('Failed to load profile data', 'error');
            }

            modal.classList.remove('hidden');
        }
    };

    window.closeEditProfileModal = function() {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    window.openUploadProfileModal = function() {
        const modal = document.getElementById('upload-profile-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };

    window.closeUploadProfileModal = function() {
        const modal = document.getElementById('upload-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    window.openUploadCoverModal = function() {
        const modal = document.getElementById('upload-cover-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };

    window.closeUploadCoverModal = function() {
        const modal = document.getElementById('upload-cover-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    window.handleProfileUpdate = async function(event) {
        event.preventDefault();

        // Get form values
        const adminName = document.getElementById('adminNameInput').value;
        const department = document.getElementById('departmentInput').value;
        const employeeId = document.getElementById('employeeIdInput').value;
        const bio = document.getElementById('bioInput').value;
        const quote = document.getElementById('quoteInput').value;

        const profileData = {
            display_name: adminName,
            department: department,
            employee_id: employeeId,
            bio: bio,
            profile_quote: quote
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin-dashboard/profile?admin_id=1`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(profileData)
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            const result = await response.json();
            console.log('Profile updated:', result);

            // Update profile header immediately
            const adminNameDisplay = document.getElementById('adminName');
            if (adminNameDisplay) {
                adminNameDisplay.textContent = adminName;
            }

            // Update quote
            const quoteDisplay = document.querySelector('.profile-quote span');
            if (quoteDisplay) {
                quoteDisplay.textContent = `"${quote}"`;
            }

            // Update department in info grid
            const infoItems = document.querySelectorAll('.info-item');
            infoItems.forEach(item => {
                const label = item.querySelector('.info-label');
                if (label && label.textContent.includes('Department:')) {
                    const value = item.querySelector('.info-value');
                    if (value) {
                        value.textContent = department;
                    }
                }
                if (label && label.textContent.includes('Employee ID:')) {
                    const value = item.querySelector('.info-value');
                    if (value) {
                        value.textContent = employeeId;
                    }
                }
            });

            // Update bio in description
            const description = document.querySelector('.info-description p');
            if (description) {
                description.textContent = bio;
            }

            closeEditProfileModal();
            showNotification('Profile updated successfully!', 'success');

        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('Failed to update profile: ' + error.message, 'error');
        }
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
        // Implement profile picture upload logic
        console.log('Uploading profile picture...');
        closeUploadProfileModal();
        showNotification('Profile picture uploaded successfully!', 'success');
    };

    window.handleCoverImageUpload = function() {
        // Implement cover image upload logic
        console.log('Uploading cover image...');
        closeUploadCoverModal();
        showNotification('Cover image uploaded successfully!', 'success');
    };

    window.logout = function() {
        if (confirm('Are you sure you want to logout?')) {
            // Implement logout logic
            console.log('Logging out...');
            showNotification('Logging out...', 'info');
            // Redirect to login page
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1000);
        }
    };

    // Refresh panel statistics after course status changes
    async function refreshPanelStats() {
        try {
            // Get current panel from URL or use 'dashboard'
            const urlParams = new URLSearchParams(window.location.search);
            const currentPanel = urlParams.get('panel') || 'dashboard';

            // Refresh stats for current panel
            const response = await fetch(`${API_BASE_URL}/api/admin-dashboard/panel-statistics/${currentPanel}?force_refresh=true`);
            if (response.ok) {
                const stats = await response.json();

                // Update stats display based on current panel
                updateStatsDisplay(currentPanel, stats);
            }

            // Also refresh daily quotas in right sidebar
            const quotasResponse = await fetch(`${API_BASE_URL}/api/admin-dashboard/daily-quotas?admin_id=1`);
            if (quotasResponse.ok) {
                const quotas = await quotasResponse.json();
                updateDailyQuotas(quotas);
                console.log('Stats and quotas refreshed successfully');
            }
        } catch (error) {
            console.error('Error refreshing stats:', error);
        }
    }

    // Update daily quotas in right sidebar
    function updateDailyQuotas(quotas) {
        if (!quotas || !quotas.quotas) {
            console.warn('No quotas data provided');
            return;
        }

        const quotaData = quotas.quotas;

        // Update each quota value in the right sidebar
        const quotaItems = document.querySelectorAll('.admin-widget-card .space-y-3 > div');

        quotaItems.forEach((item) => {
            const label = item.querySelector('.text-sm.text-gray-600');
            const value = item.querySelector('.font-bold');
            const progressBar = item.querySelector('.progress-fill');

            if (label && value) {
                const labelText = label.textContent;

                if (labelText.includes('Active')) {
                    value.textContent = quotaData.active;
                    if (progressBar) {
                        progressBar.style.width = `${(quotaData.active / quotaData.total_capacity) * 100}%`;
                    }
                } else if (labelText.includes('Pending')) {
                    value.textContent = quotaData.pending;
                    if (progressBar) {
                        progressBar.style.width = `${(quotaData.pending / quotaData.total_capacity) * 100}%`;
                    }
                } else if (labelText.includes('Rejected')) {
                    value.textContent = quotaData.rejected;
                    if (progressBar) {
                        progressBar.style.width = `${(quotaData.rejected / quotaData.total_capacity) * 100}%`;
                    }
                } else if (labelText.includes('Suspended')) {
                    value.textContent = quotaData.suspended;
                    if (progressBar) {
                        progressBar.style.width = `${(quotaData.suspended / quotaData.total_capacity) * 100}%`;
                    }
                } else if (labelText.includes('Archived')) {
                    value.textContent = quotaData.archived;
                    if (progressBar) {
                        progressBar.style.width = `${(quotaData.archived / quotaData.total_capacity) * 100}%`;
                    }
                }
            }
        });

        console.log('Daily quotas updated:', quotaData);
    }

    // Update stats display on current panel
    function updateStatsDisplay(panelName, stats) {
        const panelElement = document.getElementById(`${panelName}-panel`);
        if (!panelElement) {
            console.warn(`Panel element not found: ${panelName}-panel`);
            return;
        }

        // Find stats cards in current panel
        const statCards = panelElement.querySelectorAll('.dashboard-grid .card');

        if (statCards.length === 0) {
            console.warn(`No stat cards found in panel: ${panelName}`);
            return;
        }

        console.log(`Updating ${statCards.length} stats in ${panelName} panel with`, stats);

        stats.forEach((stat, index) => {
            if (statCards[index]) {
                // Look for any element with text-2xl class (more flexible selector)
                const valueElement = statCards[index].querySelector('p.text-2xl, .text-2xl');
                if (valueElement) {
                    valueElement.textContent = stat.stat_value;
                    console.log(`Updated stat ${index}: ${stat.stat_key} = ${stat.stat_value}`);
                } else {
                    console.warn(`Value element not found in card ${index}`);
                }
            }
        });
    }

    // Notification helper function
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-0`;

        // Set color based on type
        switch(type) {
            case 'success':
                notification.className += ' bg-green-500 text-white';
                break;
            case 'warning':
                notification.className += ' bg-yellow-500 text-white';
                break;
            case 'error':
                notification.className += ' bg-red-500 text-white';
                break;
            default:
                notification.className += ' bg-blue-500 text-white';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        // Check if we're on the course management page
        if (window.location.href.includes('manage-courses.html')) {
            console.log('Course Management Module initialized');

            // Add keyboard shortcuts
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    // Close all modals
                    closeAddCourseModal();
                    closeViewCourseModal();
                    closeSendNotificationModal();
                    closeEditProfileModal();
                    closeUploadProfileModal();
                    closeUploadCoverModal();
                }
            });

            // Initialize panel state from URL
            const urlParams = new URLSearchParams(window.location.search);
            const panel = urlParams.get('panel');
            if (panel) {
                // switchPanel function is provided by panel-manager.js
                if (typeof window.switchPanel === 'function') {
                    window.switchPanel(panel);
                }
            }
        }
    });
})();