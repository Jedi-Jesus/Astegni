/**
 * Share Profile Manager
 * Handles profile sharing with referral tracking
 */

// Use existing API_BASE_URL if already defined, otherwise set default
if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = 'http://localhost:8000';
}

// Global state - use var to avoid conflicts if script is loaded multiple times
if (typeof currentReferralData === 'undefined') {
    var currentReferralData = null;
}

/**
 * Detect if we're on a view-profiles page and return the viewed person's data.
 * Returns null if we're on a profile-pages page (own profile).
 */
function getViewedProfileData() {
    const path = window.location.pathname;
    if (path.includes('view-tutor')) {
        const data = window.currentTutorData;
        if (!data) return null;
        return {
            name: data.full_name || data.name || 'Tutor',
            picture: data.profile_picture || null,
            role: 'tutor',
            profileUrl: window.location.href.split('?')[0] + '?id=' + (data.id || new URLSearchParams(window.location.search).get('id'))
        };
    }
    if (path.includes('view-student')) {
        const data = window.currentStudentData;
        if (!data) return null;
        return {
            name: data.name || data.first_name || 'Student',
            picture: data.profile_picture || null,
            role: 'student',
            profileUrl: window.location.href.split('?')[0] + '?id=' + (data.id || new URLSearchParams(window.location.search).get('id'))
        };
    }
    if (path.includes('view-parent')) {
        const data = window.currentParentData;
        if (!data) return null;
        return {
            name: data.name || data.first_name || 'Parent',
            picture: data.profile_picture || null,
            role: 'parent',
            profileUrl: window.location.href.split('?')[0] + '?id=' + (data.id || new URLSearchParams(window.location.search).get('id'))
        };
    }
    if (path.includes('view-advertiser')) {
        const data = window.currentAdvertiserData;
        if (!data) return null;
        return {
            name: data.company_name || data.name || 'Advertiser',
            picture: data.profile_picture || data.logo || null,
            role: 'advertiser',
            profileUrl: window.location.href.split('?')[0] + '?id=' + (data.id || new URLSearchParams(window.location.search).get('id'))
        };
    }
    return null;
}

/**
 * Open share modal for current profile
 */
async function shareProfile(event) {
    // CRITICAL FIX: Stop event propagation to prevent immediate close
    if (event) {
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    try {
        // Get current user and role
        // Check both 'currentUser' (used by AuthManager) and 'user' (legacy) for compatibility
        const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (!userStr || !token) {
            alert('Please login to share your profile');
            return;
        }

        const user = JSON.parse(userStr);

        if (!user) {
            alert('Please login to share your profile');
            return;
        }

        // Guard: user must be verified to share profile
        if (!user.verified) {
            if (typeof openAccessRestrictedModal === 'function') {
                openAccessRestrictedModal({ reason: 'kyc_not_verified', featureName: 'Share Profile' });
            }
            return;
        }

        const VALID_REFERRAL_ROLES = ['tutor', 'student', 'parent', 'advertiser'];
        let activeRole = localStorage.getItem('active_role') || localStorage.getItem('userRole') || user?.active_role;

        // "user" is not a valid referral profile type — fall back to the first real role the user has
        if (!activeRole || !VALID_REFERRAL_ROLES.includes(activeRole)) {
            const roles = user.roles || (user.role ? [user.role] : []);
            activeRole = roles.find(r => VALID_REFERRAL_ROLES.includes(r)) || null;
        }

        if (!activeRole) {
            alert('Please select a role first (tutor, student, parent, or advertiser)');
            return;
        }

        // Load modal if not already loaded
        await ensureShareModalLoaded();

        // Show modal
        const modal = document.getElementById('shareProfileModal');
        if (modal) {
            modalJustOpened = true; // Flag to prevent immediate close
            modal.style.display = 'block'; // Changed from 'flex' to 'block' for new structure
            modal.style.zIndex = '100000'; // Force high z-index to appear above all other elements
            modal.style.opacity = '1'; // Force visible
            modal.style.visibility = 'visible'; // Force visible

            // Also ensure the overlay inside is visible
            const overlay = modal.querySelector('.modal-overlay');
            if (overlay) {
                overlay.style.display = 'flex'; // Overlay needs to be flex to center the container
                overlay.style.alignItems = 'center';
                overlay.style.justifyContent = 'center';
                overlay.style.opacity = '1'; // CRITICAL: Force overlay visible
                overlay.style.visibility = 'visible'; // CRITICAL: Force overlay visible
            }

            // Also ensure the container inside is visible
            const container = overlay ? overlay.querySelector('.modal-container') : null;
            if (container) {
                container.style.visibility = 'visible'; // CRITICAL: Force container visible
            }

            console.log('[ShareProfile] Modal shown with styles:', {
                display: modal.style.display,
                zIndex: modal.style.zIndex,
                opacity: modal.style.opacity,
                visibility: modal.style.visibility,
                overlayDisplay: overlay ? overlay.style.display : 'not found',
                overlayOpacity: overlay ? overlay.style.opacity : 'not found',
                overlayVisibility: overlay ? overlay.style.visibility : 'not found',
                containerVisibility: container ? container.style.visibility : 'not found'
            });
        } else {
            console.error('[ShareProfile] Modal element not found!');
        }

        // Load referral data
        const viewedProfile = getViewedProfileData();
        await loadReferralData(activeRole, user, token, viewedProfile);

        // Check if native share is available (mobile)
        if (navigator.share) {
            document.getElementById('nativeShareBtn').style.display = 'flex';
        }

    } catch (error) {
        console.error('Error opening share modal:', error);
        alert('Failed to open share modal. Please try again.');
    }
}

/**
 * Ensure share modal is loaded
 */
async function ensureShareModalLoaded() {
    if (document.getElementById('shareProfileModal')) {
        return; // Already loaded
    }

    try {
        // Use relative path that works from any profile page
        // Cache-busting version parameter to ensure latest HTML/CSS is loaded
        const response = await fetch('../modals/common-modals/share-profile-modal.html?v=20260221b');
        if (!response.ok) throw new Error('Failed to load share modal');

        const html = await response.text();
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);
    } catch (error) {
        console.error('Error loading share modal:', error);
        throw error;
    }
}

