// ============================================
// SESSIONS PANEL MANAGER
// Manages the dedicated Sessions panel
// All session-related functionality consolidated here
// ============================================

// Namespace to avoid conflicts with schedule-panel-manager.js
window.SessionsPanel = window.SessionsPanel || {};

let allSessionsData = [];
let sessionStats = null;
let sessionCurrentPage = 1;
const sessionItemsPerPage = 10;
let currentRoleFilter = 'all';
let filteredSessionsCache = [];
let sessionSortField = null;
let sessionSortDirection = 'asc';

// Initialize when sessions panel is opened
window.addEventListener('panelSwitch', (event) => {
    if (event.detail.panelName === 'sessions') {
        console.log('Sessions panel opened, loading sessions...');
        loadSessions();
        loadSessionStats();
    }
});

// Also listen for panelSwitched event (backward compatibility)
window.addEventListener('panelSwitched', (event) => {
    if (event.detail.panelName === 'sessions') {
        console.log('Sessions panel opened (backward compat), loading sessions...');
        loadSessions();
        loadSessionStats();
    }
});

// Filter sessions by role (calls different API endpoints based on role perspective)
window.filterSessionsByRole = function filterSessionsByRole(role, event) {
    console.log(`Filtering sessions by role: ${role}`);
    currentRoleFilter = role;

    // Update filter buttons
    document.querySelectorAll('#sessions-panel button[onclick^="filterSessionsByRole"]').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-200');
    });

    // If event is provided (from onclick), highlight the clicked button
    if (event && event.target) {
        event.target.classList.remove('bg-gray-200');
        event.target.classList.add('bg-blue-500', 'text-white');
    }

    // Reset to page 1 when changing filters
    sessionCurrentPage = 1;

    // Load sessions based on role perspective
    loadSessionsByRole(role);
}

