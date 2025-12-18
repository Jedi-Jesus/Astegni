/**
 * View Parent Profile Loader
 * Dynamically loads ALL parent profile data from database based on URL parameter
 * Displays "None" for fields that haven't been filled yet
 */

// Determine API base URL based on environment
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://api.astegni.com';

class ViewParentLoader {
    constructor() {
        this.parentId = null;
        this.parentData = null;
        this.reviewStats = null;
    }

    /**
     * Initialize the loader and fetch parent data
     */
    async init() {
        // Get parent ID from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.parentId = urlParams.get('id');
        this.byUserId = urlParams.get('by_user_id') === 'true';

        if (!this.parentId) {
            this.showError('No parent ID provided in URL');
            return;
        }

        // Show loading state
        this.showLoading();

        try {
            // Fetch parent data from API
            await this.fetchParentData();

            // Fetch review stats
            await this.fetchReviewStats();

            // Populate the profile header with data
            this.populateProfileHeader();

            // Initialize reviews if function exists
            if (typeof window.initializeParentReviews === 'function' && this.parentData.id) {
                await window.initializeParentReviews(this.parentData.id);
                console.log('Initialized parent reviews for profile_id:', this.parentData.id);
            }

            // Initialize children list if function exists
            if (typeof window.loadParentChildren === 'function') {
                await window.loadParentChildren(this.parentData.children_info || []);
                console.log('Initialized parent children:', this.parentData.children_info?.length || 0);
            }

            // Store parent data globally for connect and message buttons
            window.currentParentUserId = this.parentData.user_id;
            window.currentParentProfileId = this.parentData.id;
            window.currentParentData = this.parentData;

            // Hide loading state
            this.hideLoading();
        } catch (error) {
            console.error('Error loading parent profile:', error);
            this.showError('Failed to load parent profile. Please try again later.');
        }
    }

    /**
     * Fetch parent data from the API
     */
    async fetchParentData() {
        try {
            // Build URL with by_user_id parameter if needed
            const url = this.byUserId
                ? `${API_BASE_URL}/api/parent/${this.parentId}?by_user_id=true`
                : `${API_BASE_URL}/api/parent/${this.parentId}`;

            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Parent not found');
                }
                throw new Error(`Failed to fetch parent data: ${response.status}`);
            }

