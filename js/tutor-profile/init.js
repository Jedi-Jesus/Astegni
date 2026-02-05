// ============================================
// TUTOR PROFILE INITIALIZATION
// Module coordination and initialization
// ============================================

/**
 * Initialize Tutor Profile Application
 *
 * This module coordinates the initialization of all tutor profile modules
 * following Astegni's four-tier architecture pattern.
 *
 * Module Loading Order:
 * 1. State Manager - Initialize state and load from storage
 * 2. API Service - Ready for API calls
 * 3. UI Manager - Setup UI components
 * 4. Modal Manager - Setup modals and event listeners
 * 5. Upload Handler - Setup file upload handlers
 * 6. Profile Controller - Main controller initialization
 * 7. Global Functions - Export functions for HTML onclick handlers
 */

// Guard to prevent multiple initializations
let _tutorProfileInitialized = false;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    if (_tutorProfileInitialized) {
        console.log('⚠️ Tutor Profile init.js already initialized, skipping...');
        return;
    }
    _tutorProfileInitialized = true;

    console.log('🚀 INITIALIZING TUTOR PROFILE PAGE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // ============================================
        // AUTHENTICATION CHECK
        // ============================================
        // Check if AuthManager is loaded
        if (typeof AuthManager === 'undefined' || typeof window.AuthManager === 'undefined') {
            console.error('❌ AuthManager not loaded! Redirecting to login...');
            alert('Authentication manager not loaded. Please refresh the page.');
            window.location.href = '../index.html';
            return;
        }

        // Wait for AuthManager to restore session
        await window.AuthManager.restoreSession();

        // Check if user is authenticated
        if (!window.AuthManager.isAuthenticated()) {
            console.warn('⚠️ User not authenticated. Redirecting to login...');
            alert('Please log in to access your tutor profile.');
            window.location.href = '../index.html';
            return;
        }

        // FIX: Check if role switch is in progress FIRST (before getting userRole)
        // Use localStorage with timestamp - valid for 10 seconds after switch
        const switchTimestamp = localStorage.getItem('role_switch_timestamp');
        const targetRole = localStorage.getItem('role_switch_target');

        console.log('🔍 [TutorProfile] Grace Period Check:', {
            switchTimestamp: switchTimestamp,
            targetRole: targetRole,
            currentTime: Date.now(),
            timeSinceSwitch: switchTimestamp ? Date.now() - parseInt(switchTimestamp) : 'N/A'
        });

        if (switchTimestamp && targetRole === 'tutor') {
            const timeSinceSwitch = Date.now() - parseInt(switchTimestamp);
            const isWithinGracePeriod = timeSinceSwitch < 10000; // 10 seconds grace period

            console.log(`🔍 [TutorProfile] Time since switch: ${timeSinceSwitch}ms, Grace period valid: ${isWithinGracePeriod}`);

            if (isWithinGracePeriod) {
                // DON'T clear the flags here - let them expire naturally
                // This ensures any subsequent checks within the grace period still pass
                // The flags will be cleared by AuthManager.restoreSession() when they expire
                console.log('✅ [TutorProfile] Role switch detected (within 10s grace period) - allowing page load');
                console.log('✅ [TutorProfile] Skipping role validation (user just switched roles)');
                console.log(`✅ [TutorProfile] Grace period will expire in ${10000 - timeSinceSwitch}ms`);
                // Continue to initialize the page - skip role validation entirely
            } else {
                // Grace period expired, clear flags and perform normal check
                console.log(`⚠️ [TutorProfile] Role switch grace period expired (${timeSinceSwitch}ms > 10000ms), performing normal role check`);
                localStorage.removeItem('role_switch_timestamp');
                localStorage.removeItem('role_switch_target');

                // Fall through to normal role check below
                performNormalRoleCheck();
            }
        } else {
            // No role switch in progress - perform normal check
            console.log('🔍 [TutorProfile] No active role switch detected, performing normal role check');
            performNormalRoleCheck();
        }

        function performNormalRoleCheck() {
            const userRole = window.AuthManager.getUserRole();
            const user = window.AuthManager.getUser();

            // DEBUG: Log detailed role information
            console.log('🔍 [TutorProfile] Role Check Debug:', {
                userRole: userRole,
                user_active_role: user?.active_role,
                user_role: user?.role,
                user_roles: user?.roles,
                localStorage_userRole: localStorage.getItem('userRole'),
                localStorage_switchTimestamp: localStorage.getItem('role_switch_timestamp'),
                localStorage_switchTarget: localStorage.getItem('role_switch_target')
            });

            // More defensive role check - handle undefined, null, and string "undefined"
            const normalizedRole = userRole && userRole !== 'undefined' && userRole !== 'null' ? userRole : null;

            if (normalizedRole !== 'tutor') {
                console.warn(`⚠️ [TutorProfile] User role is '${normalizedRole}', not 'tutor'. Redirecting...`);
                alert(`This page is for tutors only. You are logged in as: ${normalizedRole || 'unknown'}\n\nPlease switch to your tutor role or log in with a tutor account.`);
                window.location.href = '../index.html';
                return;
            }
        }

        console.log('✅ Authentication verified for tutor role');

        // ============================================
        // CHECK API SERVICE
        // ============================================
        // Check if API service is loaded
        if (typeof TutorProfileAPI === 'undefined') {
            console.error('❌ TutorProfileAPI not loaded');
            return;
        }

        console.log('✅ API Service loaded');

        // Small delay to ensure all modules are fully parsed
        await new Promise(resolve => setTimeout(resolve, 50));

        // Initialize Profile Data Loader to fetch profile from database
        console.log('📊 Initializing Profile Data Loader...');
        if (typeof TutorProfileDataLoader !== 'undefined') {
            await TutorProfileDataLoader.init();
            console.log('✅ Profile Data Loader initialized');
        } else {
            console.warn('⚠️ TutorProfileDataLoader not loaded');
        }

        console.log('🖼️ Initializing Image Upload Handler...');
        if (typeof ImageUploadHandler !== 'undefined') {
            ImageUploadHandler.init();
        }

        console.log('✏️ Initializing Profile Edit Handler...');
        if (typeof TutorProfileEditHandler !== 'undefined') {
            TutorProfileEditHandler.init();
        }

        // Initialize existing modules if present
        if (typeof TutorProfileController !== 'undefined') {
            console.log('📊 Initializing Profile Controller...');
            await TutorProfileController.init();
        }

        // Initialize Community Manager (Database Integration)
        console.log('👥 Initializing Community Manager...');
        if (typeof CommunityManager !== 'undefined') {
            window.communityManager = new CommunityManager();
            console.log('✅ Community Manager initialized');
        } else {
            console.warn('⚠️ CommunityManager not loaded');
        }

        // Initialize Reviews Panel Manager
        console.log('🌟 Initializing Reviews Panel Manager...');
        if (typeof ReviewsPanelManager !== 'undefined') {
            await ReviewsPanelManager.init();
            console.log('✅ Reviews Panel Manager initialized');
        } else {
            console.warn('⚠️ ReviewsPanelManager not loaded');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ TUTOR PROFILE INITIALIZATION COMPLETE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Setup school search if elements exist
        const schoolInputs = ['cert-institution', 'exp-institution'];
        schoolInputs.forEach(inputId => {
            if (document.getElementById(inputId)) {
                setupSchoolSearch(inputId);
            }
        });

    } catch (error) {
        console.error('❌ ERROR DURING INITIALIZATION:', error);
        console.error('Stack trace:', error.stack);

        // Show user-friendly error message
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification(
                'Failed to initialize profile. Please refresh the page.',
                'error'
            );
        }
    }
});

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TutorProfileController,
        TutorProfileState,
        TutorProfileUI,
        TutorProfileAPI,
        TutorModalManager,
        TutorUploadHandler
    };
}

// Global module access for debugging
window.TutorProfile = {
    Controller: typeof TutorProfileController !== 'undefined' ? TutorProfileController : null,
    State: typeof TutorProfileState !== 'undefined' ? TutorProfileState : null,
    UI: typeof TutorProfileUI !== 'undefined' ? TutorProfileUI : null,
    API: typeof TutorProfileAPI !== 'undefined' ? TutorProfileAPI : null,
    Modals: typeof TutorModalManager !== 'undefined' ? TutorModalManager : null,
    Upload: typeof TutorUploadHandler !== 'undefined' ? TutorUploadHandler : null
};

console.log('📦 Tutor Profile modules available via window.TutorProfile');