// Load sessions based on role perspective (calls different API endpoints)
async function loadSessionsByRole(role) {
    const container = document.getElementById('sessions-table-container');
    if (!container) return;

    try {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                <p>Loading sessions as ${role}...</p>
            </div>
        `;

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-lock text-3xl mb-3"></i>
                    <p>Please log in to view your sessions</p>
                </div>
            `;
            return;
        }

        // Determine API endpoint based on role
        let url;
        if (role === 'all') {
            // For "all", we'll fetch all three and combine them
            url = null; // Will be handled separately
        } else if (role === 'tutor') {
            url = `${window.API_BASE_URL || 'http://localhost:8000'}/api/tutor/sessions`;
        } else if (role === 'student') {
            url = `${window.API_BASE_URL || 'http://localhost:8000'}/api/student/my-sessions`;
        } else if (role === 'parent') {
            url = `${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/sessions`;
        }

        let fetchedSessions = [];

        if (role === 'all') {
            // Fetch from all three endpoints and combine
            const [tutorRes, studentRes, parentRes] = await Promise.allSettled([
                fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/tutor/sessions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/student/my-sessions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/sessions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            // Combine all successful responses
            if (tutorRes.status === 'fulfilled' && tutorRes.value.ok) {
                const tutorSessions = await tutorRes.value.json();
                fetchedSessions = [...fetchedSessions, ...tutorSessions.map(s => ({ ...s, viewAs: 'tutor' }))];
            }
            if (studentRes.status === 'fulfilled' && studentRes.value.ok) {
                const studentSessions = await studentRes.value.json();
                fetchedSessions = [...fetchedSessions, ...studentSessions.map(s => ({ ...s, viewAs: 'student' }))];
            }
            if (parentRes.status === 'fulfilled' && parentRes.value.ok) {
                const parentSessions = await parentRes.value.json();
                fetchedSessions = [...fetchedSessions, ...parentSessions.map(s => ({ ...s, viewAs: 'parent' }))];
            }
        } else {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`Failed to load ${role} sessions`);
            }

            fetchedSessions = await response.json();
            // Tag sessions with their view role
            fetchedSessions = fetchedSessions.map(s => ({ ...s, viewAs: role }));
        }

        allSessionsData = fetchedSessions;
        filteredSessionsCache = fetchedSessions;

        if (fetchedSessions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-users text-3xl mb-3"></i>
                    <p>No sessions found as ${role}</p>
                </div>
            `;
            return;
        }

        // Display sessions with role-appropriate columns
        displayFilteredSessions(fetchedSessions, role);

    } catch (error) {
        console.error(`Error loading ${role} sessions:`, error);
        container.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load sessions</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

// Display filtered sessions (helper function) - with role-based columns
function displayFilteredSessions(sessions, viewRole = 'tutor') {
    const container = document.getElementById('sessions-table-container');
    if (!container) return;

    if (sessions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-filter text-3xl mb-3"></i>
                <p>No sessions found for this filter</p>
            </div>
        `;
        return;
    }

    console.log(`Displaying ${sessions.length} filtered sessions as ${viewRole}`);

    // Pagination for filtered sessions
    const totalSessions = sessions.length;
    const totalPages = Math.ceil(totalSessions / sessionItemsPerPage);
    const startIndex = (sessionCurrentPage - 1) * sessionItemsPerPage;
    const endIndex = startIndex + sessionItemsPerPage;
    const paginatedSessions = sessions.slice(startIndex, endIndex);

    // Determine table headers based on viewRole
    let tableHeaders = '';
    if (viewRole === 'tutor') {
        tableHeaders = `
            <th style="padding: 12px; text-align: left; font-weight: 600;">Student Name</th>
            <th style="padding: 12px; text-align: left; font-weight: 600;">Course & Topics</th>
            <th style="padding: 12px; text-align: left; font-weight: 600;">Date & Time</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Status</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Attendance</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Notification</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Alarm</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Actions</th>
        `;
    } else if (viewRole === 'student') {
        tableHeaders = `
            <th style="padding: 12px; text-align: left; font-weight: 600;">Tutor Name</th>
            <th style="padding: 12px; text-align: left; font-weight: 600;">Course & Topics</th>
            <th style="padding: 12px; text-align: left; font-weight: 600;">Date & Time</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Status</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Attendance</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Notification</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Alarm</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Actions</th>
        `;
    } else if (viewRole === 'parent') {
        tableHeaders = `
            <th style="padding: 12px; text-align: left; font-weight: 600;">Child Name</th>
            <th style="padding: 12px; text-align: left; font-weight: 600;">Tutor Name</th>
            <th style="padding: 12px; text-align: left; font-weight: 600;">Course & Topics</th>
            <th style="padding: 12px; text-align: left; font-weight: 600;">Date & Time</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Status</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Attendance</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Notification</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Alarm</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Actions</th>
        `;
    } else if (viewRole === 'all') {
        // Show all columns for 'all' view
        tableHeaders = `
            <th style="padding: 12px; text-align: left; font-weight: 600;">Role</th>
            <th style="padding: 12px; text-align: left; font-weight: 600;">Name</th>
            <th style="padding: 12px; text-align: left; font-weight: 600;">Course & Topics</th>
            <th style="padding: 12px; text-align: left; font-weight: 600;">Date & Time</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Status</th>
            <th style="padding: 12px; text-align: center; font-weight: 600;">Actions</th>
        `;
    }

    // Generate table rows based on viewRole
    const tableRows = paginatedSessions.map(session => {
        const currentViewRole = session.viewAs || viewRole;

        const alarmStatus = session.alarm_enabled
            ? `<i class="fas fa-bell text-green-500 cursor-pointer hover:text-green-600" title="Alarm enabled (${session.alarm_before_minutes || 15} min before)" onclick="toggleSessionAlarm(${session.id}, false)"></i>`
            : `<i class="fas fa-bell-slash text-gray-400 cursor-pointer hover:text-gray-600" title="Click to enable alarm" onclick="toggleSessionAlarm(${session.id}, true)"></i>`;

        const notificationStatus = session.notification_enabled
            ? `<i class="fas fa-check-circle text-green-500 cursor-pointer hover:text-green-600" title="Browser notifications enabled" onclick="toggleSessionNotification(${session.id}, false)"></i>`
            : `<i class="fas fa-times-circle text-gray-400 cursor-pointer hover:text-gray-600" title="Click to enable notifications" onclick="toggleSessionNotification(${session.id}, true)"></i>`;

        // Get topics as string
        const topicsStr = Array.isArray(session.topics) && session.topics.length > 0
            ? session.topics.join(', ')
            : 'No topics specified';

        // Status badge color
        const statusColor =
            session.status === 'completed' ? '#10B981' :
            session.status === 'in-progress' ? '#3B82F6' :
            session.status === 'scheduled' ? '#F59E0B' :
            session.status === 'cancelled' ? '#EF4444' :
            session.status === 'missed' ? '#6B7280' : '#9CA3AF';

        const statusBadge = `<span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; text-transform: capitalize;">
            ${session.status || 'scheduled'}
        </span>`;

        // Attendance badges helper function
        const getAttendanceBadge = (status) => {
            if (!status || status === 'present') {
                return '<span style="background: #D1FAE5; color: #065F46; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">Present</span>';
            } else if (status === 'late') {
                return '<span style="background: #FEF3C7; color: #92400E; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">Late</span>';
            } else if (status === 'absent') {
                return '<span style="background: #FEE2E2; color: #991B1B; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">Absent</span>';
            }
            return '<span style="color: #9CA3AF; font-size: 0.75rem;">Not Marked</span>';
        };

        const attendanceDisplay = `
            <div style="display: flex; flex-direction: column; gap: 4px; align-items: center;">
                <div style="display: flex; align-items: center; gap: 4px;">
                    <i class="fas fa-chalkboard-teacher" style="color: var(--text-secondary); font-size: 0.75rem;" title="Tutor"></i>
                    ${getAttendanceBadge(session.tutor_attendance_status)}
                </div>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <i class="fas fa-user-graduate" style="color: var(--text-secondary); font-size: 0.75rem;" title="Student"></i>
                    ${getAttendanceBadge(session.student_attendance_status)}
                </div>
                ${session.status === 'completed' ? `
                    <button
                        onclick="openAttendanceSuggestionModal(${session.id})"
                        class="btn-secondary"
                        style="margin-top: 4px; padding: 4px 8px; font-size: 0.75rem; border-radius: 4px;"
                        title="Mark Attendance">
                        <i class="fas fa-clipboard-check"></i>
                    </button>
                ` : ''}
            </div>
        `;

        let rowHTML = '';

        if (currentViewRole === 'tutor') {
            // As Tutor: Show student name
            rowHTML = `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 12px;">
                        <div style="font-weight: 500;">${session.student_name || 'Unknown Student'}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Mode: ${session.session_mode || 'online'}</div>
                    </td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 500;">${session.course_name || 'Unknown Course'}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${topicsStr}</div>
                    </td>
                    <td style="padding: 12px; font-size: 0.875rem;">
                        ${session.session_date ? new Date(session.session_date).toLocaleDateString() : 'N/A'}<br>
                        <span style="color: var(--text-secondary);">${session.start_time || ''} - ${session.end_time || ''}</span>
                    </td>
                    <td style="padding: 12px; text-align: center;">${statusBadge}</td>
                    <td style="padding: 12px; text-align: center;">${attendanceDisplay}</td>
                    <td style="padding: 12px; text-align: center;">${notificationStatus}</td>
                    <td style="padding: 12px; text-align: center;">${alarmStatus}</td>
                    <td style="padding: 12px; text-align: center;">
                        <button onclick="viewSession(${session.id})" class="btn-secondary" style="padding: 6px 12px; font-size: 0.875rem; border-radius: 6px;">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        } else if (currentViewRole === 'student') {
            // As Student: Show tutor name
            rowHTML = `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 12px;">
                        <div style="font-weight: 500;">${session.tutor_name || 'Unknown Tutor'}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Mode: ${session.session_mode || 'online'}</div>
                    </td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 500;">${session.course_name || 'Unknown Course'}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${topicsStr}</div>
                    </td>
                    <td style="padding: 12px; font-size: 0.875rem;">
                        ${session.session_date ? new Date(session.session_date).toLocaleDateString() : 'N/A'}<br>
                        <span style="color: var(--text-secondary);">${session.start_time || ''} - ${session.end_time || ''}</span>
                    </td>
                    <td style="padding: 12px; text-align: center;">${statusBadge}</td>
                    <td style="padding: 12px; text-align: center;">${attendanceDisplay}</td>
                    <td style="padding: 12px; text-align: center;">${notificationStatus}</td>
                    <td style="padding: 12px; text-align: center;">${alarmStatus}</td>
                    <td style="padding: 12px; text-align: center;">
                        <button onclick="viewSession(${session.id})" class="btn-secondary" style="padding: 6px 12px; font-size: 0.875rem; border-radius: 6px;">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        } else if (currentViewRole === 'parent') {
            // As Parent: Show child name + tutor name
            rowHTML = `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 12px;">
                        <div style="font-weight: 500;">${session.child_name || session.student_name || 'Unknown Child'}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Mode: ${session.session_mode || 'online'}</div>
                    </td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 500;">${session.tutor_name || 'Unknown Tutor'}</div>
                    </td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 500;">${session.course_name || 'Unknown Course'}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${topicsStr}</div>
                    </td>
                    <td style="padding: 12px; font-size: 0.875rem;">
                        ${session.session_date ? new Date(session.session_date).toLocaleDateString() : 'N/A'}<br>
                        <span style="color: var(--text-secondary);">${session.start_time || ''} - ${session.end_time || ''}</span>
                    </td>
                    <td style="padding: 12px; text-align: center;">${statusBadge}</td>
                    <td style="padding: 12px; text-align: center;">${attendanceDisplay}</td>
                    <td style="padding: 12px; text-align: center;">${notificationStatus}</td>
                    <td style="padding: 12px; text-align: center;">${alarmStatus}</td>
                    <td style="padding: 12px; text-align: center;">
                        <button onclick="viewSession(${session.id})" class="btn-secondary" style="padding: 6px 12px; font-size: 0.875rem; border-radius: 6px;">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        } else if (viewRole === 'all') {
            // All view: Show role badge + name
            const roleBadge = currentViewRole === 'tutor'
                ? '<span style="background: #10B981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">Tutor</span>'
                : currentViewRole === 'student'
                ? '<span style="background: #3B82F6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">Student</span>'
                : '<span style="background: #8B5CF6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">Parent</span>';

            const displayName = currentViewRole === 'tutor'
                ? session.student_name
                : currentViewRole === 'student'
                ? session.tutor_name
                : `${session.child_name || session.student_name} (via ${session.tutor_name})`;

            rowHTML = `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 12px; text-align: center;">${roleBadge}</td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 500;">${displayName || 'Unknown'}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Mode: ${session.session_mode || 'online'}</div>
                    </td>
                    <td style="padding: 12px;">
                        <div style="font-weight: 500;">${session.course_name || 'Unknown Course'}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${topicsStr}</div>
                    </td>
                    <td style="padding: 12px; font-size: 0.875rem;">
                        ${session.session_date ? new Date(session.session_date).toLocaleDateString() : 'N/A'}<br>
                        <span style="color: var(--text-secondary);">${session.start_time || ''} - ${session.end_time || ''}</span>
                    </td>
                    <td style="padding: 12px; text-align: center;">${statusBadge}</td>
                    <td style="padding: 12px; text-align: center;">
                        <button onclick="viewSession(${session.id})" class="btn-secondary" style="padding: 6px 12px; font-size: 0.875rem; border-radius: 6px;">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                </tr>
            `;
        }

        return rowHTML;
    }).join('');

    // Create table HTML
    const tableHTML = `
        <div class="overflow-x-auto">
            <table class="w-full" style="border-collapse: collapse;">
                <thead>
                    <tr style="background-color: var(--bg-secondary); border-bottom: 2px solid var(--border-color);">
                        ${tableHeaders}
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>

        <!-- Pagination Controls -->
        ${totalPages > 1 ? `
            <div class="flex justify-between items-center mt-6">
                <div class="text-sm text-gray-600">
                    Showing ${startIndex + 1}-${Math.min(endIndex, totalSessions)} of ${totalSessions} sessions
                </div>
                <div class="flex gap-2">
                    <button
                        onclick="loadFilteredSessionsPage(${sessionCurrentPage - 1})"
                        ${sessionCurrentPage === 1 ? 'disabled' : ''}
                        class="px-4 py-2 rounded ${sessionCurrentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}">
                        <i class="fas fa-chevron-left"></i> Previous
                    </button>
                    <div class="flex gap-1">
                        ${Array.from({length: Math.min(totalPages, 5)}, (_, i) => i + 1).map(pageNum => `
                            <button
                                onclick="loadFilteredSessionsPage(${pageNum})"
                                class="px-3 py-2 rounded ${pageNum === sessionCurrentPage ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}">
                                ${pageNum}
                            </button>
                        `).join('')}
                    </div>
                    <button
                        onclick="loadFilteredSessionsPage(${sessionCurrentPage + 1})"
                        ${sessionCurrentPage === totalPages ? 'disabled' : ''}
                        class="px-4 py-2 rounded ${sessionCurrentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}">
                        Next <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        ` : ''}
    `;

    container.innerHTML = tableHTML;
}

// Helper function for pagination with filtered sessions
window.loadFilteredSessionsPage = function loadFilteredSessionsPage(page) {
    sessionCurrentPage = page;
    displayFilteredSessions(filteredSessionsCache, currentRoleFilter);
}

// ============================================
// LOAD SESSIONS FROM API
// ============================================

window.loadSessions = async function loadSessions(statusFilter = null, page = 1) {
    console.log('Loading sessions...');

    const container = document.getElementById('sessions-table-container');
    if (!container) return;

    sessionCurrentPage = page;

    try {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                <p>Loading sessions...</p>
            </div>
        `;

        // Wait for auth to be ready before checking token
        if (window.TutorAuthReady) {
            await window.TutorAuthReady.waitForAuth();
        }

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-lock text-3xl mb-3"></i>
                    <p>Please log in to view your sessions</p>
                </div>
            `;
            return;
        }

        let url = `${window.API_BASE_URL || 'http://localhost:8000'}/api/tutor/sessions`;
        if (statusFilter && statusFilter !== 'all') {
            url += `?status_filter=${statusFilter}`;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load sessions');
        }

        const fetchedSessions = await response.json();
        allSessionsData = fetchedSessions;

        // Pagination logic
        const totalSessions = allSessionsData.length;
        const totalPages = Math.ceil(totalSessions / sessionItemsPerPage);
        const startIndex = (page - 1) * sessionItemsPerPage;
        const endIndex = startIndex + sessionItemsPerPage;
        const sessions = allSessionsData.slice(startIndex, endIndex);

        if (totalSessions === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-users text-3xl mb-3"></i>
                    <p>No sessions ${statusFilter && statusFilter !== 'all' ? 'with status: ' + statusFilter : 'yet'}</p>
                    <p class="text-sm mt-2">Sessions will appear here when students book with you</p>
                </div>
            `;
            return;
        }

        // Create table
        const tableHTML = `
            <div class="overflow-x-auto">
                <table class="w-full" style="border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: var(--bg-secondary); border-bottom: 2px solid var(--border-color);">
                            <th style="padding: 12px; text-align: left; font-weight: 600; cursor: pointer;" onclick="sortSessionsByColumn('student_name')" title="Click to sort">
                                Student Name <i class="fas fa-sort text-gray-400"></i>
                            </th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; cursor: pointer;" onclick="sortSessionsByColumn('course_name')" title="Click to sort">
                                Course & Topics <i class="fas fa-sort text-gray-400"></i>
                            </th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; cursor: pointer;" onclick="sortSessionsByColumn('session_date')" title="Click to sort">
                                Date & Time <i class="fas fa-sort text-gray-400"></i>
                            </th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Attendance</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Notification</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Alarm</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sessions.map(session => {
                            const alarmStatus = session.alarm_enabled
                                ? `<i class="fas fa-bell text-green-500 cursor-pointer hover:text-green-600" title="Alarm enabled (${session.alarm_before_minutes || 15} min before)" onclick="toggleSessionAlarm(${session.id}, false)"></i>`
                                : `<i class="fas fa-bell-slash text-gray-400 cursor-pointer hover:text-gray-600" title="Click to enable alarm" onclick="toggleSessionAlarm(${session.id}, true)"></i>`;

                            const notificationStatus = session.notification_enabled
                                ? `<i class="fas fa-check-circle text-green-500 cursor-pointer hover:text-green-600" title="Browser notifications enabled" onclick="toggleSessionNotification(${session.id}, false)"></i>`
                                : `<i class="fas fa-times-circle text-gray-400 cursor-pointer hover:text-gray-600" title="Click to enable notifications" onclick="toggleSessionNotification(${session.id}, true)"></i>`;

                            // Get topics as string
                            const topicsStr = Array.isArray(session.topics) && session.topics.length > 0
                                ? session.topics.join(', ')
                                : 'No topics specified';

                            // Attendance badges
                            const getAttendanceBadge = (status) => {
                                if (!status || status === 'present') {
                                    return '<span style="background: #D1FAE5; color: #065F46; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">Present</span>';
                                } else if (status === 'late') {
                                    return '<span style="background: #FEF3C7; color: #92400E; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">Late</span>';
                                } else if (status === 'absent') {
                                    return '<span style="background: #FEE2E2; color: #991B1B; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">Absent</span>';
                                }
                                return '<span style="color: #9CA3AF; font-size: 0.75rem;">Not Marked</span>';
                            };

                            const attendanceDisplay = `
                                <div style="display: flex; flex-direction: column; gap: 4px; align-items: center;">
                                    <div style="display: flex; align-items: center; gap: 4px;">
                                        <i class="fas fa-chalkboard-teacher" style="color: var(--text-secondary); font-size: 0.75rem;" title="Tutor"></i>
                                        ${getAttendanceBadge(session.tutor_attendance_status)}
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 4px;">
                                        <i class="fas fa-user-graduate" style="color: var(--text-secondary); font-size: 0.75rem;" title="Student"></i>
                                        ${getAttendanceBadge(session.student_attendance_status)}
                                    </div>
                                    ${session.status === 'completed' ? `
                                        <button
                                            onclick="openAttendanceSuggestionModal(${session.id})"
                                            class="btn-secondary"
                                            style="margin-top: 4px; padding: 4px 8px; font-size: 0.75rem; border-radius: 4px;"
                                            title="Mark Attendance">
                                            <i class="fas fa-clipboard-check"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            `;

                            return `
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 12px;">
                                        <div style="font-weight: 500;">${session.student_name || 'Unknown Student'}</div>
                                        <div style="font-size: 0.875rem; color: var(--text-secondary);">Mode: ${session.session_mode || 'online'}</div>
                                    </td>
                                    <td style="padding: 12px;">
                                        <div style="font-weight: 500;">${session.course_name || 'Unknown Course'}</div>
                                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${topicsStr}</div>
                                    </td>
                                    <td style="padding: 12px; font-size: 0.875rem;">
                                        ${new Date(session.session_date).toLocaleDateString()}<br>
                                        <span style="color: var(--text-secondary);">${session.start_time} - ${session.end_time}</span>
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        ${attendanceDisplay}
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        ${notificationStatus}
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        ${alarmStatus}
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        <button onclick="viewSession(${session.id})" class="btn-secondary" style="padding: 6px 12px; font-size: 0.875rem; border-radius: 6px;">
                                            <i class="fas fa-eye"></i> View
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Pagination Controls -->
            ${totalPages > 1 ? `
                <div class="flex justify-between items-center mt-6">
                    <div class="text-sm text-gray-600">
                        Showing ${startIndex + 1}-${Math.min(endIndex, totalSessions)} of ${totalSessions} sessions
                    </div>
                    <div class="flex gap-2">
                        <button
                            onclick="loadSessions(${statusFilter ? `'${statusFilter}'` : 'null'}, ${page - 1})"
                            ${page === 1 ? 'disabled' : ''}
                            class="px-4 py-2 rounded ${page === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}">
                            <i class="fas fa-chevron-left"></i> Previous
                        </button>
                        <div class="flex gap-1">
                            ${Array.from({length: totalPages}, (_, i) => i + 1).map(pageNum => `
                                <button
                                    onclick="loadSessions(${statusFilter ? `'${statusFilter}'` : 'null'}, ${pageNum})"
                                    class="px-3 py-2 rounded ${pageNum === page ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}">
                                    ${pageNum}
                                </button>
                            `).join('')}
                        </div>
                        <button
                            onclick="loadSessions(${statusFilter ? `'${statusFilter}'` : 'null'}, ${page + 1})"
                            ${page === totalPages ? 'disabled' : ''}
                            class="px-4 py-2 rounded ${page === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}">
                            Next <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            ` : ''}
        `;

        container.innerHTML = tableHTML;

    } catch (error) {
        console.error('Error loading sessions:', error);
        container.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load sessions</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

// ============================================
// LOAD SESSION STATISTICS
// ============================================

async function loadSessionStats() {
    console.log('Loading session stats...');

    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/tutor/sessions/stats/summary`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const stats = await response.json();
        sessionStats = stats;

        // Update session stats UI (check if elements exist first)
        const totalEl = document.getElementById('session-stat-total');
        const completedEl = document.getElementById('session-stat-completed');
        const hoursEl = document.getElementById('session-stat-hours');
        const earningsEl = document.getElementById('session-stat-earnings');

        if (totalEl) totalEl.textContent = stats.total_sessions || 0;
        if (completedEl) completedEl.textContent = stats.completed_sessions || 0;
        if (hoursEl) hoursEl.textContent = stats.total_hours || 0;
        if (earningsEl) earningsEl.textContent = `${stats.in_progress_sessions || 0} active`;

        console.log('✅ Session stats loaded:', stats);

    } catch (error) {
        console.error('Error loading session stats:', error);
    }
}

// ============================================
// SEARCH SESSIONS
// ============================================

window.searchSessions = function searchSessions(query) {
    query = query.toLowerCase().trim();

    const container = document.getElementById('sessions-table-container');
    if (!container) return;

    // If empty query, reload all sessions
    if (!query) {
        loadSessions();
        return;
    }

    // Filter sessions
    const filteredSessions = allSessionsData.filter(session =>
        (session.student_name && session.student_name.toLowerCase().includes(query)) ||
        (session.course_name && session.course_name.toLowerCase().includes(query)) ||
        (session.topics && Array.isArray(session.topics) && session.topics.some(t => t.toLowerCase().includes(query))) ||
        (session.status && session.status.toLowerCase().includes(query)) ||
        (session.session_mode && session.session_mode.toLowerCase().includes(query)) ||
        (session.course_enrollment_id && session.course_enrollment_id.toString().includes(query))
    );

    // Display filtered sessions
    displaySearchResults(filteredSessions, query);
}

// Display search results
function displaySearchResults(sessions, query) {
    const container = document.getElementById('sessions-table-container');

    if (sessions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-search text-3xl mb-3"></i>
                <p>No sessions found for "${query}"</p>
                <p class="text-sm mt-2">Try different keywords</p>
            </div>
        `;
        return;
    }

    const tableHTML = `
        <div class="overflow-x-auto">
            <p class="mb-4 text-sm text-gray-600">Showing ${sessions.length} result(s) for "${query}"</p>
            <table class="w-full" style="border-collapse: collapse;">
                <thead>
                    <tr style="background-color: var(--bg-secondary); border-bottom: 2px solid var(--border-color);">
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Student Name</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Course</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Topics</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Date & Time</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${sessions.map(session => {
                        const topicsStr = Array.isArray(session.topics) && session.topics.length > 0
                            ? session.topics.join(', ')
                            : 'N/A';

                        return `
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                <td style="padding: 12px;">
                                    <div style="font-weight: 500;">${session.student_name || 'Unknown Student'}</div>
                                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Mode: ${session.session_mode || 'online'}</div>
                                </td>
                                <td style="padding: 12px;">
                                    <div style="font-weight: 500;">${session.course_name || 'Unknown Course'}</div>
                                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Status: ${session.status || 'N/A'}</div>
                                </td>
                                <td style="padding: 12px; font-size: 0.875rem;">
                                    ${topicsStr}
                                </td>
                                <td style="padding: 12px; font-size: 0.875rem;">
                                    ${new Date(session.session_date).toLocaleDateString()}<br>
                                    <span style="color: var(--text-secondary);">${session.start_time} - ${session.end_time}</span>
                                </td>
                                <td style="padding: 12px; text-align: center;">
                                    <button onclick="viewSession(${session.id})" class="btn-secondary" style="padding: 6px 12px; font-size: 0.875rem; border-radius: 6px;">
                                        <i class="fas fa-eye"></i> View
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = tableHTML;
}

// ============================================
// TOGGLE FUNCTIONS
// ============================================

window.toggleSessionNotification = async function toggleSessionNotification(sessionId, enable) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to modify session settings');
            return;
        }

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/tutor/sessions/${sessionId}/toggle-notification`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notification_enabled: enable })
        });

        if (!response.ok) {
            throw new Error('Failed to update notification setting');
        }

        // Reload sessions to reflect changes
        loadSessions(null, sessionCurrentPage);

        console.log(`✅ Session ${sessionId} notification ${enable ? 'enabled' : 'disabled'}`);
    } catch (error) {
        console.error('Error toggling session notification:', error);
        alert('Failed to update notification setting');
    }
}

window.toggleSessionAlarm = async function toggleSessionAlarm(sessionId, enable) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to modify session settings');
            return;
        }

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/tutor/sessions/${sessionId}/toggle-alarm`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ alarm_enabled: enable })
        });

        if (!response.ok) {
            throw new Error('Failed to update alarm setting');
        }

        // Reload sessions to reflect changes
        loadSessions(null, sessionCurrentPage);

        console.log(`✅ Session ${sessionId} alarm ${enable ? 'enabled' : 'disabled'}`);
    } catch (error) {
        console.error('Error toggling session alarm:', error);
        alert('Failed to update alarm setting');
    }
}

