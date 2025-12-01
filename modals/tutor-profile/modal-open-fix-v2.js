/**
 * Modal Opening Fix V2 - Ensures modals are loaded before showing
 *
 * This script immediately wraps the openModal function to ensure
 * modals are loaded from external files before being displayed.
 */

(function() {
    'use strict';

    console.log('[Modal Fix V2] Initializing immediately...');

    // Store the original openModal if it exists
    const originalOpenModal = window.openModal;

    // Create new openModal that loads modals first
    window.openModal = async function(modalId) {
        console.log(`[Modal Fix V2] openModal called: ${modalId}`);

        // Wait for ModalLoader to be available
        let attempts = 0;
        while (typeof ModalLoader === 'undefined' && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof ModalLoader === 'undefined') {
            console.error('[Modal Fix V2] ModalLoader not found after 5 seconds');
            // Try original function as fallback
            if (typeof originalOpenModal === 'function') {
                return originalOpenModal(modalId);
            }
            return;
        }

        try {
            // Load the modal first
            console.log(`[Modal Fix V2] Loading modal: ${modalId}`);
            await ModalLoader.loadById(modalId);
            console.log(`[Modal Fix V2] Modal loaded: ${modalId}`);

            // Now show the modal
            const modal = document.getElementById(modalId);
            if (modal) {
                // Remove hidden class
                modal.classList.remove('hidden');

                // Set display to flex for proper centering
                modal.style.display = 'flex';
                modal.style.visibility = 'visible';
                modal.style.opacity = '1';

                // Prevent body scroll
                document.body.style.overflow = 'hidden';

                console.log(`[Modal Fix V2] ✅ Modal shown: ${modalId}`);
            } else {
                console.error(`[Modal Fix V2] ❌ Modal not found after loading: ${modalId}`);
            }
        } catch (error) {
            console.error(`[Modal Fix V2] Failed to load/show modal ${modalId}:`, error);

            // Try original function as fallback
            if (typeof originalOpenModal === 'function') {
                return originalOpenModal(modalId);
            }
        }
    };

    // Also wrap specific modal functions
    const modalFunctions = [
        'openEditProfileModal',
        'openAdAnalyticsModal',
        'openCertificationModal',
        'openExperienceModal',
        'openAchievementModal',
        'openScheduleModal',
        'openCommunityModal',
        'openBlogModal',
        'openCoverUploadModal',
        'openProfileUploadModal',
        'openVideoUploadModal',
        'openUploadStoryModal',
        'openVerificationFeeModal',
        'openVerificationSuccessModal',
        'openPackageModal',
        'openQuizMaker',
        'openDigitalLab',
        'openUploadResourceModal',
        'openUploadVideoModal',
        'openCreateBlogModal',
        'openUploadDocumentModal',
        'openVerifyPersonalInfoModal',
        'openPaymentMethodModal',
        'openSubscriptionModal',
        'openLeaveAstegniModal',
        'openComingSoonModal'
    ];

    // Wait for functions to be defined, then wrap them
    setTimeout(() => {
        let wrappedCount = 0;

        modalFunctions.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                const originalFunc = window[funcName];

                window[funcName] = async function(...args) {
                    console.log(`[Modal Fix V2] ${funcName} called`);

                    // Wait for ModalLoader
                    let attempts = 0;
                    while (typeof ModalLoader === 'undefined' && attempts < 50) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        attempts++;
                    }

                    if (typeof ModalLoader !== 'undefined') {
                        // Try to determine modal ID from function name
                        // e.g., openEditProfileModal -> edit-profile-modal
                        let modalId = funcName
                            .replace(/^open/, '')
                            .replace(/^show/, '')
                            .replace(/Modal$/, '')
                            .replace(/([A-Z])/g, '-$1')
                            .toLowerCase()
                            .replace(/^-/, '') + '-modal';

                        // Handle special cases
                        const specialCases = {
                            'edit-profile-modal': 'edit-profile-modal',
                            'ad-analytics-modal': 'adAnalyticsModal',
                            'certification-modal': 'certificationModal',
                            'experience-modal': 'experienceModal',
                            'achievement-modal': 'achievementModal',
                            'schedule-modal': 'scheduleModal',
                            'community-modal': 'communityModal',
                            'cover-upload-modal': 'coverUploadModal',
                            'profile-upload-modal': 'profileUploadModal',
                            'story-upload-modal': 'storyUploadModal',
                            'verification-fee-modal': 'verificationFeeModal',
                            'verify-personal-info-modal': 'verify-personal-info-modal',
                            'payment-method-modal': 'payment-method-modal',
                            'subscription-modal': 'subscription-modal',
                            'leave-astegni-modal': 'leave-astegni-modal',
                            'coming-soon-modal': 'coming-soon-modal'
                        };

                        // Use special case if it exists
                        if (specialCases[modalId]) {
                            modalId = specialCases[modalId];
                        }

                        try {
                            await ModalLoader.loadById(modalId);
                            console.log(`[Modal Fix V2] Pre-loaded modal for ${funcName}: ${modalId}`);
                        } catch (error) {
                            console.warn(`[Modal Fix V2] Could not pre-load modal: ${modalId}`, error);
                        }
                    }

                    // Call original function
                    return originalFunc.apply(this, args);
                };

                wrappedCount++;
            }
        });

        console.log(`[Modal Fix V2] Wrapped ${wrappedCount} modal functions`);
    }, 500);

    console.log('[Modal Fix V2] ✅ Initialization complete');
    console.log('[Modal Fix V2] Global openModal() is now async and loads modals on-demand');

})();
