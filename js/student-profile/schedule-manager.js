// ============================================
// STUDENT PROFILE SCHEDULE MANAGER
// Manages schedules with role-based filtering
// ============================================

let scheduleManagerAllSchedules = [];
let scheduleManagerCurrentRoleFilter = 'all';

// Filter schedules by role
async function filterSchedulesByRole(role, event) {
    console.log(`Filtering schedules by role: ${role}`);

    scheduleManagerCurrentRoleFilter = role;

    // Update button styles
    document.querySelectorAll('[onclick^="filterSchedulesByRole"]').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-200');
    });

    const activeBtn = event?.target;
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-200');
        activeBtn.classList.add('bg-blue-500', 'text-white');
    }

    // Load schedules with filter
    await loadSchedules(role);
}

// Load schedules from API
async function loadSchedules(roleFilter = 'all') {
    console.log(`Loading schedules with filter: ${roleFilter}`);

    const container = document.getElementById('schedule-calendar');
    if (!container) return;

    try {
        // Show loading
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

        // Build API URL with optional role filter
        let url = `${window.API_BASE_URL || 'http://localhost:8000'}/api/schedules`;
        if (roleFilter && roleFilter !== 'all') {
            url += `?role_filter=${roleFilter}`;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const schedules = await response.json();
        scheduleManagerAllSchedules = schedules;

        console.log(`Loaded ${schedules.length} schedules`);

        // Render schedules
        renderSchedules(schedules);

    } catch (error) {
        console.error('Error loading schedules:', error);
        container.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-circle text-3xl mb-3"></i>
                <p>Error loading schedules: ${error.message}</p>
            </div>
        `;
    }
}

// Render schedules to the UI
function renderSchedules(schedules) {
    const container = document.getElementById('schedule-calendar');
    if (!container) return;

    if (schedules.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-calendar-times text-3xl mb-3"></i>
                <p>No schedules found</p>
                <button class="mt-4 btn-primary" onclick="openCreateScheduleModal()">
                    <i class="fas fa-plus mr-2"></i>Create Your First Schedule
                </button>
            </div>
        `;
        return;
    }

    // Group schedules by role
    const groupedSchedules = {};
    schedules.forEach(schedule => {
        const role = schedule.scheduler_role || 'other';
        if (!groupedSchedules[role]) {
            groupedSchedules[role] = [];
        }
        groupedSchedules[role].push(schedule);
    });

    let html = '';

    // Render each role group
    Object.keys(groupedSchedules).sort().forEach(role => {
        const roleSchedules = groupedSchedules[role];
        const roleIcon = getRoleIcon(role);
        const roleName = role.charAt(0).toUpperCase() + role.slice(1);

        html += `
            <div class="mb-6">
                <h4 class="text-md font-semibold text-gray-700 mb-3 flex items-center">
                    <i class="${roleIcon} mr-2"></i>
                    ${roleName} Schedules (${roleSchedules.length})
                </h4>
                <div class="space-y-3">
        `;

        roleSchedules.forEach(schedule => {
            html += renderScheduleCard(schedule);
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Render individual schedule card
function renderScheduleCard(schedule) {
    const priorityColors = {
        'low': 'bg-green-100 text-green-800',
        'medium': 'bg-yellow-100 text-yellow-800',
        'high': 'bg-orange-100 text-orange-800',
        'important': 'bg-red-100 text-red-800',
        'urgent': 'bg-red-200 text-red-900'
    };

    const priorityColor = priorityColors[schedule.priority_level] || 'bg-gray-100 text-gray-800';

    const typeInfo = schedule.schedule_type === 'recurring'
        ? `<i class="fas fa-sync-alt mr-1"></i>Recurring`
        : `<i class="fas fa-calendar-day mr-1"></i>Specific Dates`;

    const timeRange = `${schedule.start_time} - ${schedule.end_time}`;

    return `
        <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex justify-between items-start mb-2">
                <h5 class="text-lg font-semibold text-gray-800">${escapeHtml(schedule.title)}</h5>
                <span class="px-2 py-1 rounded text-xs font-semibold ${priorityColor}">
                    ${schedule.priority_level.toUpperCase()}
                </span>
            </div>

            ${schedule.description ? `<p class="text-gray-600 text-sm mb-3">${escapeHtml(schedule.description)}</p>` : ''}

            <div class="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
                <span>${typeInfo}</span>
                <span><i class="fas fa-clock mr-1"></i>${timeRange}</span>
                <span><i class="fas fa-calendar mr-1"></i>Year: ${schedule.year}</span>
            </div>

            ${schedule.schedule_type === 'recurring' ? `
                <div class="mb-3">
                    <div class="text-xs text-gray-500 mb-1">Months:</div>
                    <div class="flex flex-wrap gap-1">
                        ${schedule.months.map(m => `<span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">${m}</span>`).join('')}
                    </div>
                    <div class="text-xs text-gray-500 mt-2 mb-1">Days:</div>
                    <div class="flex flex-wrap gap-1">
                        ${schedule.days.map(d => `<span class="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">${d}</span>`).join('')}
                    </div>
                </div>
            ` : ''}

            ${schedule.specific_dates && schedule.specific_dates.length > 0 ? `
                <div class="mb-3">
                    <div class="text-xs text-gray-500 mb-1">Dates:</div>
                    <div class="flex flex-wrap gap-1">
                        ${schedule.specific_dates.slice(0, 5).map(d => `<span class="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">${d}</span>`).join('')}
                        ${schedule.specific_dates.length > 5 ? `<span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">+${schedule.specific_dates.length - 5} more</span>` : ''}
                    </div>
                </div>
            ` : ''}

            <div class="flex justify-between items-center pt-3 border-t border-gray-100">
                <div class="flex gap-2">
                    ${schedule.alarm_enabled ? '<span class="text-xs text-blue-600"><i class="fas fa-bell"></i> Alarm</span>' : ''}
                    ${schedule.is_featured ? '<span class="text-xs text-yellow-600"><i class="fas fa-star"></i> Featured</span>' : ''}
                    ${schedule.notification_browser ? '<span class="text-xs text-green-600"><i class="fas fa-desktop"></i> Notify</span>' : ''}
                </div>
                <button onclick="handleViewScheduleClick(${schedule.id})"
                        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                    <i class="fas fa-eye mr-2"></i>View Details
                </button>
            </div>
        </div>
    `;
}

// Get role icon
function getRoleIcon(role) {
    const icons = {
        'tutor': 'fas fa-chalkboard-teacher',
        'student': 'fas fa-user-graduate',
        'parent': 'fas fa-user-friends',
        'advertiser': 'fas fa-bullhorn'
    };
    return icons[role] || 'fas fa-user';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Note: The following functions are now defined in global-functions.js:
// - openViewScheduleModal(scheduleId)
// - editScheduleFromView() (no parameter - uses currentViewingSchedule)
// - deleteScheduleFromView() (no parameter - uses currentViewingSchedule)
// - openCreateScheduleModal()
// These are all exported to window and available globally.

// Wrapper function to handle view schedule click with error handling
function handleViewScheduleClick(scheduleId) {
    console.log('[Schedule Manager] View schedule clicked for ID:', scheduleId);

    if (typeof window.openViewScheduleModal === 'function') {
        window.openViewScheduleModal(scheduleId);
    } else {
        console.error('[Schedule Manager] openViewScheduleModal function not found!');
        console.log('[Schedule Manager] Available window functions:', Object.keys(window).filter(k => k.includes('Schedule')));
        alert('Error: Schedule modal function not loaded. Please refresh the page and try again.');
    }
}

// Export functions to window for global access
window.handleViewScheduleClick = handleViewScheduleClick;
window.filterSchedulesByRole = filterSchedulesByRole;
window.loadSchedules = loadSchedules;

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Student Schedule Manager loaded');
        // Auto-load schedules if on schedule panel
        const scheduleCalendar = document.getElementById('schedule-calendar');
        if (scheduleCalendar) {
            loadSchedules('all');
        }
    });
} else {
    console.log('Student Schedule Manager loaded');
    // Auto-load schedules if on schedule panel
    const scheduleCalendar = document.getElementById('schedule-calendar');
    if (scheduleCalendar) {
        loadSchedules('all');
    }
}

console.log('Student Schedule Manager script loaded successfully');
