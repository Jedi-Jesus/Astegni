/**
 * View Parent Reviews Manager
 * Handles loading and displaying reviews for parent profiles
 * Reads from parent_reviews table with 4-factor rating system:
 * - engagement_with_tutor_rating
 * - engagement_with_child_rating
 * - responsiveness_rating
 * - payment_consistency_rating
 */

// Determine API base URL based on environment
const REVIEWS_API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://api.astegni.com';

class ViewParentReviews {
    constructor() {
        this.parentId = null;
        this.reviews = [];
        this.reviewStats = null;
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalReviews = 0;
    }

    /**
     * Initialize reviews for a parent profile
     * @param {number} parentId - The parent_profiles.id
     */
    async init(parentId) {
        this.parentId = parentId;

        try {
            // Fetch reviews
            await this.fetchReviews();

            // Fetch review stats
            await this.fetchReviewStats();

            // Update dashboard reviews section
            this.updateDashboardReviews();

            // Update reviews panel
            this.updateReviewsPanel();

            console.log('Parent reviews initialized successfully');
        } catch (error) {
            console.error('Error initializing parent reviews:', error);
        }
    }

    /**
     * Fetch reviews from the API
     */
    async fetchReviews(page = 1, limit = 20) {
        try {
            const skip = (page - 1) * limit;
            const response = await fetch(
                `${REVIEWS_API_BASE_URL}/api/parent/${this.parentId}/reviews?skip=${skip}&limit=${limit}`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch reviews: ${response.status}`);
            }

            this.reviews = await response.json();
            this.totalReviews = this.reviews.length;
            console.log('Loaded reviews:', this.reviews);
        } catch (error) {
            console.error('Error fetching reviews:', error);
            this.reviews = [];
        }
    }

    /**
     * Fetch review statistics
     */
    async fetchReviewStats() {
        try {
            const response = await fetch(
                `${REVIEWS_API_BASE_URL}/api/parent/reviews/stats/${this.parentId}`
            );

            if (response.ok) {
                this.reviewStats = await response.json();
                console.log('Loaded review stats:', this.reviewStats);
            }
        } catch (error) {
            console.error('Error fetching review stats:', error);
            this.reviewStats = null;
        }
    }

    /**
     * Update the dashboard reviews section (shows 3 recent reviews)
     */
    updateDashboardReviews() {
        const reviewsSection = document.getElementById('dashboard-reviews-section');
        if (!reviewsSection) {
            // Try to find by structure
            const sections = document.querySelectorAll('#dashboard-panel section');
            for (const section of sections) {
                const header = section.querySelector('h2');
                if (header && header.textContent.includes('Reviews & Ratings')) {
                    this.renderDashboardReviews(section);
                    return;
                }
            }
            return;
        }

        this.renderDashboardReviews(reviewsSection);
    }

    /**
     * Render reviews in dashboard section
     */
    renderDashboardReviews(container) {
        const reviewsGrid = container.querySelector('[style*="display: grid"]') ||
            container.querySelector('.reviews-grid');

        if (!reviewsGrid) return;

        // If no reviews, show empty state
        if (this.reviews.length === 0) {
            reviewsGrid.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
                    <p>No reviews yet. Reviews from tutors will appear here.</p>
                </div>
            `;
            return;
        }

        // Show up to 3 recent reviews
        const recentReviews = this.reviews.slice(0, 3);
        reviewsGrid.innerHTML = recentReviews.map((review, index) =>
            this.createReviewCard(review, index)
        ).join('');
    }

    /**
     * Create a review card HTML
     */
    createReviewCard(review, index = 0) {
        const colors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'];
        const borderColor = colors[index % colors.length];

        const reviewerName = review.reviewer_name || 'Tutor';
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewerName)}&background=f59e0b&color=fff&size=128`;
        const reviewerPicture = review.reviewer_profile_picture || defaultAvatar;

        const rating = review.rating || 0;
        const stars = this.generateStars(rating);

        const timeAgo = this.formatTimeAgo(review.created_at);

        return `
            <div style="background: var(--highlight-bg); border-radius: 12px; padding: 1.5rem; border-left: 4px solid ${borderColor};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <img src="${reviewerPicture}" alt="${reviewerName}"
                            style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;"
                            onerror="this.src='${defaultAvatar}'">
                        <div>
                            <h4 style="font-size: 1rem; font-weight: 600; margin: 0 0 0.25rem 0; color: var(--heading);">
                                ${reviewerName}
                            </h4>
                            <p style="font-size: 0.875rem; color: var(--text-muted); margin: 0;">
                                ${review.user_role || 'Tutor'}
                            </p>
                        </div>
                    </div>
                    <div class="rating-tooltip-container">
                        <div style="color: #f59e0b; font-size: 1.25rem;">${stars}</div>
                        ${this.createRatingTooltip(review, reviewerName)}
                    </div>
                </div>
                <p style="color: var(--text); line-height: 1.6; margin: 0 0 0.75rem 0;">
                    "${review.review_text || review.title || 'No review text provided.'}"
                </p>
                <span style="font-size: 0.875rem; color: var(--text-muted);">${timeAgo}</span>
            </div>
        `;
    }

    /**
     * Create rating tooltip HTML
     */
    createRatingTooltip(review, reviewerName) {
        const engagementTutor = review.engagement_with_tutor_rating || 0;
        const engagementChild = review.engagement_with_child_rating || 0;
        const responsiveness = review.responsiveness_rating || 0;
        const payment = review.payment_consistency_rating || 0;
        const overall = review.rating || 0;

        return `
            <div class="rating-tooltip">
                <div class="tooltip-header">${reviewerName}'s Rating</div>
                <div class="tooltip-rating-row">
                    <div class="tooltip-rating-label">Engagement with Tutor</div>
                    <div class="tooltip-progress-bar">
                        <div class="tooltip-progress-fill engagement-tutor" style="width: ${(engagementTutor / 5) * 100}%;"></div>
                    </div>
                    <div class="tooltip-progress-value">${engagementTutor.toFixed(1)}</div>
                </div>
                <div class="tooltip-rating-row">
                    <div class="tooltip-rating-label">Engagement with Child</div>
                    <div class="tooltip-progress-bar">
                        <div class="tooltip-progress-fill engagement-child" style="width: ${(engagementChild / 5) * 100}%;"></div>
                    </div>
                    <div class="tooltip-progress-value">${engagementChild.toFixed(1)}</div>
                </div>
                <div class="tooltip-rating-row">
                    <div class="tooltip-rating-label">Responsiveness</div>
                    <div class="tooltip-progress-bar">
                        <div class="tooltip-progress-fill responsiveness" style="width: ${(responsiveness / 5) * 100}%;"></div>
                    </div>
                    <div class="tooltip-progress-value">${responsiveness.toFixed(1)}</div>
                </div>
                <div class="tooltip-rating-row">
                    <div class="tooltip-rating-label">Payment Consistency</div>
                    <div class="tooltip-progress-bar">
                        <div class="tooltip-progress-fill payment" style="width: ${(payment / 5) * 100}%;"></div>
                    </div>
                    <div class="tooltip-progress-value">${payment.toFixed(1)}</div>
                </div>
                <div class="tooltip-overall">
                    <div class="tooltip-overall-label">Overall</div>
                    <div class="tooltip-overall-value">${overall.toFixed(1)} / 5.0</div>
                </div>
            </div>
        `;
    }

    /**
     * Update the reviews panel
     */
    updateReviewsPanel() {
        const reviewsPanel = document.getElementById('reviews-ratings-panel');
        if (!reviewsPanel) return;

        // Update stats overview
        this.updateReviewsStatsOverview(reviewsPanel);

        // Update reviews list
        this.updateReviewsList(reviewsPanel);
    }

    /**
     * Update reviews stats overview in reviews panel
     */
    updateReviewsStatsOverview(panel) {
        if (!this.reviewStats) return;

        // Update total reviews count
        const totalReviewsEl = panel.querySelector('[data-stat="total-reviews"]');
        if (totalReviewsEl) {
            totalReviewsEl.textContent = this.reviewStats.total_reviews || 0;
        }

        // Update average rating
        const avgRatingEl = panel.querySelector('[data-stat="avg-rating"]');
        if (avgRatingEl) {
            avgRatingEl.textContent = (this.reviewStats.average_rating || 0).toFixed(1);
        }

        // Update individual metrics
        const metrics = [
            { key: 'engagement_with_tutor_avg', selector: '[data-stat="engagement-tutor"]' },
            { key: 'engagement_with_child_avg', selector: '[data-stat="engagement-child"]' },
            { key: 'responsiveness_avg', selector: '[data-stat="responsiveness"]' },
            { key: 'payment_consistency_avg', selector: '[data-stat="payment"]' }
        ];

        metrics.forEach(metric => {
            const el = panel.querySelector(metric.selector);
            if (el) {
                el.textContent = (this.reviewStats[metric.key] || 0).toFixed(1);
            }
        });
    }

    /**
     * Update reviews list in reviews panel
     */
    updateReviewsList(panel) {
        const reviewsList = panel.querySelector('#reviews-list') ||
            panel.querySelector('.reviews-list');

        if (!reviewsList) return;

        if (this.reviews.length === 0) {
            reviewsList.innerHTML = `
                <div style="text-align: center; padding: 4rem 2rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">⭐</div>
                    <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--heading); margin-bottom: 0.5rem;">
                        No Reviews Yet
                    </h3>
                    <p style="color: var(--text-secondary);">
                        Reviews from tutors will appear here once they rate this parent.
                    </p>
                </div>
            `;
            return;
        }

        reviewsList.innerHTML = this.reviews.map((review, index) =>
            this.createDetailedReviewCard(review, index)
        ).join('');
    }

    /**
     * Create detailed review card for reviews panel
     */
    createDetailedReviewCard(review, index) {
        const rating = Math.round(review.rating || 0);
        const stars = this.generateStars(review.rating || 0);
        const timeAgo = this.formatTimeAgo(review.created_at);

        const reviewerName = review.reviewer_name || 'Tutor';
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(reviewerName)}&background=f59e0b&color=fff&size=128`;
        const reviewerPicture = review.reviewer_profile_picture || defaultAvatar;

        return `
            <div class="review-card" data-rating="${rating}"
                style="background: var(--highlight-bg); border-radius: 16px; padding: 1.5rem; margin-bottom: 1rem; transition: all 0.3s;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <img src="${reviewerPicture}" alt="${reviewerName}"
                            style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover;"
                            onerror="this.src='${defaultAvatar}'">
                        <div>
                            <h4 style="font-size: 1.125rem; font-weight: 600; margin: 0 0 0.25rem 0; color: var(--heading);">
                                ${reviewerName}
                            </h4>
                            <p style="font-size: 0.875rem; color: var(--text-muted); margin: 0 0 0.5rem 0;">
                                ${review.user_role || 'Tutor'}
                            </p>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <div style="color: #f59e0b; font-size: 1rem;">${stars}</div>
                                <span style="font-weight: 600; color: var(--heading);">${(review.rating || 0).toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    <span style="font-size: 0.875rem; color: var(--text-muted);">${timeAgo}</span>
                </div>

                ${review.title ? `
                    <h5 style="font-size: 1rem; font-weight: 600; margin: 0 0 0.75rem 0; color: var(--heading);">
                        ${review.title}
                    </h5>
                ` : ''}

                <p style="color: var(--text); line-height: 1.7; margin: 0 0 1rem 0;">
                    ${review.review_text || 'No review text provided.'}
                </p>

                <!-- Rating Breakdown -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1rem;">
                    ${this.createRatingBreakdownItem('Engagement with Tutor', review.engagement_with_tutor_rating)}
                    ${this.createRatingBreakdownItem('Engagement with Child', review.engagement_with_child_rating)}
                    ${this.createRatingBreakdownItem('Responsiveness', review.responsiveness_rating)}
                    ${this.createRatingBreakdownItem('Payment Consistency', review.payment_consistency_rating)}
                </div>

                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button onclick="markHelpful(this)" style="
                        display: flex; align-items: center; gap: 0.5rem;
                        padding: 0.5rem 1rem; border-radius: 8px;
                        background: transparent; border: 1px solid rgba(var(--border-rgb), 0.3);
                        color: var(--text-secondary); cursor: pointer; font-size: 0.875rem;
                        transition: all 0.2s;
                    ">
                        <span>👍</span> Helpful (${review.helpful_count || 0})
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Create rating breakdown item
     */
    createRatingBreakdownItem(label, value) {
        const rating = value || 0;
        const percentage = (rating / 5) * 100;

        return `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 0.75rem; color: var(--text-muted); min-width: 140px;">${label}</span>
                <div style="flex: 1; height: 6px; background: rgba(var(--border-rgb), 0.2); border-radius: 3px; overflow: hidden;">
                    <div style="width: ${percentage}%; height: 100%; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 3px;"></div>
                </div>
                <span style="font-size: 0.75rem; font-weight: 600; color: var(--heading); min-width: 24px;">${rating.toFixed(1)}</span>
            </div>
        `;
    }

    /**
     * Generate star rating string
     */
    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';
        for (let i = 0; i < fullStars; i++) stars += '★';
        if (hasHalfStar) stars += '★';
        for (let i = 0; i < emptyStars; i++) stars += '☆';

        return stars;
    }

    /**
     * Format time ago string
     */
    formatTimeAgo(dateString) {
        if (!dateString) return 'Unknown date';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }
}

// Create global instance
const viewParentReviews = new ViewParentReviews();

// Initialize function to be called by loader
window.initializeParentReviews = async function(parentId) {
    await viewParentReviews.init(parentId);
};

// Listen for parent data loaded event
window.addEventListener('parentDataLoaded', (event) => {
    const { parentId } = event.detail;
    if (parentId && !viewParentReviews.parentId) {
        viewParentReviews.init(parentId);
    }
});

// Export for use in other modules
window.viewParentReviews = viewParentReviews;
window.ViewParentReviews = ViewParentReviews;
