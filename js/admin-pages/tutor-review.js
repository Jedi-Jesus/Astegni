/**
 * Tutor Review Modal Functions
 * Handles the review, approval, and rejection of tutor applications
 */

// Use window object to avoid duplicate declaration errors
window.API_BASE_URL = window.API_BASE_URL || 'https://api.astegni.com';

let currentReviewTutorId = null;
let currentSourcePanel = null; // Track which panel opened the modal

/**
 * Open the review modal and load tutor details
 * @param {number} tutorId - The ID of the tutor to review
 * @param {string} sourcePanel - The panel from which the modal was opened (requested, verified, rejected, suspended)
 */
async function reviewTutorRequest(tutorId, sourcePanel = 'requested') {
    currentReviewTutorId = tutorId;
    currentSourcePanel = sourcePanel;

    // Show the modal
    const modal = document.getElementById('tutor-review-modal');
    modal.classList.remove('hidden');

    // Reset the modal state
    resetReviewModal();

    // Load tutor details
    await loadTutorReviewDetails(tutorId);

    // Render appropriate buttons based on source panel
    renderModalButtons(sourcePanel);
}

/**
 * Load detailed tutor information for review
 * @param {number} tutorId - The ID of the tutor
 */
async function loadTutorReviewDetails(tutorId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            showNotification('Please log in to access this feature', 'error');
            closeTutorReviewModal();
            // Redirect to login after a short delay
            setTimeout(() => {
                window.location.href = '../test-admin-login.html';
            }, 2000);
            return;
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/tutor/${tutorId}/review`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            console.error('Authentication failed - token may be invalid or expired');
            showNotification('Your session has expired. Please log in again.', 'error');
            closeTutorReviewModal();
            // Clear invalid token and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('adminAuth');
            localStorage.removeItem('adminUser');
            setTimeout(() => {
                window.location.href = '../test-admin-login.html';
            }, 2000);
            return;
        }

        if (response.status === 403) {
            console.error('Access denied - admin role required');
            showNotification('You do not have permission to access this feature', 'error');
            closeTutorReviewModal();
            return;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Failed to load tutor details: ${response.status}`);
        }

        const tutor = await response.json();

        // Populate modal with tutor data
        populateReviewModal(tutor);

    } catch (error) {
        console.error('Error loading tutor details:', error);
        showNotification('Failed to load tutor details: ' + error.message, 'error');
        closeTutorReviewModal();
    }
}

/**
 * Populate the review modal with tutor data
 * @param {object} tutor - Tutor data from API
 */
function populateReviewModal(tutor) {
    // Basic info
    document.getElementById('review-tutor-name').textContent = tutor.name || 'Unknown';
    document.getElementById('review-tutor-teaches-at').querySelector('span').textContent =
        tutor.teaches_at || 'Not specified';
    document.getElementById('review-tutor-location').querySelector('span').textContent =
        tutor.location || 'Not specified';

    // Profile picture
    const profilePic = document.getElementById('review-profile-picture');
    if (tutor.profile_picture) {
        profilePic.src = tutor.profile_picture;
    } else {
        profilePic.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='16'%3ENo Photo%3C/text%3E%3C/svg%3E";
    }

    // ID Document
    const idDocument = document.getElementById('review-id-document');
    const idDocContainer = document.getElementById('review-id-document-container');
    if (tutor.id_document_url) {
        idDocument.src = tutor.id_document_url;
        idDocContainer.classList.remove('hidden');
    } else {
        idDocContainer.innerHTML = '<p class="text-center text-gray-500 py-8"><i class="fas fa-exclamation-triangle mr-2"></i>No ID document uploaded</p>';
    }

    // Contact info
    document.getElementById('review-tutor-email').textContent = tutor.email || 'Not provided';
    document.getElementById('review-tutor-phone').textContent = tutor.phone || 'Not provided';

    // Professional info
    document.getElementById('review-tutor-experience').textContent =
        tutor.experience ? `${tutor.experience} years` : 'Not specified';
    document.getElementById('review-tutor-education').textContent =
        tutor.education_level || 'Not specified';

    // Courses/Subjects
    const coursesText = Array.isArray(tutor.courses) && tutor.courses.length > 0
        ? tutor.courses.join(', ')
        : 'Not specified';
    document.getElementById('review-tutor-courses').textContent = coursesText;

    // Languages
    const languagesText = Array.isArray(tutor.languages) && tutor.languages.length > 0
        ? tutor.languages.join(', ')
        : 'Not specified';
    document.getElementById('review-tutor-languages').textContent = languagesText;

    // Bio
    document.getElementById('review-tutor-bio').textContent = tutor.bio || 'No bio provided';
}

