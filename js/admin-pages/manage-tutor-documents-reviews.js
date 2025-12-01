/**
 * Manage Tutor Documents - Reviews Integration
 * Loads admin reviews from admin_reviews table by admin_id
 */

const API_BASE_URL = window.API_BASE_URL || 'https://api.astegni.com';

// Helper function to get authentication token
function getAuthToken() {
    return localStorage.getItem('token') || localStorage.getItem('access_token');
}

// Helper function to get admin ID
function getAdminId() {
    const adminId = localStorage.getItem('adminId');
    if (!adminId) {
        console.warn('Admin ID not found in localStorage');
    }
    return adminId;
}

// Helper function to format date
function formatReviewDate(dateString) {
    if (!dateString) return 'Unknown date';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
}

// Helper function to generate star rating HTML
function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let stars = '';
    for (let i = 0; i < fullStars; i++) {
        stars += '★';
    }
    if (hasHalfStar) {
        stars += '⯨';
    }
    for (let i = 0; i < emptyStars; i++) {
        stars += '☆';
    }

    return stars;
}

// Helper function to get border color based on rating
function getBorderColorClass(rating) {
    if (rating >= 4.5) return 'border-green-500';
    if (rating >= 4.0) return 'border-blue-500';
    if (rating >= 3.5) return 'border-yellow-500';
    if (rating >= 3.0) return 'border-orange-500';
    return 'border-red-500';
}

/**
 * Load recent reviews for dashboard (limit 3)
 */
