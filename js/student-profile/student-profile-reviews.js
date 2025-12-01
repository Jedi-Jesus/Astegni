/**
 * student-profile-reviews.js
 * Handles loading and displaying reviews in:
 * 1. Dashboard panel (recent-feedback-container) - Shows 3 most recent reviews
 * 2. Ratings and Reviews panel (ratings-and-reviews-panel) - Full reviews with filtering
 */

// Use existing API_BASE_URL or define it
const REVIEWS_API_BASE_URL = window.API_BASE_URL || 'https://api.astegni.com';

// Global variable to store all reviews for filtering
let allReviews = [];
let currentFilter = 'all';

/**
 * Load recent feedback from tutors (latest reviews) - Dashboard Panel
 */
async function loadRecentFeedback() {
    console.log('🔄 loadRecentFeedback called');

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            displayFeedbackError();
            return;
        }

        // Get student profile to find student_id
        const profileResponse = await fetch(`${REVIEWS_API_BASE_URL}/api/student/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!profileResponse.ok) {
            throw new Error('Failed to fetch student profile');
        }

        const profileData = await profileResponse.json();
        const studentId = profileData.id;

        console.log('📊 Fetching reviews for student_id:', studentId);

        // Fetch reviews for this student
        const reviewsResponse = await fetch(`${REVIEWS_API_BASE_URL}/api/student/reviews/${studentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!reviewsResponse.ok) {
            console.error('❌ Reviews API failed:', reviewsResponse.status);
            throw new Error(`Failed to fetch reviews: ${reviewsResponse.status}`);
        }

        const data = await reviewsResponse.json();
        console.log('📦 Reviews data received:', data);

        // Get the 3 most recent reviews
        // Backend returns array directly, not {reviews: [...]}
        const reviewsArray = Array.isArray(data) ? data : (data.reviews || []);
        const recentReviews = reviewsArray.slice(0, 3);

        console.log('✨ Displaying', recentReviews.length, 'recent reviews');

        // Display the reviews
        displayRecentFeedback(recentReviews);

        console.log('✅ Recent feedback loaded successfully:', recentReviews.length);

    } catch (error) {
        console.error('Error loading recent feedback:', error);
        displayFeedbackError();
    }
}

/**
 * Display recent feedback reviews - Dashboard Panel
 */