/**
 * Render modal buttons based on the source panel
 * @param {string} sourcePanel - The panel from which the modal was opened
 */
function renderModalButtons(sourcePanel) {
    const footer = document.querySelector('#tutor-review-modal .modal-footer');
    if (!footer) return;

    // Clear existing buttons except cancel
    footer.innerHTML = `
        <button class="btn-secondary flex-1 px-4 py-3 border-2 rounded-lg hover:bg-gray-100 transition-colors"
            onclick="closeTutorReviewModal()">
            <i class="fas fa-times mr-2"></i>Cancel
        </button>
    `;

    // Add buttons based on source panel
    switch (sourcePanel) {
        case 'requested':
            // Approve and Reject buttons
            footer.innerHTML += `
                <button id="reject-tutor-btn"
                    class="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
                    onclick="showRejectReason()">
                    <i class="fas fa-times-circle mr-2"></i>Reject
                </button>
                <button id="confirm-reject-btn"
                    class="hidden flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    onclick="confirmRejectTutor()">
                    <i class="fas fa-exclamation-triangle mr-2"></i>Confirm Rejection
                </button>
                <button id="approve-tutor-btn"
                    class="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
                    onclick="approveTutor()">
                    <i class="fas fa-check-circle mr-2"></i>Approve
                </button>
            `;
            break;

        case 'verified':
            // Suspend and Reject buttons
            footer.innerHTML += `
                <button id="reject-tutor-btn"
                    class="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
                    onclick="showRejectReason()">
                    <i class="fas fa-times-circle mr-2"></i>Reject
                </button>
                <button id="confirm-reject-btn"
                    class="hidden flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    onclick="confirmRejectTutor()">
                    <i class="fas fa-exclamation-triangle mr-2"></i>Confirm Rejection
                </button>
                <button id="suspend-tutor-btn"
                    class="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold"
                    onclick="showSuspendReason()">
                    <i class="fas fa-ban mr-2"></i>Suspend
                </button>
                <button id="confirm-suspend-btn"
                    class="hidden flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                    onclick="confirmSuspendTutor()">
                    <i class="fas fa-exclamation-triangle mr-2"></i>Confirm Suspension
                </button>
            `;
            break;

        case 'rejected':
            // Reconsider button only
            footer.innerHTML += `
                <button id="reconsider-tutor-btn"
                    class="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                    onclick="reconsiderTutorFromModal()">
                    <i class="fas fa-undo mr-2"></i>Reconsider
                </button>
            `;
            break;

        case 'suspended':
            // Reinstate and Reject buttons
            footer.innerHTML += `
                <button id="reject-tutor-btn"
                    class="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
                    onclick="showRejectReason()">
                    <i class="fas fa-times-circle mr-2"></i>Reject
                </button>
                <button id="confirm-reject-btn"
                    class="hidden flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    onclick="confirmRejectTutor()">
                    <i class="fas fa-exclamation-triangle mr-2"></i>Confirm Rejection
                </button>
                <button id="reinstate-tutor-btn"
                    class="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold"
                    onclick="reinstateTutorFromModal()">
                    <i class="fas fa-check-circle mr-2"></i>Reinstate
                </button>
            `;
            break;
    }
}

