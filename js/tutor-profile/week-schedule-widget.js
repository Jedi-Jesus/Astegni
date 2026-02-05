// ============================================
// THIS WEEK'S SCHEDULE WIDGET
// Displays this week's schedule items from schedules and sessions tables
// ============================================

console.log('%c📅 This Week\'s Schedule Widget Loading...', 'color: purple; font-weight: bold;');

// Initialize widget when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing This Week\'s Schedule widget');
    loadWeekSchedule();
});

// Global function for "View Full Schedule" button
window.openSchedulePanelFromWeek = function() {
    if (typeof window.switchPanel === 'function') {
        window.switchPanel('schedule');
    } else {
        console.warn('switchPanel function not found');
    }
};

async function loadWeekSchedule() {
    const widgetContainer = document.getElementById('week-schedule-widget-content');

    if (!widgetContainer) {
        console.warn('Week schedule widget container not found');
        return;
    }

    try {
        // Show loading state
        widgetContainer.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
                <p class="text-sm text-gray-500 mt-2">Loading this week's schedule...</p>
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

        // Get week boundaries (Monday to Sunday)
        const { weekStart, weekEnd, weekDates } = getWeekBoundaries();

        console.log(`Loading week schedule from ${weekStart} to ${weekEnd}`);

        // Fetch both schedules and sessions for the week
        const [schedulesRes, sessionsRes] = await Promise.all([
            fetch(`${API_BASE}/api/tutor/schedules`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }),
            fetch(`${API_BASE}/api/tutor/sessions?date_from=${weekStart}&date_to=${weekEnd}`, {
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

        // Filter schedules for this week
        const weekSchedules = filterSchedulesForWeek(schedules, weekDates);

        // Organize by day
        const scheduleByDay = organizeScheduleByDay(weekSchedules, sessions, weekDates);

        // Display the schedule
        displayWeekSchedule(scheduleByDay, widgetContainer);

    } catch (error) {
        console.error('Error loading week schedule:', error);
        widgetContainer.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-exclamation-triangle text-2xl text-red-400 mb-2"></i>
                <p class="text-sm text-gray-500">Failed to load schedule</p>
            </div>
        `;
    }
}

function getWeekBoundaries() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Calculate Monday of current week
    const monday = new Date(today);
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);

    // Calculate Sunday of current week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    // Get all dates in the week
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        weekDates.push({
            date: date,
            dateStr: date.toISOString().split('T')[0],
            dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
            dayShort: date.toLocaleDateString('en-US', { weekday: 'short' }),
            dayNum: date.getDate(),
            isToday: date.toDateString() === today.toDateString()
        });
    }

    return {
        weekStart: monday.toISOString().split('T')[0],
        weekEnd: sunday.toISOString().split('T')[0],
        weekDates: weekDates
    };
}

function filterSchedulesForWeek(schedules, weekDates) {
    const weekDayNames = weekDates.map(d => d.dayName);
    const weekDateStrs = weekDates.map(d => d.dateStr);

    return schedules.filter(schedule => {
        // Only show active schedules
        if (schedule.status !== 'active') return false;

        // For recurring schedules, check if any day this week matches
        if (schedule.schedule_type === 'recurring') {
            return schedule.days && schedule.days.some(day => weekDayNames.includes(day));
        }

        // For specific date schedules, check if any date this week is in specific_dates
        if (schedule.schedule_type === 'specific') {
            return schedule.specific_dates && schedule.specific_dates.some(date => weekDateStrs.includes(date));
        }

        return false;
    });
}

function organizeScheduleByDay(schedules, sessions, weekDates) {
    const scheduleByDay = {};

    // Initialize all days
    weekDates.forEach(day => {
        scheduleByDay[day.dateStr] = {
            ...day,
            items: []
        };
    });

    // Add schedules
    schedules.forEach(schedule => {
        weekDates.forEach(day => {
            let shouldAdd = false;

            if (schedule.schedule_type === 'recurring') {
                shouldAdd = schedule.days && schedule.days.includes(day.dayName);
            } else if (schedule.schedule_type === 'specific') {
                shouldAdd = schedule.specific_dates && schedule.specific_dates.includes(day.dateStr);
            }

            if (shouldAdd) {
                scheduleByDay[day.dateStr].items.push({
                    ...schedule,
                    type: 'schedule',
                    start_time: schedule.start_time,
                    end_time: schedule.end_time
                });
            }
        });
    });

    // Add sessions
    sessions.forEach(session => {
        const sessionDate = session.session_date || session.sessionDate;
        if (sessionDate && scheduleByDay[sessionDate]) {
            scheduleByDay[sessionDate].items.push({
                ...session,
                type: 'session',
                start_time: session.start_time || session.startTime,
                end_time: session.end_time || session.endTime
            });
        }
    });

    // Sort items by time for each day
    Object.keys(scheduleByDay).forEach(dateStr => {
        scheduleByDay[dateStr].items.sort((a, b) => {
            const timeA = a.start_time || '00:00';
            const timeB = b.start_time || '00:00';
            return timeA.localeCompare(timeB);
        });
    });

    return scheduleByDay;
}

function displayWeekSchedule(scheduleByDay, container) {
    const sortedDays = Object.values(scheduleByDay).sort((a, b) =>
        new Date(a.dateStr) - new Date(b.dateStr)
    );

    // Calculate total items
    const totalItems = sortedDays.reduce((sum, day) => sum + day.items.length, 0);

    if (totalItems === 0) {
        container.innerHTML = `
            <div class="text-center py-6">
                <i class="fas fa-calendar-week text-3xl text-gray-300 mb-2"></i>
                <p class="text-sm text-gray-500">No schedule for this week</p>
                <p class="text-xs text-gray-400 mt-1">Time to plan ahead!</p>
            </div>
        `;
        return;
    }

    let html = '<div class="space-y-2" style="max-height: 400px; overflow-y: auto;">';

    sortedDays.forEach(day => {
        if (day.items.length === 0) return; // Skip days with no items

        // Day header
        const todayClass = day.isToday ? 'font-bold' : '';
        const todayIndicator = day.isToday ? '• ' : '';

        html += `
            <div class="day-section" style="border-left: 3px solid ${day.isToday ? 'var(--button-bg)' : 'var(--border-color)'}; padding-left: 0.75rem; margin-bottom: 1rem;">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-semibold ${todayClass}" style="color: ${day.isToday ? 'var(--button-bg)' : 'var(--text-primary)'};">
                        ${todayIndicator}${day.dayShort} ${day.dayNum}
                    </span>
                    <span class="text-xs" style="color: var(--text-secondary);">
                        ${day.items.length} ${day.items.length === 1 ? 'item' : 'items'}
                    </span>
                </div>
                <div class="space-y-1">
        `;

        // Show up to 3 items per day in widget
        const displayItems = day.items.slice(0, 3);
        const hasMore = day.items.length > 3;

        displayItems.forEach(item => {
            const time = formatTime(item.start_time);
            const title = item.title || item.course_name || item.courseName || 'Session';
            const icon = getItemIcon(item);

            html += `
                <div class="flex items-center gap-2 py-1 px-2 rounded hover:bg-opacity-50 cursor-pointer text-sm"
                     onclick="openSchedulePanelFromWeek()"
                     style="background: var(--bg-secondary); transition: opacity 0.2s;"
                     onmouseover="this.style.opacity='0.7'"
                     onmouseout="this.style.opacity='1'">
                    <span>${icon}</span>
                    <span class="flex-1 truncate">${title}</span>
                    <span class="text-xs" style="color: var(--text-secondary);">${time}</span>
                </div>
            `;
        });

        if (hasMore) {
            html += `
                <div class="text-xs text-center py-1" style="color: var(--text-secondary);">
                    +${day.items.length - 3} more
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;
    });

    html += '</div>';

    // Summary and button
    html += `
        <div class="mt-3 pt-3" style="border-top: 1px solid var(--border-color);">
            <div class="flex justify-between items-center mb-2 text-sm">
                <span style="color: var(--text-secondary);">Total this week:</span>
                <span class="font-semibold" style="color: var(--text-primary);">${totalItems} items</span>
            </div>
            <button
                onclick="openSchedulePanelFromWeek()"
                class="w-full px-4 py-2 text-sm rounded-lg transition-colors"
                style="background: var(--button-bg); color: var(--button-text);"
                onmouseover="this.style.opacity='0.9'"
                onmouseout="this.style.opacity='1'">
                View Full Schedule
            </button>
        </div>
    `;

    container.innerHTML = html;
}

function getItemIcon(item) {
    if (item.type === 'schedule') {
        if (item.priority_level === 'urgent' || item.priority_level === 'high') {
            return '🔥';
        }
        return '📅';
    } else {
        // Session
        const mode = item.session_mode || item.sessionMode || '';
        return mode === 'online' ? '💻' : '👥';
    }
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

// Auto-refresh every 10 minutes
setInterval(() => {
    console.log('Auto-refreshing week schedule...');
    loadWeekSchedule();
}, 10 * 60 * 1000);

console.log('%c✅ This Week\'s Schedule Widget Loaded', 'color: green; font-weight: bold;');
