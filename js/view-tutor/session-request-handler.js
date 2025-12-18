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
        // Package details modal close is handled by view-tutor-db-loader.js
        if (detailsModal && !detailsModal.classList.contains('hidden') && typeof window.closePackageDetailsModal === 'function') {
            window.closePackageDetailsModal();
        }
    }
});

/**
 * Toggle schedule fields based on schedule type selection
 * Used by both request modal and package details modal
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

// NOTE: Package Details Modal functions (openPackageDetailsModal, populatePackageDetails,
// prefillPackageModalUserInfo, closePackageDetailsModal, submitPackageRequest) are now
// handled by view-tutor-db-loader.js which includes parent/child selection functionality.