/**
 * Close the review modal
 */
function closeTutorReviewModal() {
    const modal = document.getElementById('tutor-review-modal');
    modal.classList.add('hidden');
    currentReviewTutorId = null;
    currentSourcePanel = null;
    resetReviewModal();
}

/**
 * Reset the review modal to initial state
 */
function resetReviewModal() {
    // Hide rejection reason section
    const rejectionSection = document.getElementById('rejection-reason-section');
    if (rejectionSection) {
        rejectionSection.classList.add('hidden');
    }

    const rejectionInput = document.getElementById('rejection-reason-input');
    if (rejectionInput) {
        rejectionInput.value = '';
    }

    // Hide suspension reason section (will be created dynamically if needed)
    const suspensionSection = document.getElementById('suspension-reason-section');
    if (suspensionSection) {
        suspensionSection.classList.add('hidden');
    }
}

/**
 * Show the rejection reason input
 */
function showRejectReason() {
    // Show rejection reason textarea
    document.getElementById('rejection-reason-section').classList.remove('hidden');

    // Swap buttons
    document.getElementById('reject-tutor-btn').classList.add('hidden');
    document.getElementById('confirm-reject-btn').classList.remove('hidden');

    // Focus on textarea
    document.getElementById('rejection-reason-input').focus();
}

/**
 * Approve the tutor
 * @param {number} tutorId - Optional tutor ID. If not provided, uses currentReviewTutorId
 */
async function approveTutor(tutorId = null) {
    // Use provided tutorId or fall back to currentReviewTutorId
    const targetTutorId = tutorId || currentReviewTutorId;

    if (!targetTutorId) {
        showNotification('No tutor selected', 'error');
        return;
    }

    // Confirm action
    if (!confirm('Are you sure you want to approve this tutor?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/tutor/${targetTutorId}/verify`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Approval failed: ${response.status}`);
        }

        const result = await response.json();

        showNotification('Tutor approved successfully!', 'success');
        closeTutorReviewModal();

        // Reload both requested and verified panels, plus update stats
        if (typeof window.loadPendingTutors === 'function') {
            window.loadPendingTutors();
        }
        if (typeof window.loadVerifiedTutors === 'function') {
            window.loadVerifiedTutors();
        }
        if (typeof window.loadDashboardStats === 'function') {
            window.loadDashboardStats();
        }

        // Fallback to page reload if functions don't exist
        if (typeof window.loadPendingTutors !== 'function' &&
            typeof window.loadVerifiedTutors !== 'function') {
            setTimeout(() => location.reload(), 1500);
        }

    } catch (error) {
        console.error('Error approving tutor:', error);
        showNotification('Failed to approve tutor: ' + error.message, 'error');
    }
}

/**
 * Confirm and submit tutor rejection
 */
