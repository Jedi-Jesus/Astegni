// ============================================
// PARENT PROFILE - SCHEDULE MANAGER
// Manages 2-tab interface: Schedules, Sessions
// Reads from schedules and sessions tables
// ============================================

const API_BASE_URL = 'http://localhost:8000';

let currentScheduleTab = 'schedules';
let allSchedules = [];
let allSessions = [];
let sessionStats = null;

// Pagination state
let scheduleCurrentPage = 1;
let sessionCurrentPage = 1;
const itemsPerPage = 10;

// Current filters
let currentSchedulesFilter = 'all';
let currentSessionsFilter = 'all';

// ============================================
// TAB SWITCHING
// ============================================

function switchScheduleTab(tabName) {
    console.log(`[Parent Schedule] Switching to tab: ${tabName}`);

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
    console.log(`[Parent Schedule] Loading data for tab: ${tabName}`);

    try {
        if (tabName === 'schedules') {
            await loadSchedules();
        } else if (tabName === 'sessions') {
            await loadSessions();
        }
    } catch (error) {
        console.error(`[Parent Schedule] Error loading data for tab ${tabName}:`, error);
    }
}

// ============================================
// SCHEDULES TAB FUNCTIONS
// ============================================

async function loadSchedules(page = 1) {
    const container = document.getElementById('schedules-table-container');
    if (!container) return;

    scheduleCurrentPage = page;

    try {
        // Show loading state
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                <p>Loading schedules...</p>
            </div>
        `;

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-lock text-3xl mb-3"></i>
                    <p>Please log in to view your schedules</p>
                </div>
            `;
            return;
        }

        // Fetch schedules for parent
        const response = await fetch(`${API_BASE_URL}/api/parent/schedules`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load schedules');
        }

        const schedulesData = await response.json();
        allSchedules = schedulesData;

        // Apply filter if not 'all'
        let filteredSchedules = allSchedules;
        if (currentSchedulesFilter !== 'all') {
            filteredSchedules = allSchedules.filter(s => s.priority_level === currentSchedulesFilter);
        }

        // Pagination logic
        const totalSchedules = filteredSchedules.length;
        const totalPages = Math.ceil(totalSchedules / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const schedules = filteredSchedules.slice(startIndex, endIndex);

        if (totalSchedules === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-calendar-alt text-3xl mb-3"></i>
                    <p>No schedules created yet</p>
                    <p class="text-sm mt-2">Click "Create Schedule" to add your first family schedule</p>
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
                            <th style="padding: 12px; text-align: left; font-weight: 600; cursor: pointer;" onclick="sortSchedulesByColumn('title')" title="Click to sort">
                                Schedule Title <i class="fas fa-sort text-gray-400"></i>
                            </th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; cursor: pointer;" onclick="sortSchedulesByColumn('priority_level')" title="Click to sort">
                                Priority Level <i class="fas fa-sort text-gray-400"></i>
                            </th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; cursor: pointer;" onclick="sortSchedulesByColumn('start_time')" title="Click to sort">
                                Date & Time <i class="fas fa-sort text-gray-400"></i>
                            </th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Notification</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Alarm</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedules.map(schedule => {
                            const alarmStatus = schedule.alarm_enabled
                                ? `<i class="fas fa-bell text-green-500 cursor-pointer hover:text-green-600" title="Alarm enabled (${schedule.alarm_before_minutes || 15} min before)" onclick="toggleScheduleAlarm(${schedule.id}, false)"></i>`
                                : `<i class="fas fa-bell-slash text-gray-400 cursor-pointer hover:text-gray-600" title="Click to enable alarm" onclick="toggleScheduleAlarm(${schedule.id}, true)"></i>`;

                            const notificationStatus = schedule.notification_browser
                                ? `<i class="fas fa-check-circle text-green-500 cursor-pointer hover:text-green-600" title="Browser notifications enabled" onclick="toggleScheduleNotification(${schedule.id}, false)"></i>`
                                : `<i class="fas fa-times-circle text-gray-400 cursor-pointer hover:text-gray-600" title="Click to enable notifications" onclick="toggleScheduleNotification(${schedule.id}, true)"></i>`;

                            // Format date and time
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
                                                ${schedule.scheduler_role || 'parent'}
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

            <!-- Pagination Controls -->
            ${totalPages > 1 ? `
                <div class="flex justify-between items-center mt-6">
                    <div class="text-sm text-gray-600">
                        Showing ${startIndex + 1}-${Math.min(endIndex, totalSchedules)} of ${totalSchedules} schedules
                    </div>
                    <div class="flex gap-2">
                        <button
                            onclick="loadSchedules(${page - 1})"
                            ${page === 1 ? 'disabled' : ''}
                            class="px-4 py-2 rounded ${page === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}">
                            <i class="fas fa-chevron-left"></i> Previous
                        </button>
                        <div class="flex gap-1">
                            ${Array.from({length: totalPages}, (_, i) => i + 1).map(pageNum => `
                                <button
                                    onclick="loadSchedules(${pageNum})"
                                    class="px-3 py-2 rounded ${pageNum === page ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}">
                                    ${pageNum}
                                </button>
                            `).join('')}
                        </div>
                        <button
                            onclick="loadSchedules(${page + 1})"
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
        console.error('[Parent Schedule] Error loading schedules:', error);
        container.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load schedules</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

// Filter schedules by priority
function filterSchedules(priority) {
    console.log(`[Parent Schedule] Filtering schedules by priority: ${priority}`);
    currentSchedulesFilter = priority;

    // Update filter buttons
    document.querySelectorAll('#schedules-tab-content button[onclick^="filterSchedules"]').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-200');
    });

    event.target.classList.remove('bg-gray-200');
    event.target.classList.add('bg-blue-500', 'text-white');

    // Reset to page 1 when filtering
    loadSchedules(1);
}

// Search schedules
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

                        const notificationStatus = schedule.notification_browser
                            ? `<i class="fas fa-check-circle text-green-500" title="Browser notifications enabled"></i>`
                            : `<i class="fas fa-times-circle text-gray-400" title="Notifications disabled"></i>`;

                        // Format date and time
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
                                        ${schedule.scheduler_role || 'parent'}
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

// ============================================
// SESSIONS TAB FUNCTIONS
// ============================================

async function loadSessions(statusFilter = null, page = 1) {
    console.log('[Parent Schedule] Loading sessions...');

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

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-lock text-3xl mb-3"></i>
                    <p>Please log in to view your children's sessions</p>
                </div>
            `;
            return;
        }

        let url = `${API_BASE_URL}/api/parent/sessions`;
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
        const totalPages = Math.ceil(totalSessions / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const sessions = allSessionsData.slice(startIndex, endIndex);

        if (totalSessions === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-users text-3xl mb-3"></i>
                    <p>No sessions ${statusFilter && statusFilter !== 'all' ? 'with status: ' + statusFilter : 'yet'}</p>
                    <p class="text-sm mt-2">Sessions will appear here when your children book tutoring sessions</p>
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
                                Child Name <i class="fas fa-sort text-gray-400"></i>
                            </th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; cursor: pointer;" onclick="sortSessionsByColumn('tutor_name')" title="Click to sort">
                                Tutor <i class="fas fa-sort text-gray-400"></i>
                            </th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; cursor: pointer;" onclick="sortSessionsByColumn('course_name')" title="Click to sort">
                                Course & Topics <i class="fas fa-sort text-gray-400"></i>
                            </th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; cursor: pointer;" onclick="sortSessionsByColumn('session_date')" title="Click to sort">
                                Date & Time <i class="fas fa-sort text-gray-400"></i>
                            </th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Status</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sessions.map(session => {
                            // Get topics as string
                            const topicsStr = Array.isArray(session.topics) && session.topics.length > 0
                                ? session.topics.join(', ')
                                : 'No topics specified';

                            // Status badge color
                            const statusColor = {
                                'scheduled': '#3B82F6',
                                'in-progress': '#F59E0B',
                                'completed': '#10B981',
                                'cancelled': '#EF4444',
                                'missed': '#9CA3AF'
                            }[session.status] || '#6B7280';

                            return `
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 12px;">
                                        <div style="font-weight: 500;">${session.student_name || 'Unknown Child'}</div>
                                    </td>
                                    <td style="padding: 12px;">
                                        <div style="font-weight: 500;">${session.tutor_name || 'Unknown Tutor'}</div>
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
                                        <span style="background: ${statusColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; text-transform: capitalize;">
                                            ${session.status || 'scheduled'}
                                        </span>
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
        console.error('[Parent Schedule] Error loading sessions:', error);
        container.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load sessions</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

// Filter sessions by status
function filterSessions(status) {
    console.log(`[Parent Schedule] Filtering sessions by status: ${status}`);
    currentSessionsFilter = status;

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

// Search sessions
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
        (session.tutor_name && session.tutor_name.toLowerCase().includes(query)) ||
        (session.course_name && session.course_name.toLowerCase().includes(query)) ||
        (session.topics && Array.isArray(session.topics) && session.topics.some(t => t.toLowerCase().includes(query))) ||
        (session.status && session.status.toLowerCase().includes(query)) ||
        (session.session_mode && session.session_mode.toLowerCase().includes(query))
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
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Child Name</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Tutor</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Course & Topics</th>
                        <th style="padding: 12px; text-align: left; font-weight: 600;">Date & Time</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600;">Status</th>
                        <th style="padding: 12px; text-align: center; font-weight: 600;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${sessions.map(session => {
                        const topicsStr = Array.isArray(session.topics) && session.topics.length > 0
                            ? session.topics.join(', ')
                            : 'N/A';

                        const statusColor = {
                            'scheduled': '#3B82F6',
                            'in-progress': '#F59E0B',
                            'completed': '#10B981',
                            'cancelled': '#EF4444',
                            'missed': '#9CA3AF'
                        }[session.status] || '#6B7280';

                        return `
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                <td style="padding: 12px;">
                                    <div style="font-weight: 500;">${session.student_name || 'Unknown Child'}</div>
                                </td>
                                <td style="padding: 12px;">
                                    <div style="font-weight: 500;">${session.tutor_name || 'Unknown Tutor'}</div>
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
                                    <span style="background: ${statusColor}; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; text-transform: capitalize;">
                                        ${session.status || 'scheduled'}
                                    </span>
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
// VIEW/EDIT FUNCTIONS
// ============================================

function viewSchedule(scheduleId) {
    console.log(`[Parent Schedule] Viewing schedule: ${scheduleId}`);
    // TODO: Open schedule details modal
    alert(`View schedule ${scheduleId} - Modal coming soon`);
}

function editSchedule(scheduleId) {
    console.log(`[Parent Schedule] Editing schedule: ${scheduleId}`);
    // TODO: Open schedule edit modal
    alert(`Edit schedule ${scheduleId} - Modal coming soon`);
}

function viewSession(sessionId) {
    console.log(`[Parent Schedule] Viewing session: ${sessionId}`);
    // TODO: Open session details modal
    alert(`View session ${sessionId} - Modal coming soon`);
}

function openScheduleModal() {
    console.log('[Parent Schedule] Opening create schedule modal');
    // TODO: Open create schedule modal
    alert('Create schedule modal coming soon');
}

// ============================================
// TOGGLE FUNCTIONS
// ============================================

async function toggleScheduleAlarm(scheduleId, enable) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to modify schedule settings');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/parent/schedules/${scheduleId}/toggle-alarm`, {
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

        // Reload schedules to reflect changes
        loadSchedules(scheduleCurrentPage);

        console.log(`[Parent Schedule] Schedule ${scheduleId} alarm ${enable ? 'enabled' : 'disabled'}`);
    } catch (error) {
        console.error('[Parent Schedule] Error toggling schedule alarm:', error);
        alert('Failed to update alarm setting');
    }
}

async function toggleScheduleNotification(scheduleId, enable) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to modify schedule settings');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/parent/schedules/${scheduleId}/toggle-notification`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notification_browser: enable })
        });

        if (!response.ok) {
            throw new Error('Failed to update notification setting');
        }

        // Reload schedules to reflect changes
        loadSchedules(scheduleCurrentPage);

        console.log(`[Parent Schedule] Schedule ${scheduleId} notification ${enable ? 'enabled' : 'disabled'}`);
    } catch (error) {
        console.error('[Parent Schedule] Error toggling schedule notification:', error);
        alert('Failed to update notification setting');
    }
}

// ============================================
// SORTING FUNCTIONS
// ============================================

let scheduleSortField = null;
let scheduleSortDirection = 'asc';
let sessionSortField = null;
let sessionSortDirection = 'asc';

function sortSchedulesByColumn(field) {
    console.log(`[Parent Schedule] Sorting schedules by: ${field}`);

    // Toggle direction if same field
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

        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';

        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();

        if (scheduleSortDirection === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });

    // Re-render
    loadSchedules(scheduleCurrentPage);
}

function sortSessionsByColumn(field) {
    console.log(`[Parent Schedule] Sorting sessions by: ${field}`);

    // Toggle direction if same field
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

        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';

        // Special handling for dates
        if (field === 'session_date') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        } else {
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
        }

        if (sessionSortDirection === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
    });

    // Re-render
    loadSessions(currentSessionsFilter === 'all' ? null : currentSessionsFilter, sessionCurrentPage);
}

