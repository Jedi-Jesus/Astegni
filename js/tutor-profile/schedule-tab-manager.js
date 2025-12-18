// ============================================
// SCHEDULE PANEL TAB MANAGER
// Manages 2-tab interface: Schedules, Sessions
// ============================================

let currentScheduleTab = 'schedules';
let allSchedules = [];
let allSessions = [];
let sessionStats = null;

// Pagination state for sessions
let sessionCurrentPage = 1;
const sessionItemsPerPage = 10;

// Switch between tabs
function switchScheduleTab(tabName) {
    console.log(`Switching to tab: ${tabName}`);

    // Update active tab button
    document.querySelectorAll('.schedule-tab').forEach(tab => {
        tab.classList.remove('active', 'border-blue-500', 'text-blue-500');
        tab.classList.add('border-transparent', 'text-gray-500');
    });

    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) {
        activeTab.classList.add('active', 'border-blue-500', 'text-blue-500');
        activeTab.classList.remove('border-transparent', 'text-gray-500');
    }

    // Hide all tab contents
    document.querySelectorAll('.schedule-tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    // Show selected tab content
    const selectedContent = document.getElementById(`${tabName}-tab-content`);
    if (selectedContent) {
        selectedContent.classList.remove('hidden');
    }

    // Update current tab
    currentScheduleTab = tabName;

    // Load data for the tab
    loadTabData(tabName);
}

// Load data for specific tab
async function loadTabData(tabName) {
    console.log(`Loading data for tab: ${tabName}`);

    try {
        if (tabName === 'all') {
            await loadAllData();
        } else if (tabName === 'schedules') {
            await loadSchedules();
        } else if (tabName === 'sessions') {
            await loadSessions();
            await loadSessionStats();
        }
    } catch (error) {
        console.error(`Error loading data for tab ${tabName}:`, error);
    }
}

