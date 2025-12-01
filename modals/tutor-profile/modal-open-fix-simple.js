/**
 * Modal Open Fix - Simple Version
 *
 * This script wraps modal open functions to ensure modals are loaded
 * from external files before attempting to open them.
 *
 * It intercepts calls to modal open functions, loads the modal if needed,
 * and then calls the original open function.
 */

(function() {
    'use strict';

    console.log('[ModalOpenFix] Initializing...');

    // Store original functions
    const originalFunctions = {};

    /**
     * Wrap a modal open function to load the modal first
     * @param {string} functionName - Name of the function to wrap
     * @param {string} modalId - ID of the modal element
     * @param {string} modalFile - Filename of the modal HTML
     */
    function wrapModalOpenFunction(functionName, modalId, modalFile) {
        // Wait a bit for the function to be defined
        setTimeout(() => {
            // Store original function if it exists
            if (typeof window[functionName] === 'function') {
                originalFunctions[functionName] = window[functionName];
                console.log(`[ModalOpenFix] Found function to wrap: ${functionName}`);
            } else {
                console.warn(`[ModalOpenFix] Function not found: ${functionName}`);
                return;
            }

            // Create wrapper function
            window[functionName] = async function(...args) {
                console.log(`[ModalOpenFix] ${functionName} called with args:`, args);

                // Check if modal exists in DOM
                if (!document.getElementById(modalId)) {
                    console.log(`[ModalOpenFix] Modal ${modalId} not in DOM, loading from ${modalFile}...`);

                    try {
                        // Load the modal
                        await ModalLoader.load(modalFile);
                        console.log(`[ModalOpenFix] Modal ${modalId} loaded successfully`);

                        // Wait a tiny bit for DOM to update
                        await new Promise(resolve => setTimeout(resolve, 50));
                    } catch (error) {
                        console.error(`[ModalOpenFix] Failed to load modal ${modalId}:`, error);
                        alert(`Failed to load modal. Please refresh the page.`);
                        return;
                    }
                }

                // Verify modal is now in DOM
                const modalElement = document.getElementById(modalId);
                if (!modalElement) {
                    console.error(`[ModalOpenFix] Modal ${modalId} still not in DOM after loading!`);
                    alert(`Modal failed to load. Please refresh the page.`);
                    return;
                }

                // Call original function if it exists
                if (originalFunctions[functionName]) {
                    console.log(`[ModalOpenFix] Calling original ${functionName}`);
                    return originalFunctions[functionName].apply(this, args);
                } else {
                    console.error(`[ModalOpenFix] Original function ${functionName} not found`);
                }
            };

            console.log(`[ModalOpenFix] ✅ Wrapped function: ${functionName}`);
        }, 100); // Give time for community-modal-functions.js to load
    }

    /**
     * Initialize when DOM is ready
     */
    function init() {
        console.log('[ModalOpenFix] Wrapping modal open functions...');

        // Wait for ModalLoader to be initialized
        if (typeof ModalLoader === 'undefined') {
            console.error('[ModalOpenFix] ModalLoader not found. Make sure modal-loader.js is loaded first.');
            return;
        }

        // Wrap all modal open functions
        // Format: wrapModalOpenFunction('functionName', 'modalId', 'modal-file.html')

        // Community Modal - PRIORITY
        wrapModalOpenFunction('openCommunityModal', 'communityModal', 'community-modal.html');
        wrapModalOpenFunction('closeCommunityModal', 'communityModal', 'community-modal.html');

        // Custom Filter Modal (used by community modal)
        wrapModalOpenFunction('openCustomFilterModal', 'customFilterModal', 'custom-filter-modal.html');

        // Edit Profile Modal
        wrapModalOpenFunction('openEditProfileModal', 'edit-profile-modal', 'edit-profile-modal.html');

        // Package Management Modal
        wrapModalOpenFunction('openPackageModal', 'package-management-modal', 'package-management-modal.html');

        // Quiz Modals
        wrapModalOpenFunction('openQuizMainModal', 'quizMainModal', 'quiz-main-modal.html');
        wrapModalOpenFunction('openQuizGiveModal', 'quizGiveModal', 'quiz-give-modal.html');
        wrapModalOpenFunction('openQuizMyQuizzesModal', 'quizMyQuizzesModal', 'quiz-my-quizzes-modal.html');
        wrapModalOpenFunction('openQuizViewDetailsModal', 'quizViewDetailsModal', 'quiz-view-details-modal.html');
        wrapModalOpenFunction('openQuizViewAnswersModal', 'quizViewAnswersModal', 'quiz-view-answers-modal.html');

        // Upload Modals
        wrapModalOpenFunction('openProfileUploadModal', 'profileUploadModal', 'profile-upload-modal.html');
        wrapModalOpenFunction('openCoverUploadModal', 'coverUploadModal', 'cover-upload-modal.html');
        wrapModalOpenFunction('openStoryUploadModal', 'storyUploadModal', 'story-upload-modal.html');
        wrapModalOpenFunction('openUploadDocumentModal', 'uploadDocumentModal', 'upload-document-modal.html');

        // Story Viewer Modal
        wrapModalOpenFunction('openStoryViewerModal', 'storyViewerModal', 'story-viewer-modal.html');

        // Schedule Modal
        wrapModalOpenFunction('openScheduleModal', 'scheduleModal', 'schedule-modal.html');
        wrapModalOpenFunction('openViewScheduleModal', 'viewScheduleModal', 'view-schedule-modal.html');

        // Achievement, Certification, Experience Modals
        wrapModalOpenFunction('openAchievementModal', 'achievementModal', 'achievement-modal.html');
        wrapModalOpenFunction('openViewAchievementModal', 'viewAchievementModal', 'view-achievement-modal.html');
        wrapModalOpenFunction('openCertificationModal', 'certificationModal', 'certification-modal.html');
        wrapModalOpenFunction('openViewCertificationModal', 'viewCertificationModal', 'view-certification-modal.html');
        wrapModalOpenFunction('openExperienceModal', 'experienceModal', 'experience-modal.html');
        wrapModalOpenFunction('openViewExperienceModal', 'viewExperienceModal', 'view-experience-modal.html');

        // Subscription Modals
        wrapModalOpenFunction('openSubscriptionModal', 'subscription-modal', 'subscription-modal.html');
        wrapModalOpenFunction('openSwitchSubscriptionModal', 'switchSubscriptionModal', 'switch-subscription-modal.html');
        wrapModalOpenFunction('openPlanDetailsModal', 'plan-details-modal', 'plan-details-modal.html');

        // Unsubscribe Modals
        wrapModalOpenFunction('openUnsubscribeModal1', 'unsubscribeModal1', 'unsubscribe-1-modal.html');
        wrapModalOpenFunction('openUnsubscribeConfirm1', 'unsubscribeConfirm1', 'unsubscribe-confirm1-modal.html');
        wrapModalOpenFunction('openUnsubscribeConfirm2', 'unsubscribeConfirm2', 'unsubscribe-confirm2-modal.html');
        wrapModalOpenFunction('openUnsubscribePasswordModal', 'unsubscribePasswordModal', 'unsubscribe-password-modal.html');
        wrapModalOpenFunction('openUnsubscribeFinalModal', 'unsubscribeFinalModal', 'unsubscribe-final-modal.html');

        // Delete Account Modals
        wrapModalOpenFunction('openDeleteModal1', 'deleteModal1', 'delete-1-modal.html');
        wrapModalOpenFunction('openDeletePasswordModal', 'deletePasswordModal', 'delete-password-modal.html');
        wrapModalOpenFunction('openDeleteSubscriptionCheckModal', 'deleteSubscriptionCheckModal', 'delete-subscription-check-modal.html');
        wrapModalOpenFunction('openDeleteVerifyModal', 'deleteVerifyModal', 'delete-verify-modal.html');
        wrapModalOpenFunction('openDeleteFinalModal', 'deleteFinalModal', 'delete-final-modal.html');

        // Verification Modals
        wrapModalOpenFunction('openVerificationModal', 'verificationModal', 'verification-modal.html');
        wrapModalOpenFunction('openVerificationFeeModal', 'verificationFeeModal', 'verification-fee-modal.html');
        wrapModalOpenFunction('openOTPVerificationModal', 'otp-verification-modal', 'otp-verification-modal.html');
        wrapModalOpenFunction('openOTPConfirmationModal', 'otp-confirmation-modal', 'otp-confirmation-modal.html');
        wrapModalOpenFunction('openVerifyPersonalInfoModal', 'verify-personal-info-modal', 'verify-personal-info-modal.html');

        // Payment Method Modal
        wrapModalOpenFunction('openPaymentMethodModal', 'payment-method-modal', 'payment-method-modal.html');

        // Leave Astegni Modal
        wrapModalOpenFunction('openLeaveAstegniModal', 'leave-astegni-modal', 'leave-astegni-modal.html');

        // Ad Analytics Modal
        wrapModalOpenFunction('openAdAnalyticsModal', 'adAnalyticsModal', 'ad-analytics-modal.html');

        // Student Details Modal
        wrapModalOpenFunction('openStudentDetailsModal', 'studentDetailsModal', 'student-details-modal.html');

        // View Request Modal
        wrapModalOpenFunction('openViewRequestModal', 'viewRequestModal', 'view-request-modal.html');

        // Create Event/Club Modals
        wrapModalOpenFunction('openCreateEventModal', 'create-event-modal', 'create-event-modal.html');
        wrapModalOpenFunction('openCreateClubModal', 'create-club-modal', 'create-club-modal.html');

        // Coming Soon Modal - loaded from common-modals
        wrapModalOpenFunction('openComingSoonModal', 'coming-soon-modal', 'coming-soon-modal.html');

        console.log('[ModalOpenFix] All modal functions scheduled for wrapping');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already loaded, initialize immediately
        init();
    }

    console.log('[ModalOpenFix] Script loaded');
})();
