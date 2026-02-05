// ============================================
// PARENT SESSIONS PANEL MANAGER
// Manages the dedicated Sessions panel for parents
// Multi-role perspective: view sessions as student, tutor, or parent
// ============================================

// Namespace to avoid conflicts
window.ParentSessionsPanel = window.ParentSessionsPanel || {};

let parentAllSessionsData = [];
let parentSessionStats = null;
let parentSessionCurrentPage = 1;
const parentSessionItemsPerPage = 10;
let parentCurrentRoleFilter = 'all';
let parentFilteredSessionsCache = [];
let parentSessionSortField = null;
let parentSessionSortDirection = 'asc';

// Initialize when sessions panel is opened
window.addEventListener('panelSwitch', (event) => {
    if (event.detail.panelName === 'sessions') {
        console.log('Parent Sessions panel opened, loading sessions...');
        loadParentSessions();
        loadParentSessionStats();
    }
});

// Also listen for panelSwitched event (backward compatibility)
window.addEventListener('panelSwitched', (event) => {
    if (event.detail.panelName === 'sessions') {
        console.log('Parent Sessions panel opened (backward compat), loading sessions...');
        loadParentSessions();
        loadParentSessionStats();
    }
});

// Filter sessions by role (calls different API endpoints based on role perspective)
window.filterParentSessionsByRole = function filterParentSessionsByRole(role, event) {
    console.log(`Filtering parent sessions by role: ${role}`);
    parentCurrentRoleFilter = role;

    // Update filter buttons
    document.querySelectorAll('#sessions-panel button[onclick^="filterParentSessionsByRole"]').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-200');
    });

    // If event is provided (from onclick), highlight the clicked button
    if (event && event.target) {
        event.target.classList.remove('bg-gray-200');
        event.target.classList.add('bg-blue-500', 'text-white');
    }

    // Reset to page 1 when changing filters
    parentSessionCurrentPage = 1;

    // Load sessions based on role perspective
    loadParentSessionsByRole(role);
}

