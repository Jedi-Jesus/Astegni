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
        const activeRole = localStorage.getItem('active_role') || localStorage.getItem('userRole') || user?.active_role;

        if (!user) {
            alert('Please login to share your profile');
            return;
        }

        if (!activeRole) {
            alert('Please select a role first');
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
        await loadReferralData(activeRole, user, token);

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
        const response = await fetch('../modals/common-modals/share-profile-modal.html?v=20260204k');
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
 */
async function loadReferralData(profileType, user, token) {
    try {
        // Update profile info
        const profilePic = document.getElementById('shareProfilePic');
        const profileName = document.getElementById('shareProfileName');
        const profileTypeEl = document.getElementById('shareProfileType');

        if (profilePic && user.profile_picture) {
            profilePic.src = user.profile_picture;
        }
        if (profileName) {
            const fullName = [user.first_name, user.father_name, user.grandfather_name, user.last_name]
                .filter(n => n).join(' ') || 'User';
            profileName.textContent = fullName;
        }
        if (profileTypeEl) {
            profileTypeEl.textContent = profileType;
        }

        // Fetch referral code
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

        // Update UI
        document.getElementById('shareReferralCode').value = data.referral_code;
        document.getElementById('shareProfileLink').value = data.share_url;

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
 * Copy referral code to clipboard
 */
async function copyReferralCode() {
    const codeInput = document.getElementById('shareReferralCode');
    const code = codeInput.value;

    try {
        await navigator.clipboard.writeText(code);
        showCopyFeedback(codeInput, 'Referral code copied!');
    } catch (error) {
        // Fallback for older browsers
        codeInput.select();
        document.execCommand('copy');
        showCopyFeedback(codeInput, 'Referral code copied!');
    }
}

/**
 * Copy share link to clipboard
 */
async function copyShareLink() {
    const linkInput = document.getElementById('shareProfileLink');
    const link = linkInput.value;

    try {
        await navigator.clipboard.writeText(link);
        showCopyFeedback(linkInput, 'Link copied to clipboard!');
    } catch (error) {
        // Fallback for older browsers
        linkInput.select();
        document.execCommand('copy');
        showCopyFeedback(linkInput, 'Link copied to clipboard!');
    }
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
 * Share via native share API (mobile)
 */
async function shareViaNative() {
    if (!navigator.share) {
        alert('Native sharing not supported on this device');
        return;
    }

    const link = document.getElementById('shareProfileLink').value;
    const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const activeRole = localStorage.getItem('userRole') || localStorage.getItem('active_role');
    const fullName = user ? [user.first_name, user.father_name, user.grandfather_name, user.last_name]
        .filter(n => n).join(' ') || 'User' : 'User';

    try {
        await navigator.share({
            title: `${fullName}'s ${activeRole} profile on Astegni`,
            text: `Check out my profile on Astegni! Register using my link and join our community.`,
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
    const link = document.getElementById('shareProfileLink').value;
    const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const activeRole = localStorage.getItem('userRole') || localStorage.getItem('active_role');
    const fullName = user ? [user.first_name, user.father_name, user.grandfather_name, user.last_name]
        .filter(n => n).join(' ') || 'User' : 'User';

    const text = encodeURIComponent(`Hi! I'm ${fullName}, a ${activeRole} on Astegni. Join me on this amazing educational platform: ${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

/**
 * Share via Facebook
 */
function shareViaFacebook() {
    const link = document.getElementById('shareProfileLink').value;
    const url = encodeURIComponent(link);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400');
}

/**
 * Share via Twitter
 */
function shareViaTwitter() {
    const link = document.getElementById('shareProfileLink').value;
    const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const activeRole = localStorage.getItem('userRole') || localStorage.getItem('active_role');
    const fullName = user ? [user.first_name, user.father_name, user.grandfather_name, user.last_name]
        .filter(n => n).join(' ') || 'User' : 'User';

    const text = encodeURIComponent(`Check out my ${activeRole} profile on Astegni!`);
    const url = encodeURIComponent(link);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
}

/**
 * Share via Telegram
 */
function shareViaTelegram() {
    const link = document.getElementById('shareProfileLink').value;
    const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const activeRole = localStorage.getItem('userRole') || localStorage.getItem('active_role');
    const fullName = user ? [user.first_name, user.father_name, user.grandfather_name, user.last_name]
        .filter(n => n).join(' ') || 'User' : 'User';

    const text = encodeURIComponent(`Hi! I'm ${fullName}, a ${activeRole} on Astegni. Join me: ${link}`);
    window.open(`https://t.me/share/url?url=${link}&text=${text}`, '_blank');
}

/**
 * Share via Email
 */
function shareViaEmail() {
    const link = document.getElementById('shareProfileLink').value;
    const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const activeRole = localStorage.getItem('userRole') || localStorage.getItem('active_role');
    const fullName = user ? [user.first_name, user.father_name, user.grandfather_name, user.last_name]
        .filter(n => n).join(' ') || 'User' : 'User';

    const subject = encodeURIComponent(`Join me on Astegni`);
    const body = encodeURIComponent(`Hi,

I'm ${fullName}, a ${activeRole} on Astegni - an educational platform connecting students, tutors, and parents.

I'd love for you to join me on Astegni! Use my referral link to register:
${link}

Looking forward to seeing you there!

Best regards,
${fullName}`);

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
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
