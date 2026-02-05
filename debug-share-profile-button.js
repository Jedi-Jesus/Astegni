/**
 * Debug Console for Share Profile Button
 * Inject this script to monitor all shareProfile() activity
 *
 * Usage: Add this script AFTER share-profile-manager-v2.js loads
 */

(function() {
    console.log('🐛 [DEBUG] Share Profile Button Debug Console Initialized');
    console.log('─'.repeat(80));

    // Store original function
    const originalShareProfile = window.shareProfile;

    if (!originalShareProfile) {
        console.error('❌ [DEBUG] shareProfile() function not found! Is share-profile-manager-v2.js loaded?');
        return;
    }

    // Wrap shareProfile with debug logging
    window.shareProfile = async function() {
        console.log('');
        console.log('🔵 [DEBUG] ══════════════════════════════════════════════════════════');
        console.log('🔵 [DEBUG] SHARE PROFILE BUTTON CLICKED');
        console.log('🔵 [DEBUG] ══════════════════════════════════════════════════════════');
        console.log('🔵 [DEBUG] Timestamp:', new Date().toISOString());
        console.log('');

        // ===== STEP 1: Check Authentication =====
        console.log('📋 [DEBUG] STEP 1: Checking Authentication');
        console.log('─'.repeat(80));

        const currentUser = localStorage.getItem('currentUser');
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        const activeRole = localStorage.getItem('active_role');
        const userRole = localStorage.getItem('userRole');

        console.log('├─ localStorage.currentUser:', currentUser ? '✅ EXISTS' : '❌ NOT FOUND');
        if (currentUser) {
            try {
                const parsed = JSON.parse(currentUser);
                console.log('│  ├─ user_id:', parsed.user_id);
                console.log('│  ├─ email:', parsed.email);
                console.log('│  ├─ first_name:', parsed.first_name);
                console.log('│  ├─ profile_picture:', parsed.profile_picture ? '✅ SET' : '❌ NOT SET');
                console.log('│  └─ active_role:', parsed.active_role);
            } catch (e) {
                console.error('│  └─ ⚠️ Failed to parse:', e.message);
            }
        }

        console.log('├─ localStorage.user:', user ? '✅ EXISTS' : '❌ NOT FOUND');
        console.log('├─ localStorage.token:', token ? `✅ EXISTS (${token.substring(0, 20)}...)` : '❌ NOT FOUND');
        console.log('├─ localStorage.active_role:', activeRole || '❌ NOT FOUND');
        console.log('└─ localStorage.userRole:', userRole || '❌ NOT FOUND');
        console.log('');

        // ===== STEP 2: Call Original Function =====
        console.log('🚀 [DEBUG] STEP 2: Calling Original shareProfile()');
        console.log('─'.repeat(80));

        try {
            const result = await originalShareProfile.call(this);

            console.log('✅ [DEBUG] Original function completed successfully');
            console.log('');

            // ===== STEP 3: Check Modal State =====
            console.log('🔍 [DEBUG] STEP 3: Checking Modal State');
            console.log('─'.repeat(80));

            // Wait a bit for modal to fully render
            await new Promise(resolve => setTimeout(resolve, 100));

            const modal = document.getElementById('shareProfileModal');
            if (modal) {
                console.log('├─ Modal Element: ✅ FOUND');
                console.log('│  ├─ display:', modal.style.display);
                console.log('│  ├─ zIndex:', modal.style.zIndex);
                console.log('│  ├─ opacity:', modal.style.opacity);
                console.log('│  ├─ visibility:', modal.style.visibility);
                console.log('│  ├─ position:', modal.style.position);
                console.log('│  └─ dimensions:', `${modal.offsetWidth}x${modal.offsetHeight}`);

                const overlay = modal.querySelector('.modal-overlay');
                if (overlay) {
                    console.log('│');
                    console.log('├─ Modal Overlay: ✅ FOUND');
                    console.log('│  ├─ display:', overlay.style.display);
                    console.log('│  ├─ opacity:', overlay.style.opacity);
                    console.log('│  ├─ visibility:', overlay.style.visibility);
                    console.log('│  └─ computed display:', window.getComputedStyle(overlay).display);

                    const container = overlay.querySelector('.modal-container');
                    if (container) {
                        console.log('│');
                        console.log('├─ Modal Container: ✅ FOUND');
                        console.log('│  ├─ visibility:', container.style.visibility);
                        console.log('│  ├─ background:', window.getComputedStyle(container).background);
                        console.log('│  └─ dimensions:', `${container.offsetWidth}x${container.offsetHeight}`);
                    } else {
                        console.error('├─ Modal Container: ❌ NOT FOUND');
                    }
                } else {
                    console.error('├─ Modal Overlay: ❌ NOT FOUND');
                }

                // Check modal content
                console.log('│');
                console.log('├─ Modal Content Fields:');

                const profilePic = document.getElementById('shareProfilePic');
                const profileName = document.getElementById('shareProfileName');
                const profileType = document.getElementById('shareProfileType');
                const referralCode = document.getElementById('shareReferralCode');
                const shareLink = document.getElementById('shareProfileLink');
                const totalReferrals = document.getElementById('shareTotalReferrals');
                const activeReferrals = document.getElementById('shareActiveReferrals');
                const totalClicks = document.getElementById('shareTotalClicks');

                console.log('│  ├─ shareProfilePic:', profilePic ? `✅ src="${profilePic.src}"` : '❌ NOT FOUND');
                console.log('│  ├─ shareProfileName:', profileName ? `✅ "${profileName.textContent}"` : '❌ NOT FOUND');
                console.log('│  ├─ shareProfileType:', profileType ? `✅ "${profileType.textContent}"` : '❌ NOT FOUND');
                console.log('│  ├─ shareReferralCode:', referralCode ? `✅ "${referralCode.value}"` : '❌ NOT FOUND');
                console.log('│  ├─ shareProfileLink:', shareLink ? `✅ "${shareLink.value}"` : '❌ NOT FOUND');
                console.log('│  ├─ shareTotalReferrals:', totalReferrals ? `✅ ${totalReferrals.textContent}` : '❌ NOT FOUND');
                console.log('│  ├─ shareActiveReferrals:', activeReferrals ? `✅ ${activeReferrals.textContent}` : '❌ NOT FOUND');
                console.log('│  └─ shareTotalClicks:', totalClicks ? `✅ ${totalClicks.textContent}` : '❌ NOT FOUND');

                // Check share buttons
                console.log('│');
                console.log('└─ Share Buttons:');
                const nativeBtn = document.getElementById('nativeShareBtn');
                console.log('   ├─ nativeShareBtn:', nativeBtn ? `${nativeBtn.style.display === 'none' ? '⚪ Hidden' : '✅ Visible'}` : '❌ NOT FOUND');
                console.log('   ├─ WhatsApp:', document.querySelector('[onclick*="shareViaWhatsApp"]') ? '✅ FOUND' : '❌ NOT FOUND');
                console.log('   ├─ Facebook:', document.querySelector('[onclick*="shareViaFacebook"]') ? '✅ FOUND' : '❌ NOT FOUND');
                console.log('   ├─ Twitter:', document.querySelector('[onclick*="shareViaTwitter"]') ? '✅ FOUND' : '❌ NOT FOUND');
                console.log('   ├─ Telegram:', document.querySelector('[onclick*="shareViaTelegram"]') ? '✅ FOUND' : '❌ NOT FOUND');
                console.log('   └─ Email:', document.querySelector('[onclick*="shareViaEmail"]') ? '✅ FOUND' : '❌ NOT FOUND');

            } else {
                console.error('├─ Modal Element: ❌ NOT FOUND IN DOM');
            }

            console.log('');

            // ===== STEP 4: Monitor Network Calls =====
            console.log('🌐 [DEBUG] STEP 4: Checking Network Activity');
            console.log('─'.repeat(80));
            console.log('⚠️  Check Network tab for:');
            console.log('   ├─ GET /api/referrals/my-code?profile_type={role}');
            console.log('   └─ GET /api/referrals/stats?profile_type={role}');
            console.log('');

            return result;

        } catch (error) {
            console.error('');
            console.error('❌ [DEBUG] ERROR in shareProfile()');
            console.error('─'.repeat(80));
            console.error('Error Type:', error.name);
            console.error('Error Message:', error.message);
            console.error('Stack Trace:', error.stack);
            console.error('');
            throw error;
        } finally {
            console.log('🔵 [DEBUG] ══════════════════════════════════════════════════════════');
            console.log('🔵 [DEBUG] SHARE PROFILE DEBUG COMPLETE');
            console.log('🔵 [DEBUG] ══════════════════════════════════════════════════════════');
            console.log('');
        }
    };

    // Monitor modal close
    const originalCloseShareModal = window.closeShareModal;
    if (originalCloseShareModal) {
        window.closeShareModal = function() {
            console.log('🔴 [DEBUG] Modal Closing');
            console.log('─'.repeat(80));
            const modal = document.getElementById('shareProfileModal');
            if (modal) {
                console.log('Modal display before close:', modal.style.display);
            }
            const result = originalCloseShareModal.call(this);
            console.log('✅ Modal closed');
            console.log('');
            return result;
        };
    }

    // Monitor copy actions
    const originalCopyReferralCode = window.copyReferralCode;
    if (originalCopyReferralCode) {
        window.copyReferralCode = async function() {
            console.log('📋 [DEBUG] Copy Referral Code clicked');
            const codeInput = document.getElementById('shareReferralCode');
            console.log('   Code:', codeInput?.value);
            const result = await originalCopyReferralCode.call(this);
            console.log('   ✅ Code copied to clipboard');
            console.log('');
            return result;
        };
    }

    const originalCopyShareLink = window.copyShareLink;
    if (originalCopyShareLink) {
        window.copyShareLink = async function() {
            console.log('📋 [DEBUG] Copy Share Link clicked');
            const linkInput = document.getElementById('shareProfileLink');
            console.log('   Link:', linkInput?.value);
            const result = await originalCopyShareLink.call(this);
            console.log('   ✅ Link copied to clipboard');
            console.log('');
            return result;
        };
    }

    // Monitor social shares
    const socialPlatforms = ['WhatsApp', 'Facebook', 'Twitter', 'Telegram', 'Email', 'Native'];
    socialPlatforms.forEach(platform => {
        const funcName = `shareVia${platform}`;
        const originalFunc = window[funcName];
        if (originalFunc) {
            window[funcName] = function() {
                console.log(`🔗 [DEBUG] Share via ${platform} clicked`);
                const linkInput = document.getElementById('shareProfileLink');
                console.log('   Link:', linkInput?.value);
                const result = originalFunc.call(this);
                console.log('   ✅ Share window opened');
                console.log('');
                return result;
            };
        }
    });

    // Monitor referral dashboard
    const originalViewReferralDashboard = window.viewReferralDashboard;
    if (originalViewReferralDashboard) {
        window.viewReferralDashboard = function() {
            console.log('📊 [DEBUG] View Referral Dashboard clicked');
            const result = originalViewReferralDashboard.call(this);
            console.log('');
            return result;
        };
    }

    console.log('✅ [DEBUG] All share profile functions wrapped with debug logging');
    console.log('─'.repeat(80));
    console.log('');
    console.log('💡 TIP: Click the "Share Profile" button to see detailed debug output');
    console.log('');

})();