// Load all data (schedules + sessions combined)
async function loadAllData() {
    console.log('Loading all data (schedules + sessions)...');

    const container = document.getElementById('all-data-container');
    if (!container) return;

    try {
        // Wait for auth to be ready before checking token
        if (window.TutorAuthReady) {
            await window.TutorAuthReady.waitForAuth();
        }

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-lock text-3xl mb-3"></i>
                    <p>Please log in to view your data</p>
                </div>
            `;
            return;
        }

        // Fetch schedules and sessions in parallel
        const [schedulesResponse, sessionsResponse, statsResponse] = await Promise.all([
            fetch('http://localhost:8000/api/tutor/schedules', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('http://localhost:8000/api/tutor/sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('http://localhost:8000/api/tutor/sessions/stats/summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        if (!schedulesResponse.ok || !sessionsResponse.ok) {
            throw new Error('Failed to load data');
        }

        allSchedules = await schedulesResponse.json();
        allSessions = await sessionsResponse.json();
        sessionStats = statsResponse.ok ? await statsResponse.json() : null;

        // Update stats
        updateAllStats();

        // Display combined data
        displayAllData();

    } catch (error) {
        console.error('Error loading all data:', error);
        container.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load data</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

// Update stats in All tab
function updateAllStats() {
    const totalSchedulesEl = document.getElementById('stat-total-schedules');
    const activeSessionsEl = document.getElementById('stat-active-sessions');
    const totalEarningsEl = document.getElementById('stat-total-earnings');
    const avgRatingEl = document.getElementById('stat-avg-rating');

    if (totalSchedulesEl) totalSchedulesEl.textContent = allSchedules.length;
    if (activeSessionsEl) activeSessionsEl.textContent = sessionStats ? sessionStats.scheduled_sessions : 0;
    if (totalEarningsEl) totalEarningsEl.textContent = sessionStats ? `${sessionStats.total_hours} hrs` : '0 hrs';
    if (avgRatingEl) avgRatingEl.textContent = sessionStats ? sessionStats.completed_sessions : 0;
}

// Display combined schedules and sessions (see full implementation at end of file)

// Load sessions data
async function loadSessions(statusFilter = null, page = 1) {
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

        let url = 'http://localhost:8000/api/tutor/sessions';
        if (statusFilter && statusFilter !== 'all') {
            url += `?status_filter=${statusFilter}`;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load sessions');
        }

        const allSessionsData = await response.json();
        allSessions = allSessionsData;

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

// Load session statistics
async function loadSessionStats() {
    console.log('Loading session stats...');

    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('http://localhost:8000/api/tutor/sessions/stats/summary', {
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

// Filter sessions by status
function filterSessions(status) {
    console.log(`Filtering sessions by status: ${status}`);

    // Update filter buttons
    document.querySelectorAll('#sessions-tab-content button[onclick^="filterSessions"]').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-200');
    });

    event.target.classList.remove('bg-gray-200');
    event.target.classList.add('bg-blue-500', 'text-white');

    // Reset to page 1 when filtering and load sessions with filter
    loadSessions(status === 'all' ? null : status, 1);
}

// Helper function to get status color
function getStatusColor(status) {
    const colors = {
        'scheduled': '#3B82F6',
        'in-progress': '#F59E0B',
        'completed': '#10B981',
        'cancelled': '#EF4444',
        'missed': '#9CA3AF'
    };
    return colors[status] || '#6B7280';
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

// Search in All tab (schedules + sessions)
function searchAll(query) {
    query = query.toLowerCase().trim();

    const container = document.getElementById('all-data-container');
    if (!container) return;

    // If empty query, show all data
    if (!query) {
        displayAllData();
        return;
    }

    // Filter schedules
    const filteredSchedules = allSchedules.filter(schedule =>
        schedule.title.toLowerCase().includes(query) ||
        (schedule.scheduler_role && schedule.scheduler_role.toLowerCase().includes(query)) ||
        (schedule.priority_level && schedule.priority_level.toLowerCase().includes(query)) ||
        schedule.schedule_type.toLowerCase().includes(query) ||
        schedule.status.toLowerCase().includes(query)
    );

    // Filter sessions
    const filteredSessions = allSessions.filter(session =>
        (session.student_name && session.student_name.toLowerCase().includes(query)) ||
        (session.course_name && session.course_name.toLowerCase().includes(query)) ||
        (session.topics && Array.isArray(session.topics) && session.topics.some(t => t.toLowerCase().includes(query))) ||
        (session.status && session.status.toLowerCase().includes(query)) ||
        (session.session_mode && session.session_mode.toLowerCase().includes(query))
    );

    // Display filtered results
    displayFilteredAllData(filteredSchedules, filteredSessions, query);
}

// Display filtered data in All tab
function displayFilteredAllData(schedules, sessions, query) {
    const container = document.getElementById('all-data-container');

    if (schedules.length === 0 && sessions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-search text-3xl mb-3"></i>
                <p>No results found for "${query}"</p>
                <p class="text-sm mt-2">Try different keywords</p>
            </div>
        `;
        return;
    }

    let html = '<div class="overflow-x-auto">';

    // Schedules section
    if (schedules.length > 0) {
        html += `
            <div class="mb-8">
                <h4 class="text-lg font-semibold mb-4 text-blue-600">
                    <i class="fas fa-calendar-alt mr-2"></i>Matching Schedules (${schedules.length})
                </h4>
                <table class="w-full" style="border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: var(--bg-secondary); border-bottom: 2px solid var(--border-color);">
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Schedule Title</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Type</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Time</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Status</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedules.map(schedule => `
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                <td style="padding: 12px;">
                                    <div style="font-weight: 500;">${schedule.title}</div>
                                    <div style="font-size: 0.875rem; color: var(--text-secondary);">
                                        <span class="role-badge" style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; text-transform: capitalize;">
                                            ${schedule.scheduler_role || 'tutor'}
                                        </span>
                                        <span class="priority-badge" style="background: ${
                                            schedule.priority_level === 'urgent' ? '#DC2626' :
                                            schedule.priority_level === 'high' ? '#F59E0B' :
                                            schedule.priority_level === 'low' ? '#10B981' :
                                            '#3B82F6'
                                        }; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 4px; text-transform: capitalize;">
                                            ${schedule.priority_level || 'medium'}
                                        </span>
                                    </div>
                                </td>
                                <td style="padding: 12px; font-size: 0.875rem;">
                                    <span class="badge" style="background: ${schedule.schedule_type === 'recurring' ? 'var(--primary-color)' : 'var(--secondary-color)'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">
                                        ${schedule.schedule_type}
                                    </span>
                                </td>
                                <td style="padding: 12px; font-size: 0.875rem;">
                                    ${schedule.start_time} - ${schedule.end_time}
                                </td>
                                <td style="padding: 12px; text-align: center;">
                                    <span class="badge" style="background: ${schedule.status === 'active' ? '#10B981' : '#6B7280'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">
                                        ${schedule.status}
                                    </span>
                                </td>
                                <td style="padding: 12px; text-align: center;">
                                    <button onclick="viewSchedule(${schedule.id})" class="btn-secondary" style="padding: 6px 12px; font-size: 0.875rem; border-radius: 6px;">
                                        <i class="fas fa-eye"></i> View
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Sessions section
    if (sessions.length > 0) {
        html += `
            <div>
                <h4 class="text-lg font-semibold mb-4 text-green-600">
                    <i class="fas fa-users mr-2"></i>Matching Sessions (${sessions.length})
                </h4>
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
                                </td>
                                <td style="padding: 12px;">
                                    <div style="font-weight: 500;">${session.course_name || 'Unknown Course'}</div>
                                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Mode: ${session.session_mode || 'online'}</div>
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
                        `;}).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

