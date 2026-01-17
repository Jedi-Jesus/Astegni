/**
 * Modal Loader for Tutor Profile
 *
 * This module handles dynamic loading of modals that have been extracted
 * from tutor-profile.html into separate files for better maintainability.
 *
 * Usage:
 * 1. Include this script in tutor-profile.html:
 *    <script src="modals/tutor-profile/modal-loader.js"></script>
 *
 * 2. Initialize on page load:
 *    ModalLoader.init();
 *
 * 3. Load specific modal when needed:
 *    ModalLoader.load('edit-profile-modal.html');
 *
 * 4. Or preload all modals:
 *    ModalLoader.preloadAll();
 */

const ModalLoader = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        modalPath: '../modals/tutor-profile/',
        containerId: 'modal-container',
        cache: true, // Cache loaded modals
        preloadOnInit: true, // CHANGED: Preload all modals on page load for instant access
        cacheBusting: true // Add timestamp to force fresh fetches when needed
    };

    // Modal file registry
    // Modals in tutor-profile folder
    const TUTOR_PROFILE_MODALS = [
        'achievement-modal.html',
        'certification-modal.html',
        'custom-filter-modal.html',
        'edit-profile-modal.html',
        'experience-modal.html',
        'contact-confirmation-modal.html',
        'otp-verification-modal.html',
        'package-management-modal.html',
        'plan-details-modal.html',
        'story-viewer-modal.html',
        'switch-subscription-modal.html',
        'unsubscribe-modal1.html',
        'unsubscribe-confirm1-modal.html',
        'unsubscribe-confirm2-modal.html',
        'unsubscribe-final-modal.html',
        'unsubscribe-password-modal.html',
        'verification-fee-modal.html',
        'verification-modal.html',
        'view-achievement-modal.html',
        'view-certification-modal.html',
        'view-experience-modal.html',
        'view-package-modal.html',
        'view-request-modal.html',
        'view-schedule-modal.html'
    ];

    // Modals in common-modals folder (shared across profiles)
    const COMMON_MODALS = [
        'accept-parent-invitation-modal.html',
        'access-restricted-modal.html',
        'ad-analytics-modal.html',
        'add-role-modal.html',
        'appearance-modal.html',
        'coming-soon-modal.html',
        'connected-accounts-modal.html',
        'course-request-modal.html',
        'community-modal.html',
        'create-club-modal.html',
        'create-event-modal.html',
        'coursework-main-modal.html',
        'digital-lab-modal.html',
        'coursework-give-modal.html',
        'coursework-my-courseworks-modal.html',
        'coursework-view-answers-modal.html',
        'coursework-view-details-modal.html',
        'export-data-modal.html',
        'folder-modal.html',
        'invite-parent-modal.html',
        'kyc-verification-modal.html',
        'language-preferences-modal.html',
        'leave-astegni-modal.html',
        'login-activity-modal.html',
        'logout-modal.html',
        'payment-method-modal.html',
        'review-astegni-modal.html',
        'schedule-modal.html',
        'student-details-modal.html',
        'subscription-modal.html',
        'two-factor-auth-modal.html',
        'upload-document-modal.html',
        'universal-upload-modal.html',
        'verify-personal-info-modal.html',
        'whiteboard-modal.html'
    ];

    // Modal ID to filename and path mapping
    const MODAL_ID_MAP = {
        // Tutor-profile specific modals
        'achievementModal': { file: 'achievement-modal.html', path: 'tutor-profile' },
        'certificationModal': { file: 'certification-modal.html', path: 'tutor-profile' },
        'customFilterModal': { file: 'custom-filter-modal.html', path: 'tutor-profile' },
        'edit-profile-modal': { file: 'edit-profile-modal.html', path: 'tutor-profile' },
        'experienceModal': { file: 'experience-modal.html', path: 'tutor-profile' },
        'contact-confirmation-modal': { file: 'contact-confirmation-modal.html', path: 'tutor-profile' },
        'otp-verification-modal': { file: 'otp-verification-modal.html', path: 'tutor-profile' },
        'package-management-modal': { file: 'package-management-modal.html', path: 'tutor-profile' },
        'plan-details-modal': { file: 'plan-details-modal.html', path: 'tutor-profile' },
        'storyUploadModal': { file: 'universal-upload-modal.html', path: 'common-modals' },
        'storyViewerModal': { file: 'story-viewer-modal.html', path: 'tutor-profile' },
        'studentDetailsModal': { file: 'student-details-modal.html', path: 'common-modals' },
        'switchSubscriptionModal': { file: 'switch-subscription-modal.html', path: 'tutor-profile' },
        'unsubscribeModal1': { file: 'unsubscribe-modal1.html', path: 'tutor-profile' },
        'unsubscribeConfirm1': { file: 'unsubscribe-confirm1-modal.html', path: 'tutor-profile' },
        'unsubscribeConfirm2': { file: 'unsubscribe-confirm2-modal.html', path: 'tutor-profile' },
        'unsubscribeFinalModal': { file: 'unsubscribe-final-modal.html', path: 'tutor-profile' },
        'unsubscribePasswordModal': { file: 'unsubscribe-password-modal.html', path: 'tutor-profile' },
        'verificationFeeModal': { file: 'verification-fee-modal.html', path: 'tutor-profile' },
        'verificationModal': { file: 'verification-modal.html', path: 'tutor-profile' },
        'viewAchievementModal': { file: 'view-achievement-modal.html', path: 'tutor-profile' },
        'viewPackageModal': { file: 'view-package-modal.html', path: 'tutor-profile' },
        'viewCertificationModal': { file: 'view-certification-modal.html', path: 'tutor-profile' },
        'viewExperienceModal': { file: 'view-experience-modal.html', path: 'tutor-profile' },
        'viewRequestModal': { file: 'view-request-modal.html', path: 'tutor-profile' },
        'viewScheduleModal': { file: 'view-schedule-modal.html', path: 'tutor-profile' },

        // Common modals (shared across profiles)
        'accept-parent-invitation-modal': { file: 'accept-parent-invitation-modal.html', path: 'common-modals' },
        'access-restricted-modal': { file: 'access-restricted-modal.html', path: 'common-modals' },
        'accessRestrictedModal': { file: 'access-restricted-modal.html', path: 'common-modals' },
        'adAnalyticsModal': { file: 'ad-analytics-modal.html', path: 'common-modals' },
        'add-role-modal': { file: 'add-role-modal.html', path: 'common-modals' },
        'coming-soon-modal': { file: 'coming-soon-modal.html', path: 'common-modals' },
        'course-request-modal': { file: 'course-request-modal.html', path: 'common-modals' },
        'logout-modal': { file: 'logout-modal.html', path: 'common-modals' },
        'communityModal': { file: 'community-modal.html', path: 'common-modals' },
        'coverUploadModal': { file: 'cover-upload-modal.html', path: 'common-modals' },
        'create-club-modal': { file: 'create-club-modal.html', path: 'common-modals' },
        'create-event-modal': { file: 'create-event-modal.html', path: 'common-modals' },
        'courseworkMainModal': { file: 'coursework-main-modal.html', path: 'common-modals' },
        'courseworkGiveModal': { file: 'coursework-give-modal.html', path: 'common-modals' },
        'courseworkMyCourseworksModal': { file: 'coursework-my-courseworks-modal.html', path: 'common-modals' },
        'courseworkViewAnswersModal': { file: 'coursework-view-answers-modal.html', path: 'common-modals' },
        'courseworkViewDetailsModal': { file: 'coursework-view-details-modal.html', path: 'common-modals' },
        'folder-modal': { file: 'folder-modal.html', path: 'common-modals' },
        'create-folder-modal': { file: 'folder-modal.html', path: 'common-modals' },
        'merge-folder-modal': { file: 'folder-modal.html', path: 'common-modals' },
        'inviteParentModal': { file: 'invite-parent-modal.html', path: 'common-modals' },
        'kyc-verification-modal': { file: 'kyc-verification-modal.html', path: 'common-modals' },
        'leave-astegni-modal': { file: 'leave-astegni-modal.html', path: 'common-modals' },
        'payment-method-modal': { file: 'payment-method-modal.html', path: 'common-modals' },
        'profileUploadModal': { file: 'profile-upload-modal.html', path: 'common-modals' },
        'scheduleModal': { file: 'schedule-modal.html', path: 'common-modals' },
        'subscription-modal': { file: 'subscription-modal.html', path: 'common-modals' },
        'uploadDocumentModal': { file: 'upload-document-modal.html', path: 'common-modals' },
        'verify-personal-info-modal': { file: 'verify-personal-info-modal.html', path: 'common-modals' },

        // Settings modals (new)
        'two-factor-auth-modal': { file: 'two-factor-auth-modal.html', path: 'common-modals' },
        'login-activity-modal': { file: 'login-activity-modal.html', path: 'common-modals' },
        'connected-accounts-modal': { file: 'connected-accounts-modal.html', path: 'common-modals' },
        'language-preferences-modal': { file: 'language-preferences-modal.html', path: 'common-modals' },
        'export-data-modal': { file: 'export-data-modal.html', path: 'common-modals' },
        'review-astegni-modal': { file: 'review-astegni-modal.html', path: 'common-modals' },
        'appearance-modal': { file: 'appearance-modal.html', path: 'common-modals' },

        // Digital Whiteboard modal
        'whiteboardModal': { file: 'whiteboard-modal.html', path: 'common-modals' },
        'whiteboard-modal': { file: 'whiteboard-modal.html', path: 'common-modals' },

        // Digital Lab modal
        'digitalLabModal': { file: 'digital-lab-modal.html', path: 'common-modals' },
        'digital-lab-modal': { file: 'digital-lab-modal.html', path: 'common-modals' }
    };

    // Cache for loaded modals
    const cache = {};

    // Loading state
    let initialized = false;
    let container = null;

    /**
     * Initialize the modal loader
     */
    function init() {
        if (initialized) {
            console.warn('[ModalLoader] Already initialized');
            return;
        }

        // Get or create modal container
        container = document.getElementById(CONFIG.containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = CONFIG.containerId;
            document.body.appendChild(container);
            console.log('[ModalLoader] Created modal container');
        }

        initialized = true;
        console.log('[ModalLoader] Initialized successfully');

        // Preload all modals if configured
        if (CONFIG.preloadOnInit) {
            preloadAll();
        }
    }

    /**
     * Load a single modal by filename or ID
     * @param {string} modalIdentifier - Modal filename or ID
     * @returns {Promise<void>}
     */
    async function load(modalIdentifier) {
        if (!initialized) {
            console.error('[ModalLoader] Not initialized. Call ModalLoader.init() first.');
            return;
        }

        // Determine filename and path
        let filename, modalPath;
        const modalInfo = MODAL_ID_MAP[modalIdentifier];

        if (modalInfo) {
            // Modal ID found in mapping
            filename = modalInfo.file;
            modalPath = modalInfo.path === 'common-modals' ? '../modals/common-modals/' : CONFIG.modalPath;
        } else {
            // Assume it's a filename, check which array it belongs to
            filename = modalIdentifier;
            if (COMMON_MODALS.includes(filename)) {
                modalPath = '../modals/common-modals/';
            } else {
                modalPath = CONFIG.modalPath;
            }
        }

        // Check cache first
        const cacheKey = modalPath + filename;
        if (CONFIG.cache && cache[cacheKey]) {
            console.log(`[ModalLoader] Loading from cache: ${filename}`);
            appendToContainer(cache[cacheKey]);
            return;
        }

        // Fetch modal HTML
        let url = modalPath + filename;

        // Add cache-busting timestamp to force fresh fetch
        if (CONFIG.cacheBusting) {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}v=${Date.now()}`;
        }

        try {
            console.log(`[ModalLoader] Fetching: ${filename} from ${modalPath}`);
            const response = await fetch(url, {
                cache: 'no-store' // Force no browser cache
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();

            // CRITICAL FIX: Detect if we got index.html instead of the modal
            // This happens when Nginx returns index.html as 404 fallback
            if (html.includes('<!DOCTYPE html>') && html.includes('<html')) {
                // We got a full HTML document instead of a modal fragment
                const hasModalMarker = html.includes('Modal:') || html.includes('class="modal');
                const hasIndexMarker = html.includes('Hero Section') || html.includes('Astegni - Ethiopia');

                if (hasIndexMarker && !hasModalMarker) {
                    console.error(`[ModalLoader] ❌ Received index.html instead of ${filename} (404 fallback detected)`);
                    console.error(`[ModalLoader] This indicates the modal file is missing on the server`);
                    throw new Error(`Modal not found: ${filename} - Got index.html fallback (check server deployment)`);
                }
            }

            // Cache the modal
            if (CONFIG.cache) {
                cache[cacheKey] = html;
            }

            // Append to container
            appendToContainer(html);
            console.log(`[ModalLoader] Loaded successfully: ${filename}`);

        } catch (error) {
            console.error(`[ModalLoader] Failed to load ${filename}:`, error);
            throw error;
        }
    }

    /**
     * Load modal by ID (convenience method)
     * @param {string} modalId - Modal DOM ID
     * @returns {Promise<void>}
     */
    async function loadById(modalId) {
        return load(modalId);
    }

    /**
     * Preload all modals
     * @returns {Promise<void>}
     */
    async function preloadAll() {
        if (!initialized) {
            console.error('[ModalLoader] Not initialized. Call ModalLoader.init() first.');
            return;
        }

        console.log('[ModalLoader] Preloading all modals...');
        const startTime = performance.now();

        // Combine both modal arrays
        const allModals = [...TUTOR_PROFILE_MODALS, ...COMMON_MODALS];
        const promises = allModals.map(filename => load(filename));

        try {
            await Promise.all(promises);
            const endTime = performance.now();
            console.log(`[ModalLoader] Preloaded ${allModals.length} modals (${TUTOR_PROFILE_MODALS.length} tutor-profile + ${COMMON_MODALS.length} common) in ${(endTime - startTime).toFixed(2)}ms`);

            // Dispatch custom event to notify that all modals are loaded
            const event = new CustomEvent('modalsLoaded', {
                detail: {
                    tutorProfileModals: TUTOR_PROFILE_MODALS.length,
                    commonModals: COMMON_MODALS.length,
                    loadTime: endTime - startTime
                }
            });
            document.dispatchEvent(event);
            console.log('[ModalLoader] Dispatched "modalsLoaded" event');

        } catch (error) {
            console.error('[ModalLoader] Failed to preload some modals:', error);
        }
    }

    /**
     * Append HTML to the modal container
     * @param {string} html - HTML content
     */
    function appendToContainer(html) {
        if (!container) {
            console.error('[ModalLoader] Container not found');
            return;
        }

        // Check if modal already exists in DOM
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const modalElement = tempDiv.querySelector('[id]');

        if (modalElement) {
            const existingModal = document.getElementById(modalElement.id);
            if (existingModal) {
                console.log(`[ModalLoader] Modal already in DOM: ${modalElement.id}`);
                return; // Don't add duplicate
            }
        }

        container.insertAdjacentHTML('beforeend', html);
    }

    /**
     * Clear all loaded modals from container
     */
    function clearAll() {
        if (container) {
            container.innerHTML = '';
            console.log('[ModalLoader] Cleared all modals from container');
        }
    }

    /**
     * Clear cache
     */
    function clearCache() {
        Object.keys(cache).forEach(key => delete cache[key]);
        console.log('[ModalLoader] Cleared cache');
    }

    /**
     * Get list of all available modals
     * @returns {Object} Object with tutor-profile and common modal arrays
     */
    function getAvailableModals() {
        return {
            tutorProfile: [...TUTOR_PROFILE_MODALS],
            common: [...COMMON_MODALS],
            all: [...TUTOR_PROFILE_MODALS, ...COMMON_MODALS]
        };
    }

    /**
     * Check if a modal is loaded
     * @param {string} modalId - Modal DOM ID
     * @returns {boolean}
     */
    function isLoaded(modalId) {
        return document.getElementById(modalId) !== null;
    }

    // Public API
    return {
        init,
        load,
        loadById,
        preloadAll,
        clearAll,
        clearCache,
        getAvailableModals,
        isLoaded,
        // Expose config for customization
        setConfig: function(options) {
            Object.assign(CONFIG, options);
        }
    };
})();

// Auto-initialize on DOM ready (optional - comment out if manual init preferred)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ModalLoader.init());
} else {
    ModalLoader.init();
}

// Expose as window.modalLoader for compatibility with settings-manager.js
window.modalLoader = {
    loadModal: async function(modalFile) {
        // Extract modal ID from filename (e.g., 'two-factor-auth-modal.html' -> 'two-factor-auth-modal')
        const modalId = modalFile.replace('.html', '');
        await ModalLoader.load(modalFile);
        return document.getElementById(modalId);
    }
};
