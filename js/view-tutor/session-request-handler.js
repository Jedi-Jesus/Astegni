/**
 * Session Request Handler for View Tutor Page
 * Handles session requests from students/parents
 */

// Note: API_BASE_URL is already defined in view-tutor-db-loader.js (loaded first)
// We reuse that global constant here

let currentTutorId = null;
let currentPackageData = null;

// Get tutor ID from URL on page load
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentTutorId = urlParams.get('id');
});

/**
 * Open the request session modal
 * @param {string} packageName - Pre-select this package
 */
function openRequestModal(packageName = '') {
    const modal = document.getElementById('requestSessionModal');
    if (!modal) {
        console.error('Request modal not found');
        return;
    }

    // Check if user is logged in
    const token = localStorage.getItem('token');
    console.log('[DEBUG] openRequestModal - Token exists:', !!token);
    if (!token) {
        alert('⚠️ Please log in to request a session.\n\nYou need to be logged in as a student or parent to request tutoring sessions.');
        return;
    }

    // Check if user is a student or parent
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    // Support both roles array and single role/active_role fields
    const userRoles = user.roles || [];
    const activeRole = user.active_role || user.role || '';

    // Check if user is student or parent (check both roles array and active role)
    const isStudent = userRoles.includes('student') || activeRole === 'student';
    const isParent = userRoles.includes('parent') || activeRole === 'parent';

    console.log('[DEBUG] openRequestModal - User object:', user);
    console.log('[DEBUG] openRequestModal - User roles array:', userRoles);
    console.log('[DEBUG] openRequestModal - Active role:', activeRole);
    console.log('[DEBUG] openRequestModal - Is student?', isStudent);
    console.log('[DEBUG] openRequestModal - Is parent?', isParent);

    if (!isStudent && !isParent) {
        console.error('[DEBUG] openRequestModal - ROLE CHECK FAILED!');
        console.error('[DEBUG] User data:', JSON.stringify(user, null, 2));
        alert('⚠️ Only students and parents can request tutoring sessions.\n\nPlease switch to your student or parent role to continue.');
        return;
    }

    console.log('[DEBUG] openRequestModal - Role check PASSED! Opening modal...');

    // Pre-fill user info if available
    prefillUserInfo();

    // Pre-select package if provided
    if (packageName) {
        const packageSelect = document.getElementById('packageSelect');
        if (packageSelect) {
            packageSelect.value = packageName;
        }
    }

    // Show modal
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

/**
 * Close the request session modal
 */
function closeRequestModal() {
    const modal = document.getElementById('requestSessionModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }

    // Reset form
    const form = document.getElementById('sessionRequestForm');
    if (form) {
        form.reset();
    }
}

/**
 * Pre-fill form with user information
 */
function prefillUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

        // Pre-fill student name if user is a student
        const studentNameInput = document.getElementById('studentName');
        if (studentNameInput && user.first_name) {
            const userRoles = user.roles || [];
            const activeRole = user.active_role || user.role || '';
            const isStudent = userRoles.includes('student') || activeRole === 'student';

            if (isStudent) {
                studentNameInput.value = user.name || `${user.first_name} ${user.father_name}`;
            }
        }

        // Pre-fill contact info if available
        const contactEmail = document.getElementById('contactEmail');
        if (contactEmail && user.email) {
            contactEmail.value = user.email;
        }

        const contactPhone = document.getElementById('contactPhone');
        if (contactPhone && user.phone) {
            contactPhone.value = user.phone;
        }
    } catch (error) {
        console.error('Error pre-filling user info:', error);
    }
}

/**
 * Submit the session request
 * @param {Event} event - Form submit event
 */
async function submitSessionRequest(event) {
    event.preventDefault();

    if (!currentTutorId) {
        alert('❌ Error: Tutor ID not found.');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert('❌ You must be logged in to request a session.');
        closeRequestModal();
        return;
    }

    // Get form data
    const packageSelect = document.getElementById('packageSelect');
    const packageId = packageSelect ? packageSelect.dataset.packageId : null;
    const preferredSchedule = document.getElementById('preferredSchedule').value;
    const message = document.getElementById('requestMessage').value;

    // Prepare request data (simplified - student info fetched from profile on backend)
    const requestData = {
        tutor_id: parseInt(currentTutorId),
        package_id: packageId ? parseInt(packageId) : null,
        preferred_schedule: preferredSchedule || null,
        message: message || null
    };

    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/session-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to send session request');
        }

        const result = await response.json();

        // Show success message
        alert('✅ Session request sent successfully!\n\nThe tutor will review your request and respond soon. You can check the status in your profile.');

        // Close modal and reset form
        closeRequestModal();

    } catch (error) {
        console.error('Error submitting session request:', error);
        alert(`❌ Failed to send session request:\n\n${error.message}\n\nPlease try again.`);

        // Restore button
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    const modal = document.getElementById('requestSessionModal');
    if (event.target === modal) {
        closeRequestModal();
    }
});