function displayRecentFeedback(reviews) {
    console.log('🎨 displayRecentFeedback called with', reviews.length, 'reviews');

    const container = document.getElementById('recent-feedback-container');
    if (!container) {
        console.error('❌ Recent feedback container not found in DOM');
        return;
    }

    console.log('✅ Container found:', container);

    if (reviews.length === 0) {
        console.log('📝 No reviews to display - showing empty state');
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem 2rem; color: var(--text-secondary);">
                <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📝</div>
                <p style="font-size: 1.125rem; font-weight: 500; margin-bottom: 0.5rem;">No Feedback Yet</p>
                <p style="font-size: 0.875rem;">Your tutors will provide feedback after sessions.</p>
            </div>
        `;
        return;
    }

    // Border colors for variety
    const borderColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

    const feedbackHTML = reviews.map((review, index) => {
        const borderColor = borderColors[index % borderColors.length];
        // Use correct field names from backend
        const rating = review.rating || 0;
        const comment = review.review_text || review.comment || '';
        const subjectUnderstanding = review.subject_understanding || 0;
        const discipline = review.discipline || 0;
        const punctuality = review.punctuality || 0;
        const reviewerRole = review.reviewer_role || 'Tutor';

        return `
            <div style="border-left: 4px solid ${borderColor}; padding-left: 1rem; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                    <div>
                        <h4 style="font-weight: 600; font-size: 1rem; margin: 0 0 0.25rem 0; color: var(--heading);">
                            Review from ${review.reviewer_name || 'Anonymous'}
                        </h4>
                        <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0;">
                            ${reviewerRole.charAt(0).toUpperCase() + reviewerRole.slice(1)}
                        </p>
                    </div>
                    <div style="display: flex; align-items: center; color: #f59e0b; font-size: 1rem;">
                        ${generateStars(rating)}
                    </div>
                </div>
                ${comment ? `
                    <p style="color: var(--text); line-height: 1.6; margin: 0 0 0.5rem 0; font-size: 0.9375rem;">
                        "${comment}"
                    </p>
                ` : ''}
                <div style="display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.5rem;">
                    <span>Subject Understanding: ${subjectUnderstanding.toFixed(1)}/5.0</span>
                    <span>Discipline: ${discipline.toFixed(1)}/5.0</span>
                    <span>Punctuality: ${punctuality.toFixed(1)}/5.0</span>
                </div>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">
                    ${formatDate(review.created_at)}
                </p>
            </div>
        `;
    }).join('');

    console.log('✨ Setting container innerHTML with', feedbackHTML.length, 'characters');
    container.innerHTML = feedbackHTML;
    console.log('✅ Reviews displayed successfully');
}

/**
 * Load all student reviews for the Ratings & Reviews panel
 */
async function loadStudentReviews() {
    console.log('🔄 loadStudentReviews called for ratings-and-reviews-panel');

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            displayNoReviews();
            return;
        }

        // Get student profile to find student_id
        const profileResponse = await fetch(`${REVIEWS_API_BASE_URL}/api/student/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!profileResponse.ok) {
            throw new Error('Failed to fetch student profile');
        }

        const profileData = await profileResponse.json();
        const studentId = profileData.id;

        console.log('📊 Fetching all reviews for student_id:', studentId);

        // Fetch reviews for this student
        const reviewsResponse = await fetch(`${REVIEWS_API_BASE_URL}/api/student/reviews/${studentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!reviewsResponse.ok) {
            throw new Error(`Failed to fetch reviews: ${reviewsResponse.status}`);
        }

        const data = await reviewsResponse.json();

        // Store all reviews globally for filtering
        allReviews = Array.isArray(data) ? data : (data.reviews || []);

        // Calculate category averages
        const categoryAverages = calculateCategoryAverages(allReviews);

        // Calculate overall average rating
        const avgRating = allReviews.length > 0
            ? allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / allReviews.length
            : 0;

        // Update overall rating section
        updateOverallRating(avgRating, allReviews.length);

        // Update rating breakdown with behavioral categories
        updateRatingBreakdown(categoryAverages);

        // Display reviews
        displayReviews(allReviews);

        // Initialize star filter tabs
        initializeStarFilterTabs();

        // Update filter counts
        updateFilterCounts();

        console.log('✅ Student reviews loaded successfully:', {
            total: allReviews.length,
            avg_rating: avgRating.toFixed(1)
        });

    } catch (error) {
        console.error('Error loading student reviews:', error);
        displayErrorState();
    }
}

/**
 * Calculate category averages from reviews
 */
function calculateCategoryAverages(reviews) {
    if (reviews.length === 0) {
        return {
            subject_understanding: 0,
            communication_skills: 0,
            discipline: 0,
            punctuality: 0,
            class_activity: 0
        };
    }

    const totals = {
        subject_understanding: 0,
        communication_skills: 0,
        discipline: 0,
        punctuality: 0,
        class_activity: 0
    };

    const counts = {
        subject_understanding: 0,
        communication_skills: 0,
        discipline: 0,
        punctuality: 0,
        class_activity: 0
    };

    reviews.forEach(review => {
        if (review.subject_understanding) {
            totals.subject_understanding += review.subject_understanding;
            counts.subject_understanding++;
        }
        if (review.communication_skills) {
            totals.communication_skills += review.communication_skills;
            counts.communication_skills++;
        }
        if (review.discipline) {
            totals.discipline += review.discipline;
            counts.discipline++;
        }
        if (review.punctuality) {
            totals.punctuality += review.punctuality;
            counts.punctuality++;
        }
        if (review.class_activity) {
            totals.class_activity += review.class_activity;
            counts.class_activity++;
        }
    });

    return {
        subject_understanding: counts.subject_understanding > 0 ? totals.subject_understanding / counts.subject_understanding : 0,
        communication_skills: counts.communication_skills > 0 ? totals.communication_skills / counts.communication_skills : 0,
        discipline: counts.discipline > 0 ? totals.discipline / counts.discipline : 0,
        punctuality: counts.punctuality > 0 ? totals.punctuality / counts.punctuality : 0,
        class_activity: counts.class_activity > 0 ? totals.class_activity / counts.class_activity : 0
    };
}

/**
 * Update overall rating display
 */
function updateOverallRating(rating, reviewCount) {
    const ratingValueEl = document.getElementById('overall-rating-value');
    const ratingCountEl = document.getElementById('overall-rating-count');
    const ratingStarsEl = document.getElementById('overall-rating-stars');

    if (ratingValueEl) {
        ratingValueEl.textContent = rating.toFixed(1);
    }

    if (ratingCountEl) {
        ratingCountEl.textContent = `Based on ${reviewCount} tutor review${reviewCount !== 1 ? 's' : ''}`;
    }

    if (ratingStarsEl) {
        const stars = generateStars(rating);
        ratingStarsEl.innerHTML = stars;
    }
}

/**
 * Update rating breakdown with behavioral categories
 */
function updateRatingBreakdown(categoryAverages) {
    // Update progress bars and values
    const categories = [
        { key: 'subject_understanding', barId: 'rating-bar-subject', countId: 'rating-count-subject' },
        { key: 'communication_skills', barId: 'rating-bar-communication', countId: 'rating-count-communication' },
        { key: 'discipline', barId: 'rating-bar-discipline', countId: 'rating-count-discipline' },
        { key: 'punctuality', barId: 'rating-bar-punctuality', countId: 'rating-count-punctuality' },
        { key: 'class_activity', barId: 'rating-bar-class-activity', countId: 'rating-count-class-activity' }
    ];

    categories.forEach(category => {
        const value = categoryAverages[category.key] || 0;
        const percentage = (value / 5.0) * 100;

        const barEl = document.getElementById(category.barId);
        const countEl = document.getElementById(category.countId);

        if (barEl) {
            barEl.style.width = `${percentage}%`;
        }
        if (countEl) {
            countEl.textContent = value.toFixed(1);
        }
    });
}

/**
 * Display review cards in the reviews container
 */
function displayReviews(reviews) {
    const container = document.getElementById('reviews-container');

    if (!container) {
        console.error('Reviews container not found');
        return;
    }

    if (reviews.length === 0) {
        displayNoReviews();
        return;
    }

    const reviewsHTML = reviews.map(review => `
        <div class="review-card" style="background: var(--card-bg); border-radius: 16px; padding: 2rem; margin-bottom: 1.5rem; box-shadow: 0 2px 12px rgba(0,0,0,0.08); transition: transform 0.2s ease, box-shadow 0.2s ease; position: relative; overflow: visible;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.25rem;">
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <img src="${review.reviewer_profile_picture || '../uploads/system_images/system_profile_pictures/default-avatar.png'}"
                         alt="${review.reviewer_name}"
                         style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-color);">
                    <div>
                        <h4 style="font-size: 1.125rem; font-weight: 600; margin: 0 0 0.25rem 0; color: var(--heading);">
                            ${review.reviewer_name || 'Anonymous'}
                        </h4>
                        <p style="font-size: 0.875rem; color: var(--text-muted); margin: 0 0 0.25rem 0;">
                            ${(review.reviewer_role || 'tutor').charAt(0).toUpperCase() + (review.reviewer_role || 'tutor').slice(1)}
                        </p>
                        <div class="rating-stars-container" style="position: relative; display: inline-block;">
                            <div style="color: #f59e0b; font-size: 1rem; cursor: pointer;">${generateStars(review.rating || 0)}</div>

                            <!-- Hover Tooltip with Progress Bars -->
                            <div class="rating-tooltip" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #1a1a1a; border: 2px solid #f59e0b; border-radius: 12px; padding: 1rem; width: 300px; box-shadow: 0 8px 24px rgba(0,0,0,0.8); opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s ease; z-index: 99999; display: none;">
                                <div style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; color: #ffffff; text-align: center;">
                                    Overall Rating: ${(review.rating || 0).toFixed(1)} / 5.0
                                </div>

                                <!-- Subject Understanding -->
                                <div style="margin-bottom: 0.5rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <span style="font-size: 0.75rem; color: #e0e0e0;">Subject Understanding</span>
                                        <span style="font-size: 0.75rem; font-weight: 600; color: #f59e0b;">${(review.subject_understanding || 0).toFixed(1)}</span>
                                    </div>
                                    <div style="height: 6px; background: rgba(245, 158, 11, 0.2); border-radius: 3px; overflow: hidden;">
                                        <div style="height: 100%; width: ${((review.subject_understanding || 0) / 5.0) * 100}%; background: #f59e0b; border-radius: 3px; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>

                                <!-- Communication Skills -->
                                <div style="margin-bottom: 0.5rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <span style="font-size: 0.75rem; color: #e0e0e0;">Communication Skills</span>
                                        <span style="font-size: 0.75rem; font-weight: 600; color: #f59e0b;">${(review.communication_skills || 0).toFixed(1)}</span>
                                    </div>
                                    <div style="height: 6px; background: rgba(245, 158, 11, 0.2); border-radius: 3px; overflow: hidden;">
                                        <div style="height: 100%; width: ${((review.communication_skills || 0) / 5.0) * 100}%; background: #f59e0b; border-radius: 3px; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>

                                <!-- Discipline -->
                                <div style="margin-bottom: 0.5rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <span style="font-size: 0.75rem; color: #e0e0e0;">Discipline</span>
                                        <span style="font-size: 0.75rem; font-weight: 600; color: #f59e0b;">${(review.discipline || 0).toFixed(1)}</span>
                                    </div>
                                    <div style="height: 6px; background: rgba(245, 158, 11, 0.2); border-radius: 3px; overflow: hidden;">
                                        <div style="height: 100%; width: ${((review.discipline || 0) / 5.0) * 100}%; background: #f59e0b; border-radius: 3px; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>

                                <!-- Punctuality -->
                                <div style="margin-bottom: 0.5rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <span style="font-size: 0.75rem; color: #e0e0e0;">Punctuality</span>
                                        <span style="font-size: 0.75rem; font-weight: 600; color: #f59e0b;">${(review.punctuality || 0).toFixed(1)}</span>
                                    </div>
                                    <div style="height: 6px; background: rgba(245, 158, 11, 0.2); border-radius: 3px; overflow: hidden;">
                                        <div style="height: 100%; width: ${((review.punctuality || 0) / 5.0) * 100}%; background: #f59e0b; border-radius: 3px; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>

                                <!-- Class Activity -->
                                <div style="margin-bottom: 0;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <span style="font-size: 0.75rem; color: #e0e0e0;">Class Activity</span>
                                        <span style="font-size: 0.75rem; font-weight: 600; color: #f59e0b;">${(review.class_activity || 0).toFixed(1)}</span>
                                    </div>
                                    <div style="height: 6px; background: rgba(245, 158, 11, 0.2); border-radius: 3px; overflow: hidden;">
                                        <div style="height: 100%; width: ${((review.class_activity || 0) / 5.0) * 100}%; background: #f59e0b; border-radius: 3px; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>

                                <!-- Tooltip arrow -->
                                <div style="position: absolute; top: 100%; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 8px solid #f59e0b;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <span style="font-size: 0.875rem; color: var(--text-muted);">
                    ${formatDate(review.created_at)}
                </span>
            </div>

            ${review.review_text ? `
                <p style="color: var(--text); line-height: 1.7; margin: 0; font-size: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 8px; border-left: 4px solid var(--primary-color);">
                    "${review.review_text}"
                </p>
            ` : ''}
        </div>
    `).join('');

    container.innerHTML = reviewsHTML;

    // Add hover event listeners for rating tooltips
    addRatingTooltipListeners();
}

/**
 * Add hover event listeners to show/hide rating tooltips
 */
function addRatingTooltipListeners() {
    const ratingContainers = document.querySelectorAll('.rating-stars-container');

    ratingContainers.forEach((container) => {
        const tooltip = container.querySelector('.rating-tooltip');

        if (!tooltip) return;

        container.addEventListener('mouseenter', () => {
            tooltip.style.display = 'block';
            setTimeout(() => {
                tooltip.style.opacity = '1';
                tooltip.style.visibility = 'visible';
            }, 10);
        });

        container.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
            tooltip.style.visibility = 'hidden';
            setTimeout(() => {
                tooltip.style.display = 'none';
            }, 300);
        });
    });
}

/**
 * Display "no reviews" state
 */
function displayNoReviews() {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
            <i class="fas fa-star" style="font-size: 4rem; margin-bottom: 1.5rem; opacity: 0.3; color: var(--primary-color);"></i>
            <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--heading);">No Reviews Yet</h3>
            <p style="font-size: 1rem;">You haven't received any reviews from tutors yet.</p>
        </div>
    `;

    // Update overall rating to 0
    updateOverallRating(0, 0);
    updateRatingBreakdown({
        subject_understanding: 0,
        communication_skills: 0,
        discipline: 0,
        punctuality: 0,
        class_activity: 0
    });
}

