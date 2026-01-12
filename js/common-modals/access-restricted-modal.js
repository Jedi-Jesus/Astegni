/**
 * Access Restricted Modal Manager
 *
 * Shows a beautiful modal when user tries to access a feature that requires
 * profile completion or KYC verification.
 *
 * This file should be loaded early in the page to ensure the functions are
 * available when ProfileCompletionGuard needs them.
 */

// Store the verification type for when user proceeds
let accessRestrictedVerificationType = 'profile'; // 'profile' or 'kyc'

/**
 * Open the access restricted modal with custom message
 * @param {object} options - Configuration options
 * @param {string} options.reason - 'profile_incomplete' or 'kyc_not_verified'
 * @param {string[]} options.missingFields - Array of missing field names (for profile_incomplete)
 * @param {string} options.featureName - Name of the feature being accessed
 */
function openAccessRestrictedModal(options = {}) {
    const modal = document.getElementById('accessRestrictedModal');
    if (!modal) {
        console.warn('[AccessRestrictedModal] Modal not found in DOM, attempting to load...');
        // Try to load the modal dynamically if not present
        _loadAccessRestrictedModalAndOpen(options);
        return;
    }

    _populateAndShowModal(modal, options);
}

/**
 * Load the modal HTML dynamically and then open it
 * @param {object} options - Modal options
 */
async function _loadAccessRestrictedModalAndOpen(options) {
    try {
        // Determine the correct path based on current page location
        const currentPath = window.location.pathname;
        let basePath;

        if (currentPath.includes('/profile-pages/') ||
            currentPath.includes('/view-profiles/') ||
            currentPath.includes('/branch/') ||
            currentPath.includes('/admin-pages/')) {
            basePath = '../modals/common-modals/';
        } else {
            basePath = 'modals/common-modals/';
        }

        const response = await fetch(basePath + 'access-restricted-modal.html');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();

        // Create a container if it doesn't exist
        let container = document.getElementById('modal-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'modal-container';
            document.body.appendChild(container);
        }

        // Check if modal already exists (might have been loaded by another process)
        if (!document.getElementById('accessRestrictedModal')) {
            container.insertAdjacentHTML('beforeend', html);
        }

        // Now open the modal
        const modal = document.getElementById('accessRestrictedModal');
        if (modal) {
            _populateAndShowModal(modal, options);
        } else {
            console.error('[AccessRestrictedModal] Failed to load modal');
            // Ultimate fallback
            _showFallbackNotification(options);
        }

    } catch (error) {
        console.error('[AccessRestrictedModal] Error loading modal:', error);
        _showFallbackNotification(options);
    }
}

/**
 * Populate and show the modal
 * @param {HTMLElement} modal - The modal element
 * @param {object} options - Modal options
 */
function _populateAndShowModal(modal, options) {
    const { reason, missingFields = [], featureName = 'this feature' } = options;

    // Get elements
    const titleEl = document.getElementById('accessRestrictedTitle');
    const messageEl = document.getElementById('accessRestrictedMessage');
    const reasonEl = document.getElementById('accessRestrictedReason');
    const missingFieldsEl = document.getElementById('accessRestrictedMissingFields');

    // Set content based on reason
    if (reason === 'profile_incomplete') {
        accessRestrictedVerificationType = 'profile';

        if (titleEl) titleEl.textContent = 'Complete Your Profile';
        if (messageEl) messageEl.textContent = `To access ${featureName}, please complete your profile information first.`;
        if (reasonEl) reasonEl.textContent = 'The following information is required:';

        // Show missing fields
        if (missingFieldsEl && missingFields.length > 0) {
            missingFieldsEl.innerHTML = missingFields.map(field => `<li>${field}</li>`).join('');
            missingFieldsEl.classList.remove('hidden');
        }
    } else if (reason === 'kyc_not_verified') {
        accessRestrictedVerificationType = 'kyc';

        if (titleEl) titleEl.textContent = 'Identity Verification Required';
        if (messageEl) messageEl.textContent = `To access ${featureName}, please verify your identity first.`;
        if (reasonEl) reasonEl.textContent = 'Identity verification helps us maintain a safe and trusted community. Please complete your KYC (Know Your Customer) verification.';

        // Hide missing fields list for KYC
        if (missingFieldsEl) {
            missingFieldsEl.classList.add('hidden');
        }
    } else {
        // Generic message
        accessRestrictedVerificationType = 'profile';

        if (titleEl) titleEl.textContent = 'Verification Required';
        if (messageEl) messageEl.textContent = `To access ${featureName}, please complete your verification.`;
        if (reasonEl) reasonEl.textContent = 'Please complete your profile and identity verification to unlock all features.';
        if (missingFieldsEl) missingFieldsEl.classList.add('hidden');
    }

    // Show modal - remove hidden class and force display
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';

    console.log(`[AccessRestrictedModal] Opened for reason: ${reason}, feature: ${featureName}`);
}