/**
 * Load referral data from API
 * @param {string} profileType - The logged-in user's active role
 * @param {object} user - The logged-in user object
 * @param {string} token - Auth token
 * @param {object|null} viewedProfile - If on a view-profiles page, the viewed person's data
 */
async function loadReferralData(profileType, user, token, viewedProfile) {
    try {
        // Update profile info in the popup.
        // On view-profiles pages, show the viewed person's name/picture.
        // On profile-pages, show the logged-in user's own info.
        const profilePic = document.getElementById('shareProfilePic');
        const profileName = document.getElementById('shareProfileName');
        const profileTypeEl = document.getElementById('shareProfileType');

        if (viewedProfile) {
            if (profilePic && viewedProfile.picture) profilePic.src = viewedProfile.picture;
            if (profileName) profileName.textContent = viewedProfile.name;
            if (profileTypeEl) profileTypeEl.textContent = viewedProfile.role;
        } else {
            if (profilePic && user.profile_picture) profilePic.src = user.profile_picture;
            if (profileName) {
                const fullName = [user.first_name, user.father_name, user.grandfather_name, user.last_name]
                    .filter(n => n).join(' ') || 'User';
                profileName.textContent = fullName;
            }
            if (profileTypeEl) profileTypeEl.textContent = profileType;
        }

        // Fetch the logged-in user's referral code
        const response = await fetch(
            `${API_BASE_URL}/api/referrals/my-code?profile_type=${profileType}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch referral code');
        }

        const data = await response.json();
        currentReferralData = data;

        // Build the share URL:
        // - On view-profiles: link to the viewed person's profile page + referral code appended
        // - On profile-pages: use the API-provided share_url (own profile)
        const shareUrl = viewedProfile
            ? `${viewedProfile.profileUrl}&ref=${data.referral_code}`
            : data.share_url;

        // Update UI
        document.getElementById('shareReferralCode').value = data.referral_code;
        document.getElementById('shareProfileLink').value = shareUrl;

        // Fetch and update stats
        await loadReferralStats(profileType, token);

    } catch (error) {
        console.error('Error loading referral data:', error);
        document.getElementById('shareReferralCode').value = 'Error loading code';
        document.getElementById('shareProfileLink').value = 'Error loading link';
    }
}

/**
 * Load referral statistics
 */
async function loadReferralStats(profileType, token) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/referrals/stats?profile_type=${profileType}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.ok) return;

        const stats = await response.json();

        // Update stats display
        document.getElementById('shareTotalReferrals').textContent = stats.total_registrations || 0;
        document.getElementById('shareActiveReferrals').textContent = stats.active_referrals || 0;
        document.getElementById('shareTotalClicks').textContent = stats.total_clicks || 0;

    } catch (error) {
        console.error('Error loading referral stats:', error);
    }
}

/**
 * Close share modal
 */
function closeShareModal() {
    const modal = document.getElementById('shareProfileModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Temporarily change a copy button to "Copied!" then revert to "Copy"
 */
function showButtonCopied(btn) {
    btn.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
    btn.style.background = 'var(--success, #22c55e)';
    setTimeout(() => {
        btn.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`;
        btn.style.background = '';
    }, 2000);
}

