/**
 * NUCLEAR OPTION: Force reload the correct shareProfile function
 * This will delete the old function and load the new one directly
 * Paste this in console
 */

console.log('=== FORCE RELOADING SHARE FUNCTION ===\n');

// Step 1: Delete the old function
if (typeof shareProfile !== 'undefined') {
    const oldCode = shareProfile.toString();
    const isOld = oldCode.includes('fallbackShare') && !oldCode.includes('ensureShareModalLoaded');

    if (isOld) {
        console.log('❌ Old function detected, deleting it...');
        delete window.shareProfile;
        shareProfile = undefined;
    } else {
        console.log('✓ Function looks correct already');
    }
}

// Step 2: Force reload share-profile-manager.js
console.log('Loading share-profile-manager.js with cache-busting...');

const script = document.createElement('script');
script.src = '../js/common-modals/share-profile-manager.js?v=' + Date.now();
script.onload = function() {
    console.log('✓ share-profile-manager.js loaded');

    // Step 3: Verify
    setTimeout(() => {
        if (typeof shareProfile !== 'undefined') {
            const code = shareProfile.toString();
            const isCorrect = code.includes('ensureShareModalLoaded') || code.includes('shareProfileModal');

            if (isCorrect) {
                console.log('\n✅ SUCCESS! Correct shareProfile() function is now loaded!');
                console.log('Function length:', code.length, 'characters');
                console.log('Is async:', shareProfile.constructor.name === 'AsyncFunction');
                console.log('\nYou can now click the Share Profile button!');
            } else {
                console.log('\n⚠️ Function loaded but might not be correct');
                console.log('First 200 chars:', code.substring(0, 200));
            }
        } else {
            console.log('\n❌ Function still not defined!');
        }
    }, 100);
};

script.onerror = function() {
    console.log('❌ Failed to load share-profile-manager.js');
    console.log('Check the path and make sure the server is running');
};

document.head.appendChild(script);

console.log('Loading...');