// Close modal with ESC key
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const requestModal = document.getElementById('requestSessionModal');
        const detailsModal = document.getElementById('packageDetailsModal');

        if (requestModal && !requestModal.classList.contains('hidden')) {
            closeRequestModal();
        }
        if (detailsModal && !detailsModal.classList.contains('hidden')) {
            closePackageDetailsModal();
        }
    }
});

// ============================================
// PACKAGE DETAILS MODAL
// ============================================

/**
 * Open package details modal
 * @param {number} packageId - Package ID
 * @param {string} packageName - Package name
 */
async function openPackageDetailsModal(packageId, packageName) {
    const modal = document.getElementById('packageDetailsModal');
    if (!modal) {
        console.error('Package details modal not found');
        return;
    }

    // Check if user is logged in
    const token = localStorage.getItem('token');
    console.log('[DEBUG] openPackageDetailsModal - Token exists:', !!token);
    if (!token) {
        alert('⚠️ Please log in to request a session.\n\nYou need to be logged in as a student or parent to request tutoring sessions.');
        return;
    }

    // Check if user is a student or parent
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    // Support both roles array and single role/active_role fields
    const userRoles = user.roles || [];
    const activeRole = user.active_role || user.role || '';

    // Check if user is student or parent (check both roles array and active role)
    const isStudent = userRoles.includes('student') || activeRole === 'student';
    const isParent = userRoles.includes('parent') || activeRole === 'parent';

    console.log('[DEBUG] openPackageDetailsModal - User object:', user);
    console.log('[DEBUG] openPackageDetailsModal - User roles array:', userRoles);
    console.log('[DEBUG] openPackageDetailsModal - Active role:', activeRole);
    console.log('[DEBUG] openPackageDetailsModal - Is student?', isStudent);
    console.log('[DEBUG] openPackageDetailsModal - Is parent?', isParent);

    if (!isStudent && !isParent) {
        console.error('[DEBUG] openPackageDetailsModal - ROLE CHECK FAILED!');
        console.error('[DEBUG] User data:', JSON.stringify(user, null, 2));
        alert('⚠️ Only students and parents can view and request packages.\n\nPlease switch to your student or parent role to continue.');
        return;
    }

    console.log('[DEBUG] openPackageDetailsModal - Role check PASSED! Loading package...');

    try {
        // Fetch package details from API
        const response = await fetch(`${API_BASE_URL}/api/view-tutor/${currentTutorId}/packages`);
        if (!response.ok) throw new Error('Failed to fetch package details');

        const data = await response.json();
        const packageData = data.packages.find(pkg => pkg.id === packageId);

        if (!packageData) {
            throw new Error('Package not found');
        }

        // Store current package data
        currentPackageData = packageData;

        // Populate package details
        populatePackageDetails(packageData);

        // Pre-fill user info
        prefillPackageModalUserInfo();

        // Show modal
        modal.style.display = 'flex';
        modal.classList.remove('hidden');

    } catch (error) {
        console.error('Error loading package details:', error);
        alert('❌ Failed to load package details. Please try again.');
    }
}

/**
 * Populate package details in the modal
 * @param {Object} pkg - Package data
 */