// Search schedules only
function searchSchedules(query) {
    query = query.toLowerCase().trim();

    const container = document.getElementById('schedules-table-container');
    if (!container) return;

    // If empty query, reload all schedules
    if (!query) {
        loadSchedules();
        return;
    }

    // Filter schedules
    const filteredSchedules = allSchedules.filter(schedule =>
        schedule.title.toLowerCase().includes(query) ||
        (schedule.scheduler_role && schedule.scheduler_role.toLowerCase().includes(query)) ||
        (schedule.priority_level && schedule.priority_level.toLowerCase().includes(query)) ||
        schedule.schedule_type.toLowerCase().includes(query) ||
        schedule.status.toLowerCase().includes(query) ||
        (schedule.description && schedule.description.toLowerCase().includes(query))
    );

    // Display filtered schedules
    displayFilteredSchedules(filteredSchedules, query);
}

// Display filtered schedules
function displayFilteredSchedules(schedules, query) {
    const container = document.getElementById('schedules-table-container');

    if (schedules.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-search text-3xl mb-3"></i>
                <p>No schedules found for "${query}"</p>
                <p class="text-sm mt-2">Try different keywords</p>
            </div>
        `;
        return;
    }

    const tableHTML = `
        <div class="overflow-x-auto">
            <p class="mb-4 text-sm text-gray-600">Showing ${schedules.length} result(s) for "${query}"</p>
            <table class="w-full" style="border-collapse: collapse;">
                <thead>
                    <tr style="background-color: var(--bg-secondary); border-bottom: 2px solid var(--border-color);">
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Schedule Title</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Priority Level</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Date & Time</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600;">Notification</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600;">Alarm</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${schedules.map(schedule => {
                        const alarmStatus = schedule.alarm_enabled
                            ? `<i class="fas fa-bell text-green-500" title="Alarm enabled (${schedule.alarm_before_minutes} min before)"></i>`
                            : `<i class="fas fa-bell-slash text-gray-400" title="No alarm"></i>`;

                        const notificationStatus = schedule.alarm_enabled && schedule.notification_browser
                            ? `<i class="fas fa-check-circle text-green-500" title="Browser notifications enabled"></i>`
                            : `<i class="fas fa-times-circle text-gray-400" title="Notifications disabled"></i>`;

                        // Format date and time together
                        let dateTimeDisplay = '';
                        if (schedule.schedule_type === 'recurring') {
                            if (schedule.months && schedule.months.length > 0) {
                                dateTimeDisplay = schedule.months.join(', ');
                            }
                            if (schedule.days && schedule.days.length > 0) {
                                dateTimeDisplay += (dateTimeDisplay ? ' | ' : '') + schedule.days.join(', ');
                            }
                            dateTimeDisplay += `<br><span style="color: var(--text-secondary);">${schedule.start_time} - ${schedule.end_time}</span>`;
                        } else if (schedule.specific_dates && schedule.specific_dates.length > 0) {
                            const firstDate = new Date(schedule.specific_dates[0]).toLocaleDateString();
                            dateTimeDisplay = firstDate;
                            if (schedule.specific_dates.length > 1) {
                                dateTimeDisplay += ` (+${schedule.specific_dates.length - 1} more)`;
                            }
                            dateTimeDisplay += `<br><span style="color: var(--text-secondary);">${schedule.start_time} - ${schedule.end_time}</span>`;
                        }

                        return `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 12px;">
                                <div style="font-weight: 500;">${schedule.title}</div>
                                <div style="font-size: 0.875rem; color: var(--text-secondary);">
                                    <span class="role-badge" style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; text-transform: capitalize;">
                                        ${schedule.scheduler_role || 'tutor'}
                                    </span>
                                </div>
                            </td>
                            <td style="padding: 12px;">
                                <span class="badge" style="background: ${
                                    schedule.priority_level === 'urgent' ? '#DC2626' :
                                    schedule.priority_level === 'high' ? '#F59E0B' :
                                    schedule.priority_level === 'low' ? '#10B981' :
                                    '#3B82F6'
                                }; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; text-transform: capitalize;">
                                    ${schedule.priority_level || 'medium'}
                                </span>
                            </td>
                            <td style="padding: 12px; font-size: 0.875rem;">
                                ${dateTimeDisplay || 'N/A'}
                            </td>
                            <td style="padding: 12px; text-align: center;">
                                ${notificationStatus}
                            </td>
                            <td style="padding: 12px; text-align: center;">
                                ${alarmStatus}
                            </td>
                            <td style="padding: 12px; text-align: center;">
                                <button onclick="viewSchedule(${schedule.id})" class="btn-secondary" style="padding: 6px 12px; font-size: 0.875rem; border-radius: 6px; margin-right: 4px;">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button onclick="editSchedule(${schedule.id})" class="btn-primary" style="padding: 6px 12px; font-size: 0.875rem; border-radius: 6px;">
                                    <i class="fas fa-edit"></i>
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

// Search sessions only
function searchSessions(query) {
    query = query.toLowerCase().trim();

    const container = document.getElementById('sessions-table-container');
    if (!container) return;

    // If empty query, reload all sessions
    if (!query) {
        loadSessions();
        return;
    }

    // Filter sessions
    const filteredSessions = allSessions.filter(session =>
        (session.student_name && session.student_name.toLowerCase().includes(query)) ||
        (session.course_name && session.course_name.toLowerCase().includes(query)) ||
        (session.topics && Array.isArray(session.topics) && session.topics.some(t => t.toLowerCase().includes(query))) ||
        (session.status && session.status.toLowerCase().includes(query)) ||
        (session.session_mode && session.session_mode.toLowerCase().includes(query)) ||
        (session.course_enrollment_id && session.course_enrollment_id.toString().includes(query))
    );

    // Display filtered sessions
    displayFilteredSessions(filteredSessions, query);
}

// Display filtered sessions
function displayFilteredSessions(sessions, query) {
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

// Filter sessions in All tab by status
let currentAllSessionsFilter = 'all';
function filterAllSessions(status) {
    console.log(`Filtering All tab sessions by status: ${status}`);
    currentAllSessionsFilter = status;

    // Update filter buttons
    document.querySelectorAll('#all-tab-content button[onclick^="filterAllSessions"]').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-200');
    });

    event.target.classList.remove('bg-gray-200');
    event.target.classList.add('bg-blue-500', 'text-white');

    // Filter and display sessions
    const filteredSessions = status === 'all'
        ? allSessions
        : allSessions.filter(session => session.status === status);

    displayAllData(allSchedules, filteredSessions);
}

// Filter schedules by priority (grade_level)
let currentSchedulesFilter = 'all';
function filterSchedules(priority) {
    console.log(`Filtering schedules by priority: ${priority}`);
    currentSchedulesFilter = priority;

    // Update filter buttons
    document.querySelectorAll('#schedules-tab-content button[onclick^="filterSchedules"]').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-200');
    });

    event.target.classList.remove('bg-gray-200');
    event.target.classList.add('bg-blue-500', 'text-white');

    // Filter and display schedules by priority_level
    const filteredSchedules = priority === 'all'
        ? allSchedules
        : allSchedules.filter(schedule => schedule.priority_level === priority);

    displayFilteredSchedulesOnly(filteredSchedules);
}

// Helper function to display only schedules (for filter)
function displayFilteredSchedulesOnly(schedules) {
    const container = document.getElementById('schedules-table-container');

    if (schedules.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-calendar-alt text-3xl mb-3"></i>
                <p>No schedules found with the selected filter</p>
            </div>
        `;
        return;
    }

    // Use loadSchedules internal rendering logic
    loadSchedules();
}

// Helper to display data for All tab with custom sessions
function displayAllData(schedules = allSchedules, sessions = allSessions) {
    const container = document.getElementById('all-data-container');

    if (schedules.length === 0 && sessions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-calendar-alt text-3xl mb-3"></i>
                <p>No schedules or sessions yet</p>
                <p class="text-sm mt-2">Click "Create Schedule" to add your first teaching schedule</p>
            </div>
        `;
        return;
    }

    let html = '<div class="overflow-x-auto">';

    // Schedules section
    if (schedules.length > 0) {
        html += `
            <div class="mb-8">
                <h4 class="text-lg font-semibold mb-4 text-blue-600">
                    <i class="fas fa-calendar-alt mr-2"></i>Teaching Schedules (${schedules.length})
                </h4>
                <table class="w-full" style="border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: var(--bg-secondary); border-bottom: 2px solid var(--border-color);">
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Schedule Title</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Priority Level</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Date & Time</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Notification</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Alarm</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedules.slice(0, 5).map(schedule => {
                            const alarmStatus = schedule.alarm_enabled
                                ? `<i class="fas fa-bell text-green-500" title="Alarm enabled (${schedule.alarm_before_minutes} min before)"></i>`
                                : `<i class="fas fa-bell-slash text-gray-400" title="No alarm"></i>`;

                            const notificationStatus = schedule.alarm_enabled && schedule.notification_browser
                                ? `<i class="fas fa-check-circle text-green-500" title="Browser notifications enabled"></i>`
                                : `<i class="fas fa-times-circle text-gray-400" title="Notifications disabled"></i>`;

                            // Format date and time together
                            let dateTimeDisplay = '';
                            if (schedule.schedule_type === 'recurring') {
                                if (schedule.months && schedule.months.length > 0) {
                                    dateTimeDisplay = schedule.months.join(', ');
                                }
                                if (schedule.days && schedule.days.length > 0) {
                                    dateTimeDisplay += (dateTimeDisplay ? ' | ' : '') + schedule.days.join(', ');
                                }
                                dateTimeDisplay += `<br><span style="color: var(--text-secondary);">${schedule.start_time} - ${schedule.end_time}</span>`;
                            } else if (schedule.specific_dates && schedule.specific_dates.length > 0) {
                                const firstDate = new Date(schedule.specific_dates[0]).toLocaleDateString();
                                dateTimeDisplay = firstDate;
                                if (schedule.specific_dates.length > 1) {
                                    dateTimeDisplay += ` (+${schedule.specific_dates.length - 1} more)`;
                                }
                                dateTimeDisplay += `<br><span style="color: var(--text-secondary);">${schedule.start_time} - ${schedule.end_time}</span>`;
                            }

                            return `
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                <td style="padding: 12px;">
                                    <div style="font-weight: 500;">${schedule.title}</div>
                                    <div style="font-size: 0.875rem; color: var(--text-secondary);">
                                        <span class="role-badge" style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; text-transform: capitalize;">
                                            ${schedule.scheduler_role || 'tutor'}
                                        </span>
                                    </div>
                                </td>
                                <td style="padding: 12px;">
                                    <span class="badge" style="background: ${
                                        schedule.priority_level === 'urgent' ? '#DC2626' :
                                        schedule.priority_level === 'high' ? '#F59E0B' :
                                        schedule.priority_level === 'low' ? '#10B981' :
                                        '#3B82F6'
                                    }; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; text-transform: capitalize;">
                                        ${schedule.priority_level || 'medium'}
                                    </span>
                                </td>
                                <td style="padding: 12px; font-size: 0.875rem;">
                                    ${dateTimeDisplay || 'N/A'}
                                </td>
                                <td style="padding: 12px; text-align: center;">
                                    ${notificationStatus}
                                </td>
                                <td style="padding: 12px; text-align: center;">
                                    ${alarmStatus}
                                </td>
                                <td style="padding: 12px; text-align: center;">
                                    <button onclick="viewSchedule(${schedule.id})" class="btn-secondary" style="padding: 6px 12px; font-size: 0.875rem; border-radius: 6px;">
                                        <i class="fas fa-eye"></i> View
                                    </button>
                                </td>
                            </tr>
                        `;
                        }).join('')}
                    </tbody>
                </table>
                ${schedules.length > 5 ? `<div class="text-center mt-4"><button onclick="switchScheduleTab('schedules')" class="text-blue-500 hover:underline">View all ${schedules.length} schedules</button></div>` : ''}
            </div>
        `;
    }

    // Sessions section
    if (sessions.length > 0) {
        html += `
            <div>
                <h4 class="text-lg font-semibold mb-4 text-green-600">
                    <i class="fas fa-users mr-2"></i>Sessions (${sessions.length})
                </h4>
                <table class="w-full" style="border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: var(--bg-secondary); border-bottom: 2px solid var(--border-color);">
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Student Name</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Subject</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Topic</th>
                            <th style="padding: 12px; text-align: left; font-weight: 600;">Date & Time</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sessions.slice(0, 5).map(session => {
                            const topicsStr = Array.isArray(session.topics) && session.topics.length > 0
                                ? session.topics.join(', ')
                                : 'N/A';
                            return `
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                <td style="padding: 12px;">
                                    <div style="font-weight: 500;">${session.student_name || 'Unknown Student'}</div>
                                </td>
                                <td style="padding: 12px;">
                                    <div style="font-weight: 500;">${session.course_name || 'Unknown Course'}</div>
                                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Mode: ${session.session_mode || 'online'}</div>
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
                        `;}).join('')}
                    </tbody>
                </table>
                ${sessions.length > 5 ? `<div class="text-center mt-4"><button onclick="switchScheduleTab('sessions')" class="text-blue-500 hover:underline">View all ${sessions.length} sessions</button></div>` : ''}
            </div>
        `;
    }

    html += '</div>';
    container.innerHTML = html;
}

// Make search functions globally accessible
window.searchAll = searchAll;
window.searchSchedules = searchSchedules;
window.searchSessions = searchSessions;

// Make functions globally accessible
window.switchScheduleTab = switchScheduleTab;
window.loadAllData = loadAllData;
window.loadSessions = loadSessions;
window.filterSessions = filterSessions;
window.loadSessionStats = loadSessionStats;
window.filterAllSessions = filterAllSessions;
window.filterSchedules = filterSchedules;

// Initialize when schedule panel is opened
window.addEventListener('panelSwitch', (event) => {
    if (event.detail.panelName === 'schedule') {
        console.log('Schedule panel opened, loading schedules tab...');
        // Load schedules immediately when panel opens
        loadSchedules();
    }
});

// Also listen for panelSwitched event (backward compatibility)
window.addEventListener('panelSwitched', (event) => {
    if (event.detail.panelName === 'schedule') {
        console.log('Schedule panel opened (backward compat), loading schedules...');
        loadSchedules();
    }
});

// ============================================
// SESSION TOGGLE FUNCTIONS
// ============================================

// Toggle session notification
async function toggleSessionNotification(sessionId, enable) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to modify session settings');
            return;
        }

        const response = await fetch(`http://localhost:8000/api/tutor/sessions/${sessionId}/toggle-notification`, {
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

// Toggle session alarm
async function toggleSessionAlarm(sessionId, enable) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to modify session settings');
            return;
        }

        const response = await fetch(`http://localhost:8000/api/tutor/sessions/${sessionId}/toggle-alarm`, {
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

// Toggle session featured status
async function toggleSessionFeatured(sessionId, feature) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to modify session settings');
            return;
        }

        const response = await fetch(`http://localhost:8000/api/tutor/sessions/${sessionId}/toggle-featured`, {
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

// Make toggle functions globally accessible
window.toggleSessionNotification = toggleSessionNotification;
window.toggleSessionAlarm = toggleSessionAlarm;
window.toggleSessionFeatured = toggleSessionFeatured;

// ============================================
// SORTING FUNCTIONALITY
// ============================================

let scheduleSortField = null;
let scheduleSortDirection = 'asc';
let sessionSortField = null;
let sessionSortDirection = 'asc';

// Sort schedules by column
function sortSchedulesByColumn(field) {
    console.log(`Sorting schedules by: ${field}`);

    // Toggle direction if same field, otherwise default to ascending
    if (scheduleSortField === field) {
        scheduleSortDirection = scheduleSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        scheduleSortField = field;
        scheduleSortDirection = 'asc';
    }

    // Sort allSchedules array
    allSchedules.sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];

        // Handle null/undefined
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';

        // Convert to string for comparison
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();

        if (scheduleSortDirection === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });

    // Re-render
    displayFilteredSchedulesOnly(currentSchedulesFilter === 'all' ? allSchedules : allSchedules.filter(s => s.priority_level === currentSchedulesFilter));
}

// Sort sessions by column
function sortSessionsByColumn(field) {
    console.log(`Sorting sessions by: ${field}`);

    // Toggle direction if same field, otherwise default to ascending
    if (sessionSortField === field) {
        sessionSortDirection = sessionSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sessionSortField = field;
        sessionSortDirection = 'asc';
    }

    // Sort allSessions array
    allSessions.sort((a, b) => {
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

// Make sorting functions globally accessible
window.sortSchedulesByColumn = sortSchedulesByColumn;
window.sortSessionsByColumn = sortSessionsByColumn;

console.log('Schedule Tab Manager loaded successfully');
