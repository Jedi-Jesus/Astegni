// ============================================
// REVIEWS PANEL MANAGER
// Handles reviews panel display, filtering, and interactions
// ============================================

const ReviewsPanelManager = {
    allReviews: [],
    currentFilter: 'all',
    _initialized: false,

    /**
     * Initialize reviews panel
     */
    async init() {
        if (this._initialized) {
            console.log('⚠️ ReviewsPanelManager already initialized, skipping...');
            return;
        }
        this._initialized = true;

        console.log('🌟 Initializing Reviews Panel Manager...');
        await this.loadReviews();
        this.setupEventListeners();
    },

    /**
     * Load all reviews for the tutor from database
     */
    async loadReviews() {
        try {
            // FIXED: Get tutor profile ID from localStorage (use 'currentUser' from profile-system.js)
            let retries = 0;
            const maxRetries = 15;
            const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');

            // DEBUG: Log user object to see what we have
            console.log('🔍 [Reviews] User object:', {
                user_id: user.id,
                tutor_profile_id: user.tutor_profile_id,
                role_ids: user.role_ids,
                has_role_ids: !!user.role_ids,
                tutor_id_from_role_ids: user.role_ids?.tutor
            });

            // CRITICAL: Use tutor_profile_id (from tutor_profiles table), not user.id (from users table)
            let tutorId = user.tutor_profile_id || user.role_ids?.tutor || user.id;

            // Retry mechanism: wait for tutorId to be set
            while (!tutorId && retries < maxRetries) {
                console.log(`⏳ [Reviews] Waiting for tutor ID to load... (attempt ${retries + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 200));
                const refreshedUser = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');
                tutorId = refreshedUser.tutor_profile_id || refreshedUser.role_ids?.tutor || refreshedUser.id;
                retries++;
            }

            if (!tutorId) {
                console.log('⚠️ [Reviews] No tutor ID available after waiting, cannot load reviews');
                this.showError('Unable to load reviews - tutor ID not available');
                return;
            }

            console.log('📥 Loading reviews for tutor ID:', tutorId);

            // Fetch from API
            const response = await fetch(`http://localhost:8000/api/tutor/${tutorId}/reviews`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const reviews = await response.json();
            this.allReviews = reviews || [];
            this.calculateStats();
            this.renderReviews();

            console.log(`✅ Loaded ${this.allReviews.length} reviews from database`);
        } catch (error) {
            console.error('❌ Error loading reviews:', error);
            this.showError('Failed to load reviews');
        }
    },

    /**
     * Calculate and display review statistics
     */
    calculateStats() {
        if (this.allReviews.length === 0) {
            this.updateElement('reviews-avg-rating', '0.0');
            this.updateElement('reviews-total-count', '0 reviews');
            this.updateElement('reviews-subject-matter', '0.0');
            this.updateElement('reviews-communication', '0.0');
            this.updateElement('reviews-punctuality', '0.0');
            return;
        }

        // Calculate average rating
        const avgRating = this.allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / this.allReviews.length;

        // Calculate 4-factor averages (subject_matter_rating renamed to subject_understanding_rating)
        const avgSubjectUnderstanding = this.allReviews.reduce((sum, r) => sum + (r.subject_understanding_rating || r.rating || 0), 0) / this.allReviews.length;
        const avgCommunication = this.allReviews.reduce((sum, r) => sum + (r.communication_rating || r.rating || 0), 0) / this.allReviews.length;
        const avgDiscipline = this.allReviews.reduce((sum, r) => sum + (r.discipline_rating || r.rating || 0), 0) / this.allReviews.length;
        const avgPunctuality = this.allReviews.reduce((sum, r) => sum + (r.punctuality_rating || r.rating || 0), 0) / this.allReviews.length;

        // Update UI - 4-Factor System
        this.updateElement('reviews-avg-rating', avgRating.toFixed(1));
        this.updateElement('reviews-total-count', `${this.allReviews.length} review${this.allReviews.length !== 1 ? 's' : ''}`);
        this.updateElement('reviews-subject-understanding', avgSubjectUnderstanding.toFixed(1));
        this.updateElement('reviews-communication', avgCommunication.toFixed(1));
        this.updateElement('reviews-discipline', avgDiscipline.toFixed(1));
        this.updateElement('reviews-punctuality', avgPunctuality.toFixed(1));

        // Update progress bars
        this.updateProgressBar('reviews-subject-bar', avgSubjectUnderstanding);
        this.updateProgressBar('reviews-communication-bar', avgCommunication);
        this.updateProgressBar('reviews-discipline-bar', avgDiscipline);
        this.updateProgressBar('reviews-punctuality-bar', avgPunctuality);
    },

    /**
     * Update progress bar width based on rating (0-5 scale)
     */
    updateProgressBar(id, rating) {
        const element = document.getElementById(id);
        if (element) {
            const percentage = (rating / 5) * 100;
            element.style.width = `${percentage}%`;
        }
    },

    /**
     * Render reviews based on current filter
     */
    renderReviews() {
        const container = document.getElementById('reviews-list');
        if (!container) return;

        // Filter reviews
        let filteredReviews = this.allReviews;
        if (this.currentFilter !== 'all') {
            const filterRating = parseInt(this.currentFilter);
            filteredReviews = this.allReviews.filter(r => Math.round(r.rating) === filterRating);
        }

        // Empty state
        if (filteredReviews.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <p class="text-lg">No ${this.currentFilter === 'all' ? '' : this.currentFilter + '-star '}reviews found.</p>
                </div>
            `;
            return;
        }

        // Render reviews (one per row)
        const html = filteredReviews.map(review => this.createReviewCard(review)).join('');
        container.innerHTML = html;
    },

    /**
     * Create a single review card matching view-parent.html layout EXACTLY
     */
    createReviewCard(review) {
        const reviewerName = review.reviewer_name || review.student_name || 'Anonymous';
        const defaultPicture = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(reviewerName) + '&background=4F46E5&color=fff&size=128';
        const reviewerPicture = review.reviewer_profile_picture || review.reviewer_picture || review.student_profile_picture || defaultPicture;
        const reviewerRole = review.reviewer_role_description || (review.reviewer_role === 'parent' ? 'Parent' : review.reviewer_role === 'student' ? 'Student' : 'User');
        const reviewerSubject = review.reviewer_subject || review.subject || '';
        const rating = review.rating || 0;

        // 4-factor ratings (use individual ratings or fall back to overall rating)
        const subjectMatter = review.subject_matter_rating || review.subject_understanding_rating || review.rating || 0;
        const communication = review.communication_rating || review.rating || 0;
        const discipline = review.discipline_rating || review.rating || 0;
        const punctuality = review.punctuality_rating || review.rating || 0;

        // Calculate overall rating from 4 factors
        const overallRating = ((subjectMatter + communication + discipline + punctuality) / 4).toFixed(1);

        // Generate stars HTML
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        const starsHTML = '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(emptyStars);

        // Border color based on rating (matching view-parent.html)
        const borderColor = this.getBorderColor(rating);

        // Featured badge border for featured reviews
        const featuredBorder = review.is_featured ? `border: 3px solid ${borderColor};` : '';

        // Time ago
        const timeAgo = this.getTimeAgo(review.created_at);

        return `
            <div class="review-card" data-rating="${Math.round(rating)}" style="background: var(--card-bg); border-radius: 16px; padding: 2rem; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border-left: 4px solid ${borderColor};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.25rem;">
                    <div style="display: flex; gap: 1rem; align-items: center;">
                        <img src="${reviewerPicture}" alt="${reviewerName}" style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; ${featuredBorder}" onerror="this.src='${defaultPicture}'">
                        <div>
                            <h4 style="font-size: 1.125rem; font-weight: 600; margin: 0 0 0.25rem 0; color: var(--heading);">${reviewerName}</h4>
                            <p style="font-size: 0.875rem; color: var(--text-muted); margin: 0 0 0.25rem 0;">${reviewerRole}${reviewerSubject ? ' • ' + reviewerSubject : ''}</p>
                            <div class="rating-tooltip-container" style="display: inline-block;">
                                <div style="color: #f59e0b; font-size: 1rem;">${starsHTML}</div>
                                <div class="rating-tooltip">
                                    <div class="tooltip-header">${reviewerName}'s Rating</div>
                                    <div class="tooltip-rating-row">
                                        <div class="tooltip-rating-label">Subject Matter Expertise</div>
                                        <div class="tooltip-progress-bar"><div class="tooltip-progress-fill subject-matter" style="width: ${(subjectMatter / 5) * 100}%;"></div></div>
                                        <div class="tooltip-progress-value">${subjectMatter.toFixed(1)}</div>
                                    </div>
                                    <div class="tooltip-rating-row">
                                        <div class="tooltip-rating-label">Communication Skills</div>
                                        <div class="tooltip-progress-bar"><div class="tooltip-progress-fill communication" style="width: ${(communication / 5) * 100}%;"></div></div>
                                        <div class="tooltip-progress-value">${communication.toFixed(1)}</div>
                                    </div>
                                    <div class="tooltip-rating-row">
                                        <div class="tooltip-rating-label">Discipline</div>
                                        <div class="tooltip-progress-bar"><div class="tooltip-progress-fill discipline" style="width: ${(discipline / 5) * 100}%;"></div></div>
                                        <div class="tooltip-progress-value">${discipline.toFixed(1)}</div>
                                    </div>
                                    <div class="tooltip-rating-row">
                                        <div class="tooltip-rating-label">Punctuality</div>
                                        <div class="tooltip-progress-bar"><div class="tooltip-progress-fill punctuality" style="width: ${(punctuality / 5) * 100}%;"></div></div>
                                        <div class="tooltip-progress-value">${punctuality.toFixed(1)}</div>
                                    </div>
                                    <div class="tooltip-overall">
                                        <div class="tooltip-overall-label">Overall</div>
                                        <div class="tooltip-overall-value">${overallRating} / 5.0</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        ${review.is_featured ? `<div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.5rem;">⭐ Featured Review</div>` : ''}
                        <span style="font-size: 0.875rem; color: var(--text-muted);">${timeAgo}</span>
                    </div>
                </div>
                <p style="color: var(--text); line-height: 1.7; margin: 0 0 1.25rem 0; font-size: 1rem;">"${review.review_text || review.comment || 'No comment provided.'}"</p>
                <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 1rem; border-top: 1px solid rgba(var(--border-rgb), 0.3);">
                    <div style="display: flex; gap: 1rem;">
                        <button onclick="markHelpful(this)" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid rgba(var(--border-rgb), 0.3); background: transparent; color: var(--text); font-size: 0.875rem; cursor: pointer; transition: all 0.3s;">
                            <span>👍</span> Helpful (${review.helpful_count || 0})
                        </button>
                        <button onclick="reportReview(this)" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid rgba(var(--border-rgb), 0.3); background: transparent; color: var(--text); font-size: 0.875rem; cursor: pointer; transition: all 0.3s;">
                            <span>🚩</span> Report
                        </button>
                    </div>
                </div>
            </div>
        `;
    },


    /**
     * Get border color based on rating
     */
    getBorderColor(rating) {
        if (rating >= 5) return '#f59e0b'; // Gold for 5 stars
        if (rating >= 4) return '#3b82f6'; // Blue for 4 stars
        if (rating >= 3) return '#10b981'; // Green for 3 stars
        return '#8b5cf6'; // Purple for lower ratings
    },

    /**
     * Setup tooltips on star hover (now handled by CSS - rating-tooltip-container)
     * This method is kept for backwards compatibility but does nothing
     */
    setupTooltips() {
        // Tooltips are now inline in the HTML structure (matching view-parent.html)
        // CSS handles the hover state via .rating-tooltip-container:hover .rating-tooltip
    },

    /**
     * Filter reviews by rating
     */
    filterByRating(rating) {
        this.currentFilter = rating;

        // Update active tab
        document.querySelectorAll('.review-filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`.review-filter-tab[data-rating="${rating}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Re-render
        this.renderReviews();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for panel switch to reviews
        window.addEventListener('panelSwitch', (e) => {
            if (e.detail.panelName === 'reviews') {
                // Reload reviews when panel is opened
                this.loadReviews();
            }
        });
    },

    /**
     * Get time ago string
     */
    getTimeAgo(dateString) {
        if (!dateString) return 'Recently';

        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
            }
        }

        return 'Just now';
    },

    /**
     * Utility: Update element text content
     */
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        console.error(message);
        const container = document.getElementById('reviews-list');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12 text-red-500">
                    <p class="text-lg">${message}</p>
                </div>
            `;
        }
    }
};

// Global functions for onclick handlers (matching view-parent.html pattern)
window.filterReviews = (rating) => ReviewsPanelManager.filterByRating(rating);
window.filterReviewsByRating = (rating) => ReviewsPanelManager.filterByRating(rating);

window.sortReviews = (sortBy) => {
    console.log('Sorting reviews by:', sortBy);

    switch(sortBy) {
        case 'recent':
            ReviewsPanelManager.allReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'helpful':
            ReviewsPanelManager.allReviews.sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));
            break;
        case 'highest':
            ReviewsPanelManager.allReviews.sort((a, b) => b.rating - a.rating);
            break;
        case 'lowest':
            ReviewsPanelManager.allReviews.sort((a, b) => a.rating - b.rating);
            break;
    }

    ReviewsPanelManager.renderReviews();
};

window.markHelpful = (button) => {
    console.log('Marking review as helpful');

    const currentCount = parseInt(button.textContent.match(/\d+/)[0]);
    const newCount = currentCount + 1;
    button.innerHTML = `<span>👍</span> Helpful (${newCount})`;

    // TODO: Send to backend API
    // await API.markReviewHelpful(reviewId);

    // Visual feedback
    button.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
    button.style.color = 'white';
    button.style.borderColor = '#3b82f6';
    button.disabled = true;
};

window.reportReview = (button) => {
    console.log('Reporting review');

    const confirmed = confirm('Are you sure you want to report this review? Our team will review it for policy violations.');

    if (confirmed) {
        // TODO: Send to backend API
        // await API.reportReview(reviewId);

        button.innerHTML = `<span>✅</span> Reported`;
        button.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        button.style.color = 'white';
        button.style.borderColor = '#ef4444';
        button.disabled = true;

        alert('Thank you for reporting. Our team will review this within 24 hours.');
    }
};

window.ReviewsPanelManager = ReviewsPanelManager;

console.log('✅ Reviews Panel Manager module loaded');
