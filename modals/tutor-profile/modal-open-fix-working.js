/**
 * Modal Opening Fix - Working Version
 *
 * This replaces the openModal function to handle external modal loading.
 * Works synchronously with onclick handlers.
 */

(function() {
    'use strict';

    console.log('[Modal Fix] Initializing...');

    // Store original functions
    const originalOpenModal = window.openModal;
    const originalTutorModalManagerOpen = window.TutorModalManager?.open;

    /**
     * New openModal function that loads external modals
     */
    function openModal(modalId) {
        console.log(`[Modal Fix] openModal called: ${modalId}`);

        // Load modal asynchronously, but don't block the function
        (async () => {
            try {
                // Wait for ModalLoader if not ready yet
                let attempts = 0;
                while (typeof ModalLoader === 'undefined' && attempts < 30) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }

                if (typeof ModalLoader === 'undefined') {
                    console.error('[Modal Fix] ModalLoader not available');
                    tryShowModalDirectly(modalId);
                    return;
                }

                // Load the modal HTML if not already in DOM
                const existingModal = document.getElementById(modalId);
                if (!existingModal) {
                    console.log(`[Modal Fix] Loading external modal: ${modalId}`);
                    await ModalLoader.loadById(modalId);
                    console.log(`[Modal Fix] Modal loaded: ${modalId}`);
                }

                // Now show the modal
                showModal(modalId);

            } catch (error) {
                console.error(`[Modal Fix] Error loading modal ${modalId}:`, error);
                tryShowModalDirectly(modalId);
            }
        })();
    }

    /**
     * Show modal after it's loaded
     */
    function showModal(modalId) {
        const modal = document.getElementById(modalId);

        if (!modal) {
            console.error(`[Modal Fix] Modal not found: ${modalId}`);
            return;
        }

        console.log(`[Modal Fix] Showing modal: ${modalId}`);

        // Remove hidden class
        modal.classList.remove('hidden');
        modal.classList.add('show');

        // Set display styles
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        console.log(`[Modal Fix] ✅ Modal shown: ${modalId}`);
    }

    /**
     * Try to show modal directly (fallback)
     */
    function tryShowModalDirectly(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            showModal(modalId);
        } else {
            console.error(`[Modal Fix] Cannot show modal - not found: ${modalId}`);
            alert(`Modal "${modalId}" could not be loaded. Please refresh the page.`);
        }
    }

    /**
     * Enhanced closeModal function
     */
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('show');
            modal.style.display = 'none';
            document.body.style.overflow = '';
            console.log(`[Modal Fix] Closed modal: ${modalId}`);
        }
    }

    // Replace global functions
    window.openModal = openModal;
    window.closeModal = closeModal;

    console.log('[Modal Fix] ✅ Initialized - openModal() replaced');

    // Also patch TutorModalManager if it exists
    const checkTutorModalManager = setInterval(() => {
        if (window.TutorModalManager && window.TutorModalManager.open) {
            const originalOpen = window.TutorModalManager.open;

            window.TutorModalManager.open = function(modalId) {
                console.log(`[Modal Fix] TutorModalManager.open called: ${modalId}`);

                // Use our openModal function
                openModal(modalId);
            };

            console.log('[Modal Fix] ✅ TutorModalManager.open() patched');
            clearInterval(checkTutorModalManager);
        }
    }, 100);

    // Clear interval after 5 seconds
    setTimeout(() => clearInterval(checkTutorModalManager), 5000);

    // Wrap specific modal opening functions
    setTimeout(() => {
        const functionsToWrap = [
            'openEditProfileModal',
            'openCertificationModal',
            'openExperienceModal',
            'openAchievementModal',
            'openScheduleModal',
            'openCommunityModal',
            'openVerifyPersonalInfoModal',
            'openPaymentMethodModal',
            'openSubscriptionModal',
            'openLeaveAstegniModal'
        ];

        let wrappedCount = 0;

        functionsToWrap.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                const originalFunc = window[funcName];

                window[funcName] = function(...args) {
                    console.log(`[Modal Fix] ${funcName} intercepted`);

                    // Determine modal ID
                    let modalId = funcName
                        .replace(/^open/, '')
                        .replace(/Modal$/, '')
                        .replace(/([A-Z])/g, '-$1')
                        .toLowerCase()
                        .replace(/^-/, '');

                    // Add -modal suffix if not present
                    if (!modalId.endsWith('-modal')) {
                        modalId += '-modal';
                    }

                    // Pre-load the modal
                    openModal(modalId);

                    // Also call original function (it might have additional logic)
                    setTimeout(() => {
                        try {
                            originalFunc.apply(this, args);
                        } catch (e) {
                            console.warn(`[Modal Fix] Original ${funcName} failed:`, e);
                        }
                    }, 200);
                };

                wrappedCount++;
            }
        });

        if (wrappedCount > 0) {
            console.log(`[Modal Fix] ✅ Wrapped ${wrappedCount} specific modal functions`);
        }
    }, 1000);

})();
