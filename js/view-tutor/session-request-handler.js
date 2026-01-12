/**
 * Session Request Handler for View Tutor Page
 * Helper functions for session requests from students/parents
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

// Close modal with ESC key
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const detailsModal = document.getElementById('packageDetailsModal');

        // Package details modal close is handled by view-tutor-db-loader.js
        if (detailsModal && !detailsModal.classList.contains('hidden') && typeof window.closePackageDetailsModal === 'function') {
            window.closePackageDetailsModal();
        }
    }
});

/**
 * Toggle schedule fields based on schedule type selection
 * Used by package details modal
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
// prefillPackageModalUserInfo, closePackageDetailsModal, submitPackageRequest) are
// handled by view-tutor-db-loader.js which includes parent/child selection functionality.
