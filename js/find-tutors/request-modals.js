/**
 * Request Modals Manager
 * Handles course and school request modals functionality
 */

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

class RequestModalsManager {
    constructor() {
        this.courseModal = document.getElementById('requestCourseModal');
        this.schoolModal = document.getElementById('requestSchoolModal');

        this.courseForm = document.getElementById('requestCourseForm');
        this.schoolForm = document.getElementById('requestSchoolForm');

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Course Modal Events
        const closeCourseBtn = document.getElementById('closeCourseModal');
        const cancelCourseBtn = document.getElementById('cancelCourseBtn');

        if (closeCourseBtn) {
            closeCourseBtn.addEventListener('click', () => this.closeCourseModal());
        }

        if (cancelCourseBtn) {
            cancelCourseBtn.addEventListener('click', () => this.closeCourseModal());
        }

        // School Modal Events
        const closeSchoolBtn = document.getElementById('closeSchoolModal');
        const cancelSchoolBtn = document.getElementById('cancelSchoolBtn');

        if (closeSchoolBtn) {
            closeSchoolBtn.addEventListener('click', () => this.closeSchoolModal());
        }

        if (cancelSchoolBtn) {
            cancelSchoolBtn.addEventListener('click', () => this.closeSchoolModal());
        }

        // Form Submit Events
        if (this.courseForm) {
            this.courseForm.addEventListener('submit', (e) => this.handleCourseSubmit(e));
        }

        if (this.schoolForm) {
            this.schoolForm.addEventListener('submit', (e) => this.handleSchoolSubmit(e));
        }

        // Close modals on background click
        if (this.courseModal) {
            this.courseModal.addEventListener('click', (e) => {
                if (e.target === this.courseModal) {
                    this.closeCourseModal();
                }
            });
        }

        if (this.schoolModal) {
            this.schoolModal.addEventListener('click', (e) => {
                if (e.target === this.schoolModal) {
                    this.closeSchoolModal();
                }
            });
        }

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.courseModal && !this.courseModal.classList.contains('hidden')) {
                    this.closeCourseModal();
                }
                if (this.schoolModal && !this.schoolModal.classList.contains('hidden')) {
                    this.closeSchoolModal();
                }
            }
        });
    }

    // Course Modal Methods
    openCourseModal() {
        console.log('openCourseModal - courseModal element:', this.courseModal);
        console.log('openCourseModal - has hidden class:', this.courseModal?.classList.contains('hidden'));
        if (this.courseModal) {
            // Remove hidden class and force display first
            this.courseModal.classList.remove('hidden');
            this.courseModal.style.display = 'flex';

            // Force a reflow to ensure the display change is applied
            void this.courseModal.offsetHeight;

            // Then apply all other styles in next frame to bypass transition
            requestAnimationFrame(() => {
                this.courseModal.style.position = 'fixed';
                this.courseModal.style.top = '0';
                this.courseModal.style.left = '0';
                this.courseModal.style.width = '100%';
                this.courseModal.style.height = '100%';
                this.courseModal.style.zIndex = '10001';
                this.courseModal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                this.courseModal.style.opacity = '1';
                this.courseModal.style.visibility = 'visible';

                console.log('openCourseModal - after applying styles');
                console.log('openCourseModal - computed display:', window.getComputedStyle(this.courseModal).display);
                console.log('openCourseModal - computed z-index:', window.getComputedStyle(this.courseModal).zIndex);
                console.log('openCourseModal - computed opacity:', window.getComputedStyle(this.courseModal).opacity);
                console.log('openCourseModal - computed visibility:', window.getComputedStyle(this.courseModal).visibility);
            });

            document.body.style.overflow = 'hidden';
            this.clearMessages(this.courseForm);
        } else {
            console.error('openCourseModal - courseModal is null!');
        }
    }

    closeCourseModal() {
        if (this.courseModal) {
            this.courseModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
            this.courseForm?.reset();
            this.clearMessages(this.courseForm);
        }
    }

    async handleCourseSubmit(event) {
        event.preventDefault();

        console.log('[RequestModals] Course submit started');

        // Check if user is authenticated and get valid token
        let token = null;

        // Try to get and verify token from authManager if available
        console.log('[RequestModals] authManager available:', typeof authManager !== 'undefined');
        console.log('[RequestModals] authManager.isAuthenticated():', typeof authManager !== 'undefined' ? authManager.isAuthenticated() : 'N/A');

        if (typeof authManager !== 'undefined' && authManager.isAuthenticated()) {
            console.log('[RequestModals] authManager found, verifying token...');
            // Verify token is still valid before using it
            try {
                const isValid = await authManager.verifyToken();
                console.log('[RequestModals] Token verification result:', isValid);

                if (isValid) {
                    token = authManager.getToken();
                    console.log('[RequestModals] Using existing valid token');
                } else {
                    // Token expired, try to refresh
                    console.log('[RequestModals] Token invalid, attempting refresh...');
                    const refreshed = await authManager.refreshAccessToken();
                    console.log('[RequestModals] Refresh result:', refreshed);

                    if (refreshed) {
                        token = authManager.getToken();
                        console.log('[RequestModals] Successfully refreshed token');
                    } else {
                        console.error('[RequestModals] Failed to refresh token');
                    }
                }
            } catch (error) {
                console.error('[RequestModals] Error verifying token:', error);
            }
        } else {
            console.log('[RequestModals] authManager not available or not authenticated');
        }

        // Fallback to localStorage token if authManager not available
        if (!token) {
            token = localStorage.getItem('token');
            console.log('[RequestModals] Falling back to localStorage token:', token ? 'Found' : 'Not found');
        }

        if (!token) {
            console.error('[RequestModals] No token available, redirecting to login');
            this.showError(this.courseForm, 'Please login to submit a course request');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
            return;
        }

        console.log('[RequestModals] Proceeding with course request submission');

        // Get form values
        const courseTitle = document.getElementById('courseTitle').value.trim();
        const courseCategory = document.getElementById('courseCategory').value;
        const courseLevel = document.getElementById('courseLevel').value;
        const courseDescription = document.getElementById('courseDescription').value.trim();

        // Validate required fields
        if (!courseTitle || !courseCategory || !courseLevel) {
            this.showError(this.courseForm, 'Please fill in all required fields');
            return;
        }

        const submitBtn = document.getElementById('submitCourseBtn');
        const originalText = submitBtn.textContent;

        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');

            const response = await fetch(`${API_BASE_URL}/api/course-requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    course_title: courseTitle,
                    category: courseCategory,
                    level: courseLevel,
                    description: courseDescription || null
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess(this.courseForm, 'Course request submitted successfully! We will review it shortly.');

                // Reset form and close modal after delay
                setTimeout(() => {
                    this.closeCourseModal();
                }, 2000);
            } else if (response.status === 401) {
                // Unauthorized - token expired or invalid
                this.showError(this.courseForm, 'Your session has expired. Please log in again.');
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 2000);
            } else {
                this.showError(this.courseForm, data.detail || 'Failed to submit course request. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting course request:', error);
            this.showError(this.courseForm, 'An error occurred. Please check your connection and try again.');
        } finally {
            // Remove loading state
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }

    // School Modal Methods
    openSchoolModal() {
        console.log('openSchoolModal - schoolModal element:', this.schoolModal);
        console.log('openSchoolModal - has hidden class:', this.schoolModal?.classList.contains('hidden'));
        if (this.schoolModal) {
            // Remove hidden class and force display first
            this.schoolModal.classList.remove('hidden');
            this.schoolModal.style.display = 'flex';

            // Force a reflow to ensure the display change is applied
            void this.schoolModal.offsetHeight;

            // Then apply all other styles in next frame to bypass transition
            requestAnimationFrame(() => {
                this.schoolModal.style.position = 'fixed';
                this.schoolModal.style.top = '0';
                this.schoolModal.style.left = '0';
                this.schoolModal.style.width = '100%';
                this.schoolModal.style.height = '100%';
                this.schoolModal.style.zIndex = '10001';
                this.schoolModal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                this.schoolModal.style.opacity = '1';
                this.schoolModal.style.visibility = 'visible';

                console.log('openSchoolModal - after applying styles');
                console.log('openSchoolModal - computed display:', window.getComputedStyle(this.schoolModal).display);
                console.log('openSchoolModal - computed z-index:', window.getComputedStyle(this.schoolModal).zIndex);
                console.log('openSchoolModal - computed opacity:', window.getComputedStyle(this.schoolModal).opacity);
                console.log('openSchoolModal - computed visibility:', window.getComputedStyle(this.schoolModal).visibility);
            });

            document.body.style.overflow = 'hidden';
            this.clearMessages(this.schoolForm);
        } else {
            console.error('openSchoolModal - schoolModal is null!');
        }
    }

    closeSchoolModal() {
        if (this.schoolModal) {
            this.schoolModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
            this.schoolForm?.reset();
            this.clearMessages(this.schoolForm);
        }
    }

    async handleSchoolSubmit(event) {
        event.preventDefault();

        // Check if user is authenticated and get valid token
        let token = null;

        // Try to get and verify token from authManager if available
        if (typeof authManager !== 'undefined' && authManager.isAuthenticated()) {
            // Verify token is still valid before using it
            try {
                const isValid = await authManager.verifyToken();
                if (isValid) {
                    token = authManager.getToken();
                } else {
                    // Token expired, try to refresh
                    const refreshed = await authManager.refreshAccessToken();
                    if (refreshed) {
                        token = authManager.getToken();
                    }
                }
            } catch (error) {
                console.error('Error verifying token:', error);
            }
        }

        // Fallback to localStorage token if authManager not available
        if (!token) {
            token = localStorage.getItem('token');
        }

        if (!token) {
            this.showError(this.schoolForm, 'Please login to submit a school request');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
            return;
        }

        // Get form values
        const schoolName = document.getElementById('schoolName').value.trim();
        const schoolType = document.getElementById('schoolType').value;
        const schoolLevel = document.getElementById('schoolLevel').value;
        const schoolLocation = document.getElementById('schoolLocation').value.trim();
        const schoolEmail = document.getElementById('schoolEmail').value.trim();
        const schoolPhone = document.getElementById('schoolPhone').value.trim();

        // Validate required fields
        if (!schoolName || !schoolType || !schoolLevel) {
            this.showError(this.schoolForm, 'Please fill in all required fields');
            return;
        }

        const submitBtn = document.getElementById('submitSchoolBtn');
        const originalText = submitBtn.textContent;

        try {
            // Show loading state
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');

            const response = await fetch(`${API_BASE_URL}/api/school-requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    school_name: schoolName,
                    school_type: schoolType,
                    level: schoolLevel,
                    location: schoolLocation || null,
                    school_email: schoolEmail || null,
                    school_phone: schoolPhone || null
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess(this.schoolForm, 'School request submitted successfully! We will review it shortly.');

                // Reset form and close modal after delay
                setTimeout(() => {
                    this.closeSchoolModal();
                }, 2000);
            } else if (response.status === 401) {
                // Unauthorized - token expired or invalid
                this.showError(this.schoolForm, 'Your session has expired. Please log in again.');
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 2000);
            } else {
                this.showError(this.schoolForm, data.detail || 'Failed to submit school request. Please try again.');
            }
        } catch (error) {
            console.error('Error submitting school request:', error);
            this.showError(this.schoolForm, 'An error occurred. Please check your connection and try again.');
        } finally {
            // Remove loading state
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    }

    // Helper Methods
    showSuccess(form, message) {
        this.clearMessages(form);
        const successDiv = document.createElement('div');
        successDiv.className = 'form-success-message';
        successDiv.innerHTML = `
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span>${message}</span>
        `;
        form.insertBefore(successDiv, form.firstChild);
    }

    showError(form, message) {
        this.clearMessages(form);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error-message';
        errorDiv.innerHTML = `
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            <span>${message}</span>
        `;
        form.insertBefore(errorDiv, form.firstChild);
    }

    clearMessages(form) {
        const existingMessages = form.querySelectorAll('.form-success-message, .form-error-message');
        existingMessages.forEach(msg => msg.remove());
    }
}

