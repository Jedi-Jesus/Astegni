// ============================================
// BADGE COUNTS DEBUG SCRIPT
// Copy and paste this entire script into your browser console
// ============================================

console.clear();
console.log('%c=== COMMUNITY BADGE DIAGNOSTIC STARTING ===', 'color: cyan; font-size: 16px; font-weight: bold');
console.log('');

// Step 1: Check if CommunityManager class exists
console.log('%c1. Checking CommunityManager class...', 'color: yellow; font-weight: bold');
const hasCommunityManagerClass = typeof CommunityManager !== 'undefined';
console.log('   CommunityManager class exists:', hasCommunityManagerClass ? '✅ YES' : '❌ NO');

if (!hasCommunityManagerClass) {
    console.error('❌ CRITICAL: CommunityManager class not loaded!');
    console.log('   Check: <script src="../js/page-structure/communityManager.js"></script>');
} else {
    console.log('   ✓ Class loaded successfully');
}

// Step 2: Check if instance exists
console.log('');
console.log('%c2. Checking communityManager instance...', 'color: yellow; font-weight: bold');
const hasInstance = typeof window.communityManager !== 'undefined' && window.communityManager !== null;
console.log('   window.communityManager exists:', hasInstance ? '✅ YES' : '❌ NO');

if (!hasInstance && hasCommunityManagerClass) {
    console.log('   ⚠️ Class exists but instance not created. Creating now...');
    try {
        window.communityManager = new CommunityManager();
        console.log('   ✅ Instance created successfully');
    } catch (error) {
        console.error('   ❌ Failed to create instance:', error);
    }
}

// Step 3: Check authentication token
console.log('');
console.log('%c3. Checking authentication...', 'color: yellow; font-weight: bold');
const token = localStorage.getItem('token');
const hasToken = !!token;
console.log('   Token exists:', hasToken ? '✅ YES' : '❌ NO (you must login first)');
if (hasToken) {
    console.log('   Token preview:', token.substring(0, 30) + '...');
}

// Step 4: Check if modal is open
console.log('');
console.log('%c4. Checking Community Modal...', 'color: yellow; font-weight: bold');
const modal = document.getElementById('communityModal');
const modalExists = modal !== null;
console.log('   Modal element exists:', modalExists ? '✅ YES' : '❌ NO');

if (modalExists) {
    const isModalVisible = modal.style.display !== 'none' && modal.classList.contains('show');
    console.log('   Modal is open:', isModalVisible ? '✅ YES' : '❌ NO (you need to open it)');

    if (!isModalVisible) {
        console.log('   ⚠️ Modal is closed. Opening it now...');
        if (typeof TutorModalManager !== 'undefined') {
            TutorModalManager.openCommunity();
            console.log('   ✓ Modal opened');
        } else if (typeof openCommunityModal === 'function') {
            openCommunityModal();
            console.log('   ✓ Modal opened');
        }
    }
}

// Wait a moment for modal to render
setTimeout(() => {
    console.log('');
    console.log('%c5. Checking badge elements...', 'color: yellow; font-weight: bold');

    const allCount = document.getElementById('all-count');
    const requestsBadge = document.getElementById('requests-badge');
    const connectionsBadge = document.getElementById('connections-badge');

    console.log('   Badge elements:');
    console.log('     all-count:', allCount ? '✅ Found' : '❌ NOT FOUND');
    console.log('     requests-badge:', requestsBadge ? '✅ Found' : '❌ NOT FOUND');
    console.log('     connections-badge:', connectionsBadge ? '✅ Found' : '❌ NOT FOUND');

    // Step 6: Check current values
    console.log('');
    console.log('%c6. Current badge values...', 'color: yellow; font-weight: bold');
    console.log('   all-count:', allCount ? `"${allCount.textContent}"` : 'N/A');
    console.log('   requests-badge:', requestsBadge ? `"${requestsBadge.textContent}"` : 'N/A');
    console.log('   connections-badge:', connectionsBadge ? `"${connectionsBadge.textContent}"` : 'N/A');

    const allEmpty = (!allCount?.textContent || allCount.textContent.trim() === '');
    const requestsEmpty = (!requestsBadge?.textContent || requestsBadge.textContent.trim() === '');
    const connectionsEmpty = (!connectionsBadge?.textContent || connectionsBadge.textContent.trim() === '');

    if (allEmpty || requestsEmpty || connectionsEmpty) {
        console.warn('   ⚠️ Some badges are empty!');
    } else {
        console.log('   ✅ All badges have values');
    }

    // Step 7: Try to initialize badges
    console.log('');
    console.log('%c7. Attempting to initialize badges...', 'color: yellow; font-weight: bold');

    if (!window.communityManager) {
        console.error('   ❌ Cannot initialize - communityManager not available');
    } else if (!allCount || !requestsBadge || !connectionsBadge) {
        console.error('   ❌ Cannot initialize - badge elements not found');
        console.log('   💡 Make sure the Community Modal is open!');
    } else {
        console.log('   Setting badges to "0"...');
        allCount.textContent = '0';
        requestsBadge.textContent = '0';
        connectionsBadge.textContent = '0';
        console.log('   ✅ Badges initialized to "0"');

        // Step 8: Try to load from API
        console.log('');
        console.log('%c8. Loading badge counts from API...', 'color: yellow; font-weight: bold');

        if (!token) {
            console.error('   ❌ Cannot load - no authentication token');
            console.log('   💡 Please login first');
        } else {
            window.communityManager.loadBadgeCounts()
                .then(() => {
                    console.log('   ✅ Badge counts loaded successfully!');
                    console.log('');
                    console.log('%c9. Final badge values:', 'color: yellow; font-weight: bold');
                    console.log('   all-count:', `"${allCount.textContent}"`);
                    console.log('   requests-badge:', `"${requestsBadge.textContent}"`);
                    console.log('   connections-badge:', `"${connectionsBadge.textContent}"`);

                    console.log('');
                    console.log('%c=== DIAGNOSTIC COMPLETE ===', 'color: green; font-size: 16px; font-weight: bold');
                    console.log('✅ If badges show numbers above, it\'s working!');
                    console.log('❌ If badges are still empty, check Network tab for API errors');
                })
                .catch(error => {
                    console.error('   ❌ Failed to load badge counts:', error);
                    console.log('');
                    console.log('%c=== DIAGNOSTIC COMPLETE (WITH ERRORS) ===', 'color: red; font-size: 16px; font-weight: bold');
                    console.log('❌ Badge loading failed. Check:');
                    console.log('   1. Is backend running? (http://localhost:8000)');
                    console.log('   2. Check Network tab for failed requests');
                    console.log('   3. Are you logged in?');
                });
        }
    }
}, 500); // Wait 500ms for modal to render
