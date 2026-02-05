/**
 * EMERGENCY FIX: Bypass all caching issues
 * Paste this ENTIRE script in console to make share button work immediately
 */

(function() {
    console.log('🚨 EMERGENCY SHARE BUTTON FIX - Loading...\n');

    // Step 1: Define shareProfile function directly
    window.shareProfile = async function() {
        try {
            console.log('📤 Share button clicked!');

            // Get user info
            const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
            const token = localStorage.getItem('token');

            if (!userStr || !token) {
                alert('Please login to share your profile');
                return;
            }

            const user = JSON.parse(userStr);
            console.log('✓ User authenticated:', user.email);

            // Check if modal exists
            let modal = document.getElementById('shareProfileModal');

            // If not, load it
            if (!modal) {
                console.log('⏳ Loading share modal...');
                const response = await fetch('../modals/common-modals/share-profile-modal.html');
                if (!response.ok) {
                    throw new Error('Failed to load share modal');
                }

                const html = await response.text();
                const container = document.createElement('div');
                container.innerHTML = html;
                document.body.appendChild(container);

                modal = document.getElementById('shareProfileModal');
                console.log('✓ Modal loaded');
            }

            if (!modal) {
                console.error('❌ Modal not found after loading');
                alert('Failed to load share modal');
                return;
            }

            // Get active role
            const activeRole = localStorage.getItem('active_role') || 'student';
            console.log('✓ Active role:', activeRole);

            // Load referral data
            console.log('⏳ Loading referral data...');
            const API_URL = 'http://localhost:8000';

            const referralResponse = await fetch(
                `${API_URL}/api/referral/my-code?profile_type=${activeRole}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!referralResponse.ok) {
                throw new Error('Failed to load referral data');
            }

            const referralData = await referralResponse.json();
            console.log('✓ Referral data loaded:', referralData);

            // Update modal with data
            const profilePic = document.getElementById('shareProfilePic');
            const profileName = document.getElementById('shareProfileName');
            const profileTypeEl = document.getElementById('shareProfileType');
            const referralCode = document.getElementById('referralCode');
            const referralLink = document.getElementById('referralLink');
            const totalReferrals = document.getElementById('totalReferrals');
            const activeReferrals = document.getElementById('activeReferrals');
            const totalClicks = document.getElementById('totalClicks');

            if (profilePic) profilePic.src = user.profile_picture || '../assets/default-avatar.png';
            if (profileName) profileName.textContent = user.full_name || user.email;
            if (profileTypeEl) profileTypeEl.textContent = activeRole.charAt(0).toUpperCase() + activeRole.slice(1);

            if (referralCode) referralCode.value = referralData.referral_code;
            if (referralLink) {
                const baseUrl = window.location.origin;
                referralLink.value = `${baseUrl}?ref=${referralData.referral_code}`;
            }

            // Update stats
            if (totalReferrals) totalReferrals.textContent = referralData.total_referrals || 0;
            if (activeReferrals) activeReferrals.textContent = referralData.active_referrals || 0;
            if (totalClicks) totalClicks.textContent = referralData.total_clicks || 0;

            // Setup copy buttons
            const copyCodeBtn = document.getElementById('copyCodeBtn');
            const copyLinkBtn = document.getElementById('copyLinkBtn');

            if (copyCodeBtn) {
                copyCodeBtn.onclick = () => {
                    navigator.clipboard.writeText(referralData.referral_code);
                    copyCodeBtn.textContent = '✓ Copied!';
                    setTimeout(() => { copyCodeBtn.textContent = 'Copy Code'; }, 2000);
                };
            }

            if (copyLinkBtn) {
                copyLinkBtn.onclick = () => {
                    const link = `${window.location.origin}?ref=${referralData.referral_code}`;
                    navigator.clipboard.writeText(link);
                    copyLinkBtn.textContent = '✓ Copied!';
                    setTimeout(() => { copyLinkBtn.textContent = 'Copy Link'; }, 2000);
                };
            }

            // Setup social share buttons
            const shareUrl = encodeURIComponent(`${window.location.origin}?ref=${referralData.referral_code}`);
            const shareText = encodeURIComponent(`Check out my profile on Astegni!`);

            const whatsappBtn = document.getElementById('shareWhatsapp');
            const facebookBtn = document.getElementById('shareFacebook');
            const twitterBtn = document.getElementById('shareTwitter');
            const telegramBtn = document.getElementById('shareTelegram');
            const emailBtn = document.getElementById('shareEmail');

            if (whatsappBtn) {
                whatsappBtn.onclick = () => {
                    window.open(`https://wa.me/?text=${shareText}%20${shareUrl}`, '_blank');
                };
            }

            if (facebookBtn) {
                facebookBtn.onclick = () => {
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank');
                };
            }

            if (twitterBtn) {
                twitterBtn.onclick = () => {
                    window.open(`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`, '_blank');
                };
            }

            if (telegramBtn) {
                telegramBtn.onclick = () => {
                    window.open(`https://t.me/share/url?url=${shareUrl}&text=${shareText}`, '_blank');
                };
            }

            if (emailBtn) {
                emailBtn.onclick = () => {
                    window.location.href = `mailto:?subject=${shareText}&body=${shareUrl}`;
                };
            }

            // Setup close button
            const closeBtn = modal.querySelector('.close-modal');
            const overlay = modal.querySelector('.modal-overlay');

            if (closeBtn) {
                closeBtn.onclick = () => {
                    modal.style.display = 'none';
                };
            }

            if (overlay) {
                overlay.onclick = (e) => {
                    if (e.target === overlay) {
                        modal.style.display = 'none';
                    }
                };
            }

            // Show modal
            modal.style.display = 'block';
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';

            console.log('✅ Modal opened successfully!');

        } catch (error) {
            console.error('❌ Error in shareProfile:', error);
            alert('Failed to open share modal: ' + error.message);
        }
    };

    console.log('✅ EMERGENCY FIX LOADED!');
    console.log('🎯 Click the Share Profile button now - it will work!');
    console.log('');
})();
