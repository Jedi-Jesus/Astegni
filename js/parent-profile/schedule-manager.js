// ============================================
// PARENT PROFILE SCHEDULE MANAGER
// Manages schedules with role-based filtering
// ============================================

let allSchedules = [];
let currentRoleFilter = 'all';

// Filter schedules by role
async function filterSchedulesByRole(role, event) {
    console.log(`Filtering schedules by role: ${role}`);

    currentRoleFilter = role;

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
        allSchedules = schedules;

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
                <div class="flex gap-2">
                    <button onclick="viewSchedule(${schedule.id})" class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors">
                        <i class="fas fa-eye mr-1"></i>View Details
                    </button>
                </div>
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

// Store current schedule for modal operations
let currentScheduleInView = null;

// View schedule details
function viewSchedule(scheduleId) {
    const schedule = allSchedules.find(s => s.id === scheduleId);
    if (!schedule) {
        alert('Schedule not found');
        return;
    }

    currentScheduleInView = schedule;

    // Open view schedule modal
    openViewScheduleModal(schedule);
}

// Open view schedule modal and populate with data
function openViewScheduleModal(schedule) {
    const modal = document.getElementById('viewScheduleModal');
    if (!modal) {
        console.warn('View schedule modal not found. Make sure view-schedule-modal.html is loaded.');
        return;
    }

    // Populate schedule title and description
    const titleEl = document.getElementById('view-schedule-name');
    const descEl = document.getElementById('view-schedule-description');
    if (titleEl) titleEl.textContent = schedule.title;
    if (descEl) {
        descEl.textContent = schedule.description || 'No description provided';
        descEl.style.display = schedule.description ? 'block' : 'none';
    }

    // Populate priority badge
    const priorityBadge = document.getElementById('view-schedule-priority-badge');
    if (priorityBadge) {
        const priorityMap = {
            'low': { class: 'priority-low', label: 'LOW' },
            'medium': { class: 'priority-medium', label: 'MEDIUM' },
            'high': { class: 'priority-high', label: 'HIGH' },
            'important': { class: 'priority-high', label: 'IMPORTANT' },
            'urgent': { class: 'priority-urgent', label: 'URGENT' }
        };
        const priority = priorityMap[schedule.priority_level] || priorityMap['medium'];
        priorityBadge.className = `priority-badge ${priority.class}`;
        priorityBadge.textContent = priority.label;
    }

    // Populate schedule type
    const typeEl = document.getElementById('view-schedule-type');
    if (typeEl) {
        typeEl.innerHTML = schedule.schedule_type === 'recurring'
            ? '<i class="fas fa-sync-alt mr-1"></i>Recurring'
            : '<i class="fas fa-calendar-day mr-1"></i>Specific Dates';
    }

    // Populate times
    const startTimeEl = document.getElementById('view-schedule-start-time');
    const endTimeEl = document.getElementById('view-schedule-end-time');
    if (startTimeEl) startTimeEl.textContent = schedule.start_time;
    if (endTimeEl) endTimeEl.textContent = schedule.end_time;

    // Populate year
    const yearEl = document.getElementById('view-schedule-year');
    if (yearEl) yearEl.textContent = schedule.year;

    // Handle recurring section
    const recurringSection = document.getElementById('view-recurring-section');
    const specificDatesSection = document.getElementById('view-specific-dates-section');

    if (schedule.schedule_type === 'recurring') {
        if (recurringSection) recurringSection.classList.remove('hidden');
        if (specificDatesSection) specificDatesSection.classList.add('hidden');

        // Populate months
        const monthsEl = document.getElementById('view-schedule-months');
        if (monthsEl && schedule.months && schedule.months.length > 0) {
            monthsEl.innerHTML = schedule.months.map(m =>
                `<span class="tag month-tag">${m}</span>`
            ).join('');
        }

        // Populate days
        const daysEl = document.getElementById('view-schedule-days');
        if (daysEl && schedule.days && schedule.days.length > 0) {
            daysEl.innerHTML = schedule.days.map(d =>
                `<span class="tag day-tag">${d}</span>`
            ).join('');
        }
    } else {
        if (recurringSection) recurringSection.classList.add('hidden');
        if (specificDatesSection && schedule.specific_dates && schedule.specific_dates.length > 0) {
            specificDatesSection.classList.remove('hidden');
            const specificDatesEl = document.getElementById('view-schedule-specific-dates');
            if (specificDatesEl) {
                specificDatesEl.innerHTML = schedule.specific_dates.map(d =>
                    `<span class="tag date-tag">${d}</span>`
                ).join('');
            }
        } else if (specificDatesSection) {
            specificDatesSection.classList.add('hidden');
        }
    }

    // Populate notes
    const notesSection = document.getElementById('view-notes-section');
    const notesEl = document.getElementById('view-schedule-notes');
    if (schedule.notes) {
        if (notesSection) notesSection.classList.remove('hidden');
        if (notesEl) notesEl.textContent = schedule.notes;
    } else {
        if (notesSection) notesSection.classList.add('hidden');
    }

    // Populate notification badges
    const alarmBadge = document.getElementById('view-alarm-badge');
    const browserBadge = document.getElementById('view-browser-notification-badge');
    const soundBadge = document.getElementById('view-sound-notification-badge');
    const featuredBadge = document.getElementById('view-featured-badge');
    const noNotifications = document.getElementById('view-no-notifications');

    let hasNotifications = false;

    if (alarmBadge) {
        if (schedule.alarm_enabled) {
            alarmBadge.classList.remove('hidden');
            const alarmMinutes = document.getElementById('view-alarm-minutes');
            if (alarmMinutes) alarmMinutes.textContent = schedule.alarm_before_minutes || 15;
            hasNotifications = true;
        } else {
            alarmBadge.classList.add('hidden');
        }
    }

    if (browserBadge) {
        if (schedule.notification_browser) {
            browserBadge.classList.remove('hidden');
            hasNotifications = true;
        } else {
            browserBadge.classList.add('hidden');
        }
    }

    if (soundBadge) {
        if (schedule.notification_sound) {
            soundBadge.classList.remove('hidden');
            hasNotifications = true;
        } else {
            soundBadge.classList.add('hidden');
        }
    }

    if (featuredBadge) {
        if (schedule.is_featured) {
            featuredBadge.classList.remove('hidden');
            hasNotifications = true;
        } else {
            featuredBadge.classList.add('hidden');
        }
    }

    if (noNotifications) {
        noNotifications.style.display = hasNotifications ? 'none' : 'inline';
    }

    // Populate metadata
    const roleEl = document.getElementById('view-schedule-role');
    if (roleEl) {
        const roleMap = {
            'tutor': 'Tutor',
            'student': 'Student',
            'parent': 'Parent',
            'advertiser': 'Advertiser'
        };
        roleEl.textContent = roleMap[schedule.scheduler_role] || 'Unknown';
    }

    const statusEl = document.getElementById('view-schedule-status');
    if (statusEl) {
        statusEl.textContent = schedule.is_active ? 'Active' : 'Inactive';
    }

    // Handle role-based button visibility
    // Detect current profile from URL or page context
    let currentRole = localStorage.getItem('active_role');

    // Fallback: detect from URL path if localStorage is stale
    const urlPath = window.location.pathname;
    if (urlPath.includes('parent-profile')) {
        currentRole = 'parent';
    } else if (urlPath.includes('student-profile')) {
        currentRole = 'student';
    } else if (urlPath.includes('tutor-profile')) {
        currentRole = 'tutor';
    }

    const editBtn = document.getElementById('view-schedule-edit-btn');
    const deleteBtn = document.getElementById('view-schedule-delete-btn');

    console.log('Schedule Role:', schedule.scheduler_role);
    console.log('Current Role (detected):', currentRole);
    console.log('URL Path:', urlPath);

    // Show edit and delete buttons only if schedule was created with the current role
    if (schedule.scheduler_role === currentRole) {
        console.log('✅ Showing edit and delete buttons (matches current role)');
        if (editBtn) {
            editBtn.classList.remove('hidden');
            editBtn.style.display = 'inline-flex';
        }
        if (deleteBtn) {
            deleteBtn.classList.remove('hidden');
            deleteBtn.style.display = 'inline-flex';
        }
    } else {
        console.log('❌ Hiding edit and delete buttons (created by ' + schedule.scheduler_role + ', viewing as ' + currentRole + ')');
        if (editBtn) {
            editBtn.classList.add('hidden');
            editBtn.style.display = 'none';
        }
        if (deleteBtn) {
            deleteBtn.classList.add('hidden');
            deleteBtn.style.display = 'none';
        }
    }

    // Show the modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

// Close view schedule modal
function closeViewScheduleModal() {
    const modal = document.getElementById('viewScheduleModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    currentScheduleInView = null;
}

// Open edit schedule from view modal
function openEditScheduleFromView() {
    if (!currentScheduleInView) {
        alert('No schedule selected');
        return;
    }

    console.log('Opening edit modal with schedule:', currentScheduleInView);

    // Store schedule temporarily before closing modal
    const scheduleToEdit = currentScheduleInView;

    // Close view modal first
    closeViewScheduleModal();

    // Open schedule modal in edit mode with the stored schedule
    openScheduleModalForEdit(scheduleToEdit);
}

// Open schedule modal for editing with pre-filled data
function openScheduleModalForEdit(schedule) {
    console.log('openScheduleModalForEdit called with:', schedule);

    if (!schedule) {
        console.error('No schedule provided to openScheduleModalForEdit');
        alert('Error: No schedule data available for editing');
        return;
    }

    const modal = document.getElementById('scheduleModal');
    if (!modal) {
        console.warn('Schedule modal not found. Make sure schedule-modal.html is loaded.');
        return;
    }

    // Set the schedule ID for editing
    const scheduleIdInput = document.getElementById('editing-schedule-id');
    if (scheduleIdInput) {
        scheduleIdInput.value = schedule.id || '';
    }

    // Update modal title
    const modalTitle = document.getElementById('schedule-modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Schedule';
    }

    // Fill form fields
    const titleInput = document.getElementById('schedule-title');
    if (titleInput) titleInput.value = schedule.title;

    const descriptionInput = document.getElementById('schedule-description');
    if (descriptionInput) descriptionInput.value = schedule.description || '';

    // Set priority level
    const priorityInput = document.getElementById('schedule-priority');
    if (priorityInput) {
        const priorityMap = {
            'low': 1,
            'medium': 2,
            'high': 3,
            'important': 4,
            'urgent': 5
        };
        priorityInput.value = priorityMap[schedule.priority_level] || 3;
        // Trigger the priority label update if function exists
        if (typeof updatePriorityLabel === 'function') {
            updatePriorityLabel(priorityInput.value);
        }
    }

    // Set schedule type
    const scheduleTypeInputs = document.querySelectorAll('input[name="schedule-type"]');
    scheduleTypeInputs.forEach(input => {
        if (input.value === schedule.schedule_type) {
            input.checked = true;
        }
    });

    // Trigger schedule type change if function exists (to show/hide sections)
    if (typeof toggleScheduleType === 'function') {
        toggleScheduleType(schedule.schedule_type);
    }

    // Set times
    const startTimeInput = document.getElementById('schedule-start-time');
    if (startTimeInput) startTimeInput.value = schedule.start_time;

    const endTimeInput = document.getElementById('schedule-end-time');
    if (endTimeInput) endTimeInput.value = schedule.end_time;

    // Set year (modal uses year-from and year-to)
    const yearFromInput = document.getElementById('schedule-year-from');
    if (yearFromInput) yearFromInput.value = schedule.year;

    // Year-to is optional, leave empty for now (backend only stores single year)
    const yearToInput = document.getElementById('schedule-year-to');
    if (yearToInput) yearToInput.value = '';

    // Set recurring: months and days (wait for toggleScheduleType to complete)
    if (schedule.schedule_type === 'recurring') {
        console.log('Setting recurring schedule - Months:', schedule.months, 'Days:', schedule.days);

        // Use setTimeout to ensure the recurring section is visible first
        setTimeout(() => {
            // Check if recurring section is visible
            const recurringSection = document.getElementById('recurring-schedule-section');
            console.log('Recurring section found:', !!recurringSection);
            if (recurringSection) {
                console.log('Recurring section display:', recurringSection.style.display);
            }

            // Set months - try different selectors
            let monthCheckboxes = document.querySelectorAll('input[name="schedule-months"]');
            if (monthCheckboxes.length === 0) {
                // Try alternative selector in the correct section
                monthCheckboxes = document.querySelectorAll('#recurring-schedule-section input[type="checkbox"]');
                console.log('Trying alternative month selector, found:', monthCheckboxes.length);
            }
            console.log('Found month checkboxes:', monthCheckboxes.length);

            monthCheckboxes.forEach(checkbox => {
                const shouldCheck = schedule.months && schedule.months.includes(checkbox.value);
                checkbox.checked = shouldCheck;
                if (shouldCheck) {
                    console.log('Checked month:', checkbox.value);
                }
            });

            // Set days
            let dayCheckboxes = document.querySelectorAll('input[name="schedule-days"]');
            if (dayCheckboxes.length === 0) {
                // Try to find day checkboxes in the days section
                const daysSection = document.querySelector('[class*="days"], [id*="days"]');
                if (daysSection) {
                    dayCheckboxes = daysSection.querySelectorAll('input[type="checkbox"]');
                    console.log('Trying alternative day selector, found:', dayCheckboxes.length);
                }
            }
            console.log('Found day checkboxes:', dayCheckboxes.length);

            dayCheckboxes.forEach(checkbox => {
                const shouldCheck = schedule.days && schedule.days.includes(checkbox.value);
                checkbox.checked = shouldCheck;
                if (shouldCheck) {
                    console.log('Checked day:', checkbox.value);
                }
            });
        }, 300);  // Increased timeout to 300ms
    }

    // Set specific dates
    if (schedule.schedule_type === 'specific' && schedule.specific_dates && schedule.specific_dates.length > 0) {
        console.log('Setting specific dates:', schedule.specific_dates);

        // Update global variable if it exists
        if (typeof selectedSpecificDates !== 'undefined') {
            selectedSpecificDates = [...schedule.specific_dates];
            console.log('Updated selectedSpecificDates:', selectedSpecificDates);
        }

        // Wait a bit for modal to render, then update the UI display
        setTimeout(() => {
            if (typeof displaySelectedDates === 'function') {
                displaySelectedDates();
                console.log('Called displaySelectedDates()');
            } else {
                console.warn('displaySelectedDates function not found');

                // Fallback: manually populate the selected dates list
                const selectedDatesList = document.getElementById('selected-dates-list');
                if (selectedDatesList && schedule.specific_dates) {
                    selectedDatesList.innerHTML = schedule.specific_dates.map((date, index) => `
                        <div class="selected-date-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-secondary); border-radius: 6px; margin-bottom: 6px;">
                            <span style="font-weight: 500;">
                                <i class="fas fa-calendar-day" style="color: var(--primary-color); margin-right: 8px;"></i>
                                ${date}
                            </span>
                            <button type="button" onclick="removeSpecificDate(${index})" class="btn-icon-danger" style="padding: 4px 8px; font-size: 0.875rem;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `).join('');
                    console.log('Manually populated selected dates list');
                }
            }
        }, 100);
    }

    // Set notes
    const notesInput = document.getElementById('schedule-notes');
    if (notesInput) notesInput.value = schedule.notes || '';

    // Set alarm settings
    const alarmCheckbox = document.getElementById('schedule-alarm');
    if (alarmCheckbox) {
        alarmCheckbox.checked = schedule.alarm_enabled || false;
        // Trigger alarm toggle if function exists
        if (typeof toggleAlarm === 'function') {
            toggleAlarm();
        }
    }

    const alarmMinutesInput = document.getElementById('alarm-minutes');
    if (alarmMinutesInput) alarmMinutesInput.value = schedule.alarm_before_minutes || 15;

    // Set notification settings
    const browserNotifCheckbox = document.getElementById('notification-browser');
    if (browserNotifCheckbox) browserNotifCheckbox.checked = schedule.notification_browser || false;

    const soundNotifCheckbox = document.getElementById('notification-sound');
    if (soundNotifCheckbox) soundNotifCheckbox.checked = schedule.notification_sound || false;

    // Set featured
    const featuredCheckbox = document.getElementById('schedule-featured');
    if (featuredCheckbox) featuredCheckbox.checked = schedule.is_featured || false;

    // Update submit button text
    const submitBtn = document.getElementById('schedule-submit-btn');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Schedule';
    }

    // Show the modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

// Open delete confirmation modal
function openDeleteScheduleConfirmation() {
    if (!currentScheduleInView) {
        alert('No schedule selected');
        return;
    }

    const confirmModal = document.getElementById('confirmDeleteScheduleModal');
    if (!confirmModal) {
        console.warn('Confirm delete schedule modal not found. Make sure confirm-delete-schedule-modal.html is loaded.');
        return;
    }

    // Populate confirmation modal with schedule info
    const titleEl = document.getElementById('confirm-delete-schedule-title');
    if (titleEl) titleEl.textContent = currentScheduleInView.title;

    const typeEl = document.getElementById('confirm-delete-schedule-type');
    if (typeEl) {
        typeEl.textContent = currentScheduleInView.schedule_type === 'recurring' ? 'Recurring' : 'Specific Dates';
    }

    const yearEl = document.getElementById('confirm-delete-schedule-year');
    if (yearEl) yearEl.textContent = currentScheduleInView.year;

    // Show confirmation modal
    confirmModal.classList.remove('hidden');
    confirmModal.style.display = 'flex';
}

// Close delete confirmation modal
function closeConfirmDeleteScheduleModal() {
    const confirmModal = document.getElementById('confirmDeleteScheduleModal');
    if (confirmModal) {
        confirmModal.classList.add('hidden');
        confirmModal.style.display = 'none';
    }
}

// Confirm and delete schedule
async function confirmDeleteSchedule() {
    if (!currentScheduleInView) {
        alert('No schedule selected');
        closeConfirmDeleteScheduleModal();
        return;
    }

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');

        const response = await fetch(
            `${window.API_BASE_URL || 'http://localhost:8000'}/api/schedules/${currentScheduleInView.id}`,
            {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to delete schedule`);
        }

        // Close both modals
        closeConfirmDeleteScheduleModal();
        closeViewScheduleModal();

        // Show success message
        alert('Schedule deleted successfully!');

        // Reload schedules
        await loadSchedules(currentRoleFilter);

    } catch (error) {
        console.error('Error deleting schedule:', error);
        alert('Failed to delete schedule: ' + error.message);
        closeConfirmDeleteScheduleModal();
    }
}

// Open create schedule modal
function openCreateScheduleModal() {
    // Use the common schedule modal
    if (typeof openScheduleModal === 'function') {
        openScheduleModal();
    } else {
        alert('Schedule modal not available. Please ensure schedule-modal.html is loaded.');
    }
}

// Open schedule modal (main function called by HTML)
function openScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    if (!modal) {
        console.warn('Schedule modal not found. Loading...');
        // Try to load modal dynamically
        if (typeof CommonModalLoader !== 'undefined' && CommonModalLoader.load) {
            CommonModalLoader.load('schedule-modal.html').then(() => {
                openScheduleModal(); // Retry after load
            }).catch(err => {
                console.error('Failed to load schedule modal:', err);
                alert('Schedule modal not available. Please refresh the page.');
            });
        } else {
            alert('Schedule modal not available. Please ensure schedule-modal.html is loaded.');
        }
        return;
    }

    // Reset form for create mode
    const form = document.getElementById('scheduleForm');
    if (form) form.reset();

    const scheduleIdInput = document.getElementById('editing-schedule-id');
    if (scheduleIdInput) scheduleIdInput.value = '';

    const modalTitle = document.getElementById('schedule-modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-calendar-plus"></i> Create Teaching Schedule';
    }

    const submitBtn = document.getElementById('schedule-submit-btn');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Create Schedule';
    }

    // Clear selected specific dates
    selectedSpecificDates = [];
    displaySelectedDates();

    // Set default year to current year
    const currentYear = new Date().getFullYear();
    const yearFromInput = document.getElementById('schedule-year-from');
    if (yearFromInput) {
        yearFromInput.value = currentYear;
    }

    // Show modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close schedule modal
function closeScheduleModal() {
    const modal = document.getElementById('scheduleModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Save schedule (handles both create and update)
async function saveSchedule() {
    const scheduleId = document.getElementById('editing-schedule-id')?.value;
    const isEditing = scheduleId && scheduleId !== '';

    // Validate required fields
    const title = document.getElementById('schedule-title')?.value;
    const startTime = document.getElementById('schedule-start-time')?.value;
    const endTime = document.getElementById('schedule-end-time')?.value;
    const yearFrom = document.getElementById('schedule-year-from')?.value;

    if (!title || !title.trim()) {
        alert('Please enter a schedule title');
        document.getElementById('schedule-title')?.focus();
        return;
    }

    if (!startTime) {
        alert('Please select a start time');
        document.getElementById('schedule-start-time')?.focus();
        return;
    }

    if (!endTime) {
        alert('Please select an end time');
        document.getElementById('schedule-end-time')?.focus();
        return;
    }

    if (!yearFrom) {
        alert('Please enter a year');
        document.getElementById('schedule-year-from')?.focus();
        return;
    }

    // Collect form data
    const formData = {
        title: document.getElementById('schedule-title')?.value,
        description: document.getElementById('schedule-description')?.value || '',
        priority_level: getPriorityLevel(),
        schedule_type: document.querySelector('input[name="schedule-type"]:checked')?.value || 'recurring',
        start_time: document.getElementById('schedule-start-time')?.value,
        end_time: document.getElementById('schedule-end-time')?.value,
        year: parseInt(yearFrom) || new Date().getFullYear(), // Backend expects integer
        notes: document.getElementById('schedule-notes')?.value || '',
        alarm_enabled: document.getElementById('schedule-alarm')?.checked || false,
        alarm_before_minutes: parseInt(document.getElementById('alarm-minutes')?.value) || 15,
        notification_browser: document.getElementById('notification-browser')?.checked || false,
        notification_sound: document.getElementById('notification-sound')?.checked || false,
        is_featured: document.getElementById('schedule-featured')?.checked || false
    };

    // Add schedule type specific fields
    if (formData.schedule_type === 'recurring') {
        formData.months = Array.from(document.querySelectorAll('input[name="schedule-months"]:checked')).map(cb => cb.value);
        formData.days = Array.from(document.querySelectorAll('input[name="schedule-days"]:checked')).map(cb => cb.value);
        formData.specific_dates = []; // Empty array for recurring
    } else {
        // selectedSpecificDates is already a flat array of date strings
        formData.months = []; // Empty array for specific dates
        formData.days = []; // Empty array for specific dates
        formData.specific_dates = selectedSpecificDates || [];
    }

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const url = isEditing
            ? `${window.API_BASE_URL || 'http://localhost:8000'}/api/schedules/${scheduleId}`
            : `${window.API_BASE_URL || 'http://localhost:8000'}/api/schedules`;

        const response = await fetch(url, {
            method: isEditing ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error(`Failed to save schedule: ${response.statusText}`);
        }

        // Close modal and reload schedules
        closeScheduleModal();
        alert(isEditing ? 'Schedule updated successfully!' : 'Schedule created successfully!');
        await loadSchedules(currentRoleFilter);

    } catch (error) {
        console.error('Error saving schedule:', error);
        alert('Failed to save schedule: ' + error.message);
    }
}

// Get priority level from slider
function getPriorityLevel() {
    const priorityValue = document.getElementById('schedule-priority')?.value;
    const priorityMap = {
        '1': 'low',
        '2': 'medium',
        '3': 'high',
        '4': 'important',
        '5': 'urgent'
    };
    return priorityMap[priorityValue] || 'medium';
}

// Update priority label (called by slider oninput)
function updatePriorityLabel(value) {
    const labelMap = {
        '1': 'Low Priority',
        '2': 'Normal Priority',
        '3': 'High Priority',
        '4': 'Very Important',
        '5': 'Highly Critical'
    };
    const label = document.getElementById('priority-label');
    if (label) {
        label.textContent = labelMap[value] || 'Normal Priority';
    }
}

// Toggle schedule type (recurring vs specific dates)
function toggleScheduleType(type) {
    const recurringSection = document.getElementById('recurring-schedule-section');
    const specificDatesSection = document.getElementById('specific-dates-section');

    if (!type) {
        const selected = document.querySelector('input[name="schedule-type"]:checked');
        type = selected ? selected.value : 'recurring';
    }

    if (recurringSection && specificDatesSection) {
        if (type === 'recurring') {
            recurringSection.style.display = 'block';
            specificDatesSection.style.display = 'none';
        } else {
            recurringSection.style.display = 'none';
            specificDatesSection.style.display = 'block';
        }
    }
}

// Toggle alarm settings visibility
function toggleAlarm() {
    const alarmCheckbox = document.getElementById('schedule-alarm');
    const alarmSettings = document.getElementById('alarm-settings');

    if (alarmCheckbox && alarmSettings) {
        alarmSettings.style.display = alarmCheckbox.checked ? 'block' : 'none';
    }
}

// Toggle alarm settings (alternative name)
function toggleAlarmSettings() {
    toggleAlarm();
}

// Specific dates management (Date Range Picker System)
let selectedSpecificDates = [];

// Handle "From Date" change
function handleFromDateChange() {
    const fromDateInput = document.getElementById('schedule-date-from');
    const toDateInput = document.getElementById('schedule-date-to');

    if (!fromDateInput || !fromDateInput.value) return;

    // Set minimum date for "To Date" to be the same as "From Date"
    if (toDateInput) {
        toDateInput.min = fromDateInput.value;

        // If To Date is already set and is before From Date, clear it
        if (toDateInput.value && toDateInput.value < fromDateInput.value) {
            toDateInput.value = '';
        }
    }
}

// Handle "To Date" change
function handleToDateChange() {
    const fromDateInput = document.getElementById('schedule-date-from');
    const toDateInput = document.getElementById('schedule-date-to');

    if (!toDateInput || !toDateInput.value) return;

    // Ensure To Date is not before From Date
    if (fromDateInput && fromDateInput.value && toDateInput.value < fromDateInput.value) {
        alert('End date cannot be before start date');
        toDateInput.value = '';
    }
}

// Add another date or date range
function addAnotherDateRange() {
    const fromDateInput = document.getElementById('schedule-date-from');
    const toDateInput = document.getElementById('schedule-date-to');

    if (!fromDateInput || !fromDateInput.value) {
        alert('Please select a "From Date" first');
        return;
    }

    const fromDate = fromDateInput.value;
    const toDate = toDateInput.value;

    // Check if it's a single date or date range
    if (!toDate || toDate === fromDate) {
        // Single date
        if (selectedSpecificDates.some(d => d.type === 'single' && d.date === fromDate)) {
            alert('This date is already added');
            return;
        }

        selectedSpecificDates.push({
            type: 'single',
            date: fromDate
        });
    } else {
        // Date range
        // Check for overlapping ranges
        const overlaps = selectedSpecificDates.some(d => {
            if (d.type === 'range') {
                return (fromDate <= d.toDate && toDate >= d.fromDate);
            } else {
                return (d.date >= fromDate && d.date <= toDate);
            }
        });

        if (overlaps) {
            alert('This date range overlaps with an existing date or range');
            return;
        }

        selectedSpecificDates.push({
            type: 'range',
            fromDate: fromDate,
            toDate: toDate
        });
    }

    // Clear inputs
    fromDateInput.value = '';
    toDateInput.value = '';
    toDateInput.min = '';

    // Update display
    displaySelectedDates();
}

// Display selected dates
function displaySelectedDates() {
    const container = document.getElementById('selected-dates-list');
    if (!container) return;

    if (selectedSpecificDates.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); font-style: italic; padding: 12px; background: var(--bg-secondary); border-radius: 6px; text-align: center;">No dates selected yet. Choose a date above and click "Add Another Date/Range".</p>';
        return;
    }

    container.innerHTML = selectedSpecificDates.map((item, index) => {
        if (item.type === 'single') {
            return `
                <div class="selected-date-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-secondary); border-left: 3px solid var(--primary-color); border-radius: 6px; margin-bottom: 8px;">
                    <span style="font-weight: 500;">
                        <i class="fas fa-calendar-day" style="color: var(--primary-color); margin-right: 10px;"></i>
                        ${item.date}
                    </span>
                    <button type="button" onclick="removeSpecificDate(${index})" class="btn-icon-danger" style="padding: 6px 10px; font-size: 0.875rem; border-radius: 4px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        } else {
            return `
                <div class="selected-date-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-secondary); border-left: 3px solid var(--success-color); border-radius: 6px; margin-bottom: 8px;">
                    <span style="font-weight: 500;">
                        <i class="fas fa-calendar-week" style="color: var(--success-color); margin-right: 10px;"></i>
                        ${item.fromDate} <i class="fas fa-arrow-right" style="font-size: 0.75rem; margin: 0 6px;"></i> ${item.toDate}
                    </span>
                    <button type="button" onclick="removeSpecificDate(${index})" class="btn-icon-danger" style="padding: 6px 10px; font-size: 0.875rem; border-radius: 4px;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }
    }).join('');
}

// Remove specific date by index
function removeSpecificDate(index) {
    selectedSpecificDates.splice(index, 1);
    displaySelectedDates();
}

// Convert date range objects to flat array of date strings
function convertDateRangesToFlatArray(dateRanges) {
    const flatDates = [];

    if (!dateRanges || dateRanges.length === 0) {
        return flatDates;
    }

    for (const item of dateRanges) {
        if (item.type === 'single') {
            // Add single date
            flatDates.push(item.date);
        } else if (item.type === 'range') {
            // Generate all dates between fromDate and toDate
            const start = new Date(item.fromDate);
            const end = new Date(item.toDate);

            let current = new Date(start);
            while (current <= end) {
                const dateStr = current.toISOString().split('T')[0];
                flatDates.push(dateStr);
                current.setDate(current.getDate() + 1);
            }
        }
    }

    // Remove duplicates and sort
    return [...new Set(flatDates)].sort();
}

// Filter schedules by priority level (for the filter buttons in the panel)
function filterSchedules(priority) {
    if (!allSchedules || allSchedules.length === 0) {
        console.log('No schedules to filter');
        return;
    }

    if (priority === 'all') {
        renderSchedules(allSchedules);
        return;
    }

    // Map priority names to match backend database values
    // Backend uses: 'low', 'medium', 'high', 'important', 'urgent'
    const priorityMap = {
        'urgent': 'urgent',      // Slider 5
        'high': 'important',     // Slider 4 (but UI shows as "high")
        'medium': 'high',        // Slider 3 (but UI shows as "medium")
        'low': 'low'            // Slider 1
    };

    const filterValue = priorityMap[priority] || priority;
    const filtered = allSchedules.filter(schedule => schedule.priority_level === filterValue);

    console.log(`Filtering by priority: ${priority} (${filterValue}), found ${filtered.length} schedules`);
    renderSchedules(filtered);
}

// Search schedules
function searchSchedules(searchValue) {
    if (!searchValue || searchValue.trim() === '') {
        // Show all schedules
        renderSchedules(allSchedules);
        return;
    }

    const searchLower = searchValue.toLowerCase().trim();
    const filtered = allSchedules.filter(schedule => {
        return schedule.title?.toLowerCase().includes(searchLower) ||
               schedule.description?.toLowerCase().includes(searchLower) ||
               schedule.priority_level?.toLowerCase().includes(searchLower) ||
               schedule.scheduler_role?.toLowerCase().includes(searchLower);
    });

    renderSchedules(filtered);
}

// Listen for panel switch events
window.addEventListener('panelSwitch', (event) => {
    const panelName = event.detail?.panelName;
    console.log(`[Schedule Manager] Panel switched to: ${panelName}`);

    // Load schedules when schedule panel becomes active
    if (panelName === 'schedule') {
        console.log('[Schedule Manager] Schedule panel activated, loading schedules...');
        loadSchedules(currentRoleFilter || 'all');
    }
});

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Parent Schedule Manager loaded');
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

// Export function to window for global access
window.filterSchedulesByRole = filterSchedulesByRole;

console.log('Parent Schedule Manager script loaded successfully');