async function confirmRejectTutor() {
    if (!currentReviewTutorId) {
        showNotification('No tutor selected', 'error');
        return;
    }

    const rejectionReason = document.getElementById('rejection-reason-input').value.trim();

    if (!rejectionReason) {
        showNotification('Please provide a reason for rejection', 'error');
        document.getElementById('rejection-reason-input').focus();
        return;
    }

    // Confirm action
    if (!confirm('Are you sure you want to reject this tutor application?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/tutor/${currentReviewTutorId}/reject`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reason: rejectionReason
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Rejection failed: ${response.status}`);
        }

        const result = await response.json();

        showNotification('Tutor application rejected', 'info');
        closeTutorReviewModal();

        // Reload source panel and rejected panel, plus update stats
        if (currentSourcePanel === 'requested' && typeof window.loadPendingTutors === 'function') {
            window.loadPendingTutors();
        } else if (currentSourcePanel === 'verified' && typeof window.loadVerifiedTutors === 'function') {
            window.loadVerifiedTutors();
        } else if (currentSourcePanel === 'suspended' && typeof window.loadSuspendedTutors === 'function') {
            window.loadSuspendedTutors();
        }

        // Always reload rejected panel (destination)
        if (typeof window.loadRejectedTutors === 'function') {
            window.loadRejectedTutors();
        }

        // Update dashboard stats
        if (typeof window.loadDashboardStats === 'function') {
            window.loadDashboardStats();
        }

        // Fallback to page reload if no functions exist
        if (!currentSourcePanel || (
            typeof window.loadPendingTutors !== 'function' &&
            typeof window.loadVerifiedTutors !== 'function' &&
            typeof window.loadSuspendedTutors !== 'function' &&
            typeof window.loadRejectedTutors !== 'function'
        )) {
            setTimeout(() => location.reload(), 1500);
        }

    } catch (error) {
        console.error('Error rejecting tutor:', error);
        showNotification('Failed to reject tutor: ' + error.message, 'error');
    }
}

/**
 * Show the suspension reason input
 */
function showSuspendReason() {
    // Get or create suspension reason section
    let suspensionSection = document.getElementById('suspension-reason-section');

    if (!suspensionSection) {
        // Create suspension reason section dynamically
        const modalBody = document.querySelector('#tutor-review-modal .modal-body');
        const rejectionSection = document.getElementById('rejection-reason-section');

        suspensionSection = document.createElement('div');
        suspensionSection.id = 'suspension-reason-section';
        suspensionSection.className = 'hidden mb-6';
        suspensionSection.innerHTML = `
            <label class="block text-sm font-semibold mb-2 text-orange-600">
                <i class="fas fa-exclamation-triangle mr-2"></i>
                Suspension Reason *
            </label>
            <textarea id="suspension-reason-input" rows="4"
                class="w-full px-3 py-2 border-2 border-orange-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Please provide a detailed reason for suspending this tutor..."></textarea>
        `;

        // Insert before the rejection section or at the end
        if (rejectionSection) {
            rejectionSection.parentNode.insertBefore(suspensionSection, rejectionSection);
        } else {
            modalBody.appendChild(suspensionSection);
        }
    }

    // Show suspension reason textarea
    suspensionSection.classList.remove('hidden');

    // Swap buttons
    const suspendBtn = document.getElementById('suspend-tutor-btn');
    const confirmSuspendBtn = document.getElementById('confirm-suspend-btn');

    if (suspendBtn) suspendBtn.classList.add('hidden');
    if (confirmSuspendBtn) confirmSuspendBtn.classList.remove('hidden');

    // Focus on textarea
    const textarea = document.getElementById('suspension-reason-input');
    if (textarea) textarea.focus();
}

/**
 * Confirm and submit tutor suspension
 */
async function confirmSuspendTutor() {
    if (!currentReviewTutorId) {
        showNotification('No tutor selected', 'error');
        return;
    }

    const suspensionReason = document.getElementById('suspension-reason-input')?.value.trim();

    if (!suspensionReason) {
        showNotification('Please provide a reason for suspension', 'error');
        const textarea = document.getElementById('suspension-reason-input');
        if (textarea) textarea.focus();
        return;
    }

    // Confirm action
    if (!confirm('Are you sure you want to suspend this tutor?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/tutor/${currentReviewTutorId}/suspend`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reason: suspensionReason
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Suspension failed: ${response.status}`);
        }

        const result = await response.json();

        showNotification('Tutor suspended successfully', 'info');
        closeTutorReviewModal();

        // Reload both verified (source) and suspended (destination) panels, plus stats
        if (typeof window.loadVerifiedTutors === 'function') {
            window.loadVerifiedTutors();
        }
        if (typeof window.loadSuspendedTutors === 'function') {
            window.loadSuspendedTutors();
        }
        if (typeof window.loadDashboardStats === 'function') {
            window.loadDashboardStats();
        }

        // Fallback to page reload if functions don't exist
        if (typeof window.loadVerifiedTutors !== 'function' &&
            typeof window.loadSuspendedTutors !== 'function') {
            setTimeout(() => location.reload(), 1500);
        }

    } catch (error) {
        console.error('Error suspending tutor:', error);
        showNotification('Failed to suspend tutor: ' + error.message, 'error');
    }
}

/**
 * Reconsider a rejected tutor from the modal
 */
async function reconsiderTutorFromModal() {
    if (!currentReviewTutorId) {
        showNotification('No tutor selected', 'error');
        return;
    }

    // Confirm action
    if (!confirm('Reconsider this application and move it back to pending?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/tutor/${currentReviewTutorId}/reconsider`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Reconsideration failed: ${response.status}`);
        }

        const result = await response.json();

        showNotification('Tutor application reconsidered successfully!', 'success');
        closeTutorReviewModal();

        // Reload both rejected (source) and requested (destination) panels, plus stats
        if (typeof window.loadRejectedTutors === 'function') {
            window.loadRejectedTutors();
        }
        if (typeof window.loadPendingTutors === 'function') {
            window.loadPendingTutors();
        }
        if (typeof window.loadDashboardStats === 'function') {
            window.loadDashboardStats();
        }

        // Fallback to page reload if functions don't exist
        if (typeof window.loadRejectedTutors !== 'function' &&
            typeof window.loadPendingTutors !== 'function') {
            setTimeout(() => location.reload(), 1500);
        }

    } catch (error) {
        console.error('Error reconsidering tutor:', error);
        showNotification('Failed to reconsider tutor: ' + error.message, 'error');
    }
}

/**
 * Reinstate a suspended tutor from the modal
 */
async function reinstateTutorFromModal() {
    if (!currentReviewTutorId) {
        showNotification('No tutor selected', 'error');
        return;
    }

    // Confirm action
    if (!confirm('Are you sure you want to reinstate this tutor?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${window.API_BASE_URL}/api/admin/tutor/${currentReviewTutorId}/reinstate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Reinstatement failed: ${response.status}`);
        }

        const result = await response.json();

        showNotification('Tutor reinstated successfully!', 'success');
        closeTutorReviewModal();

        // Reload both suspended (source) and verified (destination) panels, plus stats
        if (typeof window.loadSuspendedTutors === 'function') {
            window.loadSuspendedTutors();
        }
        if (typeof window.loadVerifiedTutors === 'function') {
            window.loadVerifiedTutors();
        }
        if (typeof window.loadDashboardStats === 'function') {
            window.loadDashboardStats();
        }

        // Fallback to page reload if functions don't exist
        if (typeof window.loadSuspendedTutors !== 'function' &&
            typeof window.loadVerifiedTutors !== 'function') {
            setTimeout(() => location.reload(), 1500);
        }

    } catch (error) {
        console.error('Error reinstating tutor:', error);
        showNotification('Failed to reinstate tutor: ' + error.message, 'error');
    }
}

/**
 * Show a notification message
 * @param {string} message - The message to display
 * @param {string} type - The notification type (success, error, info)
 */
function showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }

    // Fallback: create simple notification
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 transition-opacity ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add ESC key listener to close modal
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const modal = document.getElementById('tutor-review-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeTutorReviewModal();
        }
    }
});

// Explicitly assign functions to window object to prevent overriding by other modules
window.approveTutor = approveTutor;
window.confirmRejectTutor = confirmRejectTutor;
window.reviewTutorRequest = reviewTutorRequest;
window.closeTutorReviewModal = closeTutorReviewModal;
window.showRejectReason = showRejectReason;
window.showSuspendReason = showSuspendReason;
window.confirmSuspendTutor = confirmSuspendTutor;
window.reconsiderTutorFromModal = reconsiderTutorFromModal;
window.reinstateTutorFromModal = reinstateTutorFromModal;
