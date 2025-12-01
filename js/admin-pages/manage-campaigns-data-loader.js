/**
 * Manage Campaigns - Database Integration Module
 * Loads profile, reviews, and stats data from database
 */

(function() {
    'use strict';

    const API_BASE_URL = 'https://api.astegni.com';

    // Store current admin data
    let currentAdminId = null;
    let currentDepartment = 'manage-campaigns';  // NOTE: Use lowercase with hyphens
    let currentAdminProfile = null;

    /**
     * Initialize data loading on page load
     */
    async function initializeDataLoading() {
        try {
            // Get admin ID from localStorage or session
            const adminData = getAdminDataFromSession();
            if (!adminData) {
                console.warn('No admin session found. Redirecting to login...');
                // window.location.href = '../index.html';
                return;
            }

            currentAdminId = adminData.id;
            currentDepartment = adminData.department || 'manage-campaigns';

            // IMPORTANT: Verify department access before loading data
            await verifyDepartmentAccess();

            // Load all data in parallel
            await Promise.all([
                loadProfileHeader(),
                loadDashboardStats(),
                loadReviews()
            ]);

            console.log('✓ All campaign management data loaded successfully');

        } catch (error) {
            console.error('Failed to initialize data:', error);

            // Check if it's an access denied error
            if (error.message && error.message.includes('Access denied')) {
                showAccessDeniedPage(error.message);
            } else {
                showNotification('Failed to load profile data', 'error');
            }
        }
    }

    /**
     * Verify department access for this page
     * Only admins in "Campaign Management" or "System Settings" can access
     */
    async function verifyDepartmentAccess() {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/manage-campaigns/profile/${currentAdminId}`
            );

            if (response.status === 403) {
                const error = await response.json();
                throw new Error(error.detail || 'Access denied');
            }

            if (!response.ok && response.status !== 404) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log('✓ Department access verified');

        } catch (error) {
            console.error('Department access verification failed:', error);
            throw error;
        }
    }

    /**
     * Show access denied page
     */
    function showAccessDeniedPage(message) {
        // Hide main content
        const mainContent = document.querySelector('.container');
        if (mainContent) {
            mainContent.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 72px; color: #f44336; margin-bottom: 20px;">
                        🚫
                    </div>
                    <h1 style="color: #333; font-size: 32px; margin-bottom: 20px;">
                        Access Denied
                    </h1>
                    <p style="color: #666; font-size: 18px; max-width: 600px; margin: 0 auto 30px;">
                        ${message}
                    </p>
                    <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; max-width: 600px; margin: 0 auto 30px; text-align: left;">
                        <h3 style="color: #856404; margin-bottom: 10px;">
                            ℹ️ Access Requirements:
                        </h3>
                        <ul style="color: #856404; margin: 0; padding-left: 20px;">
                            <li>Department: <strong>manage-campaigns</strong> OR <strong>manage-system-settings</strong></li>
                            <li>Contact your system administrator to request access</li>
                        </ul>
                    </div>
                    <button onclick="window.location.href='../index.html'"
                            style="background: #4CAF50; color: white; border: none; padding: 12px 24px; border-radius: 4px; font-size: 16px; cursor: pointer;">
                        ← Return to Home
                    </button>
                </div>
            `;
        }
    }

    /**
     * Get admin data from session/localStorage
     */
    function getAdminDataFromSession() {
        // Try to get from localStorage
        const adminSession = localStorage.getItem('adminSession');
        if (adminSession) {
            try {
                return JSON.parse(adminSession);
            } catch (e) {
                console.error('Failed to parse admin session:', e);
            }
        }

        // No fallback - return null to force login redirect
        console.warn('No valid admin session found');
        return null;
    }

    /**
     * Load profile header data from database
     */
    async function loadProfileHeader() {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/manage-campaigns/profile/${currentAdminId}?department=${encodeURIComponent(currentDepartment)}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const profile = await response.json();
            currentAdminProfile = profile;

            // Update profile header UI
            updateProfileHeaderUI(profile);

            // Populate edit modal with current data
            populateEditModal(profile);

            console.log('✓ Profile header loaded:', profile);

        } catch (error) {
            console.error('Failed to load profile header:', error);
            // Use fallback data
            loadFallbackProfileData();
        }
    }

    /**
     * Update profile header UI with data
     */
    function updateProfileHeaderUI(profile) {
        // Full name (Ethiopian naming convention)
        const fullName = `${profile.first_name} ${profile.father_name}`;
        const adminNameEl = document.getElementById('adminUsername');
        if (adminNameEl) {
            adminNameEl.textContent = profile.username || fullName;
        }

        // Profile picture
        if (profile.profile_picture) {
            const profileImg = document.querySelector('.profile-avatar');
            if (profileImg) {
                profileImg.src = profile.profile_picture;
            }
        }

        // Cover picture
        if (profile.cover_picture) {
            const coverImg = document.querySelector('.cover-img');
            if (coverImg) {
                coverImg.src = profile.cover_picture;
            }
        }

        // Rating
        const ratingValueEl = document.querySelector('.rating-value');
        if (ratingValueEl) {
            ratingValueEl.textContent = profile.rating.toFixed(1);
        }

        const ratingCountEl = document.querySelector('.rating-count');
        if (ratingCountEl) {
            ratingCountEl.textContent = `(${profile.total_reviews} reviews)`;
        }

        // Quote
        const quoteEl = document.querySelector('.profile-quote span');
        if (quoteEl && profile.quote) {
            quoteEl.textContent = `"${profile.quote}"`;
        }

        // Bio/Description
        const bioEl = document.querySelector('.info-description p');
        if (bioEl && profile.bio) {
            bioEl.textContent = profile.bio;
        }

        // Email
        const emailEl = document.getElementById('profile-email');
        if (emailEl && profile.email) {
            emailEl.textContent = profile.email;
        }

        // Phone
        const phoneEl = document.getElementById('profile-phone');
        if (phoneEl && profile.phone_number) {
            phoneEl.textContent = profile.phone_number;
        }

        // Position/Department
        const departmentEl = document.getElementById('profile-department');
        if (departmentEl && profile.position) {
            departmentEl.textContent = profile.position;
        }

        // Joined date
        const joinedEl = document.querySelector('.info-item:nth-child(5) .info-value');
        if (joinedEl) {
            const joinedDate = new Date(profile.joined_date);
            joinedEl.textContent = joinedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }

        // Update badges if provided
        if (profile.badges && profile.badges.length > 0) {
            updateBadges(profile.badges);
        }
    }

    /**
     * Update badges display
     */
    function updateBadges(badges) {
        const badgesRow = document.querySelector('.badges-row');
        if (!badgesRow) return;

        // Keep existing badges or update with new ones
        // This is a simple implementation - you can enhance it
        console.log('Badges:', badges);
    }

    /**
     * Populate edit modal with current profile data
     */
    function populateEditModal(profile) {
        // Set values in edit modal
        const firstNameInput = document.getElementById('firstNameInput');
        if (firstNameInput) firstNameInput.value = profile.first_name || '';

        const fatherNameInput = document.getElementById('fatherNameInput');
        if (fatherNameInput) fatherNameInput.value = profile.father_name || '';

        const grandfatherNameInput = document.getElementById('grandfatherNameInput');
        if (grandfatherNameInput) grandfatherNameInput.value = profile.grandfather_name || '';

        const usernameInput = document.getElementById('adminUsernameInput');
        if (usernameInput) usernameInput.value = profile.username || '';

        const emailInput = document.getElementById('emailInput');
        if (emailInput) emailInput.value = profile.email || '';

        const phoneInput = document.getElementById('phoneNumberInput');
        if (phoneInput) phoneInput.value = profile.phone_number || '';

        const bioInput = document.getElementById('bioInput');
        if (bioInput) bioInput.value = profile.bio || '';

        const quoteInput = document.getElementById('quoteInput');
        if (quoteInput) quoteInput.value = profile.quote || '';
    }

    /**
     * Load dashboard statistics from database
     */
    async function loadDashboardStats() {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/manage-campaigns/stats/${currentAdminId}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const stats = await response.json();

            // Update dashboard stats UI
            updateDashboardStatsUI(stats);

            console.log('✓ Dashboard stats loaded:', stats);

        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
            // Keep existing hardcoded stats as fallback
        }
    }

    /**
     * Update dashboard statistics UI
     */
    function updateDashboardStatsUI(stats) {
        // Update main dashboard stats cards
        const statsCards = document.querySelectorAll('#dashboard-panel .card');

        if (statsCards.length >= 8) {
            // Verified Campaigns
            updateStatCard(statsCards[0], stats.verified_campaigns, '72% of total');

            // Pending Campaigns
            updateStatCard(statsCards[1], stats.pending_campaigns, 'Awaiting review');

            // Rejected Campaigns
            updateStatCard(statsCards[2], stats.rejected_campaigns, 'Last 30 days');

            // Suspended Campaigns
            updateStatCard(statsCards[3], stats.suspended_campaigns, 'Active suspensions');

            // Archived Campaigns
            updateStatCard(statsCards[4], stats.archived_campaigns, 'Completed');

            // Approval Rate
            updateStatCard(statsCards[5], `${stats.approval_rate}%`, 'This month');

            // Avg Processing Time
            const processingTime = stats.avg_processing_time < 1 ? '< 1hr' : `${stats.avg_processing_time.toFixed(1)}hrs`;
            updateStatCard(statsCards[6], processingTime, 'Per application');

            // Client Satisfaction
            updateStatCard(statsCards[7], `${stats.client_satisfaction}%`, 'Happy clients');
        }

        // Update panel-specific stats
        updatePanelStats(stats);
    }

    /**
     * Helper to update individual stat card
     */
    function updateStatCard(card, value, subtitle) {
        const valueEl = card.querySelector('.text-2xl');
        const subtitleEl = card.querySelector('.text-sm');

        if (valueEl) valueEl.textContent = value;
        if (subtitleEl) subtitleEl.textContent = subtitle;
    }

    /**
     * Update panel-specific statistics
     */
    function updatePanelStats(stats) {
        // Verified panel stats
        const verifiedCards = document.querySelectorAll('#verified-panel .card');
        if (verifiedCards.length >= 4) {
            updateStatCard(verifiedCards[0], stats.verified_campaigns, '');
            // You can add more detailed breakdown here
        }

        // Requested panel stats
        const requestedCards = document.querySelectorAll('#requested-panel .card');
        if (requestedCards.length >= 4) {
            updateStatCard(requestedCards[0], stats.pending_campaigns, '');
        }

        // Rejected panel stats
        const rejectedCards = document.querySelectorAll('#rejected-panel .card');
        if (rejectedCards.length >= 4) {
            updateStatCard(rejectedCards[0], stats.rejected_campaigns, '');
        }

        // Suspended panel stats
        const suspendedCards = document.querySelectorAll('#suspended-panel .card');
        if (suspendedCards.length >= 4) {
            updateStatCard(suspendedCards[0], stats.suspended_campaigns, '');
        }
    }

    /**
     * Load reviews from database filtered by admin_id and department
     */
    async function loadReviews() {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/admin-reviews/recent?limit=3&admin_id=${currentAdminId}&department=${encodeURIComponent(currentDepartment)}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const reviews = data.reviews;

            // Update reviews UI
            updateReviewsUI(reviews);

            console.log('✓ Reviews loaded:', reviews.length);

        } catch (error) {
            console.error('Failed to load reviews:', error);
            // Keep existing hardcoded reviews as fallback
        }
    }

    /**
     * Update reviews section UI
     */
    function updateReviewsUI(reviews) {
        const reviewsContainer = document.querySelector('.card.p-6.mb-8 .space-y-4');
        if (!reviewsContainer) return;

        // Only update if we have reviews
        if (reviews.length === 0) return;

        // Clear existing reviews
        reviewsContainer.innerHTML = '';

        // Color schemes for review borders
        const borderColors = ['blue-500', 'green-500', 'purple-500', 'yellow-500', 'red-500'];

        reviews.forEach((review, index) => {
            const borderColor = borderColors[index % borderColors.length];
            const stars = '★'.repeat(Math.floor(review.rating)) + '☆'.repeat(5 - Math.floor(review.rating));

            const reviewEl = document.createElement('div');
            reviewEl.className = `border-l-4 border-${borderColor} pl-4`;
            reviewEl.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-semibold">${escapeHtml(review.admin_name)}</h4>
                        <p class="text-sm text-gray-600">From: ${escapeHtml(review.reviewer_name)}${review.reviewer_role ? ` (${review.reviewer_role})` : ''}</p>
                    </div>
                    <div class="flex items-center">
                        <span class="text-yellow-400">${stars}</span>
                    </div>
                </div>
                <p class="text-gray-700">"${escapeHtml(review.comment || 'No comment provided')}"</p>
                <p class="text-xs text-gray-500 mt-2">${formatTimeAgo(review.created_at)}</p>
            `;

            reviewsContainer.appendChild(reviewEl);
        });
    }

    /**
     * Handle profile update form submission
     */
    window.handleProfileUpdate = async function(event) {
        event.preventDefault();

        try {
            const formData = {
                first_name: document.getElementById('firstNameInput')?.value,
                father_name: document.getElementById('fatherNameInput')?.value,
                grandfather_name: document.getElementById('grandfatherNameInput')?.value,
                email: document.getElementById('emailInput')?.value,
                phone_number: document.getElementById('phoneNumberInput')?.value,
                bio: document.getElementById('bioInput')?.value,
                quote: document.getElementById('quoteInput')?.value
            };

            const response = await fetch(
                `${API_BASE_URL}/api/manage-campaigns/profile/${currentAdminId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Reload profile data
            await loadProfileHeader();

            // Close modal
            closeEditProfileModal();

            showNotification('Profile updated successfully!', 'success');

        } catch (error) {
            console.error('Failed to update profile:', error);
            showNotification('Failed to update profile. Please try again.', 'error');
        }
    };

    /**
     * Load fallback profile data (for development/testing)
     */
    function loadFallbackProfileData() {
        console.log('Using fallback profile data');
        const fallbackProfile = {
            id: 1,
            first_name: 'Campaign',
            father_name: 'Administrator',
            grandfather_name: '',
            username: 'admin_campaigns',
            email: 'campaigns@astegni.et',
            phone_number: '+251911234567',
            bio: 'Senior System Administrator specializing in advertising campaign management and revenue optimization.',
            quote: 'Maximizing ROI through strategic campaign management and advertiser partnerships.',
            rating: 4.8,
            total_reviews: 312,
            position: 'Marketing & Advertising',
            joined_date: '2020-02-01',
            badges: [],
            profile_picture: null,
            cover_picture: null
        };

        updateProfileHeaderUI(fallbackProfile);
        populateEditModal(fallbackProfile);
    }

    /**
     * Utility: Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Utility: Format timestamp to relative time
     */
    function formatTimeAgo(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
        if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
        if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    /**
     * Notification helper (uses existing function from manage-campaigns.js)
     */
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-0`;

        // Set color based on type
        switch(type) {
            case 'success':
                notification.className += ' bg-green-500 text-white';
                break;
            case 'warning':
                notification.className += ' bg-yellow-500 text-white';
                break;
            case 'error':
                notification.className += ' bg-red-500 text-white';
                break;
            default:
                notification.className += ' bg-blue-500 text-white';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        if (window.location.href.includes('manage-campaigns.html')) {
            console.log('Initializing Campaign Management Data Loader...');
            initializeDataLoading();
        }
    });

    // Expose functions globally if needed
    window.reloadCampaignProfile = loadProfileHeader;
    window.reloadCampaignStats = loadDashboardStats;
    window.reloadCampaignReviews = loadReviews;

})();