/**
 * Display error state
 */
function displayErrorState() {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem; color: var(--text-secondary); background: rgba(239, 68, 68, 0.1); border-radius: 12px; border: 2px dashed rgba(239, 68, 68, 0.3);">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; color: #ef4444;"></i>
            <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem; color: var(--heading);">Failed to Load Reviews</h3>
            <p style="font-size: 0.95rem;">Unable to fetch your reviews. Please try again later.</p>
        </div>
    `;
}

/**
 * Display error state for feedback (dashboard)
 */
function displayFeedbackError() {
    const container = document.getElementById('recent-feedback-container');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem; color: var(--text-secondary);">
            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">⚠️</div>
            <p style="font-size: 1.125rem; font-weight: 500; margin-bottom: 0.5rem;">Failed to Load Feedback</p>
            <p style="font-size: 0.875rem;">Please try refreshing the page.</p>
        </div>
    `;
}

/**
 * Initialize star filter tabs event listeners
 */
function initializeStarFilterTabs() {
    const filterTabs = document.querySelectorAll('.star-filter-tab');

    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            filterReviewsByStar(filter);
        });
    });

    console.log('✅ Star filter tabs initialized');
}

/**
 * Filter reviews by star rating
 */
function filterReviewsByStar(starFilter) {
    currentFilter = starFilter;

    // Update active tab styling
    const filterTabs = document.querySelectorAll('.star-filter-tab');
    filterTabs.forEach(tab => {
        const tabFilter = tab.getAttribute('data-filter');
        if (tabFilter === starFilter) {
            // Active state
            tab.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
            tab.style.color = 'white';
            tab.style.border = '2px solid var(--primary-color)';
        } else {
            // Inactive state
            tab.style.background = 'var(--card-bg)';
            tab.style.color = 'var(--text)';
            tab.style.border = '2px solid rgba(245, 158, 11, 0.3)';
        }
    });

    // Filter reviews
    let filteredReviews = allReviews;

    if (starFilter !== 'all') {
        const targetStar = parseInt(starFilter);
        filteredReviews = allReviews.filter(review => {
            const reviewStar = Math.floor(review.rating || 0);
            return reviewStar === targetStar;
        });
    }

    // Display filtered reviews
    displayReviews(filteredReviews);

    console.log(`✅ Filtered reviews by ${starFilter} stars:`, filteredReviews.length);
}