/**
 * Copy referral code to clipboard
 */
async function copyReferralCode() {
    const codeInput = document.getElementById('shareReferralCode');
    const btn = codeInput.closest('div').querySelector('.share-copy-btn');
    try {
        await navigator.clipboard.writeText(codeInput.value);
    } catch (error) {
        codeInput.select();
        document.execCommand('copy');
    }
    if (btn) showButtonCopied(btn);
}

/**
 * Copy share link to clipboard
 */
async function copyShareLink() {
    const linkInput = document.getElementById('shareProfileLink');
    const btn = linkInput.closest('div').querySelector('.share-copy-btn');
    try {
        await navigator.clipboard.writeText(linkInput.value);
    } catch (error) {
        linkInput.select();
        document.execCommand('copy');
    }
    if (btn) showButtonCopied(btn);
}

/**
 * Show copy feedback animation
 */
function showCopyFeedback(element, message) {
    const originalBorder = element.style.border;
    element.style.border = '2px solid var(--success)';

    // Show temporary message
    const feedback = document.createElement('div');
    feedback.textContent = message;
    feedback.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--success);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 10001;
        animation: fadeInOut 2s ease;
    `;
    document.body.appendChild(feedback);

    setTimeout(() => {
        element.style.border = originalBorder;
        feedback.remove();
    }, 2000);
}

// Add fadeInOut animation
if (!document.getElementById('copyFeedbackAnimation')) {
    const style = document.createElement('style');
    style.id = 'copyFeedbackAnimation';
    style.textContent = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
    `;
    document.head.appendChild(style);
}

/**
 * Get share message context.
 * On view-profiles pages, messaging refers to the viewed person.
 * On profile-pages, messaging refers to the logged-in user (own profile).
 */
function getShareContext() {
    const link = document.getElementById('shareProfileLink').value;
    const viewed = getViewedProfileData();

    if (viewed) {
        return {
            link,
            isOwnProfile: false,
            name: viewed.name,
            role: viewed.role
        };
    }

    const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const role = localStorage.getItem('active_role') || localStorage.getItem('userRole') || user?.active_role || 'user';
    const name = user ? [user.first_name, user.father_name, user.grandfather_name, user.last_name]
        .filter(n => n).join(' ') || 'User' : 'User';

    return { link, isOwnProfile: true, name, role };
}

/**
 * Share via native share API (mobile)
 */
async function shareViaNative() {
    if (!navigator.share) {
        alert('Native sharing not supported on this device');
        return;
    }

    const { link, isOwnProfile, name, role } = getShareContext();

    try {
        await navigator.share({
            title: isOwnProfile
                ? `${name}'s ${role} profile on Astegni`
                : `${name} on Astegni`,
            text: isOwnProfile
                ? `Check out my profile on Astegni! Register using my link and join our community.`
                : `Check out ${name}'s ${role} profile on Astegni!`,
            url: link
        });
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error sharing:', error);
        }
    }
}

/**
 * Share via WhatsApp
 */