function populatePackageDetails(pkg) {
    const detailsContent = document.getElementById('packageDetailsContent');
    if (!detailsContent) return;

    // Build features list
    const features = [];

    // Courses
    if (pkg.courses) {
        const coursesText = typeof pkg.courses === 'string'
            ? pkg.courses
            : (Array.isArray(pkg.courses) ? pkg.courses.join(', ') : '');
        if (coursesText) {
            features.push(`<strong>📚 Subjects:</strong> ${coursesText}`);
        }
    }

    // Duration
    if (pkg.duration_minutes || pkg.hours_per_day) {
        const hours = pkg.hours_per_day || Math.floor(pkg.duration_minutes / 60);
        const mins = pkg.duration_minutes ? pkg.duration_minutes % 60 : 0;
        const durationText = hours > 0
            ? `${hours} hour${hours > 1 ? 's' : ''}${mins > 0 ? ` ${mins} min` : ''}`
            : `${mins} minutes`;
        features.push(`<strong>⏱️ Duration:</strong> ${durationText} per session`);
    }

    // Schedule
    if (pkg.schedule_type || pkg.recurring_days || pkg.start_time) {
        let scheduleText = '';
        if (pkg.schedule_type === 'recurring') {
            const days = pkg.recurring_days && pkg.recurring_days.length > 0
                ? pkg.recurring_days.join(', ')
                : `${pkg.days_per_week || 0} days/week`;
            scheduleText = days;
            if (pkg.start_time && pkg.end_time) {
                scheduleText += ` (${pkg.start_time.substring(0, 5)} - ${pkg.end_time.substring(0, 5)})`;
            }
        } else if (pkg.schedule_type === 'flexible') {
            scheduleText = 'Flexible';
        } else if (pkg.days_per_week) {
            scheduleText = `${pkg.days_per_week} days/week`;
        }
        if (scheduleText) {
            features.push(`<strong>📅 Schedule:</strong> ${scheduleText}`);
        }
    }

    // Total sessions
    if (pkg.total_sessions) {
        features.push(`<strong>📊 Total Sessions:</strong> ${pkg.total_sessions} sessions/month`);
    }

    // Session format
    if (pkg.session_format) {
        const formatText = pkg.session_format.toLowerCase() === 'both'
            ? 'Online & In-person'
            : pkg.session_format.charAt(0).toUpperCase() + pkg.session_format.slice(1);
        features.push(`<strong>🌐 Format:</strong> ${formatText}`);
    }

    // Grade level
    if (pkg.grade_level) {
        features.push(`<strong>🎓 Grade Level:</strong> ${pkg.grade_level}`);
    }

    // Payment frequency
    if (pkg.payment_frequency) {
        const paymentText = pkg.payment_frequency === '2-weeks'
            ? 'Bi-weekly'
            : pkg.payment_frequency.charAt(0).toUpperCase() + pkg.payment_frequency.slice(1);
        features.push(`<strong>💳 Payment:</strong> ${paymentText}`);
    }

    const price = pkg.session_price || pkg.package_price || 0;

    detailsContent.innerHTML = `
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 20px; border-radius: 12px; color: white; margin-bottom: 20px;">
            <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">${pkg.name}</h3>
            <p style="font-size: 2rem; font-weight: 800; margin: 12px 0;">ETB ${Math.round(price)}<span style="font-size: 1rem; font-weight: 400; opacity: 0.9;">/session</span></p>
            ${pkg.description ? `<p style="font-size: 0.95rem; opacity: 0.95; margin-top: 12px;">${pkg.description}</p>` : ''}
        </div>

        ${features.length > 0 ? `
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 12px; color: #374151;">📋 Package Includes:</h4>
                <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;">
                    ${features.map(f => `<li style="font-size: 0.9rem; color: #4b5563;">${f}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        ${pkg.discount_1_month || pkg.discount_6_month || pkg.discount_12_month ? `
            <div style="margin-top: 16px; background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                <h4 style="font-size: 1rem; font-weight: 600; margin-bottom: 12px; color: #92400e;">🎁 Available Discounts:</h4>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${pkg.discount_1_month ? `<span style="background: #10b981; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.875rem; font-weight: 600;">${pkg.discount_1_month}% OFF - 1 Month</span>` : ''}
                    ${pkg.discount_6_month ? `<span style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.875rem; font-weight: 600;">${pkg.discount_6_month}% OFF - 6 Months</span>` : ''}
                    ${pkg.discount_12_month ? `<span style="background: #8b5cf6; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.875rem; font-weight: 600;">${pkg.discount_12_month}% OFF - 1 Year</span>` : ''}
                </div>
            </div>
        ` : ''}
    `;
}

/**
 * Pre-fill user information in package modal
 */
function prefillPackageModalUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

        // Pre-fill student name if user is a student
        const studentNameInput = document.getElementById('detailsStudentName');
        if (studentNameInput && user.first_name) {
            const userRoles = user.roles || [];
            const activeRole = user.active_role || user.role || '';
            const isStudent = userRoles.includes('student') || activeRole === 'student';

            if (isStudent) {
                studentNameInput.value = user.name || `${user.first_name} ${user.father_name}`;
            }
        }

        // Pre-fill contact info
        const contactEmail = document.getElementById('detailsContactEmail');
        if (contactEmail && user.email) {
            contactEmail.value = user.email;
        }

        const contactPhone = document.getElementById('detailsContactPhone');
        if (contactPhone && user.phone) {
            contactPhone.value = user.phone;
        }
    } catch (error) {
        console.error('Error pre-filling user info:', error);
    }
}

/**
 * Close package details modal
 */
