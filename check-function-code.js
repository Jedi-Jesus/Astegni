/**
 * Check what shareProfile function code is actually loaded
 * Paste this in console
 */

console.log('=== CHECKING ACTUAL FUNCTION CODE ===\n');

if (typeof shareProfile === 'undefined') {
    console.log('❌ shareProfile function does not exist!');
} else {
    const code = shareProfile.toString();

    console.log('Function length:', code.length, 'characters');
    console.log('\n--- First 500 characters ---');
    console.log(code.substring(0, 500));
    console.log('\n--- Last 300 characters ---');
    console.log(code.substring(code.length - 300));

    // Check for specific strings
    console.log('\n=== SIGNATURE CHECKS ===');
    console.log('Contains "ensureShareModalLoaded":', code.includes('ensureShareModalLoaded'));
    console.log('Contains "shareProfileModal":', code.includes('shareProfileModal'));
    console.log('Contains "currentReferralData":', code.includes('currentReferralData'));
    console.log('Contains "fallbackShare":', code.includes('fallbackShare'));
    console.log('Contains "window.location.href":', code.includes('window.location.href'));
    console.log('Contains "navigator.share":', code.includes('navigator.share'));
    console.log('Is async function:', shareProfile.constructor.name === 'AsyncFunction');

    // Verdict
    console.log('\n=== VERDICT ===');
    if (code.includes('ensureShareModalLoaded') || code.includes('shareProfileModal')) {
        console.log('✅ This is the CORRECT function from share-profile-manager.js');
    } else if (code.includes('fallbackShare') && code.includes('window.location.href')) {
        console.log('❌ This is the OLD function from global-functions.js');
        console.log('\nThe old function is still cached!');
    } else {
        console.log('⚠️ Unknown function version');
    }
}