            this.parentData = await response.json();
            console.log('Loaded parent data:', this.parentData);
        } catch (error) {
            console.error('Error fetching parent data:', error);
            throw error;
        }
    }

    /**
     * Fetch review stats from the API
     */
    async fetchReviewStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/parent/reviews/stats/${this.parentData.id}`);

            if (response.ok) {
                this.reviewStats = await response.json();
                console.log('Loaded review stats:', this.reviewStats);
            } else {
                // Default stats if API fails
                this.reviewStats = {
                    total_reviews: 0,
                    average_rating: 0.0,
                    engagement_with_tutor_avg: 0.0,
                    engagement_with_child_avg: 0.0,
                    responsiveness_avg: 0.0,
                    payment_consistency_avg: 0.0
                };
            }
        } catch (error) {
            console.error('Error fetching review stats:', error);
            this.reviewStats = {
                total_reviews: 0,
                average_rating: 0.0,
                engagement_with_tutor_avg: 0.0,
                engagement_with_child_avg: 0.0,
                responsiveness_avg: 0.0,
                payment_consistency_avg: 0.0
            };
        }
    }

    /**
     * Populate the profile header section with parent data
     */
    populateProfileHeader() {
        if (!this.parentData) return;

        const data = this.parentData;

        // Update profile avatar
        this.updateProfileAvatar(data);

        // Update cover image
        this.updateCoverImage(data);

        // Update hero section
        this.updateHeroSection(data);

        // Update parent name
        this.updateParentName(data);

        // Update username
        this.updateUsername(data);

        // Update rating section
        this.updateRating(data.rating, data.rating_count);

        // Update rating metrics tooltip
        this.updateRatingMetrics();

        // Update location
        this.updateLocation(data);

        // Update relationship and occupation info
        this.updateRelationshipInfo(data);

        // Update contact information
        this.updateContactInfo(data);

        // Update quote
        this.updateQuote(data);

        // Update badges
        this.updateBadges(data);

        // Update about section
        this.updateAboutSection(data);

        // Update statistics
        this.updateStatistics(data);

        // Update dashboard reviews section
        this.updateDashboardReviews();
    }

    /**
     * Update profile avatar
     */
    updateProfileAvatar(data) {
        const avatarImg = document.getElementById('profile-avatar');
        if (avatarImg) {
            if (data.profile_picture) {
                avatarImg.src = data.profile_picture;
            } else {
                // Set default avatar based on relationship type
                const defaultAvatar = data.relationship_type === 'Mother'
                    ? '../uploads/system_images/system_profile_pictures/Mom-profile.jpg'
                    : '../uploads/system_images/system_profile_pictures/Dad-profile.jpg';
                avatarImg.src = defaultAvatar;
            }
            avatarImg.alt = `${data.name || 'Parent'} Profile`;
        }
    }

    /**
     * Update cover image
     */
    updateCoverImage(data) {
        const coverImg = document.getElementById('cover-img');
        if (coverImg) {
            if (data.cover_image) {
                coverImg.src = data.cover_image;
            } else {
                coverImg.src = '../uploads/system_images/system_cover_pictures/parent-cover.webp';
            }
        }
    }

    /**
     * Update hero section
     */
    updateHeroSection(data) {
        // Update hero title (typed text)
        const typedText = document.getElementById('typedText');
        if (typedText) {
            if (data.hero_title && data.hero_title.length > 0) {
                typedText.textContent = data.hero_title.join(' • ');
            } else {
                typedText.textContent = 'Dedicated Parent • Supporting Educational Excellence';
            }
        }

        // Update hero subtitle
        const heroSubtitle = document.getElementById('hero-subtitle');
        if (heroSubtitle) {
            heroSubtitle.textContent = data.hero_subtitle || "Actively involved in children's academic journey and development";
        }

        // Update hero stats
        this.updateHeroStats(data);
    }

    /**
     * Update hero statistics
     */
    updateHeroStats(data) {
        // Children count
        const childrenStat = document.querySelector('.stat-item:nth-child(1) .stat-number');
        if (childrenStat) {
            const childrenCount = data.total_children || (data.children_ids ? data.children_ids.length : 0);
            childrenStat.setAttribute('data-target', childrenCount);
            childrenStat.textContent = childrenCount;
        }

        // Engagement rate
        const engagementStat = document.querySelector('.stat-item:nth-child(2) .stat-number');
        if (engagementStat) {
            const engagementRate = this.calculateEngagementRate();
            engagementStat.setAttribute('data-target', engagementRate);
            engagementStat.textContent = engagementRate + '%';
        }

        // Rating
        const ratingStat = document.querySelector('.stat-item:nth-child(3) .stat-number');
        if (ratingStat) {
            const ratingPercent = data.rating ? Math.round((data.rating / 5) * 100) : 0;
            ratingStat.setAttribute('data-target', ratingPercent);
            ratingStat.textContent = ratingPercent + '%';
        }
    }

    /**
     * Calculate engagement rate from review stats
     */
    calculateEngagementRate() {
        if (!this.reviewStats || this.reviewStats.total_reviews === 0) {
            return 0;
        }

        const avg = (
            this.reviewStats.engagement_with_tutor_avg +
            this.reviewStats.engagement_with_child_avg +
            this.reviewStats.responsiveness_avg
        ) / 3;

        return Math.round((avg / 5) * 100);
    }

    /**
     * Update parent name
     */
    updateParentName(data) {
        const nameElement = document.getElementById('parentName');
        if (nameElement) {
            nameElement.textContent = data.name || 'Parent Name';
        }

        // Update page title
        document.title = `ASTEGNI - ${data.name || 'Parent Profile'}`;
    }

    /**
     * Update username
     */
    updateUsername(data) {
        const usernameElement = document.getElementById('parentUsername');
        if (usernameElement) {
            usernameElement.textContent = data.username ? `@${data.username}` : '';
        }
    }

    /**
     * Update rating display
     */
    updateRating(rating, ratingCount) {
        // Update star rating
        const ratingStars = document.querySelector('.rating-stars');
        if (ratingStars) {
            const stars = this.generateStarRating(rating || 0);
            ratingStars.innerHTML = stars;
        }

        // Update rating value
        const ratingValue = document.querySelector('.rating-value');
        if (ratingValue) {
            ratingValue.textContent = (rating || 0).toFixed(1);
        }

        // Update rating count
        const ratingCountEl = document.querySelector('.rating-count');
        if (ratingCountEl) {
            ratingCountEl.textContent = `(${ratingCount || 0} tutor reviews)`;
        }
    }

    /**
     * Generate star rating HTML
     */
    generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';
        for (let i = 0; i < fullStars; i++) stars += '★';
        if (hasHalfStar) stars += '★'; // Use full star for half (simplification)
        for (let i = 0; i < emptyStars; i++) stars += '☆';

        return stars;
    }

    /**
     * Update rating metrics in tooltip
     */
    updateRatingMetrics() {
        if (!this.reviewStats) return;

        // Engagement with Tutor
        const engagementTutorScore = document.querySelector('.rating-metric:nth-child(1) .metric-score');
        const engagementTutorFill = document.querySelector('.rating-metric:nth-child(1) .metric-fill');
        if (engagementTutorScore && engagementTutorFill) {
            const score = this.reviewStats.engagement_with_tutor_avg || 0;
            engagementTutorScore.textContent = score.toFixed(1);
            engagementTutorFill.style.width = `${(score / 5) * 100}%`;
        }

        // Engagement with Child
        const engagementChildScore = document.querySelector('.rating-metric:nth-child(2) .metric-score');
        const engagementChildFill = document.querySelector('.rating-metric:nth-child(2) .metric-fill');
        if (engagementChildScore && engagementChildFill) {
            const score = this.reviewStats.engagement_with_child_avg || 0;
            engagementChildScore.textContent = score.toFixed(1);
            engagementChildFill.style.width = `${(score / 5) * 100}%`;
        }

        // Responsiveness
        const responsivenessScore = document.querySelector('.rating-metric:nth-child(3) .metric-score');
        const responsivenessFill = document.querySelector('.rating-metric:nth-child(3) .metric-fill');
        if (responsivenessScore && responsivenessFill) {
            const score = this.reviewStats.responsiveness_avg || 0;
            responsivenessScore.textContent = score.toFixed(1);
            responsivenessFill.style.width = `${(score / 5) * 100}%`;
        }

        // Payment Consistency
        const paymentScore = document.querySelector('.rating-metric:nth-child(4) .metric-score');
        const paymentFill = document.querySelector('.rating-metric:nth-child(4) .metric-fill');
        if (paymentScore && paymentFill) {
            const score = this.reviewStats.payment_consistency_avg || 0;
            paymentScore.textContent = score.toFixed(1);
            paymentFill.style.width = `${(score / 5) * 100}%`;
        }
    }

    /**
     * Update location display
     */
    updateLocation(data) {
        const locationEl = document.querySelector('.profile-location span:last-child');
        if (locationEl) {
            const childrenCount = data.total_children || (data.children_ids ? data.children_ids.length : 0);
            const location = data.location || 'Location not specified';
            locationEl.textContent = `${location} | Parent of ${childrenCount} Student${childrenCount !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Update relationship and occupation info
     */
    updateRelationshipInfo(data) {
        // Relationship type
        const relationshipEl = document.getElementById('parentRelationship');
        if (relationshipEl) {
            relationshipEl.textContent = data.relationship_type || 'Parent';
        } else {
            // Try to find by structure
            const relationshipContainer = document.querySelector('.profile-contact-info div:first-child div:last-child div:last-child');
            if (relationshipContainer) {
                relationshipContainer.textContent = data.relationship_type || 'Parent';
            }
        }

        // Update relationship badge
        const relationshipBadge = document.querySelector('.profile-badge.relationship');
        if (relationshipBadge) {
            const emoji = data.relationship_type === 'Mother' ? '👩‍👧‍👦' : '👨‍👩‍👧‍👦';
            relationshipBadge.innerHTML = `${emoji} ${data.relationship_type || 'Parent'}`;
        }
    }

    /**
     * Update contact information
     */
    updateContactInfo(data) {
        // Email - we don't have email in parent_profiles, check if available
        const emailContainer = document.querySelector('.profile-contact-info:nth-of-type(2) div:first-child');
        if (emailContainer) {
            const emailValue = emailContainer.querySelector('div:last-child div:last-child');
            if (emailValue) {
                emailValue.textContent = data.email || 'Not provided';
            }
        }

        // Phone - we don't have phone in parent_profiles
        const phoneContainer = document.querySelector('.profile-contact-info:nth-of-type(2) div:last-child');
        if (phoneContainer) {
            const phoneValue = phoneContainer.querySelector('div:last-child div:last-child');
            if (phoneValue) {
                phoneValue.textContent = data.phone || 'Not provided';
            }
        }
    }

    /**
     * Update quote display
     */
    updateQuote(data) {
        const quoteEl = document.querySelector('.profile-quote span');
        if (quoteEl) {
            quoteEl.textContent = `"${data.quote || 'Investing in my children\'s education for a brighter future'}"`;
        }
    }

    /**
     * Update badges
     */
    updateBadges(data) {
        // Verified badge
        const verifiedBadge = document.querySelector('.profile-badge.verified');
        if (verifiedBadge) {
            if (data.is_verified) {
                verifiedBadge.style.display = 'inline-flex';
            } else {
                verifiedBadge.style.display = 'none';
            }
        }

        // Engagement badge
        const engagementBadge = document.querySelector('.profile-badge.expert');
        if (engagementBadge) {
            const engagementRate = this.calculateEngagementRate();
            engagementBadge.innerHTML = `📈 ${engagementRate}% Engagement`;
        }
    }

    /**
     * Update about section
     */
    updateAboutSection(data) {
        const aboutSection = document.querySelector('section h3');
        if (aboutSection && aboutSection.textContent === 'About This Parent') {
            const aboutParagraph = aboutSection.parentElement.querySelector('p');
            if (aboutParagraph) {
                if (data.bio) {
                    aboutParagraph.textContent = data.bio;
                } else {
                    const name = data.name ? data.name.split(' ')[0] : 'This parent';
                    const childCount = data.total_children || (data.children_ids ? data.children_ids.length : 0);
                    aboutParagraph.textContent = `${name} is a dedicated parent of ${childCount} child${childCount !== 1 ? 'ren' : ''}, actively involved in their educational journey.`;
                }
            }
        }
    }

    /**
     * Update statistics section
     */
    updateStatistics(data) {
        const statsSection = document.querySelector('h2');
        if (!statsSection) return;

        // Find Parent Statistics section
        const parentStatsHeader = Array.from(document.querySelectorAll('h2')).find(
            h => h.textContent.includes('Parent Statistics')
        );

        if (parentStatsHeader) {
            const statsContainer = parentStatsHeader.nextElementSibling;
            if (statsContainer) {
                const statItems = statsContainer.querySelectorAll('[style*="text-align: center"]');

                // Children Enrolled
                if (statItems[0]) {
                    const valueEl = statItems[0].querySelector('div:nth-child(2)');
                    if (valueEl) {
                        valueEl.textContent = data.total_children || (data.children_ids ? data.children_ids.length : 0);
                    }
                }

                // Engagement Rate
                if (statItems[1]) {
                    const valueEl = statItems[1].querySelector('div:nth-child(2)');
                    if (valueEl) {
                        valueEl.textContent = this.calculateEngagementRate() + '%';
                    }
                }

                // Payment Punctuality
                if (statItems[2]) {
                    const valueEl = statItems[2].querySelector('div:nth-child(2)');
                    if (valueEl) {
                        const paymentRate = this.reviewStats?.payment_consistency_avg
                            ? Math.round((this.reviewStats.payment_consistency_avg / 5) * 100)
                            : 0;
                        valueEl.textContent = paymentRate + '%';
                    }
                }

                // Parent Rating
                if (statItems[3]) {
                    const valueEl = statItems[3].querySelector('div:nth-child(2)');
                    if (valueEl) {
                        valueEl.textContent = (data.rating || 0).toFixed(1);
                    }
                }
            }
        }
    }

    /**
     * Update dashboard reviews section
     */
    updateDashboardReviews() {
        // This will be handled by view-parent-reviews.js
        // Just trigger an event to notify it's ready
        window.dispatchEvent(new CustomEvent('parentDataLoaded', {
            detail: {
                parentId: this.parentData.id,
                parentData: this.parentData,
                reviewStats: this.reviewStats
            }
        }));
    }

    /**
     * Show loading state
     */
    showLoading() {
        // Create loading overlay if it doesn't exist
        let loadingOverlay = document.getElementById('profile-loading-overlay');
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'profile-loading-overlay';
            loadingOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            loadingOverlay.innerHTML = `
                <div style="text-align: center;">
                    <div style="width: 50px; height: 50px; border: 4px solid #e5e7eb; border-top-color: #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                    <p style="color: #4b5563; font-size: 1rem;">Loading parent profile...</p>
                </div>
                <style>
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.body.appendChild(loadingOverlay);
        }
        loadingOverlay.style.display = 'flex';
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loadingOverlay = document.getElementById('profile-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Show error state
     */
    showError(message) {
        this.hideLoading();

        const mainContent = document.querySelector('.panels-container');
        if (mainContent) {
            mainContent.innerHTML = `
                <div style="text-align: center; padding: 4rem 2rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">😕</div>
                    <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--heading); margin-bottom: 0.75rem;">
                        Unable to Load Profile
                    </h2>
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                        ${message}
                    </p>
                    <button onclick="window.location.reload()" style="
                        background: var(--button-bg);
                        color: white;
                        border: none;
                        padding: 0.75rem 1.5rem;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                    ">
                        Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Initialize the loader when DOM is ready
let viewParentLoader = null;

document.addEventListener('DOMContentLoaded', () => {
    viewParentLoader = new ViewParentLoader();
    viewParentLoader.init();
});

// Export for use in other modules
window.viewParentLoader = viewParentLoader;
window.ViewParentLoader = ViewParentLoader;
