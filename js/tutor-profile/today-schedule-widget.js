// ============================================
// TODAY'S SCHEDULE WIDGET
// Displays today's schedule items from schedules and sessions tables
// ============================================

console.log('%c📅 Today\'s Schedule Widget Loading...', 'color: blue; font-weight: bold;');

// Initialize widget when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing Today\'s Schedule widget');
    loadTodaySchedule();
});

// Global function for "View Full Schedule" button
window.openSchedulePanel = function() {
    if (typeof window.switchPanel === 'function') {
        window.switchPanel('schedule');
    } else {
        console.warn('switchPanel function not found');
    }
};

async function loadTodaySchedule() {
    const widgetContainer = document.getElementById('today-schedule-widget-content');

    if (!widgetContainer) {
        console.warn('Today schedule widget container not found');
        return;
    }

    try {
        // Show loading state
        widgetContainer.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                <p class="text-sm text-gray-500 mt-2">Loading today's schedule...</p>
            </div>
        `;

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');

        if (!token) {
            widgetContainer.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-lock text-2xl text-gray-400 mb-2"></i>
                    <p class="text-sm text-gray-500">Please log in to view your schedule</p>
                </div>
            `;
            return;
        }

        const API_BASE = window.API_BASE_URL || 'http://localhost:8000';
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }); // Monday, Tuesday, etc.

        // Fetch both schedules and sessions
        const [schedulesRes, sessionsRes] = await Promise.all([
            fetch(`${API_BASE}/api/tutor/schedules`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }),
            fetch(`${API_BASE}/api/tutor/sessions?date_from=${todayStr}&date_to=${todayStr}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
        ]);

        if (!schedulesRes.ok || !sessionsRes.ok) {
            throw new Error('Failed to fetch schedule data');
        }

        const schedules = await schedulesRes.json();
        const sessions = await sessionsRes.json();

        // Filter schedules for today
        const todaySchedules = filterSchedulesForToday(schedules, dayName, todayStr);

        // Combine and sort by time
        const allItems = [
            ...todaySchedules.map(s => ({ ...s, type: 'schedule' })),
            ...sessions.map(s => ({ ...s, type: 'session' }))
        ];

        // Sort by start time
        allItems.sort((a, b) => {
            const timeA = a.start_time || a.startTime || '00:00';
            const timeB = b.start_time || b.startTime || '00:00';
            return timeA.localeCompare(timeB);
        });

        // Display the items
        displayTodaySchedule(allItems, widgetContainer);

    } catch (error) {
        console.error('Error loading today\'s schedule:', error);
        widgetContainer.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle text-2xl text-red-400 mb-2"></i>
                <p class="text-sm text-gray-500">Failed to load schedule</p>
            </div>
        `;
    }
}

function filterSchedulesForToday(schedules, dayName, todayStr) {
    return schedules.filter(schedule => {
        // Only show active schedules
        if (schedule.status !== 'active') return false;

        // For recurring schedules, check if today's day is in the days array
        if (schedule.schedule_type === 'recurring') {
            return schedule.days && schedule.days.includes(dayName);
        }

        // For specific date schedules, check if today is in specific_dates
        if (schedule.schedule_type === 'specific') {
            return schedule.specific_dates && schedule.specific_dates.includes(todayStr);
        }

        return false;
    });
}

function displayTodaySchedule(items, container) {
    if (items.length === 0) {
        container.innerHTML = `
            <div class="text-center py-6">
                <i class="fas fa-calendar-check text-3xl text-gray-300 mb-2"></i>
                <p class="text-sm text-gray-500">No schedule for today</p>
                <p class="text-xs text-gray-400 mt-1">Enjoy your free time!</p>
            </div>
        `;
        return;
    }

    // Limit to 3 items for widget display
    const displayItems = items.slice(0, 3);
    const hasMore = items.length > 3;

    const colors = ['blue', 'green', 'purple', 'orange', 'pink'];

    let html = '<div class="space-y-3">';

    displayItems.forEach((item, index) => {
        const color = colors[index % colors.length];
        const time = formatTime(item.start_time || item.startTime);
        const title = item.title || item.course_name || item.courseName || 'Session';

        let description = '';
        if (item.type === 'schedule') {
            description = item.description || 'Scheduled activity';
        } else {
            // For sessions, show student name and mode
            const studentName = item.student_name || item.studentName || 'Student';
            const mode = item.session_mode || item.sessionMode || 'session';
            description = `${studentName} - ${mode}`;
        }

        // Get icon based on type and priority
        let icon = '📚';
        if (item.type === 'schedule') {
            if (item.priority_level === 'urgent' || item.priority_level === 'high') {
                icon = '🔥';
            } else {
                icon = '📅';
            }
        } else {
            icon = item.session_mode === 'online' ? '💻' : '👥';
        }

        html += `
            <div class="p-3 bg-${color}-50 rounded-lg border border-${color}-100 hover:shadow-md transition-shadow cursor-pointer"
                 onclick="openSchedulePanel()"
                 style="background: var(--bg-secondary); border: 1px solid var(--border-color);">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-sm font-semibold flex items-center gap-2">
                        <span>${icon}</span>
                        <span>${title}</span>
                    </span>
                    <span class="text-xs" style="color: var(--text-secondary);">${time}</span>
                </div>
                <div class="text-xs" style="color: var(--text-secondary);">${description}</div>
            </div>
        `;
    });

    html += '</div>';

    // Add "View Full Schedule" button
    html += `
        <button
            onclick="openSchedulePanel()"
            class="w-full mt-3 px-4 py-2 text-sm rounded-lg transition-colors"
            style="background: var(--button-bg); color: var(--button-text);"
            onmouseover="this.style.opacity='0.9'"
            onmouseout="this.style.opacity='1'">
            ${hasMore ? `View All ${items.length} Items` : 'View Full Schedule'}
        </button>
    `;

    container.innerHTML = html;
}

function formatTime(timeStr) {
    if (!timeStr) return '';

    // Handle both "HH:MM:SS" and "HH:MM" formats
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
        let hours = parseInt(parts[0]);
        const minutes = parts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
    }

    return timeStr;
}

// Auto-refresh every 5 minutes
setInterval(() => {
    console.log('Auto-refreshing today\'s schedule...');
    loadTodaySchedule();
}, 5 * 60 * 1000);

console.log('%c✅ Today\'s Schedule Widget Loaded', 'color: green; font-weight: bold;');
