// manage-courses-reviews.js - Admin Reviews & Ratings Database Integration
// Loads and manages admin performance reviews from database

(function() {
    'use strict';

    // Use global API_BASE_URL set by api-config.js
    const API_BASE_URL_LOCAL = window.API_BASE_URL || 'http://localhost:8000';

    // Store admin_id for filtering reviews
    let currentAdminId = null;

    // ============================================
    // ADMIN IDENTIFICATION
    // ============================================

    /**
     * Get admin ID from loaded profile or email lookup
     */
    async function getAdminId() {
        if (currentAdminId) return currentAdminId;

        try {
            // Get admin email
            const adminEmail = getAdminEmail();
            if (!adminEmail) return null;

            // Fetch profile to get admin_id (using new dual-database endpoint)
            const response = await fetch(`${API_BASE_URL_LOCAL}/api/admin/courses/profile/by-email/${encodeURIComponent(adminEmail)}`);
            if (!response.ok) return null;

            const profile = await response.json();
            currentAdminId = profile.id;
            return currentAdminId;
        } catch (error) {
            console.error('Error getting admin ID:', error);
            return null;
        }
    }

    /**
     * Get admin email from authentication
     */
    function getAdminEmail() {
        // Method 1: Check authManager
        if (typeof authManager !== 'undefined' && authManager && authManager.getCurrentUser) {
            const user = authManager.getCurrentUser();
            if (user && user.email) return user.email;
        }

        // Method 2: Check localStorage
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.email) return user.email;
            } catch (e) {}
        }

        // Method 3: Decode JWT token
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
                    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                ).join(''));
                const payload = JSON.parse(jsonPayload);
                if (payload.email) return payload.email;
            } catch (e) {}
        }

        return null;
    }

    // ============================================
    // LOAD REVIEW STATISTICS
    // ============================================

    /**
     * Load review statistics for performance summary cards
     */
    async function loadReviewStats() {
        try {
            console.log('Loading review statistics from database...');

            const adminId = await getAdminId();
            const url = adminId ? `${API_BASE_URL_LOCAL}/api/admin/courses/reviews/stats/${adminId}` : `${API_BASE_URL_LOCAL}/api/admin/courses/reviews/stats/1`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch review stats');

            const stats = await response.json();

            // Check if admin has no reviews
            if (stats.total_reviews === 0) {
                console.log('No reviews yet for this admin');
                showNoReviewsMessage();
                return;
            }

            // Update performance cards (handle both field name formats for compatibility)
            const avgRating = stats.average_rating || 0;
            const responseTime = stats.average_response_time_rating || stats.avg_response_time || 0;
            const accuracy = stats.average_accuracy_rating || stats.avg_accuracy || 0;

            document.getElementById('review-avg-rating').textContent = avgRating.toFixed(1);
            document.getElementById('review-response-time').textContent = responseTime.toFixed(1);
            document.getElementById('review-accuracy').textContent = accuracy.toFixed(1);
            document.getElementById('review-total').textContent = stats.total_reviews || 0;

            // Update stars display
            const stars = generateStars(stats.average_rating);
            document.getElementById('review-stars').textContent = stars;

            // Update trend indicator
            const trendText = stats.recent_trend === 'improving' ? '📈 Improving' :
                             stats.recent_trend === 'declining' ? '📉 Declining' : '→ Stable';
            document.getElementById('review-trend').textContent = trendText;

            console.log(`Review stats loaded: ${stats.total_reviews} reviews, ${stats.average_rating.toFixed(1)} avg rating`);

        } catch (error) {
            console.error('Error loading review stats:', error);
            showFallbackStats();
        }
    }

    /**
     * Load all reviews into the reviews panel table
     */
    async function loadAllReviews(filters = {}) {
        try {
            console.log('Loading all reviews from database...');

            const adminId = await getAdminId();

            // Build URL with filters and admin_id (using new dual-database endpoint)
            let url = `${API_BASE_URL_LOCAL}/api/admin/courses/reviews/${adminId || 1}?limit=50&offset=0`;

            if (filters.type) url += `&review_type=${encodeURIComponent(filters.type)}`;
            if (filters.min_rating) url += `&min_rating=${filters.min_rating}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch reviews');

            const data = await response.json();

            const container = document.getElementById('reviews-list-container');
            if (!container) {
                console.warn('Reviews list container not found');
                return;
            }

            // Clear existing reviews
            container.innerHTML = '';

            if (data.reviews && data.reviews.length > 0) {
                data.reviews.forEach(review => {
                    const widget = createReviewWidget(review);
                    container.appendChild(widget);
                });
                console.log(`Loaded ${data.reviews.length} reviews from database`);
            } else {
                container.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <svg class="w-16 h-16 text-gray-300 mb-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                        </svg>
                        <p class="text-lg font-semibold mb-2">No Reviews Yet</p>
                        <p class="text-sm">Reviews will appear here</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error loading reviews:', error);
            showErrorInList();
        }
    }

    /**
     * Load recent reviews for dashboard widget
     */
    async function loadRecentReviewsWidget() {
        try {
            const adminId = await getAdminId();
            const url = `${API_BASE_URL_LOCAL}/api/admin/courses/reviews/${adminId || 1}?limit=5&offset=0`;

            const response = await fetch(url);
            if (!response.ok) return; // Silently fail for widget

            const data = await response.json();

            // Find dashboard reviews container
            const reviewsContainer = document.getElementById('dashboard-reviews-container');
            if (!reviewsContainer) return;

            // Clear hardcoded reviews
            reviewsContainer.innerHTML = '';

            if (data.reviews && data.reviews.length > 0) {
                data.reviews.forEach(review => {
                    const widget = createReviewWidget(review);
                    reviewsContainer.appendChild(widget);
                });
                console.log(`Loaded ${data.reviews.length} reviews into dashboard widget`);
            } else {
                reviewsContainer.innerHTML = `
                    <div class="text-center text-gray-500 py-4">
                        <p>No reviews yet</p>
                    </div>
                `;
            }

        } catch (error) {
            console.error('Error loading recent reviews widget:', error);
        }
    }

    // ============================================
    // WIDGET CREATION FUNCTIONS
    // ============================================

    /**
     * Create review widget for dashboard and review panel
     */
    function createReviewWidget(review) {
        const div = document.createElement('div');
        div.className = 'border-l-4 border-blue-500 pl-4';

        const stars = generateStars(review.rating);
        const responseTime = review.response_time_rating ? `${review.response_time_rating.toFixed(1)}/5.0` : 'N/A';
        const accuracy = review.accuracy_rating ? `${review.accuracy_rating.toFixed(1)}/5.0` : 'N/A';

        div.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h4 class="font-semibold">${escapeHtml(truncate(review.comment || 'Review', 50))}</h4>
                    <p class="text-sm text-gray-600">by ${escapeHtml(review.reviewer_name)}</p>
                </div>
                <div class="text-right">
                    <div class="text-yellow-500">${stars}</div>
                    <p class="text-xs text-gray-500">${review.rating.toFixed(1)}/5.0</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm mt-2">
                <div>
                    <span class="text-gray-500">Response Time:</span>
                    <span class="font-semibold ml-1">${responseTime}</span>
                </div>
                <div>
                    <span class="text-gray-500">Accuracy:</span>
                    <span class="font-semibold ml-1">${accuracy}</span>
                </div>
            </div>
            <p class="text-xs text-gray-400 mt-2">${formatRelativeTime(review.created_at)}</p>
        `;

        return div;
    }

    // ============================================
    // FILTER HANDLING
    // ============================================

    /**
     * Apply filters and reload reviews
     */
    function applyFilters() {
        const filters = {
            type: document.getElementById('review-filter-type')?.value || '',
            min_rating: document.getElementById('review-filter-rating')?.value || ''
        };

        loadAllReviews(filters);
    }

    /**
     * Setup filter event listeners
     */
    function setupFilters() {
        const typeFilter = document.getElementById('review-filter-type');
        const ratingFilter = document.getElementById('review-filter-rating');
        const searchInput = document.getElementById('review-search');

        if (typeFilter) {
            typeFilter.addEventListener('change', applyFilters);
        }

        if (ratingFilter) {
            ratingFilter.addEventListener('change', applyFilters);
        }

        if (searchInput) {
            // Debounced search (could be implemented later)
            searchInput.addEventListener('input', debounce(() => {
                // For now, search is client-side only
                console.log('Search:', searchInput.value);
            }, 300));
        }
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /**
     * Show "No reviews yet" message for admin with no reviews
     */
    function showNoReviewsMessage() {
        // Update stats cards to show zeros
        document.getElementById('review-avg-rating').textContent = '0.0';
        document.getElementById('review-response-time').textContent = '0.0';
        document.getElementById('review-accuracy').textContent = '0.0';
        document.getElementById('review-total').textContent = '0';
        document.getElementById('review-stars').textContent = '☆☆☆☆☆';
        document.getElementById('review-trend').textContent = 'No reviews yet';

        // Show message in reviews list if visible
        const container = document.getElementById('reviews-list-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <svg class="w-16 h-16 text-gray-300 mb-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                    </svg>
                    <p class="text-lg font-semibold mb-2">No Reviews Yet</p>
                    <p class="text-sm">Reviews will appear here once received</p>
                </div>
            `;
        }
    }

    /**
     * Generate star display
     */
    function generateStars(rating) {
        const full = Math.floor(rating);
        const half = (rating % 1) >= 0.5 ? 1 : 0;
        const empty = 5 - full - half;

        return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
    }

    /**
     * Format date as "Jan 10, 2025"
     */
    function formatDate(dateString) {
        if (!dateString) return 'N/A';

        const date = new Date(dateString);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

    /**
     * Format relative time (e.g., "2 days ago")
     */
    function formatRelativeTime(dateString) {
        if (!dateString) return 'Recently';

        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 30) return formatDate(dateString);
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    /**
     * Truncate text
     */
    function truncate(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    /**
     * Debounce function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Show fallback stats when loading fails
     */
    function showFallbackStats() {
        document.getElementById('review-avg-rating').textContent = '0.0';
        document.getElementById('review-response-time').textContent = '0.0';
        document.getElementById('review-accuracy').textContent = '0.0';
        document.getElementById('review-total').textContent = '0';
        document.getElementById('review-stars').textContent = '☆☆☆☆☆';
        document.getElementById('review-trend').textContent = 'No data';
    }

    /**
     * Show error in review list
     */
    function showErrorInList() {
        const container = document.getElementById('reviews-list-container');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <svg class="w-16 h-16 text-red-300 mb-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-lg font-semibold mb-2">Failed to Load Reviews</p>
                <p class="text-sm">Check backend connection</p>
            </div>
        `;
    }

    // ============================================
    // PANEL SWITCH DETECTION
    // ============================================

    /**
     * Detect when reviews panel becomes active
     */
    function onPanelSwitch(panelId) {
        if (panelId === 'reviews') {
            console.log('Reviews panel activated - loading data...');
            loadReviewStats();
            loadAllReviews();
        }
    }

    // Listen for panelSwitched event (fired by panel-manager-enhanced.js)
    window.addEventListener('panelSwitched', function(event) {
        if (event.detail && event.detail.panelName) {
            onPanelSwitch(event.detail.panelName);
        }
    });

    // Also hook into switchPanel function as fallback
    setTimeout(() => {
        if (window.switchPanel) {
            const originalSwitchPanel = window.switchPanel;
            window.switchPanel = function(panelId) {
                originalSwitchPanel(panelId);
                onPanelSwitch(panelId);
            };
        }
    }, 100);

    // ============================================
    // INITIALIZATION
    // ============================================

    document.addEventListener('DOMContentLoaded', function() {
        if (window.location.href.includes('manage-courses.html')) {
            console.log('Initializing Reviews & Ratings Module...');

            // Load dashboard widget on initial page load
            setTimeout(() => {
                loadRecentReviewsWidget();
            }, 1000);

            // Setup filter listeners
            setupFilters();

            // Check if reviews panel is already active (e.g., from URL hash or panel parameter)
            setTimeout(() => {
                const reviewsPanel = document.getElementById('reviews-panel');
                if (reviewsPanel && !reviewsPanel.classList.contains('hidden')) {
                    console.log('Reviews panel already visible - loading data...');
                    loadReviewStats();
                    loadAllReviews();
                }
            }, 1500);

            console.log('Reviews module initialized');
        }
    });

    // Expose functions globally
    window.ReviewsManager = {
        loadStats: loadReviewStats,
        loadAll: loadAllReviews,
        loadWidget: loadRecentReviewsWidget,
        applyFilters: applyFilters
    };

})();