// ============================================
// INITIALIZATION & EVENT LISTENERS
// ============================================

// Initialize when schedule panel is opened
window.addEventListener('panelSwitch', (event) => {
    if (event.detail.panelName === 'family-schedule') {
        console.log('[Parent Schedule] Schedule panel opened, loading schedules tab...');
        loadSchedules();
    }
});

// Also listen for panelSwitched event (backward compatibility)
window.addEventListener('panelSwitched', (event) => {
    if (event.detail.panelName === 'family-schedule') {
        console.log('[Parent Schedule] Schedule panel opened (backward compat), loading schedules...');
        loadSchedules();
    }
});

// Make functions globally accessible
window.switchScheduleTab = switchScheduleTab;
window.loadSchedules = loadSchedules;
window.loadSessions = loadSessions;
window.filterSchedules = filterSchedules;
window.filterSessions = filterSessions;
window.searchSchedules = searchSchedules;
window.searchSessions = searchSessions;
window.viewSchedule = viewSchedule;
window.editSchedule = editSchedule;
window.viewSession = viewSession;
window.openScheduleModal = openScheduleModal;
window.toggleScheduleAlarm = toggleScheduleAlarm;
window.toggleScheduleNotification = toggleScheduleNotification;
window.sortSchedulesByColumn = sortSchedulesByColumn;
window.sortSessionsByColumn = sortSessionsByColumn;

console.log('[Parent Schedule] Schedule Manager loaded successfully');
