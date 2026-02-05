// ============================================
// STUDENT SESSIONS PANEL MANAGER
// Manages the dedicated Sessions panel for students
// Multi-role perspective: view sessions as student, tutor, or parent
// ============================================

// Namespace to avoid conflicts
window.StudentSessionsPanel = window.StudentSessionsPanel || {};

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

// ============================================
// TODAY'S CLASSES WIDGET
// ============================================

// Update Today's Classes widget with today's sessions
function updateTodayClassesWidget() {
    const container = document.getElementById('today-classes-widget-container');
    if (!container) return;

    // Get today's date (YYYY-MM-DD format)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    console.log(`[Today's Classes Widget] Filtering for today: ${todayStr}`);

    // Filter sessions for today
    const todaySessions = allSessionsData.filter(session => {
        if (!session.session_date) return false;
        const sessionDate = new Date(session.session_date).toISOString().split('T')[0];
        return sessionDate === todayStr && session.viewAs === 'student';
    });

    console.log(`[Today's Classes Widget] Found ${todaySessions.length} sessions for today`);

    // Sort by start time
    todaySessions.sort((a, b) => {
        const timeA = a.start_time || '00:00';
        const timeB = b.start_time || '00:00';
        return timeA.localeCompare(timeB);
    });

    // Generate HTML
    if (todaySessions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-6 text-gray-500">
                <i class="fas fa-calendar-check text-3xl mb-2" style="opacity: 0.5;"></i>
                <p class="text-sm">No classes scheduled for today</p>
                <p class="text-xs mt-1" style="opacity: 0.7;">Enjoy your free time!</p>
            </div>
        `;
        return;
    }

    // Limit to first 3 sessions
    const displaySessions = todaySessions.slice(0, 3);

    const sessionColors = [
        { bg: '#EEF2FF', border: '#818CF8', text: '#4F46E5' },
        { bg: '#ECFDF5', border: '#6EE7B7', text: '#059669' },
        { bg: '#FEF3C7', border: '#FCD34D', text: '#D97706' },
        { bg: '#FCE7F3', border: '#F9A8D4', text: '#DB2777' },
        { bg: '#DBEAFE', border: '#93C5FD', text: '#2563EB' }
    ];

    const sessionsHTML = displaySessions.map((session, index) => {
        const color = sessionColors[index % sessionColors.length];

        // Format time (remove seconds if present)
        const formatTime = (time) => {
            if (!time) return 'N/A';
            const parts = time.split(':');
            return `${parts[0]}:${parts[1]}`;
        };

        const startTime = formatTime(session.start_time);
        const endTime = formatTime(session.end_time);
        const timeDisplay = endTime !== 'N/A' ? `${startTime} - ${endTime}` : startTime;

        // Status indicator
        const statusIcon = session.status === 'completed'
            ? '<i class="fas fa-check-circle text-green-500" style="font-size: 0.75rem;"></i>'
            : session.status === 'in-progress'
            ? '<i class="fas fa-circle text-blue-500 animate-pulse" style="font-size: 0.5rem;"></i>'
            : session.status === 'cancelled'
            ? '<i class="fas fa-times-circle text-red-500" style="font-size: 0.75rem;"></i>'
            : '';

        return `
            <div class="p-3 rounded-lg" style="background: ${color.bg}; border-left: 3px solid ${color.border};">
                <div class="flex justify-between items-start mb-1">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold" style="color: ${color.text};">${session.course_name || 'Unknown Course'}</span>
                        ${statusIcon}
                    </div>
                    <span class="text-xs font-medium" style="color: ${color.text}; opacity: 0.8;">${timeDisplay}</span>
                </div>
                <div class="text-xs" style="color: var(--text-secondary);">
                    ${session.tutor_name || 'Unknown Tutor'} • ${session.session_mode || 'online'}
                </div>
                ${session.topics && session.topics.length > 0 ? `
                    <div class="text-xs mt-1" style="color: var(--text-secondary); opacity: 0.8;">
                        <i class="fas fa-book" style="font-size: 0.65rem;"></i> ${session.topics.slice(0, 2).join(', ')}${session.topics.length > 2 ? '...' : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    // Show count if more than 3 sessions
    const moreSessionsText = todaySessions.length > 3
        ? `<p class="text-xs text-center mt-2" style="color: var(--text-secondary);">+${todaySessions.length - 3} more ${todaySessions.length - 3 === 1 ? 'class' : 'classes'} today</p>`
        : '';

    container.innerHTML = `
        ${sessionsHTML}
        ${moreSessionsText}
        <button onclick="switchPanel('sessions')"
            class="w-full mt-3 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            View Full Schedule
        </button>
    `;
}

// Call this function whenever sessions are loaded
window.addEventListener('sessionsLoaded', () => {
    console.log('[Today\'s Classes Widget] Sessions loaded event received');
    updateTodayClassesWidget();
});

// Initialize widget on page load (load student sessions in background for the widget)
async function initializeTodayClassesWidget() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            const container = document.getElementById('today-classes-widget-container');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-6 text-gray-500">
                        <i class="fas fa-lock text-2xl mb-2" style="opacity: 0.5;"></i>
                        <p class="text-sm">Please log in to view today's classes</p>
                    </div>
                `;
            }
            return;
        }

        console.log('[Today\'s Classes Widget] Initializing...');

        // Fetch student sessions
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/student/my-sessions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch sessions');
        }

        const sessions = await response.json();

        // Update allSessionsData if not already loaded
        if (allSessionsData.length === 0) {
            allSessionsData = sessions.map(s => ({ ...s, viewAs: 'student' }));
        }

        // Update the widget
        updateTodayClassesWidget();

        console.log('[Today\'s Classes Widget] Initialized successfully');
    } catch (error) {
        console.error('[Today\'s Classes Widget] Error initializing:', error);
        const container = document.getElementById('today-classes-widget-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-6 text-gray-500">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2" style="opacity: 0.5;"></i>
                    <p class="text-sm">Unable to load today's classes</p>
                </div>
            `;
        }
    }
}

// Initialize widget when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTodayClassesWidget);
} else {
    // DOM already loaded
    initializeTodayClassesWidget();
}

// ============================================
// THIS WEEK WIDGET
// ============================================

// Update This Week widget with weekly statistics
function updateThisWeekWidget() {
    const container = document.getElementById('this-week-widget-container');
    if (!container) return;

    // Get current week date range (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, else go to Monday

    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];

    console.log(`[This Week Widget] Week range: ${mondayStr} to ${sundayStr}`);

    // Filter sessions for this week (student perspective only)
    const thisWeekSessions = allSessionsData.filter(session => {
        if (!session.session_date) return false;
        const sessionDate = session.session_date.split('T')[0];
        return sessionDate >= mondayStr && sessionDate <= sundayStr && session.viewAs === 'student';
    });

    console.log(`[This Week Widget] Found ${thisWeekSessions.length} sessions this week`);

    // Calculate statistics
    const totalSessions = thisWeekSessions.length;
    const completedSessions = thisWeekSessions.filter(s => s.status === 'completed').length;
    const scheduledSessions = thisWeekSessions.filter(s => s.status === 'scheduled').length;
    const cancelledSessions = thisWeekSessions.filter(s => s.status === 'cancelled').length;

    // Calculate total study hours (assume 1 hour per session if duration not available)
    const totalHours = thisWeekSessions
        .filter(s => s.status === 'completed')
        .reduce((sum, s) => {
            if (s.duration) return sum + s.duration / 60; // duration in minutes
            // Calculate from start/end time if available
            if (s.start_time && s.end_time) {
                const [startH, startM] = s.start_time.split(':').map(Number);
                const [endH, endM] = s.end_time.split(':').map(Number);
                const durationHours = (endH + endM / 60) - (startH + startM / 60);
                return sum + durationHours;
            }
            return sum + 1; // Default 1 hour
        }, 0);

    // Calculate attendance rate (completed / (completed + scheduled))
    const attendedSessions = completedSessions;
    const totalAttendableSessions = completedSessions + cancelledSessions;
    const attendanceRate = totalAttendableSessions > 0
        ? Math.round((attendedSessions / totalAttendableSessions) * 100)
        : 0;

    // Calculate completion rate for this week
    const completionRate = totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 0;

    // Generate HTML
    if (totalSessions === 0) {
        container.innerHTML = `
            <div class="text-center py-6 text-gray-500">
                <i class="fas fa-calendar-week text-3xl mb-2" style="opacity: 0.5;"></i>
                <p class="text-sm">No sessions this week</p>
                <p class="text-xs mt-1" style="opacity: 0.7;">Start scheduling classes!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <!-- Total Sessions -->
        <div class="flex justify-between items-center mb-3">
            <span class="text-sm text-gray-600">Total Classes</span>
            <span class="font-semibold text-blue-600">${totalSessions}</span>
        </div>

        <!-- Completed Sessions -->
        <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Completed</span>
            <span class="font-semibold text-green-600">${completedSessions}/${totalSessions}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-green-500 h-2 rounded-full transition-all" style="width: ${completionRate}%"></div>
        </div>

        <!-- Study Hours -->
        <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Study Hours</span>
            <span class="font-semibold text-purple-600">${totalHours.toFixed(1)}h</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-purple-500 h-2 rounded-full transition-all" style="width: ${Math.min(totalHours * 4, 100)}%"></div>
        </div>

        <!-- Attendance Rate -->
        <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Attendance Rate</span>
            <span class="font-semibold ${attendanceRate >= 80 ? 'text-green-600' : attendanceRate >= 50 ? 'text-orange-600' : 'text-red-600'}">${attendanceRate}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="${attendanceRate >= 80 ? 'bg-green-500' : attendanceRate >= 50 ? 'bg-orange-500' : 'bg-red-500'} h-2 rounded-full transition-all" style="width: ${attendanceRate}%"></div>
        </div>

        <!-- Upcoming Sessions -->
        ${scheduledSessions > 0 ? `
        <div class="mt-2 p-2 rounded-lg" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05));">
            <div class="flex items-center justify-between">
                <span class="text-xs text-gray-600">
                    <i class="fas fa-clock text-blue-500"></i> Upcoming
                </span>
                <span class="text-xs font-semibold text-blue-600">${scheduledSessions} ${scheduledSessions === 1 ? 'class' : 'classes'}</span>
            </div>
        </div>
        ` : ''}

        <!-- Week Progress Info -->
        <div class="mt-2 pt-2 border-t border-gray-200">
            <div class="text-xs text-center text-gray-500">
                Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
        </div>
    `;
}

// Call this function whenever sessions are loaded
window.addEventListener('sessionsLoaded', () => {
    console.log('[This Week Widget] Sessions loaded event received');
    updateThisWeekWidget();
});

// Initialize This Week widget
async function initializeThisWeekWidget() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            const container = document.getElementById('this-week-widget-container');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-6 text-gray-500">
                        <i class="fas fa-lock text-2xl mb-2" style="opacity: 0.5;"></i>
                        <p class="text-sm">Please log in to view weekly stats</p>
                    </div>
                `;
            }
            return;
        }

        console.log('[This Week Widget] Initializing...');

        // If sessions already loaded, just update the widget
        if (allSessionsData.length > 0) {
            updateThisWeekWidget();
            return;
        }

        // Otherwise fetch sessions
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/student/my-sessions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch sessions');
        }

        const sessions = await response.json();

        // Update allSessionsData if not already loaded
        if (allSessionsData.length === 0) {
            allSessionsData = sessions.map(s => ({ ...s, viewAs: 'student' }));
        }

        // Update the widget
        updateThisWeekWidget();

        console.log('[This Week Widget] Initialized successfully');
    } catch (error) {
        console.error('[This Week Widget] Error initializing:', error);
        const container = document.getElementById('this-week-widget-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-6 text-gray-500">
                    <i class="fas fa-exclamation-triangle text-2xl mb-2" style="opacity: 0.5;"></i>
                    <p class="text-sm">Unable to load weekly stats</p>
                </div>
            `;
        }
    }
}

// Initialize This Week widget when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeThisWeekWidget);
} else {
    // DOM already loaded
    initializeThisWeekWidget();
}

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
        // IMPORTANT: Clear previous data immediately to prevent displaying stale data
        allSessionsData = [];
        filteredSessionsCache = [];

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

        console.log(`[Sessions Panel] Fetching sessions for role: ${role}, URL: ${url || 'multi-endpoint'}`);

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

        console.log(`[Sessions Panel] Fetched ${fetchedSessions.length} sessions for role: ${role}`);

        // Dispatch event for widgets to update
        window.dispatchEvent(new CustomEvent('sessionsLoaded', { detail: { sessions: fetchedSessions, role } }));

        // Update widgets
        updateTodayClassesWidget();
        updateThisWeekWidget();

        if (fetchedSessions.length === 0) {
            console.log(`[Sessions Panel] No sessions found for role: ${role}`);
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-users text-3xl mb-3"></i>
                    <p>No sessions found as ${role}</p>
                    ${role === 'parent' ? '<p class="text-sm mt-2">You don\'t have any children added to your account</p>' : ''}
                </div>
            `;
            return;
        }

        // Display sessions with role-appropriate columns
        console.log(`[Sessions Panel] Displaying ${fetchedSessions.length} sessions with role: ${role}`);
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
function displayFilteredSessions(sessions, viewRole = 'student') {
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
// LOAD SESSIONS FROM API (Default - backward compat)
// ============================================

window.loadSessions = async function loadSessions(statusFilter = null, page = 1) {
    console.log('Loading sessions (default as student)...');

    // Default to loading as student for backward compatibility
    currentRoleFilter = 'student';
    loadSessionsByRole('student');
}

// ============================================
// LOAD SESSION STATISTICS
// ============================================

async function loadSessionStats() {
    console.log('Loading session stats...');

    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/student/my-sessions/counts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const stats = await response.json();
        sessionStats = stats;

        // Update session stats UI (check if elements exist first)
        const totalEl = document.getElementById('student-session-stat-total');
        const completedEl = document.getElementById('student-session-stat-completed');
        const upcomingEl = document.getElementById('student-session-stat-upcoming');
        const hoursEl = document.getElementById('student-session-stat-hours');

        if (totalEl) totalEl.textContent = stats.total || 0;
        if (completedEl) completedEl.textContent = stats.completed || 0;
        if (upcomingEl) upcomingEl.textContent = stats.scheduled || 0;

        // Calculate total hours from completed sessions if available
        if (hoursEl && allSessionsData.length > 0) {
            const totalHours = allSessionsData
                .filter(s => s.status === 'completed')
                .reduce((sum, s) => sum + (s.duration || 0), 0) / 60;
            hoursEl.textContent = totalHours.toFixed(1);
        }

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

    // If empty query, reload with current role filter
    if (!query) {
        loadSessionsByRole(currentRoleFilter);
        return;
    }

    // Filter sessions
    const filteredSessions = allSessionsData.filter(session =>
        (session.student_name && session.student_name.toLowerCase().includes(query)) ||
        (session.tutor_name && session.tutor_name.toLowerCase().includes(query)) ||
        (session.course_name && session.course_name.toLowerCase().includes(query)) ||
        (session.topics && Array.isArray(session.topics) && session.topics.some(t => t.toLowerCase().includes(query))) ||
        (session.status && session.status.toLowerCase().includes(query)) ||
        (session.session_mode && session.session_mode.toLowerCase().includes(query))
    );

    // Display filtered sessions
    filteredSessionsCache = filteredSessions;
    displayFilteredSessions(filteredSessions, currentRoleFilter);
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

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/student/sessions/${sessionId}/toggle-notification`, {
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
        loadSessionsByRole(currentRoleFilter);

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

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/student/sessions/${sessionId}/toggle-alarm`, {
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
        loadSessionsByRole(currentRoleFilter);

        console.log(`✅ Session ${sessionId} alarm ${enable ? 'enabled' : 'disabled'}`);
    } catch (error) {
        console.error('Error toggling session alarm:', error);
        alert('Failed to update alarm setting');
    }
}

window.toggleSessionFeatured = async function toggleSessionFeatured(sessionId, feature) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to modify session settings');
            return;
        }

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/student/sessions/${sessionId}/toggle-featured`, {
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
        loadSessionsByRole(currentRoleFilter);

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

    // Re-render with current role filter
    displayFilteredSessions(allSessionsData, currentRoleFilter);
}

// ============================================
// VIEW SESSION FUNCTION
// ============================================

window.viewSession = function viewSession(sessionId) {
    console.log(`Viewing session ${sessionId}`);
    // To be implemented - open session detail modal or navigate to session page
    alert(`View session ${sessionId} - Feature coming soon!`);
}

// Make all functions globally accessible via StudentSessionsPanel namespace
// This prevents conflicts with other panel managers
window.StudentSessionsPanel.loadSessions = loadSessions;
window.StudentSessionsPanel.loadSessionStats = loadSessionStats;
window.StudentSessionsPanel.searchSessions = searchSessions;
window.StudentSessionsPanel.toggleSessionNotification = toggleSessionNotification;
window.StudentSessionsPanel.toggleSessionAlarm = toggleSessionAlarm;
window.StudentSessionsPanel.toggleSessionFeatured = toggleSessionFeatured;
window.StudentSessionsPanel.sortSessionsByColumn = sortSessionsByColumn;
window.StudentSessionsPanel.filterSessionsByRole = filterSessionsByRole;
window.StudentSessionsPanel.loadFilteredSessionsPage = loadFilteredSessionsPage;
window.StudentSessionsPanel.viewSession = viewSession;

// Also export to window directly for onclick handlers used in dynamically generated HTML
window.searchSessions = searchSessions;
window.loadSessions = loadSessions;
window.filterSessionsByRole = filterSessionsByRole;
window.loadFilteredSessionsPage = loadFilteredSessionsPage;
window.toggleSessionNotification = toggleSessionNotification;
window.toggleSessionAlarm = toggleSessionAlarm;
window.toggleSessionFeatured = toggleSessionFeatured;
window.sortSessionsByColumn = sortSessionsByColumn;
window.viewSession = viewSession;

console.log('✅ Student Sessions Panel Manager loaded successfully');
