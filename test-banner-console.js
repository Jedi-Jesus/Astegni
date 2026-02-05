// Paste this in browser console on videos.html to test deletion banner
(function() {
    console.log('=== DELETION BANNER DEBUG TEST ===');

    // Test 1: Check if elements exist
    console.log('\n1. HTML Elements:');
    console.log('  deletion-countdown-banner:', document.getElementById('deletion-countdown-banner') ? '✓ EXISTS' : '✗ MISSING');
    console.log('  countdown-role-name:', document.getElementById('countdown-role-name') ? '✓ EXISTS' : '✗ MISSING');
    console.log('  countdown-days:', document.getElementById('countdown-days') ? '✓ EXISTS' : '✗ MISSING');
    console.log('  countdown-divider:', document.getElementById('countdown-divider') ? '✓ EXISTS' : '✗ MISSING');

    // Test 2: Check if deletion banner script loaded
    console.log('\n2. Script Loaded:');
    console.log('  DeletionCountdownBanner:', typeof window.DeletionCountdownBanner !== 'undefined' ? '✓ LOADED' : '✗ NOT LOADED');

    // Test 3: Check if toggleProfileDropdown exists
    console.log('\n3. Profile System:');
    console.log('  toggleProfileDropdown:', typeof window.toggleProfileDropdown === 'function' ? '✓ EXISTS' : '✗ MISSING');
    console.log('  ProfileSystem:', typeof window.ProfileSystem !== 'undefined' ? '✓ LOADED' : '✗ NOT LOADED');

    // Test 4: Check if banner is hidden
    const bannerEl = document.getElementById('deletion-countdown-banner');
    if (bannerEl) {
        console.log('\n4. Banner Status:');
        console.log('  Has "hidden" class:', bannerEl.classList.contains('hidden') ? 'YES (hidden)' : 'NO (visible)');
        console.log('  Display style:', bannerEl.style.display || 'default');
    }

    // Test 5: Manually call the banner check
    if (window.DeletionCountdownBanner) {
        console.log('\n5. Testing API Call...');
        window.DeletionCountdownBanner.checkAndShowBanner()
            .then(() => console.log('  ✓ checkAndShowBanner completed'))
            .catch(err => console.error('  ✗ checkAndShowBanner error:', err));
    } else {
        console.log('\n5. Cannot test - DeletionCountdownBanner not loaded');
    }

    // Test 6: Check access token
    console.log('\n6. Authentication:');
    const accessToken = localStorage.getItem('access_token');
    console.log('  access_token:', accessToken ? '✓ EXISTS' : '✗ MISSING');

    // Test 7: Manual API test
    if (accessToken) {
        console.log('\n7. Testing API directly...');
        fetch('http://localhost:8000/api/role/deletion-status', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        .then(r => r.json())
        .then(data => {
            console.log('  API Response:', data);
            if (data.has_pending_deletion) {
                console.log('  ✓ HAS PENDING DELETION:', data.role, '(' + data.days_remaining + ' days)');
            } else {
                console.log('  ✓ No pending deletion');
            }
        })
        .catch(err => console.error('  ✗ API Error:', err));
    }

    console.log('\n=== END DEBUG TEST ===');
})();
