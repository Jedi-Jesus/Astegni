/**
 * Modal Opening Fix - Auto-loads modals before showing them
 *
 * This script wraps all modal show functions to ensure modals are loaded
 * from external files before being displayed.
 *
 * It automatically detects and wraps functions that open modals.
 */

(function() {
    'use strict';

    console.log('[Modal Open Fix] Initializing...');

    // Wait for ModalLoader to be available
    const waitForModalLoader = setInterval(() => {
        if (typeof ModalLoader !== 'undefined' && ModalLoader.loadById) {
            clearInterval(waitForModalLoader);
            initializeModalOpenFix();
        }
    }, 100);

    function initializeModalOpenFix() {
        console.log('[Modal Open Fix] ModalLoader found, setting up wrappers...');

        // List of all modal IDs and their corresponding show functions
        const modalFunctions = {
            // Authentication & Security
            'communityModal': ['showCommunityModal', 'openCommunityModal'],
            'customFilterModal': ['showCustomFilterModal', 'openCustomFilterModal'],
            'verify-personal-info-modal': ['showVerifyPersonalInfoModal', 'openVerifyPersonalInfoModal'],
            'edit-profile-modal': ['showEditProfileModal', 'openEditProfileModal'],
            'otp-confirmation-modal': ['showOtpConfirmationModal', 'openOtpConfirmationModal'],
            'otp-verification-modal': ['showOtpVerificationModal', 'openOtpVerificationModal'],

            // Media Management
            'coverUploadModal': ['showCoverUploadModal', 'openCoverUploadModal'],
            'profileUploadModal': ['showProfileUploadModal', 'openProfileUploadModal'],
            'storyUploadModal': ['showStoryUploadModal', 'openStoryUploadModal'],

            // Subscription & Billing
            'subscription-modal': ['showSubscriptionModal', 'openSubscriptionModal'],
            'plan-details-modal': ['showPlanDetailsModal', 'openPlanDetailsModal'],
            'switchSubscriptionModal': ['showSwitchSubscriptionModal', 'openSwitchSubscriptionModal'],
            'payment-method-modal': ['showPaymentMethodModal', 'openPaymentMethodModal'],
            'unsubscribeModal1': ['showUnsubscribeModal1', 'openUnsubscribeModal1'],
            'unsubscribeConfirm1': ['showUnsubscribeConfirm1', 'openUnsubscribeConfirm1'],
            'unsubscribeConfirm2': ['showUnsubscribeConfirm2', 'openUnsubscribeConfirm2'],
            'unsubscribePasswordModal': ['showUnsubscribePasswordModal', 'openUnsubscribePasswordModal'],
            'unsubscribeFinalModal': ['showUnsubscribeFinalModal', 'openUnsubscribeFinalModal'],

            // Account Management
            'leave-astegni-modal': ['showLeaveAstegniModal', 'openLeaveAstegniModal'],
            'deleteModal1': ['showDeleteModal1', 'openDeleteModal1'],
            'deleteVerifyModal': ['showDeleteVerifyModal', 'openDeleteVerifyModal'],
            'deleteSubscriptionCheckModal': ['showDeleteSubscriptionCheckModal', 'openDeleteSubscriptionCheckModal'],
            'deletePasswordModal': ['showDeletePasswordModal', 'openDeletePasswordModal'],
            'deleteFinalModal': ['showDeleteFinalModal', 'openDeleteFinalModal'],

            // Credentials & Verification
            'certificationModal': ['showCertificationModal', 'openCertificationModal'],
            'achievementModal': ['showAchievementModal', 'openAchievementModal'],
            'experienceModal': ['showExperienceModal', 'openExperienceModal'],
            'viewCertificationModal': ['showViewCertificationModal', 'openViewCertificationModal'],
            'viewAchievementModal': ['showViewAchievementModal', 'openViewAchievementModal'],
            'viewExperienceModal': ['showViewExperienceModal', 'openViewExperienceModal'],
            'verificationFeeModal': ['showVerificationFeeModal', 'openVerificationFeeModal'],
            'verificationModal': ['showVerificationModal', 'openVerificationModal'],

            // Scheduling & Sessions
            'scheduleModal': ['showScheduleModal', 'openScheduleModal'],
            'viewScheduleModal': ['showViewScheduleModal', 'openViewScheduleModal'],
            'viewRequestModal': ['showViewRequestModal', 'openViewRequestModal'],

            // Quiz System
            'quizMainModal': ['showQuizMainModal', 'openQuizMainModal'],
            'quizGiveModal': ['showQuizGiveModal', 'openQuizGiveModal'],
            'quizMyQuizzesModal': ['showQuizMyQuizzesModal', 'openQuizMyQuizzesModal'],
            'quizViewAnswersModal': ['showQuizViewAnswersModal', 'openQuizViewAnswersModal'],
            'quizViewDetailsModal': ['showQuizViewDetailsModal', 'openQuizViewDetailsModal'],

            // Content & Analytics
            'uploadDocumentModal': ['showUploadDocumentModal', 'openUploadDocumentModal'],
            'package-management-modal': ['showPackageManagementModal', 'openPackageManagementModal'],
            'adAnalyticsModal': ['showAdAnalyticsModal', 'openAdAnalyticsModal'],
            'studentDetailsModal': ['showStudentDetailsModal', 'openStudentDetailsModal'],

            // Community & Social
            'create-event-modal': ['showCreateEventModal', 'openCreateEventModal'],
            'create-club-modal': ['showCreateClubModal', 'openCreateClubModal'],
            'storyViewerModal': ['showStoryViewerModal', 'openStoryViewerModal'],

            // Utility
            'coming-soon-modal': ['showComingSoonModal', 'openComingSoonModal']
        };

        let wrappedCount = 0;

        // Wrap each modal's show functions
        Object.keys(modalFunctions).forEach(modalId => {
            const functionNames = modalFunctions[modalId];

            functionNames.forEach(funcName => {
                if (typeof window[funcName] === 'function') {
                    wrapModalFunction(modalId, funcName);
                    wrappedCount++;
                } else {
                    // Create the function if it doesn't exist
                    window[funcName] = createModalShowFunction(modalId);
                    wrappedCount++;
                }
            });
        });

        console.log(`[Modal Open Fix] Wrapped ${wrappedCount} modal functions`);
        console.log('[Modal Open Fix] Ready! All modals will load on-demand.');
    }

    /**
     * Wrap an existing modal show function
     */
    function wrapModalFunction(modalId, functionName) {
        const originalFunction = window[functionName];

        const wrappedFunction = async function(...args) {
            console.log(`[Modal Open Fix] ${functionName} called, loading modal: ${modalId}`);

            // Ensure modal is loaded first
            try {
                await ModalLoader.loadById(modalId);
                console.log(`[Modal Open Fix] Modal ${modalId} loaded successfully`);
            } catch (error) {
                console.error(`[Modal Open Fix] Failed to load modal ${modalId}:`, error);
                return;
            }

            // Call original function if it exists
            if (typeof originalFunction === 'function') {
                return originalFunction.apply(this, args);
            } else {
                // If no original function, just show the modal
                const modal = document.getElementById(modalId);
                if (modal) {
                    if (modal.classList.contains('hidden')) {
                        modal.classList.remove('hidden');
                    }
                    if (modal.style.display === 'none' || !modal.style.display) {
                        modal.style.display = 'flex';
                    }
                    console.log(`[Modal Open Fix] Showed modal: ${modalId}`);
                }
            }
        };

        // Mark as wrapped so it won't be overwritten
        wrappedFunction.__modalOpenFixWrapped = true;
        wrappedFunction.__wrappedModalId = modalId;

        window[functionName] = wrappedFunction;

        console.log(`[Modal Open Fix] Wrapped: ${functionName} -> ${modalId}`);
    }

    /**
     * Create a new modal show function
     */
    function createModalShowFunction(modalId) {
        return async function() {
            // Load the modal
            await ModalLoader.loadById(modalId);

            // Show the modal
            const modal = document.getElementById(modalId);
            if (modal) {
                // Try different show methods
                if (modal.classList.contains('hidden')) {
                    modal.classList.remove('hidden');
                }
                if (modal.style.display === 'none' || !modal.style.display) {
                    modal.style.display = 'flex';
                }
                console.log(`[Modal Open Fix] Showed modal: ${modalId}`);
            } else {
                console.error(`[Modal Open Fix] Modal not found after loading: ${modalId}`);
            }
        };
    }

    /**
     * Also create a global helper for onclick handlers
     */
    window.openModal = async function(modalId) {
        await ModalLoader.loadById(modalId);

        const modal = document.getElementById(modalId);
        if (modal) {
            if (modal.classList.contains('hidden')) {
                modal.classList.remove('hidden');
            }
            if (modal.style.display === 'none' || !modal.style.display) {
                modal.style.display = 'flex';
            }
        }
    };

    console.log('[Modal Open Fix] Global openModal() function created');
    console.log('[Modal Open Fix] Usage: openModal("modalId") or onclick="openModal(\'modalId\')"');

})();