function closePackageDetailsModal() {
    const modal = document.getElementById('packageDetailsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }

    // Reset customization fields
    document.getElementById('customPrice').value = '';
    document.getElementById('customSessionsPerWeek').value = '';
    document.getElementById('customDuration').value = '';
    document.getElementById('customDays').value = '';
    document.getElementById('customNotes').value = '';
    document.getElementById('detailsStudentName').value = '';
    document.getElementById('detailsGradeLevel').value = '';
    document.getElementById('detailsContactPhone').value = '';
    document.getElementById('detailsContactEmail').value = '';
    document.getElementById('detailsMessage').value = '';

    // Reset schedule preference fields
    const scheduleType = document.getElementById('scheduleType');
    if (scheduleType) scheduleType.value = '';

    const startTime = document.getElementById('startTime');
    if (startTime) startTime.value = '09:00';

    const endTime = document.getElementById('endTime');
    if (endTime) endTime.value = '17:00';

    const specificDates = document.getElementById('specificDates');
    if (specificDates) specificDates.value = '';

    // Reset all year checkboxes
    document.querySelectorAll('input[name="yearRange"]').forEach(cb => {
        cb.checked = cb.value === '2025'; // Default to 2025 checked
    });

    // Reset all month checkboxes
    document.querySelectorAll('input[name="months"]').forEach(cb => {
        cb.checked = false;
    });

    // Reset all day checkboxes
    document.querySelectorAll('input[name="days"]').forEach(cb => {
        cb.checked = false;
    });

    // Hide schedule fields
    const recurringFields = document.getElementById('recurringScheduleFields');
    if (recurringFields) recurringFields.style.display = 'none';

    const specificDatesField = document.getElementById('specificDatesField');
    if (specificDatesField) specificDatesField.style.display = 'none';

    currentPackageData = null;
}

/**
 * Toggle schedule fields based on schedule type selection
 */
function toggleScheduleFields() {
    const scheduleType = document.getElementById('scheduleType')?.value;
    const recurringFields = document.getElementById('recurringScheduleFields');
    const specificDatesField = document.getElementById('specificDatesField');

    if (scheduleType === 'recurring') {
        if (recurringFields) recurringFields.style.display = 'block';
        if (specificDatesField) specificDatesField.style.display = 'none';
    } else if (scheduleType === 'specific_dates') {
        if (recurringFields) recurringFields.style.display = 'none';
        if (specificDatesField) specificDatesField.style.display = 'block';
    } else {
        if (recurringFields) recurringFields.style.display = 'none';
        if (specificDatesField) specificDatesField.style.display = 'none';
    }
}

/**
 * Submit package request with customizations
 */
async function submitPackageRequest() {
    if (!currentTutorId || !currentPackageData) {
        alert('❌ Error: Missing package or tutor information.');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert('❌ You must be logged in to request a session.');
        closePackageDetailsModal();
        return;
    }

    // Get message
    const message = document.getElementById('detailsMessage')?.value.trim() || '';

    // Get schedule data
    const scheduleType = document.getElementById('scheduleType')?.value || null;
    const startTime = document.getElementById('startTime')?.value || null;
    const endTime = document.getElementById('endTime')?.value || null;

    // Get selected years
    const yearCheckboxes = document.querySelectorAll('input[name="yearRange"]:checked');
    const yearRange = yearCheckboxes.length > 0 ? Array.from(yearCheckboxes).map(cb => parseInt(cb.value)) : null;

    // Get selected months
    const monthCheckboxes = document.querySelectorAll('input[name="months"]:checked');
    const months = monthCheckboxes.length > 0 ? Array.from(monthCheckboxes).map(cb => cb.value) : null;

    // Get selected days
    const dayCheckboxes = document.querySelectorAll('input[name="days"]:checked');
    const days = dayCheckboxes.length > 0 ? Array.from(dayCheckboxes).map(cb => cb.value) : null;

    // Get specific dates
    const specificDatesInput = document.getElementById('specificDates')?.value.trim() || '';
    const specificDates = specificDatesInput ? specificDatesInput.split(',').map(d => d.trim()).filter(d => d) : null;

    // Prepare request data
    const requestData = {
        tutor_id: parseInt(currentTutorId),
        package_id: currentPackageData.id,
        message: message || null,
        schedule_type: scheduleType,
        year_range: yearRange,
        months: months,
        days: days,
        specific_dates: specificDates,
        start_time: startTime,
        end_time: endTime
    };

    // Show loading state
    const submitButton = document.getElementById('submitPackageBtn');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/session-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to send session request');
        }

        const result = await response.json();

        // Show success message
        const hasSchedule = scheduleType && (yearRange || months || days || specificDates);
        alert(`✅ Session request sent successfully!${hasSchedule ? '\n\n📅 Your schedule preferences have been included.' : ''}\n\nThe tutor will review your request and respond soon. You can check the status in your profile.`);

        // Close modal
        closePackageDetailsModal();

    } catch (error) {
        console.error('Error submitting session request:', error);
        alert(`❌ Failed to send session request:\n\n${error.message}\n\nPlease try again.`);

        // Restore button
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}