async function loadDashboardReviews() {
    const adminId = getAdminId();

    if (!adminId) {
        displayNoReviews('dashboard-reviews-list');
        return;
    }

    try {
        const token = getAuthToken();
        // For Tutor Management department
        const department = 'manage-tutors';
        const response = await fetch(`${API_BASE_URL}/api/admin-reviews/recent?limit=3&admin_id=${adminId}&department=${department}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const reviews = data.reviews || [];

        renderDashboardReviews(reviews);
    } catch (error) {
        console.error('Error loading dashboard reviews:', error);
        displayNoReviews('dashboard-reviews-list');
    }
}

/**
 * Load all reviews for reviews panel
 */
async function loadAllReviews() {
    const adminId = getAdminId();

    if (!adminId) {
        displayNoReviews('reviews-list');
        updateReviewsStats(0, 0, 0, 0);
        return;
    }

    try {
        const token = getAuthToken();
        // For Tutor Management department
        const department = 'manage-tutors';

        // Load reviews
        const reviewsResponse = await fetch(`${API_BASE_URL}/api/admin-reviews/?limit=100&admin_id=${adminId}&department=${department}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!reviewsResponse.ok) {
            throw new Error(`HTTP error! status: ${reviewsResponse.status}`);
        }

        const reviewsData = await reviewsResponse.json();
        const reviews = reviewsData.reviews || [];

        // Load stats
        const statsResponse = await fetch(`${API_BASE_URL}/api/admin-reviews/stats?admin_id=${adminId}&department=${department}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            updateReviewsStats(
                stats.total_reviews || 0,
                stats.average_rating || 0,
                stats.average_response_time_rating || 0,
                stats.average_accuracy_rating || 0
            );
        }

        renderAllReviews(reviews);
    } catch (error) {
        console.error('Error loading reviews:', error);
        displayNoReviews('reviews-list');
        updateReviewsStats(0, 0, 0, 0);
    }
}

/**
 * Render dashboard reviews (limited to 3)
 */
function renderDashboardReviews(reviews) {
    const container = document.getElementById('dashboard-reviews-list');

    if (!container) {
        console.error('Dashboard reviews container not found');
        return;
    }

    if (!reviews || reviews.length === 0) {
        displayNoReviews('dashboard-reviews-list');
        return;
    }

    container.innerHTML = reviews.map(review => {
        const borderColor = getBorderColorClass(review.rating);
        const stars = generateStarRating(review.rating);
        const timeAgo = formatReviewDate(review.created_at);

        return `
            <div class="border-l-4 ${borderColor} pl-4">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-semibold">${escapeHtml(review.comment || 'No title')}</h4>
                        <p class="text-sm text-gray-600">From: ${escapeHtml(review.reviewer_name || 'Anonymous')}${review.reviewer_role ? ` (${escapeHtml(review.reviewer_role)})` : ''}</p>
                    </div>
                    <div class="flex items-center">
                        <span class="text-yellow-400">${stars}</span>
                    </div>
                </div>
                ${review.comment ? `<p class="text-gray-700">"${escapeHtml(review.comment)}"</p>` : ''}
                <p class="text-xs text-gray-500 mt-2">${timeAgo}</p>
            </div>
        `;
    }).join('');
}

/**
 * Render all reviews in the reviews panel
 */
function renderAllReviews(reviews) {
    const container = document.getElementById('reviews-list');

    if (!container) {
        console.error('Reviews list container not found');
        return;
    }

    if (!reviews || reviews.length === 0) {
        displayNoReviews('reviews-list');
        return;
    }

    container.innerHTML = reviews.map(review => {
        const borderColor = getBorderColorClass(review.rating);
        const stars = generateStarRating(review.rating);
        const timeAgo = formatReviewDate(review.created_at);

        return `
            <div class="border-l-4 ${borderColor} pl-4 pb-4 border-b border-gray-200 last:border-b-0">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                        <h4 class="font-semibold text-lg">${escapeHtml(review.comment || 'Review')}</h4>
                        <p class="text-sm text-gray-600 mt-1">
                            From: <span class="font-medium">${escapeHtml(review.reviewer_name || 'Anonymous')}</span>
                            ${review.reviewer_role ? `<span class="text-gray-400">•</span> <span class="text-gray-500">${escapeHtml(review.reviewer_role)}</span>` : ''}
                        </p>
                        ${review.review_type ? `<p class="text-xs text-gray-500 mt-1">Type: ${escapeHtml(review.review_type)}</p>` : ''}
                    </div>
                    <div class="flex flex-col items-end ml-4">
                        <span class="text-yellow-400 text-lg">${stars}</span>
                        <span class="text-sm font-semibold text-gray-700 mt-1">${review.rating.toFixed(1)}/5.0</span>
                    </div>
                </div>

                ${review.comment ? `
                    <div class="bg-gray-50 rounded-lg p-3 mt-3">
                        <p class="text-gray-700 italic">"${escapeHtml(review.comment)}"</p>
                    </div>
                ` : ''}

                ${review.response_time_rating || review.accuracy_rating ? `
                    <div class="grid grid-cols-2 gap-2 mt-3">
                        ${review.response_time_rating ? `
                            <div class="text-sm">
                                <span class="text-gray-600">Response Time:</span>
                                <span class="font-semibold text-blue-600">${review.response_time_rating.toFixed(1)}/5.0</span>
                            </div>
                        ` : ''}
                        ${review.accuracy_rating ? `
                            <div class="text-sm">
                                <span class="text-gray-600">Accuracy:</span>
                                <span class="font-semibold text-green-600">${review.accuracy_rating.toFixed(1)}/5.0</span>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}

                <p class="text-xs text-gray-500 mt-3">${timeAgo}</p>
            </div>
        `;
    }).join('');
}

/**
 * Display "No reviews yet" message
 */
function displayNoReviews(containerId) {
    const container = document.getElementById(containerId);

    if (!container) {
        console.error(`Container ${containerId} not found`);
        return;
    }

    container.innerHTML = `
        <div class="text-center py-12">
            <div class="text-6xl mb-4">⭐</div>
            <h3 class="text-xl font-semibold text-gray-700 mb-2">No Reviews Yet</h3>
            <p class="text-gray-500">Reviews from colleagues and supervisors will appear here.</p>
        </div>
    `;
}

/**
 * Update reviews statistics in the reviews panel
 */
function updateReviewsStats(totalReviews, avgRating, avgResponseTime, avgAccuracy) {
    const totalElement = document.getElementById('total-reviews-count');
    const ratingElement = document.getElementById('average-rating');
    const responseElement = document.getElementById('average-response-time');
    const accuracyElement = document.getElementById('average-accuracy');

    if (totalElement) totalElement.textContent = totalReviews;
    if (ratingElement) ratingElement.textContent = avgRating.toFixed(1);
    if (responseElement) responseElement.textContent = avgResponseTime.toFixed(1);
    if (accuracyElement) accuracyElement.textContent = avgAccuracy.toFixed(1);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load dashboard reviews immediately
    loadDashboardReviews();

    // Listen for panel switches to load reviews panel data
    const reviewsPanel = document.getElementById('reviews-panel');
    if (reviewsPanel) {
        // Use MutationObserver to detect when panel becomes visible
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (!reviewsPanel.classList.contains('hidden')) {
                        // Panel is now visible, load all reviews
                        loadAllReviews();
                    }
                }
            });
        });

        observer.observe(reviewsPanel, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
});

// Export functions for global use
window.loadDashboardReviews = loadDashboardReviews;
window.loadAllReviews = loadAllReviews;