async function toggleSessionFeatured(sessionId, feature) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to modify session settings');
            return;
        }

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/tutor/sessions/${sessionId}/toggle-featured`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_featured: feature })
        });

        if (!response.ok) {
            throw new Error('Failed to update featured status');
        }

        // Reload sessions to reflect changes
        loadSessions(null, sessionCurrentPage);

        console.log(`✅ Session ${sessionId} ${feature ? 'featured' : 'unfeatured'}`);
    } catch (error) {
        console.error('Error toggling session featured status:', error);
        alert('Failed to update featured status');
    }
}

// ============================================
// SORTING FUNCTIONALITY
// ============================================

window.sortSessionsByColumn = function sortSessionsByColumn(field) {
    console.log(`Sorting sessions by: ${field}`);

    // Toggle direction if same field, otherwise default to ascending
    if (sessionSortField === field) {
        sessionSortDirection = sessionSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sessionSortField = field;
        sessionSortDirection = 'asc';
    }

    // Sort allSessionsData array
    allSessionsData.sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];

        // Handle null/undefined
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';

        // Special handling for dates
        if (field === 'session_date') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        } else {
            // Convert to string for comparison
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
        }

        if (sessionSortDirection === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });

    // Re-render with pagination
    loadSessions(null, sessionCurrentPage);
}

// Make all functions globally accessible via SessionsPanel namespace
// This prevents conflicts with schedule-panel-manager.js
window.SessionsPanel.loadSessions = loadSessions;
window.SessionsPanel.loadSessionStats = loadSessionStats;
window.SessionsPanel.searchSessions = searchSessions;
window.SessionsPanel.toggleSessionNotification = toggleSessionNotification;
window.SessionsPanel.toggleSessionAlarm = toggleSessionAlarm;
window.SessionsPanel.toggleSessionFeatured = toggleSessionFeatured;
window.SessionsPanel.sortSessionsByColumn = sortSessionsByColumn;
window.SessionsPanel.filterSessionsByRole = filterSessionsByRole;
window.SessionsPanel.loadFilteredSessionsPage = loadFilteredSessionsPage;

// Also export to window directly for onclick handlers used in dynamically generated HTML
// These won't conflict with schedule-panel-manager.js because:
// - schedule-panel uses searchSchedules, loadSchedules (different names)
// - sessions-panel uses searchSessions, loadSessions, filterSessionsByRole (unique)
window.searchSessions = searchSessions;
window.loadSessions = loadSessions;
window.filterSessionsByRole = filterSessionsByRole;
window.loadFilteredSessionsPage = loadFilteredSessionsPage;
window.toggleSessionNotification = toggleSessionNotification;
window.toggleSessionAlarm = toggleSessionAlarm;
window.toggleSessionFeatured = toggleSessionFeatured;
window.sortSessionsByColumn = sortSessionsByColumn;

console.log('✅ Sessions Panel Manager loaded successfully');