/**
 * Update filter counts in tab buttons
 */
function updateFilterCounts() {
    const filterTabs = document.querySelectorAll('.star-filter-tab');

    filterTabs.forEach(tab => {
        const filter = tab.getAttribute('data-filter');
        let count = 0;

        if (filter === 'all') {
            count = allReviews.length;
        } else {
            const targetStar = parseInt(filter);
            count = allReviews.filter(review => Math.floor(review.rating || 0) === targetStar).length;
        }

        // Update button text to include count
        if (filter === 'all') {
            tab.innerHTML = `All Reviews <span style="opacity: 0.8;">(${count})</span>`;
        } else {
            // Keep the stars and add count
            const stars = '★'.repeat(parseInt(filter)) + '☆'.repeat(5 - parseInt(filter));
            tab.innerHTML = `${stars} <span style="opacity: 0.8;">(${count})</span>`;
        }
    });

    console.log('✅ Filter counts updated');
}

/**
 * Generate star rating HTML
 */
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let stars = '★'.repeat(fullStars);
    if (hasHalfStar) stars += '⯨';
    stars += '☆'.repeat(emptyStars);

    return stars;
}

/**
 * Format date to relative time
 */
function formatDate(dateString) {
    if (!dateString) return 'Unknown date';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
}

// Make functions available globally
window.loadRecentFeedback = loadRecentFeedback;
window.loadStudentReviews = loadStudentReviews;

console.log('✅ student-profile-reviews.js loaded');
