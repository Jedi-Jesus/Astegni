/**
 * Profile Completion Guard
 * Ensures users have completed their profile and KYC verification before accessing certain features
 *
 * Required fields:
 * - first_name
 * - father_name
 * - grandfather_name
 * - date_of_birth
 * - gender
 * - kyc_verified (identity verification)
 */

const ProfileCompletionGuard = {
    /**
     * Check if user profile is complete (all required fields filled)
     * @returns {object} { complete: boolean, missingFields: string[] }
     */
    checkProfileComplete() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const missingFields = [];

        if (!user.first_name || user.first_name.trim() === '') {
            missingFields.push('First Name');
        }
        if (!user.father_name || user.father_name.trim() === '') {
            missingFields.push('Father Name');
        }
        if (!user.grandfather_name || user.grandfather_name.trim() === '') {
            missingFields.push('Grandfather Name');
        }
        if (!user.date_of_birth) {
            missingFields.push('Date of Birth');
        }
        if (!user.gender || user.gender.trim() === '') {
            missingFields.push('Gender');
        }

        return {
            complete: missingFields.length === 0,
            missingFields: missingFields
        };
    },

    /**
     * Check if user is KYC verified
     * @returns {boolean}
     */
    isKYCVerified() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.kyc_verified === true;
    },

    /**
     * Check if user can access protected features
     * @returns {object} { allowed: boolean, reason: string, missingFields: string[] }
     */
    canAccessProtectedFeatures() {
        const profileCheck = this.checkProfileComplete();
        const kycVerified = this.isKYCVerified();

        if (!profileCheck.complete) {
            return {
                allowed: false,
                reason: 'profile_incomplete',
                missingFields: profileCheck.missingFields,
                message: `Please complete your profile first. Missing: ${profileCheck.missingFields.join(', ')}`
            };
        }

        if (!kycVerified) {
            return {
                allowed: false,
                reason: 'kyc_not_verified',
                missingFields: [],
                message: 'Please verify your identity before accessing this feature.'
            };
        }

        return {
            allowed: true,
            reason: null,
            missingFields: [],
            message: null
        };
    },

    /**
     * Guard a feature - shows appropriate modal if requirements not met
     * @param {string} featureName - Name of the feature being accessed (for logging and display)
     * @param {function} callback - Function to execute if requirements are met
     * @returns {boolean} - Whether the feature was allowed
     */
    guard(featureName, callback) {
        const check = this.canAccessProtectedFeatures();

        if (!check.allowed) {
            console.log(`[ProfileGuard] Blocked access to "${featureName}": ${check.reason}`);

            if (check.reason === 'profile_incomplete') {
                // Show profile completion modal with feature name
                this.showProfileIncompleteAlert(check.missingFields, featureName);
            } else if (check.reason === 'kyc_not_verified') {
                // Show KYC verification prompt with feature name
                this.showKYCVerificationAlert(featureName);
            }

            return false;
        }

        // Requirements met, execute callback
        if (typeof callback === 'function') {
            callback();
        }
        return true;
    },

    /**
     * Show access restricted modal for incomplete profile
     * @param {string[]} missingFields
     * @param {string} featureName - Name of the feature being accessed
     */
    showProfileIncompleteAlert(missingFields, featureName = 'this feature') {
        // Use the access restricted modal if available
        if (typeof openAccessRestrictedModal === 'function') {
            openAccessRestrictedModal({
                reason: 'profile_incomplete',
                missingFields: missingFields,
                featureName: featureName
            });
        } else {
            // Fallback: Show toast notification and open verify modal directly
            this._showToast(`Please complete your profile to access ${featureName}`, 'warning');

            // Open the verify personal info modal directly
            if (typeof openVerifyPersonalInfoModal === 'function') {
                setTimeout(() => {
                    openVerifyPersonalInfoModal();
                }, 100);
            }
        }
    },

    /**
     * Show access restricted modal for KYC verification required
     * @param {string} featureName - Name of the feature being accessed
     */
    showKYCVerificationAlert(featureName = 'this feature') {
        // Use the access restricted modal if available
        if (typeof openAccessRestrictedModal === 'function') {
            openAccessRestrictedModal({
                reason: 'kyc_not_verified',
                missingFields: [],
                featureName: featureName
            });
        } else {
            // Fallback: Show toast notification and open verify modal directly
            this._showToast(`Please verify your identity to access ${featureName}`, 'warning');

            // Open the verify personal info modal and switch to identity tab
            if (typeof openVerifyPersonalInfoModal === 'function') {
                setTimeout(() => {
                    openVerifyPersonalInfoModal();
                    setTimeout(() => {
                        if (typeof switchVerifyTab === 'function') {
                            switchVerifyTab('identity');
                        }
                    }, 200);
                }, 100);
            }
        }
    },

    /**
     * Show a beautiful toast notification (fallback when modal not available)
     * @param {string} message - Message to show
     * @param {string} type - 'info', 'success', 'warning', 'error'
     */
    _showToast(message, type = 'warning') {
        // Use existing showNotification if available
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }

        // Create our own toast if showNotification not available
        const colors = {
            info: { bg: 'bg-blue-500', border: 'border-blue-600' },
            success: { bg: 'bg-green-500', border: 'border-green-600' },
            warning: { bg: 'bg-amber-500', border: 'border-amber-600' },
            error: { bg: 'bg-red-500', border: 'border-red-600' }
        };

        const icons = {
            info: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
            success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
            warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
            error: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
        };

        const color = colors[type] || colors.warning;
        const icon = icons[type] || icons.warning;

        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white ${color.bg} border-2 ${color.border} transform translate-x-full transition-transform duration-300`;
        toast.innerHTML = `
            <div class="flex-shrink-0">${icon}</div>
            <p class="font-medium text-sm">${message}</p>
            <button onclick="this.parentElement.remove()" class="ml-2 hover:opacity-70 transition-opacity">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full');
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    },

    /**
     * Check if a tutor should be visible in find-tutors
     * Backend now handles all verification (is_verified=true means profile complete + KYC)
     * Frontend just does a basic sanity check
     * @param {object} tutor - Tutor object from API
     * @returns {boolean}
     */
    isTutorVisible(tutor) {
        // Backend already filters by is_verified=true, just do basic sanity check
        if (!tutor) return false;
        return true;  // Trust backend filtering
    },

    /**
     * Filter tutors list to only show complete profiles
     * Backend now handles all verification via is_verified filter
     * @param {array} tutors - Array of tutor objects
     * @returns {array} - Filtered array of tutors with complete profiles
     */
    filterVisibleTutors(tutors) {
        if (!Array.isArray(tutors)) return [];
        return tutors.filter(tutor => this.isTutorVisible(tutor));
    }
};

// Make available globally
window.ProfileCompletionGuard = ProfileCompletionGuard;

// Shorthand function for quick checks
window.guardFeature = function(featureName, callback) {
    return ProfileCompletionGuard.guard(featureName, callback);
};

// Check function without callback
window.canAccessFeature = function() {
    return ProfileCompletionGuard.canAccessProtectedFeatures();
};

console.log('[OK] Profile Completion Guard loaded');