function shareViaWhatsApp() {
    const { link, isOwnProfile, name, role } = getShareContext();
    const text = isOwnProfile
        ? encodeURIComponent(`Hi! I'm ${name}, a ${role} on Astegni. Join me on this amazing educational platform: ${link}`)
        : encodeURIComponent(`Check out ${name}'s ${role} profile on Astegni: ${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

/**
 * Share via Facebook
 */
function shareViaFacebook() {
    const { link } = getShareContext();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank', 'width=600,height=400');
}

/**
 * Share via Twitter
 */
function shareViaTwitter() {
    const { link, isOwnProfile, name, role } = getShareContext();
    const text = isOwnProfile
        ? encodeURIComponent(`Check out my ${role} profile on Astegni!`)
        : encodeURIComponent(`Check out ${name}'s ${role} profile on Astegni!`);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(link)}`, '_blank', 'width=600,height=400');
}

/**
 * Share via Telegram
 */
function shareViaTelegram() {
    const { link, isOwnProfile, name, role } = getShareContext();
    const text = isOwnProfile
        ? encodeURIComponent(`Hi! I'm ${name}, a ${role} on Astegni. Join me: ${link}`)
        : encodeURIComponent(`Check out ${name}'s ${role} profile on Astegni: ${link}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`, '_blank');
}

/**
 * Share via Email
 */
function shareViaEmail() {
    const { link, isOwnProfile, name, role } = getShareContext();

    let subject, body;

    if (isOwnProfile) {
        subject = encodeURIComponent(`Join me on Astegni`);
        body = encodeURIComponent(`Hi,

I'm ${name}, a ${role} on Astegni - an educational platform connecting students, tutors, and parents.

I'd love for you to join me on Astegni! Use my referral link to register:
${link}

Looking forward to seeing you there!

Best regards,
${name}`);
    } else {
        subject = encodeURIComponent(`Check out this ${role} on Astegni`);
        body = encodeURIComponent(`Hi,

I found ${name}'s ${role} profile on Astegni - an educational platform connecting students, tutors, and parents.

Check them out here:
${link}

If you sign up using that link, we both benefit!`);
    }

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

/**
 * Share via LinkedIn
 */
function shareViaLinkedIn() {
    const { link } = getShareContext();
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`, '_blank', 'width=600,height=400');
}

/**
 * Share via Instagram (copy link — Instagram has no web share URL)
 */
function shareViaInstagram() {
    const { link } = getShareContext();
    navigator.clipboard.writeText(link).then(() => {
        alert('Link copied! Open Instagram and paste it in your bio or story.');
    }).catch(() => {
        const input = document.getElementById('shareProfileLink');
        if (input) { input.select(); document.execCommand('copy'); }
        alert('Link copied! Open Instagram and paste it in your bio or story.');
    });
}

/**
 * Share via TikTok (copy link — TikTok has no web share URL)
 */
function shareViaTikTok() {
    const { link } = getShareContext();
    navigator.clipboard.writeText(link).then(() => {
        alert('Link copied! Open TikTok and paste it in your bio or video description.');
    }).catch(() => {
        const input = document.getElementById('shareProfileLink');
        if (input) { input.select(); document.execCommand('copy'); }
        alert('Link copied! Open TikTok and paste it in your bio or video description.');
    });
}

/**
 * Share via YouTube (copy link — YouTube has no web share URL)
 */
function shareViaYouTube() {
    const { link } = getShareContext();
    navigator.clipboard.writeText(link).then(() => {
        alert('Link copied! Paste it in your YouTube video description or community post.');
    }).catch(() => {
        const input = document.getElementById('shareProfileLink');
        if (input) { input.select(); document.execCommand('copy'); }
        alert('Link copied! Paste it in your YouTube video description or community post.');
    });
}

/**
 * Share via Snapchat (copy link — Snapchat has no web share URL)
 */
function shareViaSnapchat() {
    const { link } = getShareContext();
    navigator.clipboard.writeText(link).then(() => {
        alert('Link copied! Paste it in your Snapchat story or message.');
    }).catch(() => {
        const input = document.getElementById('shareProfileLink');
        if (input) { input.select(); document.execCommand('copy'); }
        alert('Link copied! Paste it in your Snapchat story or message.');
    });
}

/**
 * View referral dashboard (navigate to referrals section)
 */
function viewReferralDashboard() {
    closeShareModal();
    // This will be implemented when we create the referral dashboard panel
    // For now, show a coming soon message
    const activeRole = localStorage.getItem('userRole') || localStorage.getItem('active_role');
    alert(`Referral dashboard will open in the ${activeRole} profile page. Feature coming soon!`);
}

// Close modal when clicking outside (on the overlay)
// Use a flag to prevent closing immediately after opening
let modalJustOpened = false;

document.addEventListener('click', (event) => {
    // Skip if modal was just opened by this click
    if (modalJustOpened) {
        modalJustOpened = false;
        return;
    }

    const modal = document.getElementById('shareProfileModal');
    if (modal && modal.style.display !== 'none') {
        const overlay = modal.querySelector('.modal-overlay');
        // Check if click is on overlay (not on container)
        if (overlay && event.target === overlay) {
            closeShareModal();
        }
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const modal = document.getElementById('shareProfileModal');
        if (modal && modal.style.display === 'block') { // Changed from 'flex' to 'block'
            closeShareModal();
        }
    }
});

// CRITICAL: Export to window object to override any earlier definitions
window.shareProfile = shareProfile;
window.closeShareModal = closeShareModal;

console.log('✓ Share Profile Manager loaded');
