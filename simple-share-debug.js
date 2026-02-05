/**
 * SIMPLE DEBUG - Let's see what's actually happening
 */

console.log('🔍 SIMPLE DEBUG LOADED');

// Wait for modal to exist
let checkCount = 0;
const checkInterval = setInterval(() => {
    const modal = document.getElementById('shareProfileModal');
    checkCount++;

    if (modal) {
        console.log('✅ Modal exists in DOM');
        clearInterval(checkInterval);
        setupDebug(modal);
    } else if (checkCount > 50) {
        console.error('❌ Modal never appeared in DOM after 5 seconds');
        clearInterval(checkInterval);
    }
}, 100);

function setupDebug(modal) {
    // Log initial state
    console.log('📊 Initial modal state:');
    console.log('  display:', modal.style.display);
    console.log('  visibility:', modal.style.visibility);
    console.log('  opacity:', modal.style.opacity);

    // Wrap shareProfile with detailed logging
    const originalShareProfile = window.shareProfile;

    window.shareProfile = async function(event) {
        console.log('');
        console.log('═'.repeat(60));
        console.log('🚀 SHARE PROFILE CLICKED');
        console.log('═'.repeat(60));

        console.log('📋 Step 1: Before calling original function');
        console.log('  Modal display:', modal.style.display);

        try {
            // Call original
            console.log('📋 Step 2: Calling original shareProfile...');
            await originalShareProfile.call(this, event);

            console.log('📋 Step 3: Original function returned');
            console.log('  Modal display:', modal.style.display);
            console.log('  Modal visibility:', modal.style.visibility);
            console.log('  Modal opacity:', modal.style.opacity);

            // Check a bit later
            setTimeout(() => {
                console.log('📋 Step 4: After 200ms');
                console.log('  Modal display:', modal.style.display);
                console.log('  Modal visibility:', modal.style.visibility);
                console.log('  Modal opacity:', modal.style.opacity);
                console.log('  Modal dimensions:', modal.offsetWidth, 'x', modal.offsetHeight);

                // Check if modal has class or inline styles forcing it hidden
                console.log('  Modal classes:', modal.className);
                console.log('  Modal computed display:', window.getComputedStyle(modal).display);

                // Check overlay
                const overlay = modal.querySelector('.modal-overlay');
                if (overlay) {
                    console.log('  Overlay display:', overlay.style.display);
                    console.log('  Overlay computed:', window.getComputedStyle(overlay).display);
                }

            }, 200);

        } catch (error) {
            console.error('❌ Error in shareProfile:', error);
            console.error(error.stack);
        }
    };

    console.log('✅ Debug setup complete - click Share Profile button now');
}
