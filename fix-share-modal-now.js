/**
 * EMERGENCY FIX: Share Modal Closes Immediately
 * Paste this in console to fix the issue NOW
 */

(function() {
    console.log('🔧 [FIX] Applying Share Modal emergency fix...');

    // Store original function
    const originalShareProfile = window.shareProfile;

    if (!originalShareProfile) {
        console.error('❌ shareProfile() not found!');
        return;
    }

    // Wrap shareProfile to stop event propagation
    window.shareProfile = async function(event) {
        // CRITICAL: Stop the click from bubbling up to document listeners
        if (event) {
            event.stopPropagation();
            event.stopImmediatePropagation();
        }

        // Call original function
        return await originalShareProfile.call(this, event);
    };

    console.log('✅ [FIX] shareProfile() wrapped with event.stopPropagation()');

    // Now we need to fix all the onclick attributes to pass 'event'
    // Find all buttons that call shareProfile
    const shareButtons = document.querySelectorAll('[onclick*="shareProfile"]');

    shareButtons.forEach(button => {
        const oldOnclick = button.getAttribute('onclick');

        if (!oldOnclick.includes('event')) {
            // Replace shareProfile() with shareProfile(event)
            const newOnclick = oldOnclick.replace('shareProfile()', 'shareProfile(event)');
            button.setAttribute('onclick', newOnclick);

            console.log('✅ [FIX] Updated button onclick to pass event parameter');
        }
    });

    console.log('');
    console.log('✅ [FIX] Share Modal fix applied successfully!');
    console.log('💡 [FIX] Try clicking "Share Profile" button now');
    console.log('');

})();
