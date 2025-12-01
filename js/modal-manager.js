/**
 * Astegni Platform - Modal Manager
 * Centralized modal handling system
 */

class ModalManager {
    constructor() {
        this.activeModals = new Set();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.injectModalStyles();
    }

    // ============================================
    // CORE MODAL METHODS
    // ============================================

    open(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal ${modalId} not found`);
            return;
        }

        // Close other modals if exclusive
        if (options.exclusive) {
            this.closeAll();
        }

        // Show modal
        modal.classList.remove('hidden');
        this.activeModals.add(modalId);

        // Add body scroll lock
        if (options.lockScroll !== false) {
            document.body.style.overflow = 'hidden';
        }

        // Auto-close after timeout if specified
        if (options.autoClose) {
            setTimeout(() => this.close(modalId), options.autoClose);
        }

        // Callback
        if (options.onOpen) {
            options.onOpen(modal);
        }

        return modal;
    }

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.classList.add('hidden');
        this.activeModals.delete(modalId);

        // Restore body scroll if no active modals
        if (this.activeModals.size === 0) {
            document.body.style.overflow = '';
        }

        // Reset form if exists
        const form = modal.querySelector('form');
        if (form) form.reset();

        return modal;
    }

    closeAll() {
        this.activeModals.forEach(modalId => this.close(modalId));
    }

    toggle(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        if (modal.classList.contains('hidden')) {
            this.open(modalId);
        } else {
            this.close(modalId);
        }
    }

    // ============================================
    // MODAL TEMPLATES
    // ============================================

    createConfirmModal(options) {
        const modalId = `confirm-modal-${Date.now()}`;
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="modals.close('${modalId}')"></div>
            <div class="modal-content compact-modal">
                <div class="modal-header">
                    <h2>${options.title || 'Confirm'}</h2>
                    <button class="modal-close" onclick="modals.close('${modalId}')">×</button>
                </div>
                <div class="modal-body">
                    <p>${options.message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="modals.close('${modalId}')">
                        ${options.cancelText || 'Cancel'}
                    </button>
                    <button class="btn-primary" onclick="modals.handleConfirm('${modalId}', ${options.onConfirm})">
                        ${options.confirmText || 'Confirm'}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.open(modalId, { exclusive: true });
        return modalId;
    }

    handleConfirm(modalId, callback) {
        if (callback && typeof callback === 'function') {
            callback();
        }
        this.close(modalId);
        // Remove modal from DOM after animation
        setTimeout(() => {
            const modal = document.getElementById(modalId);
            if (modal) modal.remove();
        }, 300);
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    setupEventListeners() {
        // Close modal on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModals.size > 0) {
                const lastModal = Array.from(this.activeModals).pop();
                this.close(lastModal);
            }
        });

        // Setup close buttons
        document.addEventListener('click', (e) => {
            // Close on overlay click
            if (e.target.classList.contains('modal-overlay')) {
                const modal = e.target.closest('.modal');
                if (modal && modal.id) {
                    this.close(modal.id);
                }
            }
            
            // Close on close button click
            if (e.target.classList.contains('modal-close')) {
                const modal = e.target.closest('.modal');
                if (modal && modal.id) {
                    this.close(modal.id);
                }
            }
        });
    }

    injectModalStyles() {
        if (document.getElementById('modal-manager-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'modal-manager-styles';
        style.textContent = `
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            
            .modal.hidden {
                display: none;
            }
            
            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                cursor: pointer;
            }
            
            .modal-content {
                position: relative;
                background: white;
                border-radius: 12px;
                max-width: 600px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                animation: slideUp 0.3s ease;
            }
            
            .compact-modal {
                max-width: 400px;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize modal manager
const modals = new ModalManager();

// ============================================
// MODAL WRAPPER FUNCTIONS
// ============================================

// Certification modal
function openCertificationModal() {
    modals.open('certification-modal', { lockScroll: true });
}

function closeCertificationModal() {
    modals.close('certification-modal');
}

// Experience modal
function openExperienceModal() {
    modals.open('experience-modal', { lockScroll: true });
}

function closeExperienceModal() {
    modals.close('experience-modal');
}

// Achievement modal
function openAchievementModal() {
    modals.open('achievement-modal', { lockScroll: true });
}

function closeAchievementModal() {
    modals.close('achievement-modal');
}

// Video upload modal
function openUploadVideoModal() {
    modals.open('uploadVideoModal', { lockScroll: true });
}

// Schedule modal
function openScheduleModal() {
    modals.open('create-schedule-modal', { lockScroll: true });
}

function closeScheduleModal() {
    modals.close('create-schedule-modal');
}

// Edit profile modal
function openEditProfileModal() {
    modals.open('edit-profile-modal', { lockScroll: true });
}

function closeEditProfileModal() {
    modals.close('edit-profile-modal');
}

// Generic modal functions
function openModal(modalId) {
    modals.open(modalId);
}

function closeModal(modalId) {
    modals.close(modalId);
}

// Confirmation dialog
function confirmAction(message, onConfirm) {
    return modals.createConfirmModal({
        title: 'Confirm Action',
        message: message,
        onConfirm: onConfirm,
        confirmText: 'Yes',
        cancelText: 'No'
    });
}