/**
 * Show fallback notification when modal can't be loaded
 * @param {object} options - Modal options
 */
function _showFallbackNotification(options) {
    const { reason, featureName = 'this feature' } = options;

    let message;
    if (reason === 'profile_incomplete') {
        message = `Please complete your profile to access ${featureName}`;
    } else if (reason === 'kyc_not_verified') {
        message = `Please verify your identity to access ${featureName}`;
    } else {
        message = `Please complete verification to access ${featureName}`;
    }

    // Use showNotification if available, otherwise create a toast
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, 'warning');
    } else {
        // Create inline toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white bg-amber-500 border-2 border-amber-600 transform transition-transform duration-300';
        toast.innerHTML = `
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <p class="font-medium text-sm">${message}</p>
            <button onclick="this.parentElement.remove()" class="ml-2 hover:opacity-70">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }

    // Open verify modal directly
    if (typeof openVerifyPersonalInfoModal === 'function') {
        setTimeout(() => {
            openVerifyPersonalInfoModal();
            if (reason === 'kyc_not_verified' && typeof switchVerifyTab === 'function') {
                setTimeout(() => switchVerifyTab('identity'), 300);
            }
        }, 100);
    }
}

/**
 * Close the access restricted modal
 * @param {Event} event - Optional click event
 */
function closeAccessRestrictedModal(event) {
    // If event exists and target is not the overlay, don't close
    if (event && event.target !== event.currentTarget) {
        return;
    }

    const modal = document.getElementById('accessRestrictedModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        console.log('[AccessRestrictedModal] Closed');
    }
}

/**
 * Proceed to verification modal
 */
function proceedToVerification() {
    // Close this modal first
    closeAccessRestrictedModal();

    // Small delay then open verification modal
    setTimeout(() => {
        if (typeof openVerifyPersonalInfoModal === 'function') {
            openVerifyPersonalInfoModal();

            // If KYC verification needed, switch to identity tab after modal opens
            if (accessRestrictedVerificationType === 'kyc') {
                setTimeout(() => {
                    if (typeof switchVerifyTab === 'function') {
                        switchVerifyTab('identity');
                    }
                }, 300);
            }
        } else {
            console.error('[AccessRestrictedModal] openVerifyPersonalInfoModal function not found');
            // Show a helpful message
            if (typeof window.showNotification === 'function') {
                window.showNotification('Please go to Settings > Verify Personal Info to complete verification.', 'info');
            } else {
                alert('Please go to Settings > Verify Personal Info to complete verification.');
            }
        }
    }, 200);
}

// Close on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('accessRestrictedModal');
        if (modal && !modal.classList.contains('hidden')) {
            closeAccessRestrictedModal();
        }
    }
});

// Expose functions globally
window.openAccessRestrictedModal = openAccessRestrictedModal;
window.closeAccessRestrictedModal = closeAccessRestrictedModal;
window.proceedToVerification = proceedToVerification;

console.log('[OK] Access Restricted Modal Manager loaded');