// Initialize the manager when DOM is ready
let requestModalsManager;

document.addEventListener('DOMContentLoaded', () => {
    requestModalsManager = new RequestModalsManager();
});

// Global functions for opening modals (callable from HTML onclick)
function openRequestCourseModal() {
    console.log('openRequestCourseModal called - using course-request-modal');
    // Use the new course-request-modal from common-modals
    if (typeof openCourseRequestModal === 'function') {
        openCourseRequestModal();
    } else {
        // Load the modal dynamically if function not available
        loadAndOpenCourseRequestModal();
    }
}

// Helper function to load and open course request modal
async function loadAndOpenCourseRequestModal() {
    let modal = document.getElementById('course-request-modal');

    // If modal not in DOM, fetch it
    if (!modal) {
        try {
            const response = await fetch('../modals/common-modals/course-request-modal.html');
            if (response.ok) {
                const html = await response.text();
                const container = document.getElementById('modal-container') || document.body;
                container.insertAdjacentHTML('beforeend', html);
                modal = document.getElementById('course-request-modal');

                // Also load the course-request-manager.js if not loaded
                if (typeof openCourseRequestModal !== 'function') {
                    const script = document.createElement('script');
                    script.src = '../js/tutor-profile/course-request-manager.js';
                    document.head.appendChild(script);
                    // Wait a bit for script to load
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        } catch (e) {
            console.error('[RequestModals] Failed to fetch course-request-modal:', e);
        }
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        document.body.style.overflow = 'hidden';
    } else {
        console.error('[RequestModals] Course request modal not found');
        alert('Failed to load course request modal. Please refresh the page.');
    }
}

function openRequestSchoolModal() {
    console.log('openRequestSchoolModal called - delegating to school-request-manager');
    // Use the new school-request-modal from common-modals (handled by school-request-manager.js)
    // Note: school-request-manager.js defines window.openSchoolRequestModal (different word order)
    if (typeof window.openSchoolRequestModal === 'function') {
        window.openSchoolRequestModal();
    } else {
        console.error('openSchoolRequestModal function not available from school-request-manager.js');
        alert('School request modal is not available. Please refresh the page.');
    }
}

// Aliases for the "no results" buttons
function requestCourse() {
    console.log('requestCourse called');
    openRequestCourseModal();
}

function requestSchool() {
    console.log('requestSchool called');
    openRequestSchoolModal();
}

// Make functions globally available
window.openRequestCourseModal = openRequestCourseModal;
window.openRequestSchoolModal = openRequestSchoolModal;
window.requestCourse = requestCourse;
window.requestSchool = requestSchool;