// Load sessions based on role perspective (calls different API endpoints)
async function loadParentSessionsByRole(role) {
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

        parentAllSessionsData = fetchedSessions;
        parentFilteredSessionsCache = fetchedSessions;

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
        displayParentFilteredSessions(fetchedSessions, role);

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
function displayParentFilteredSessions(sessions, viewRole = 'parent') {
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

    // Pagination
    const totalSessions = sessions.length;
    const totalPages = Math.ceil(totalSessions / parentSessionItemsPerPage);
    const startIndex = (parentSessionCurrentPage - 1) * parentSessionItemsPerPage;
    const endIndex = startIndex + parentSessionItemsPerPage;
    const paginatedSessions = sessions.slice(startIndex, endIndex);

    // Build table headers based on role
    let tableHeaders = '';
    if (viewRole === 'tutor') {
        tableHeaders = `
            <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course & Topics</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
        `;
    } else if (viewRole === 'student') {
        tableHeaders = `
            <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutor Name</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course & Topics</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
        `;
    } else if (viewRole === 'parent') {
        tableHeaders = `
            <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Child Name</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tutor Name</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course & Topics</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
        `;
    } else {  // 'all' view
        tableHeaders = `
            <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course & Topics</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
        `;
    }

    // Build table rows based on role
    const tableRows = paginatedSessions.map(session => {
        const currentViewRole = session.viewAs || viewRole;

        const statusColor = {
            'completed': '#10B981',
            'in-progress': '#3B82F6',
            'scheduled': '#F59E0B',
            'cancelled': '#EF4444',
            'missed': '#6B7280'
        }[session.status] || '#9CA3AF';

        const statusBadge = `
            <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.875rem; font-weight: 500;">
                ${session.status || 'scheduled'}
            </span>
        `;

        const topics = session.topics ?
            `<div class="text-sm text-gray-500">${session.topics.join(', ')}</div>` : '';

        const dateTime = `
            <div>${session.session_date}</div>
            <div class="text-sm text-gray-500">${session.start_time} - ${session.end_time}</div>
        `;

        const actions = `
            <button class="text-blue-500 hover:text-blue-700" onclick="viewSessionDetails(${session.id})">
                <i class="fas fa-eye"></i>
            </button>
        `;

        if (currentViewRole === 'tutor') {
            return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="px-4 py-3">${session.student_name || 'N/A'}</td>
                    <td class="px-4 py-3">
                        <div class="font-medium">${session.course_name || 'N/A'}</div>
                        ${topics}
                    </td>
                    <td class="px-4 py-3">${dateTime}</td>
                    <td class="px-4 py-3">${statusBadge}</td>
                    <td class="px-4 py-3">${actions}</td>
                </tr>
            `;
        } else if (currentViewRole === 'student') {
            return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="px-4 py-3">${session.tutor_name || 'N/A'}</td>
                    <td class="px-4 py-3">
                        <div class="font-medium">${session.course_name || 'N/A'}</div>
                        ${topics}
                    </td>
                    <td class="px-4 py-3">${dateTime}</td>
                    <td class="px-4 py-3">${statusBadge}</td>
                    <td class="px-4 py-3">${actions}</td>
                </tr>
            `;
        } else if (currentViewRole === 'parent') {
            return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="px-4 py-3">${session.child_name || session.student_name || 'N/A'}</td>
                    <td class="px-4 py-3">${session.tutor_name || 'N/A'}</td>
                    <td class="px-4 py-3">
                        <div class="font-medium">${session.course_name || 'N/A'}</div>
                        ${topics}
                    </td>
                    <td class="px-4 py-3">${dateTime}</td>
                    <td class="px-4 py-3">${statusBadge}</td>
                    <td class="px-4 py-3">${actions}</td>
                </tr>
            `;
        } else {
            // 'all' view with role badge
            const roleBadge = `
                <span class="px-2 py-1 text-xs font-medium rounded-full ${
                    currentViewRole === 'tutor' ? 'bg-purple-100 text-purple-800' :
                    currentViewRole === 'student' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                }">
                    ${currentViewRole}
                </span>
            `;

            return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="px-4 py-3">${roleBadge}</td>
                    <td class="px-4 py-3">${
                        currentViewRole === 'tutor' ? session.student_name :
                        currentViewRole === 'student' ? session.tutor_name :
                        (session.child_name || session.student_name) || 'N/A'
                    }</td>
                    <td class="px-4 py-3">
                        <div class="font-medium">${session.course_name || 'N/A'}</div>
                        ${topics}
                    </td>
                    <td class="px-4 py-3">${dateTime}</td>
                    <td class="px-4 py-3">${statusBadge}</td>
                    <td class="px-4 py-3">${actions}</td>
                </tr>
            `;
        }
    }).join('');

    // Pagination controls
    const paginationHTML = `
        <div class="flex items-center justify-between px-4 py-3 border-t">
            <div class="text-sm text-gray-700">
                Showing <span class="font-medium">${startIndex + 1}</span> to <span class="font-medium">${Math.min(endIndex, totalSessions)}</span> of <span class="font-medium">${totalSessions}</span> sessions
            </div>
            <div class="flex gap-2">
                <button
                    onclick="loadParentFilteredSessionsPage(${parentSessionCurrentPage - 1})"
                    ${parentSessionCurrentPage === 1 ? 'disabled' : ''}
                    class="px-3 py-1 border rounded ${parentSessionCurrentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}">
                    Previous
                </button>
                ${Array.from({length: totalPages}, (_, i) => i + 1)
                    .slice(Math.max(0, parentSessionCurrentPage - 3), parentSessionCurrentPage + 2)
                    .map(page => `
                        <button
                            onclick="loadParentFilteredSessionsPage(${page})"
                            class="px-3 py-1 border rounded ${page === parentSessionCurrentPage ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}">
                            ${page}
                        </button>
                    `).join('')}
                <button
                    onclick="loadParentFilteredSessionsPage(${parentSessionCurrentPage + 1})"
                    ${parentSessionCurrentPage === totalPages ? 'disabled' : ''}
                    class="px-3 py-1 border rounded ${parentSessionCurrentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}">
                    Next
                </button>
            </div>
        </div>
    `;

    // Render table
    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    ${tableHeaders}
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${tableRows}
                </tbody>
            </table>
            ${paginationHTML}
        </div>
    `;
}

// Load parent sessions (default as parent for backward compatibility)
window.loadParentSessions = async function loadParentSessions(statusFilter = null, page = 1) {
    console.log('Loading parent sessions (default as parent)...');

    // Default to loading as parent for backward compatibility
    parentCurrentRoleFilter = 'parent';
    loadParentSessionsByRole('parent');
}

// ============================================
// LOAD SESSION STATISTICS
// ============================================

async function loadParentSessionStats() {
    console.log('Loading parent session stats...');

    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/parent/sessions/counts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const stats = await response.json();
        parentSessionStats = stats;

        // Update session stats UI (check if elements exist first)
        const totalEl = document.getElementById('parent-session-stat-total');
        const completedEl = document.getElementById('parent-session-stat-completed');
        const upcomingEl = document.getElementById('parent-session-stat-upcoming');
        const hoursEl = document.getElementById('parent-session-stat-hours');

        if (totalEl) totalEl.textContent = stats.total || 0;
        if (completedEl) completedEl.textContent = stats.completed || 0;
        if (upcomingEl) upcomingEl.textContent = stats.scheduled || 0;

        // Calculate total hours from completed sessions if available
        if (hoursEl && parentAllSessionsData.length > 0) {
            const totalHours = parentAllSessionsData
                .filter(s => s.status === 'completed')
                .reduce((sum, s) => sum + (s.duration || 0), 0) / 60;
            hoursEl.textContent = totalHours.toFixed(1);
        }

        console.log('✅ Parent session stats loaded:', stats);

    } catch (error) {
        console.error('Error loading parent session stats:', error);
    }
}

// ============================================
// SEARCH SESSIONS
// ============================================

window.searchParentSessions = function searchParentSessions(query) {
    query = query.toLowerCase().trim();

    const container = document.getElementById('sessions-table-container');
    if (!container) return;

    // If empty query, reload with current role filter
    if (!query) {
        loadParentSessionsByRole(parentCurrentRoleFilter);
        return;
    }

    // Search across all loaded sessions
    const filteredSessions = parentAllSessionsData.filter(session =>
        (session.student_name?.toLowerCase().includes(query)) ||
        (session.tutor_name?.toLowerCase().includes(query)) ||
        (session.child_name?.toLowerCase().includes(query)) ||
        // child_name is actually returned as student_name from parent API
        ((session.viewAs === 'parent' && session.student_name?.toLowerCase().includes(query))) ||
        (session.course_name?.toLowerCase().includes(query)) ||
        (session.topics?.some(t => t.toLowerCase().includes(query))) ||
        (session.status?.toLowerCase().includes(query)) ||
        (session.session_mode?.toLowerCase().includes(query))
    );

    parentFilteredSessionsCache = filteredSessions;
    parentSessionCurrentPage = 1;
    displayParentFilteredSessions(filteredSessions, parentCurrentRoleFilter);
};

// Pagination page change handler
window.loadParentFilteredSessionsPage = function loadParentFilteredSessionsPage(page) {
    parentSessionCurrentPage = page;
    displayParentFilteredSessions(parentFilteredSessionsCache, parentCurrentRoleFilter);
};

// ============================================
// SESSION ACTIONS
// ============================================

window.viewSessionDetails = function viewSessionDetails(sessionId) {
    console.log('Viewing session details for session:', sessionId);
    // TODO: Implement session details modal
    alert(`Session details for session ${sessionId} - To be implemented`);
};

// Export for use in other modules
window.ParentSessionsPanel.loadSessions = loadParentSessions;
window.ParentSessionsPanel.loadSessionStats = loadParentSessionStats;

console.log('✅ Parent Sessions Panel Manager loaded successfully');
