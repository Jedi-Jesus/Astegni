/**
 * Manage Reviews - Enhanced with selection and featuring functionality
 */

const ManageReviews = {
    // State
    state: {
        currentFilters: {
            role: null,
            rating: null,
            featured: null,
            page: 1,
            limit: 20
        },
        stats: null,
        reviews: [],
        totalReviews: 0,
        selectedReviews: new Set(),
        featuredReviews: new Map() // Map of review_id -> [locations]
    },

    // API base URL
    API_BASE_URL: 'https://api.astegni.com',

    /**
     * Initialize the manage reviews module
     */
    async init() {
        console.log('Initializing Manage Reviews...');
        this.state.selectedReviews.clear();
        await this.loadFeaturedReviews();
        this.loadStats();
        this.loadReviews();
        this.renderToolbar();
    },

    /**
     * Load all featured reviews to show badges
     */
    async loadFeaturedReviews() {
        try {
            // For now, we'll populate this when we load individual reviews
            // A proper implementation would have a dedicated endpoint
            // but this works as a quick solution
            this.state.featuredReviews.clear();
        } catch (error) {
            console.error('Error loading featured reviews:', error);
        }
    },

    /**
     * Render toolbar with selection actions
     */
    renderToolbar() {
        const container = document.getElementById('reviews-toolbar-container');
        if (!container) {
            // Create toolbar container if it doesn't exist
            const panel = document.getElementById('manage-reviews-panel');
            if (panel) {
                const toolbar = document.createElement('div');
                toolbar.id = 'reviews-toolbar-container';
                toolbar.className = 'reviews-toolbar hidden';
                panel.querySelector('.mb-8').after(toolbar);
            }
        }
        this.updateToolbar();
    },

    /**
     * Update toolbar based on selection
     */
    updateToolbar() {
        const container = document.getElementById('reviews-toolbar-container');
        if (!container) return;

        const selectedCount = this.state.selectedReviews.size;

        if (selectedCount === 0) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="toolbar-content">
                <div class="selection-info">
                    <i class="fas fa-check-circle"></i>
                    <span>${selectedCount} review${selectedCount > 1 ? 's' : ''} selected</span>
                </div>
                <div class="toolbar-actions">
                    <select id="feature-location-select" class="location-select">
                        <option value="all">All Pages</option>
                        <option value="parent-profile">Parent Profile</option>
                        <option value="student-profile">Student Profile</option>
                        <option value="tutor-profile">Tutor Profile</option>
                        <option value="home">Home Page</option>
                    </select>
                    <button onclick="ManageReviews.featureSelected()" class="feature-btn">
                        <i class="fas fa-star"></i>
                        Feature Reviews
                    </button>
                    <button onclick="ManageReviews.clearSelection()" class="clear-btn">
                        <i class="fas fa-times"></i>
                        Clear Selection
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Toggle review selection
     */
    toggleSelection(reviewId) {
        if (this.state.selectedReviews.has(reviewId)) {
            this.state.selectedReviews.delete(reviewId);
        } else {
            this.state.selectedReviews.add(reviewId);
        }
        this.updateToolbar();
        this.updateCheckbox(reviewId);
    },

    /**
     * Update checkbox visual state
     */
    updateCheckbox(reviewId) {
        const checkbox = document.querySelector(`input[data-review-id="${reviewId}"]`);
        if (checkbox) {
            checkbox.checked = this.state.selectedReviews.has(reviewId);
        }
    },

    /**
     * Clear all selections
     */
    clearSelection() {
        this.state.selectedReviews.clear();
        document.querySelectorAll('.review-checkbox').forEach(cb => cb.checked = false);
        this.updateToolbar();
    },

    /**
     * Feature selected reviews
     */
    async featureSelected() {
        const selectedIds = Array.from(this.state.selectedReviews);
        if (selectedIds.length === 0) {
            this.showError('Please select at least one review');
            return;
        }

        const locationSelect = document.getElementById('feature-location-select');
        const location = locationSelect ? locationSelect.value : 'all';

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/admin/reviews/feature`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    review_ids: selectedIds,
                    display_location: location
                })
            });

            if (!response.ok) throw new Error('Failed to feature reviews');

            const result = await response.json();
            this.showSuccess(`Successfully featured ${result.count} reviews on ${location}`);
            this.clearSelection();
        } catch (error) {
            console.error('Error featuring reviews:', error);
            this.showError('Failed to feature reviews');
        }
    },

    /**
     * Load review statistics
     */
    async loadStats() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/admin/reviews/stats`);
            if (!response.ok) throw new Error('Failed to load stats');

            const stats = await response.json();
            this.state.stats = stats;
            this.renderStats(stats);
        } catch (error) {
            console.error('Error loading stats:', error);
            this.showError('Failed to load review statistics');
        }
    },

    /**
     * Render statistics cards
     */
    renderStats(stats) {
        const statsContainer = document.getElementById('review-stats-container');
        if (!statsContainer) return;

        statsContainer.innerHTML = `
            <div class="stats-card" onclick="ManageReviews.filterByRole(null)" style="cursor: pointer;">
                <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <i class="fas fa-star"></i>
                </div>
                <div class="stat-details">
                    <div class="stat-value">${stats.total_reviews}</div>
                    <div class="stat-label">Total Reviews</div>
                    <div class="stat-sublabel">${stats.average_rating.toFixed(1)} avg rating</div>
                </div>
            </div>

            <div class="stats-card ${this.state.currentFilters.role === 'student' ? 'active' : ''}"
                 onclick="ManageReviews.filterByRole('student')" style="cursor: pointer;">
                <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <i class="fas fa-user-graduate"></i>
                </div>
                <div class="stat-details">
                    <div class="stat-value">${stats.by_role.student || 0}</div>
                    <div class="stat-label">Student Reviews</div>
                </div>
            </div>

            <div class="stats-card ${this.state.currentFilters.role === 'tutor' ? 'active' : ''}"
                 onclick="ManageReviews.filterByRole('tutor')" style="cursor: pointer;">
                <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <i class="fas fa-chalkboard-teacher"></i>
                </div>
                <div class="stat-details">
                    <div class="stat-value">${stats.by_role.tutor || 0}</div>
                    <div class="stat-label">Tutor Reviews</div>
                </div>
            </div>

            <div class="stats-card ${this.state.currentFilters.role === 'parent' ? 'active' : ''}"
                 onclick="ManageReviews.filterByRole('parent')" style="cursor: pointer;">
                <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                    <i class="fas fa-users"></i>
                </div>
                <div class="stat-details">
                    <div class="stat-value">${stats.by_role.parent || 0}</div>
                    <div class="stat-label">Parent Reviews</div>
                </div>
            </div>

            <div class="stats-card ${this.state.currentFilters.role === 'advertiser' ? 'active' : ''}"
                 onclick="ManageReviews.filterByRole('advertiser')" style="cursor: pointer;">
                <div class="stat-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
                    <i class="fas fa-bullhorn"></i>
                </div>
                <div class="stat-details">
                    <div class="stat-value">${stats.by_role.advertiser || 0}</div>
                    <div class="stat-label">Advertiser Reviews</div>
                </div>
            </div>

            <div class="stats-card ${this.state.currentFilters.featured === true ? 'active' : ''}"
                 onclick="ManageReviews.filterByFeatured()" style="cursor: pointer;">
                <div class="stat-icon" style="background: linear-gradient(135deg, #ffc107, #ff9800);">
                    <i class="fas fa-star"></i>
                </div>
                <div class="stat-details">
                    <div class="stat-value">${stats.featured_reviews || 0}</div>
                    <div class="stat-label">Featured Reviews</div>
                </div>
            </div>
        `;
    },

    /**
     * Render rating filter buttons
     */
    renderRatingFilters() {
        const container = document.getElementById('rating-filters-container');
        if (!container) return;

        const stats = this.state.stats;
        if (!stats) return;

        container.innerHTML = `
            <button onclick="ManageReviews.filterByRating(null)"
                    class="rating-filter-btn ${this.state.currentFilters.rating === null ? 'active' : ''}">
                <i class="fas fa-star"></i> All Ratings
                <span class="count">${stats.total_reviews}</span>
            </button>
            <button onclick="ManageReviews.filterByRating(5)"
                    class="rating-filter-btn ${this.state.currentFilters.rating === 5 ? 'active' : ''}">
                <i class="fas fa-star"></i> 5 Stars
                <span class="count">${stats.five_star}</span>
            </button>
            <button onclick="ManageReviews.filterByRating(4)"
                    class="rating-filter-btn ${this.state.currentFilters.rating === 4 ? 'active' : ''}">
                <i class="fas fa-star"></i> 4 Stars
                <span class="count">${stats.four_star}</span>
            </button>
            <button onclick="ManageReviews.filterByRating(3)"
                    class="rating-filter-btn ${this.state.currentFilters.rating === 3 ? 'active' : ''}">
                <i class="fas fa-star"></i> 3 Stars
                <span class="count">${stats.three_star}</span>
            </button>
            <button onclick="ManageReviews.filterByRating(2)"
                    class="rating-filter-btn ${this.state.currentFilters.rating === 2 ? 'active' : ''}">
                <i class="fas fa-star"></i> 2 Stars
                <span class="count">${stats.two_star}</span>
            </button>
            <button onclick="ManageReviews.filterByRating(1)"
                    class="rating-filter-btn ${this.state.currentFilters.rating === 1 ? 'active' : ''}">
                <i class="fas fa-star"></i> 1 Star
                <span class="count">${stats.one_star}</span>
            </button>
        `;
    },

    /**
     * Filter reviews by role
     */
    async filterByRole(role) {
        this.state.currentFilters.role = role;
        this.state.currentFilters.page = 1;
        await this.loadReviews();
        await this.loadStats();
    },

    /**
     * Filter reviews by rating
     */
    async filterByRating(rating) {
        this.state.currentFilters.rating = rating;
        this.state.currentFilters.page = 1;
        await this.loadReviews();
        this.renderRatingFilters();
    },

    /**
     * Filter reviews by featured status
     */
    async filterByFeatured() {
        // Toggle featured filter
        if (this.state.currentFilters.featured === true) {
            this.state.currentFilters.featured = null; // Clear filter
            this.state.currentFilters.role = null; // Also clear role filter when turning off
        } else {
            this.state.currentFilters.featured = true; // Show only featured
        }
        this.state.currentFilters.page = 1;
        await this.loadReviews();
        await this.loadStats();
    },

    /**
     * Load reviews with current filters
     */
    async loadReviews() {
        try {
            const { role, rating, featured, page, limit } = this.state.currentFilters;

            const params = new URLSearchParams({
                page: page,
                limit: limit
            });

            if (role) params.append('role', role);
            if (rating !== null) params.append('rating', rating);
            if (featured !== null) params.append('featured', featured);

            const response = await fetch(`${this.API_BASE_URL}/api/admin/reviews?${params}`);
            if (!response.ok) throw new Error('Failed to load reviews');

            const reviews = await response.json();
            this.state.reviews = reviews;

            await this.loadReviewsCount();

            this.renderReviews(reviews);
            this.renderRatingFilters();
        } catch (error) {
            console.error('Error loading reviews:', error);
            this.showError('Failed to load reviews');
        }
    },

    /**
     * Load total reviews count
     */
    async loadReviewsCount() {
        try {
            const { role, rating } = this.state.currentFilters;
            const params = new URLSearchParams();

            if (role) params.append('role', role);
            if (rating !== null) params.append('rating', rating);

            const response = await fetch(`${this.API_BASE_URL}/api/admin/reviews/count?${params}`);
            if (!response.ok) throw new Error('Failed to load count');

            const data = await response.json();
            this.state.totalReviews = data.count;
        } catch (error) {
            console.error('Error loading count:', error);
        }
    },

    /**
     * Render reviews list with checkboxes
     */
    renderReviews(reviews) {
        const container = document.getElementById('reviews-list-container');
        if (!container) return;

        if (reviews.length === 0) {
            container.innerHTML = `
                <div class="no-reviews">
                    <i class="fas fa-inbox fa-3x" style="color: var(--text-secondary); opacity: 0.5;"></i>
                    <p style="margin-top: 1rem; color: var(--text-secondary);">No reviews found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = reviews.map(review => {
            // Use featured_locations from the API response
            const featuredLocations = review.featured_locations || [];
            const isFeatured = featuredLocations.length > 0;

            return `
            <div class="review-card ${this.state.selectedReviews.has(review.id) ? 'selected' : ''} ${isFeatured ? 'is-featured' : ''}">
                ${isFeatured ? `
                <div class="featured-badge">
                    <i class="fas fa-star"></i>
                    Featured on: ${featuredLocations.join(', ')}
                </div>
                ` : ''}
                <div class="review-header">
                    <div class="reviewer-info">
                        <input type="checkbox"
                               class="review-checkbox"
                               data-review-id="${review.id}"
                               ${this.state.selectedReviews.has(review.id) ? 'checked' : ''}
                               onchange="ManageReviews.toggleSelection(${review.id})">
                        <img src="${review.reviewer_profile_picture || '../uploads/system_images/system_profile_pictures/man-user.png'}"
                             alt="${review.reviewer_name}"
                             class="reviewer-avatar">
                        <div>
                            <div class="reviewer-name">${review.reviewer_name}</div>
                            <div class="reviewer-role">
                                <i class="fas fa-${this.getRoleIcon(review.reviewer_role)}"></i>
                                ${this.capitalizeFirst(review.reviewer_role)}
                            </div>
                        </div>
                    </div>
                    <div class="review-actions">
                        <div class="review-rating">
                            ${this.renderStars(review.rating)}
                        </div>
                        ${isFeatured ? `
                        <button onclick="ManageReviews.unfeatureReview(${review.id}, '${featuredLocations[0]}')"
                                class="unfeature-review-btn"
                                title="Remove from featured">
                            <i class="fas fa-star-half-alt"></i>
                            Unfeature
                        </button>
                        ` : ''}
                        <button onclick="ManageReviews.deleteReview(${review.id})"
                                class="delete-review-btn"
                                title="Delete review">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="review-content">
                    ${review.review}
                </div>
                <div class="review-footer">
                    <span class="review-date">
                        <i class="far fa-clock"></i>
                        ${this.formatDate(review.created_at)}
                    </span>
                </div>
            </div>
        `;
        }).join('');
    },

    /**
     * Render star rating
     */
    renderStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="fas fa-star" style="color: #ffc107;"></i>';
            } else {
                stars += '<i class="far fa-star" style="color: #ddd;"></i>';
            }
        }
        return stars;
    },

    /**
     * Get role icon
     */
    getRoleIcon(role) {
        const icons = {
            student: 'user-graduate',
            tutor: 'chalkboard-teacher',
            parent: 'users',
            advertiser: 'bullhorn',
            admin: 'user-shield'
        };
        return icons[role] || 'user';
    },

    /**
     * Capitalize first letter
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    },

    /**
     * Delete review
     */
    async deleteReview(reviewId) {
        if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/admin/reviews/${reviewId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete review');

            this.showSuccess('Review deleted successfully');
            this.state.selectedReviews.delete(reviewId);
            await this.loadStats();
            await this.loadReviews();
        } catch (error) {
            console.error('Error deleting review:', error);
            this.showError('Failed to delete review');
        }
    },

    /**
     * Unfeature a review from a specific location
     */
    async unfeatureReview(reviewId, location = 'all') {
        if (!confirm(`Remove this review from featured ${location === 'all' ? 'everywhere' : location}?`)) {
            return;
        }

        try {
            const response = await fetch(
                `${this.API_BASE_URL}/api/admin/reviews/feature/${reviewId}?location=${location}`,
                { method: 'DELETE' }
            );

            if (!response.ok) throw new Error('Failed to unfeature review');

            this.showSuccess(`Review removed from featured ${location}`);
            await this.loadReviews();
        } catch (error) {
            console.error('Error unfeaturing review:', error);
            this.showError('Failed to unfeature review');
        }
    },

    /**
     * Check if review is featured
     */
    isFeatured(reviewId) {
        return this.state.featuredReviews.has(reviewId);
    },

    /**
     * Get featured locations for a review
     */
    getFeaturedLocations(reviewId) {
        return this.state.featuredReviews.get(reviewId) || [];
    },

    /**
     * Show error message
     */
    showError(message) {
        alert(message);
    },

    /**
     * Show success message
     */
    showSuccess(message) {
        alert(message);
    }
};

// Make available globally for onclick handlers
window.ManageReviews = ManageReviews;
