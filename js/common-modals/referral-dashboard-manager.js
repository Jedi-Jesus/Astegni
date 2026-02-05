/**
 * Referral Dashboard Manager
 * Handles referral analytics and referred users list
 */

const API_BASE_URL = 'http://localhost:8000';

/**
 * Open referral dashboard
 */
async function openReferralDashboard() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const token = localStorage.getItem('token');
        const activeRole = localStorage.getItem('active_role') || user?.active_role;

        if (!user || !token) {
            alert('Please login to view referral dashboard');
            return;
        }

        if (!activeRole) {
            alert('Please select a role first');
            return;
        }

        // Load modal if not already loaded
        await ensureReferralDashboardLoaded();

        // Show modal
        const modal = document.getElementById('referralDashboardModal');
        if (modal) {
            modal.style.display = 'flex';
        }

        // Load dashboard data
        await loadReferralDashboard(activeRole, token);

    } catch (error) {
        console.error('Error opening referral dashboard:', error);
        alert('Failed to open referral dashboard. Please try again.');
    }
}

/**
 * Ensure referral dashboard modal is loaded
 */
async function ensureReferralDashboardLoaded() {
    if (document.getElementById('referralDashboardModal')) {
        return; // Already loaded
    }

    try {
        const response = await fetch('/modals/common-modals/referral-dashboard-modal.html');
        if (!response.ok) throw new Error('Failed to load referral dashboard modal');

        const html = await response.text();
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);
    } catch (error) {
        console.error('Error loading referral dashboard modal:', error);
        throw error;
    }
}

/**
 * Load referral dashboard data
 */
async function loadReferralDashboard(profileType, token) {
    try {
        // Fetch referral code
        const codeResponse = await fetch(
            `${API_BASE_URL}/api/referrals/my-code?profile_type=${profileType}`,
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        if (codeResponse.ok) {
            const codeData = await codeResponse.json();
            document.getElementById('refDashShareLink').value = codeData.share_url;
        }

        // Fetch stats
        const statsResponse = await fetch(
            `${API_BASE_URL}/api/referrals/stats?profile_type=${profileType}`,
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            updateDashboardStats(stats);
        }

        // Fetch referrals list
        const referralsResponse = await fetch(
            `${API_BASE_URL}/api/referrals/my-referrals?profile_type=${profileType}`,
            {
                headers: { 'Authorization': `Bearer ${token}` }
            }
        );

        if (referralsResponse.ok) {
            const referrals = await referralsResponse.json();
            updateReferralsTable(referrals);
        }

    } catch (error) {
        console.error('Error loading referral dashboard:', error);
    }
}

/**
 * Update dashboard stats
 */
function updateDashboardStats(stats) {
    document.getElementById('refDashTotalClicks').textContent = stats.total_clicks || 0;
    document.getElementById('refDashTotalRegistrations').textContent = stats.total_registrations || 0;
    document.getElementById('refDashActiveReferrals').textContent = stats.active_referrals || 0;
    document.getElementById('refDashConversionRate').textContent = `${stats.conversion_rate || 0}%`;
    document.getElementById('refDashTotalCount').textContent = stats.total_registrations || 0;
}

/**
 * Update referrals table
 */
function updateReferralsTable(referrals) {
    const tbody = document.getElementById('referralsTableBody');
    const emptyState = document.getElementById('emptyReferralsState');

    if (!referrals || referrals.length === 0) {
        tbody.innerHTML = '';
        tbody.parentElement.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    // Hide empty state
    emptyState.style.display = 'none';
    tbody.parentElement.style.display = 'table';

    // Build table rows
    tbody.innerHTML = referrals.map(referral => {
        const date = new Date(referral.registration_date);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        const statusClass = referral.is_active ? 'status-active' : 'status-inactive';
        const statusText = referral.is_active ? 'Active' : 'Inactive';

        return `
            <tr>
                <td>
                    <div style="font-weight: 600; color: var(--text);">
                        ${referral.referred_user_name || 'User'}
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                        ID: ${referral.referred_user_id}
                    </div>
                </td>
                <td style="color: var(--text-secondary);">
                    ${referral.referred_user_email}
                </td>
                <td>
                    <div style="color: var(--text);">${formattedDate}</div>
                    ${referral.last_activity ? `
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                            Last active: ${new Date(referral.last_activity).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                    ` : ''}
                </td>
                <td style="text-align: center;">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Copy referral link from dashboard
 */
async function copyReferralLinkDash() {
    const linkInput = document.getElementById('refDashShareLink');
    const link = linkInput.value;

    try {
        await navigator.clipboard.writeText(link);
        showDashCopyFeedback('Link copied to clipboard!');
    } catch (error) {
        // Fallback
        linkInput.select();
        document.execCommand('copy');
        showDashCopyFeedback('Link copied to clipboard!');
    }
}

/**
 * Show copy feedback in dashboard
 */
function showDashCopyFeedback(message) {
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
        z-index: 10002;
        animation: fadeInOut 2s ease;
    `;
    document.body.appendChild(feedback);

    setTimeout(() => {
        feedback.remove();
    }, 2000);
}

/**
 * Open share modal from dashboard
 */
async function openShareModalFromDash() {
    closeReferralDashboard();
    // Wait a bit for the close animation
    setTimeout(() => {
        if (typeof shareProfile === 'function') {
            shareProfile();
        }
    }, 300);
}

/**
 * Close referral dashboard
 */
function closeReferralDashboard() {
    const modal = document.getElementById('referralDashboardModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * View referral dashboard (called from share modal)
 */
function viewReferralDashboard() {
    // Close share modal if open
    if (typeof closeShareModal === 'function') {
        closeShareModal();
    }

    // Open dashboard
    setTimeout(() => {
        openReferralDashboard();
    }, 300);
}

// Close modal when clicking outside
document.addEventListener('click', (event) => {
    const modal = document.getElementById('referralDashboardModal');
    if (modal && event.target === modal) {
        closeReferralDashboard();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const modal = document.getElementById('referralDashboardModal');
        if (modal && modal.style.display === 'flex') {
            closeReferralDashboard();
        }
    }
});

console.log('✓ Referral Dashboard Manager loaded');
