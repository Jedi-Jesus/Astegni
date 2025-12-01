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

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 INITIALIZING TUTOR PROFILE PAGE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // Check if API service is loaded
        if (typeof TutorProfileAPI === 'undefined') {
            console.error('❌ TutorProfileAPI not loaded');
            return;
        }

        console.log('✅ API Service loaded');

        // Small delay to ensure all modules are fully parsed
        await new Promise(resolve => setTimeout(resolve, 50));

        // REMOVED: TutorProfileDataLoader.init() - Dead code, never actually used
        // Using inline loadProfileHeaderData() function in HTML instead (line 11396 of tutor-profile.html)
        console.log('📊 Profile Data Loader REMOVED - Using inline loadProfileHeaderData() instead');

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
