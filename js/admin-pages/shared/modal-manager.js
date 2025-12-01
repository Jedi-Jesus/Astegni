/**
 * Modal Manager - Shared functionality for admin modals
 * Handles common modal operations across all admin pages
 */

class ModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModal = null;
    }

    /**
     * Register a modal
     * @param {string} modalId - ID of the modal element
     * @param {Object} options - Modal options
     */
    registerModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (modal) {
            this.modals.set(modalId, {
                element: modal,
                options: {
                    closeOnEsc: options.closeOnEsc !== false,
                    closeOnOverlay: options.closeOnOverlay !== false,
                    onOpen: options.onOpen || null,
                    onClose: options.onClose || null
                }
            });
        }
    }

    /**
     * Open a modal
     * @param {string} modalId - ID of the modal to open
     */
    openModal(modalId) {
        const modalData = this.modals.get(modalId);
        if (!modalData) {
            console.warn(`Modal '${modalId}' not found`);
            return;
        }

        // Close any active modal first
        if (this.activeModal) {
            this.closeModal(this.activeModal);
        }

        const { element, options } = modalData;

        // Show modal
        element.style.display = 'flex';
        element.classList.add('active');
        document.body.style.overflow = 'hidden';

        this.activeModal = modalId;

        // Call onOpen callback if provided
        if (options.onOpen) {
            options.onOpen(element);
        }

        // Emit custom event
        this.emitModalEvent('modalOpened', modalId);
    }

    /**
     * Close a modal
     * @param {string} modalId - ID of the modal to close (optional, closes active modal if not provided)
     */
    closeModal(modalId = null) {
        const targetModalId = modalId || this.activeModal;
        if (!targetModalId) return;

        const modalData = this.modals.get(targetModalId);
        if (!modalData) return;

        const { element, options } = modalData;

        // Hide modal
        element.style.display = 'none';
        element.classList.remove('active');
        document.body.style.overflow = '';

        if (this.activeModal === targetModalId) {
            this.activeModal = null;
        }

        // Call onClose callback if provided
        if (options.onClose) {
            options.onClose(element);
        }

        // Emit custom event
        this.emitModalEvent('modalClosed', targetModalId);
    }

    /**
     * Initialize modal event listeners
     */
    initialize() {
        // ESC key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                const modalData = this.modals.get(this.activeModal);
                if (modalData && modalData.options.closeOnEsc) {
                    this.closeModal();
                }
            }
        });

        // Overlay click handler
        document.addEventListener('click', (e) => {
            if (this.activeModal && e.target.classList.contains('modal')) {
                const modalData = this.modals.get(this.activeModal);
                if (modalData && modalData.options.closeOnOverlay && e.target === modalData.element) {
                    this.closeModal();
                }
            }
        });
    }

    /**
     * Emit custom modal event
     * @param {string} eventName - Name of the event
     * @param {string} modalId - ID of the modal
     */
    emitModalEvent(eventName, modalId) {
        const event = new CustomEvent(eventName, {
            detail: { modalId }
        });
        document.dispatchEvent(event);
    }
}

// Create global instance
const modalManager = new ModalManager();

// Global helper functions for backward compatibility
// Only override if not already defined by page-specific managers
if (typeof window.openModal === 'undefined') {
    window.openModal = function(modalId) {
        modalManager.openModal(modalId);
    };
}

if (typeof window.closeModal === 'undefined') {
    window.closeModal = function(modalId) {
        modalManager.closeModal(modalId);
    };
}

// Common admin modal functions
window.openTutorReports = function() {
    modalManager.openModal('tutor-reports-modal');
};

window.openVerificationGuidelines = function() {
    modalManager.openModal('verification-guidelines-modal');
};

window.openTutorSettings = function() {
    modalManager.openModal('tutor-settings-modal');
};

window.openUploadCoverModal = function() {
    modalManager.openModal('upload-cover-modal');
};

window.openUploadProfileModal = function() {
    modalManager.openModal('upload-profile-modal');
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        modalManager.initialize();
    });
} else {
    modalManager.initialize();
}

// Make modalManager globally available
window.modalManager = modalManager;
window.ModalManager = ModalManager;