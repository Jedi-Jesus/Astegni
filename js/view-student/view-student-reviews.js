/**
 * view-student-reviews.js
 * Handles loading and displaying student reviews in the behavioral notes panel
 */

const API_BASE_URL = 'https://api.astegni.com';

// Global variable to store all reviews for filtering
let allReviews = [];
let currentFilter = 'all';

/**
 * Load and display student reviews in behavioral notes panel
 */
async function loadStudentReviews(studentId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            displayNoReviews();
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/student/${studentId}/reviews`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch reviews: ${response.status}`);
        }

        const data = await response.json();

        // Store all reviews globally for filtering
        allReviews = data.reviews || [];

        // Update overall rating section
        updateOverallRating(data.avg_rating || 0, data.total);

        // Update rating breakdown with behavioral categories
        updateRatingBreakdown(data.category_averages);

        // Display reviews
        displayReviews(allReviews);

        // Initialize star filter tabs
        initializeStarFilterTabs();

        // Update filter counts
        updateFilterCounts();

        console.log('✅ Student reviews loaded successfully:', {
            total: data.total,
            avg_rating: data.avg_rating
        });

    } catch (error) {
        console.error('Error loading student reviews:', error);
        displayErrorState();
    }
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
    const categories = [
        { key: 'subject_understanding', label: 'Subject Understanding' },
        { key: 'communication_skills', label: 'Communication Skills' },
        { key: 'discipline', label: 'Discipline' },
        { key: 'punctuality', label: 'Punctuality' },
        { key: 'class_activity', label: 'Class Activity' }
    ];

    const breakdownHTML = categories.map(category => {
        const value = categoryAverages[category.key] || 0;
        const percentage = (value / 5.0) * 100;

        return `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 0.875rem; width: 180px;">${category.label}</span>
                <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${percentage}%; background: white; border-radius: 4px; transition: width 0.5s ease;"></div>
                </div>
                <span style="font-size: 0.875rem; width: 40px; text-align: right;">${value.toFixed(1)}</span>
            </div>
        `;
    }).join('');

    const breakdownEl = document.getElementById('rating-breakdown');
    if (breakdownEl) {
        breakdownEl.innerHTML = breakdownHTML;
    }
}

/**
 * Generate star rating HTML
 */
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = (rating % 1) >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return '★'.repeat(fullStars) +
           (hasHalfStar ? '☆' : '') +
           '☆'.repeat(emptyStars);
}

/**
 * Display review cards
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
                    <img src="${review.reviewer_picture || '../uploads/system_images/system_profile_pictures/default-avatar.png'}"
                         alt="${review.reviewer_name}"
                         style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-color);">
                    <div>
                        <h4 style="font-size: 1.125rem; font-weight: 600; margin: 0 0 0.25rem 0; color: var(--heading);">
                            ${review.reviewer_name}
                        </h4>
                        <p style="font-size: 0.875rem; color: var(--text-muted); margin: 0 0 0.25rem 0;">
                            Tutor
                        </p>
                        <div class="rating-stars-container" style="position: relative; display: inline-block;">
                            <div style="color: #f59e0b; font-size: 1rem; cursor: pointer;">${generateStars(review.rating)}</div>

                            <!-- Hover Tooltip with Progress Bars -->
                            <div class="rating-tooltip" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #1a1a1a; border: 2px solid #f59e0b; border-radius: 12px; padding: 1rem; width: 300px; box-shadow: 0 8px 24px rgba(0,0,0,0.8); opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s ease; z-index: 99999; display: none;">
                                <div style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.75rem; color: #ffffff; text-align: center;">
                                    Overall Rating: ${review.rating.toFixed(1)} / 5.0
                                </div>

                                <!-- Subject Understanding -->
                                <div style="margin-bottom: 0.5rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <span style="font-size: 0.75rem; color: #e0e0e0;">Subject Understanding</span>
                                        <span style="font-size: 0.75rem; font-weight: 600; color: #f59e0b;">${review.subject_understanding.toFixed(1)}</span>
                                    </div>
                                    <div style="height: 6px; background: rgba(245, 158, 11, 0.2); border-radius: 3px; overflow: hidden;">
                                        <div style="height: 100%; width: ${(review.subject_understanding / 5.0) * 100}%; background: #f59e0b; border-radius: 3px; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>

                                <!-- Communication Skills -->
                                <div style="margin-bottom: 0.5rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <span style="font-size: 0.75rem; color: #e0e0e0;">Communication Skills</span>
                                        <span style="font-size: 0.75rem; font-weight: 600; color: #f59e0b;">${review.communication_skills.toFixed(1)}</span>
                                    </div>
                                    <div style="height: 6px; background: rgba(245, 158, 11, 0.2); border-radius: 3px; overflow: hidden;">
                                        <div style="height: 100%; width: ${(review.communication_skills / 5.0) * 100}%; background: #f59e0b; border-radius: 3px; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>

                                <!-- Discipline -->
                                <div style="margin-bottom: 0.5rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <span style="font-size: 0.75rem; color: #e0e0e0;">Discipline</span>
                                        <span style="font-size: 0.75rem; font-weight: 600; color: #f59e0b;">${review.discipline.toFixed(1)}</span>
                                    </div>
                                    <div style="height: 6px; background: rgba(245, 158, 11, 0.2); border-radius: 3px; overflow: hidden;">
                                        <div style="height: 100%; width: ${(review.discipline / 5.0) * 100}%; background: #f59e0b; border-radius: 3px; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>

                                <!-- Punctuality -->
                                <div style="margin-bottom: 0.5rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <span style="font-size: 0.75rem; color: #e0e0e0;">Punctuality</span>
                                        <span style="font-size: 0.75rem; font-weight: 600; color: #f59e0b;">${review.punctuality.toFixed(1)}</span>
                                    </div>
                                    <div style="height: 6px; background: rgba(245, 158, 11, 0.2); border-radius: 3px; overflow: hidden;">
                                        <div style="height: 100%; width: ${(review.punctuality / 5.0) * 100}%; background: #f59e0b; border-radius: 3px; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>

                                <!-- Class Activity -->
                                <div style="margin-bottom: 0;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                        <span style="font-size: 0.75rem; color: #e0e0e0;">Class Activity</span>
                                        <span style="font-size: 0.75rem; font-weight: 600; color: #f59e0b;">${review.class_activity.toFixed(1)}</span>
                                    </div>
                                    <div style="height: 6px; background: rgba(245, 158, 11, 0.2); border-radius: 3px; overflow: hidden;">
                                        <div style="height: 100%; width: ${(review.class_activity / 5.0) * 100}%; background: #f59e0b; border-radius: 3px; transition: width 0.3s ease;"></div>
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

            ${review.comment ? `
                <p style="color: var(--text); line-height: 1.7; margin: 0; font-size: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: 8px; border-left: 4px solid var(--primary-color);">
                    "${review.comment}"
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

    console.log(`🔍 Found ${ratingContainers.length} rating containers for tooltip listeners`);

    ratingContainers.forEach((container, index) => {
        const tooltip = container.querySelector('.rating-tooltip');

        if (!tooltip) {
            console.warn(`⚠️ No tooltip found for container ${index}`);
            return;
        }

        console.log(`✅ Attached listeners to container ${index}`);

        container.addEventListener('mouseenter', () => {
            console.log('🖱️ Mouse entered rating container');
            if (tooltip) {
                tooltip.style.display = 'block';
                // Small delay to ensure display is applied before opacity transition
                setTimeout(() => {
                    tooltip.style.opacity = '1';
                    tooltip.style.visibility = 'visible';
                    console.log('📊 Tooltip styles:', {
                        display: tooltip.style.display,
                        opacity: tooltip.style.opacity,
                        visibility: tooltip.style.visibility,
                        zIndex: tooltip.style.zIndex,
                        position: tooltip.style.position
                    });
                }, 10);
                console.log('✅ Tooltip should be visible now');
            }
        });

        container.addEventListener('mouseleave', () => {
            console.log('🖱️ Mouse left rating container');
            if (tooltip) {
                tooltip.style.opacity = '0';
                tooltip.style.visibility = 'hidden';
                // Delay hiding display to allow fade-out animation
                setTimeout(() => {
                    tooltip.style.display = 'none';
                }, 300); // Match transition duration
            }
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
            <p style="font-size: 1rem;">This student hasn't received any reviews from tutors yet.</p>
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
            <p style="font-size: 0.95rem;">Unable to fetch student reviews. Please try again later.</p>
        </div>
    `;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
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
            const reviewStar = Math.floor(review.rating);
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
            count = allReviews.filter(review => Math.floor(review.rating) === targetStar).length;
        }

        // Update button text to include count
        const originalText = tab.textContent.trim();

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
 * Load recent feedback into dashboard panel (recent-feedback-container)
 * Shows only 4-star and above reviews in an animated carousel
 */
async function loadRecentFeedback(studentId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            displayNoRecentFeedback();
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/student/${studentId}/reviews`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch reviews: ${response.status}`);
        }

        const data = await response.json();
        const reviews = data.reviews || [];

        // Filter to show only 4-star and above reviews
        const highRatedReviews = reviews.filter(review => review.rating >= 4.0);

        // Display recent feedback with animation
        displayRecentFeedback(highRatedReviews);

        console.log('✅ Recent feedback loaded successfully:', {
            total: reviews.length,
            showing: highRatedReviews.length,
            filtered: '4+ stars only'
        });

    } catch (error) {
        console.error('Error loading recent feedback:', error);
        displayRecentFeedbackError();
    }
}

/**
 * Display recent feedback cards in dashboard panel
 * Shows 1 row with 2 cards, cycles through all 4+ star reviews with zoom animation
 */
function displayRecentFeedback(reviews) {
    const container = document.getElementById('recent-feedback-container');

    if (!container) {
        console.error('Recent feedback container not found');
        return;
    }

    if (reviews.length === 0) {
        displayNoRecentFeedback();
        return;
    }

    // Add CSS animations to the page
    if (!document.getElementById('feedback-zoom-animation-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'feedback-zoom-animation-styles';
        styleEl.textContent = `
            @keyframes feedbackZoomInOut {
                0% {
                    transform: scale(0.95);
                    opacity: 0;
                }
                5% {
                    transform: scale(1.03);
                    opacity: 1;
                }
                50% {
                    transform: scale(1);
                    opacity: 1;
                }
                95% {
                    transform: scale(0.97);
                    opacity: 0.8;
                }
                100% {
                    transform: scale(0.95);
                    opacity: 0;
                }
            }

            .feedback-card-animated {
                animation: feedbackZoomInOut 5s ease-in-out;
            }

            .feedback-carousel-row {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1.5rem;
                position: relative;
            }

            .feedback-pair-container {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 1.5rem;
                opacity: 0;
                pointer-events: none;
            }

            .feedback-pair-container.active {
                position: relative;
                opacity: 1;
                pointer-events: auto;
            }
        `;
        document.head.appendChild(styleEl);
    }

    // Group reviews into pairs (2 per row)
    const reviewPairs = [];
    for (let i = 0; i < reviews.length; i += 2) {
        reviewPairs.push(reviews.slice(i, i + 2));
    }

    // Create card HTML generator function
    const createCardHTML = (review) => `
        <div style="background: var(--card-bg); border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); border-left: 4px solid #f59e0b; transition: transform 0.2s ease, box-shadow 0.2s ease;">
            <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                <img src="${review.reviewer_picture || '../uploads/system_images/system_profile_pictures/default-avatar.png'}"
                     alt="${review.reviewer_name}"
                     style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-color);">
                <div style="flex: 1;">
                    <h4 style="font-size: 1rem; font-weight: 600; margin: 0 0 0.25rem 0; color: var(--heading);">
                        ${review.reviewer_name}
                    </h4>
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0 0 0.5rem 0;">
                        Tutor • ${formatDate(review.created_at)}
                    </p>
                    <div style="color: #f59e0b; font-size: 0.875rem;">
                        ${generateStars(review.rating)} <span style="color: var(--text-muted); font-size: 0.8rem;">${review.rating.toFixed(1)}/5.0</span>
                    </div>
                </div>
            </div>
            ${review.comment ? `
                <p style="color: var(--text); line-height: 1.6; margin: 0; font-size: 0.9rem; padding: 1rem; background: var(--bg-secondary); border-radius: 8px;">
                    "${review.comment}"
                </p>
            ` : `
                <p style="color: var(--text-muted); line-height: 1.6; margin: 0; font-size: 0.9rem; font-style: italic;">
                    No comment provided
                </p>
            `}
        </div>
    `;

    // Create all pairs HTML
    const pairsHTML = reviewPairs.map((pair, pairIndex) => `
        <div class="feedback-pair-container ${pairIndex === 0 ? 'active' : ''}" data-pair-index="${pairIndex}">
            ${pair.map(review => createCardHTML(review)).join('')}
        </div>
    `).join('');

    // Add carousel indicator dots if more than one pair
    const dotsHTML = reviewPairs.length > 1 ? `
        <div style="display: flex; justify-content: center; gap: 0.5rem; margin-top: 1.5rem; grid-column: 1 / -1;">
            ${reviewPairs.map((_, index) => `
                <div class="feedback-dot" data-dot-index="${index}"
                     style="width: ${index === 0 ? '24px' : '8px'}; height: 8px; border-radius: 4px; background: ${index === 0 ? '#f59e0b' : 'rgba(245, 158, 11, 0.3)'}; cursor: pointer; transition: all 0.3s ease;"></div>
            `).join('')}
        </div>
    ` : '';

    container.innerHTML = `
        <div style="grid-column: 1 / -1; position: relative; min-height: 200px;">
            ${pairsHTML}
        </div>
        ${dotsHTML}
    `;

    // Start carousel animation if more than one pair
    if (reviewPairs.length > 1) {
        let currentPairIndex = 0;

        // Auto-rotate every 5 seconds
        const carouselInterval = setInterval(() => {
            const pairs = container.querySelectorAll('.feedback-pair-container');
            const dots = container.querySelectorAll('.feedback-dot');

            if (pairs.length === 0) {
                clearInterval(carouselInterval);
                return;
            }

            // Add zoom-out animation to current pair
            pairs[currentPairIndex].classList.add('feedback-card-animated');

            // After animation starts, switch to next pair
            setTimeout(() => {
                // Hide current pair
                pairs[currentPairIndex].classList.remove('active', 'feedback-card-animated');
                if (dots[currentPairIndex]) {
                    dots[currentPairIndex].style.width = '8px';
                    dots[currentPairIndex].style.background = 'rgba(245, 158, 11, 0.3)';
                }

                // Move to next pair
                currentPairIndex = (currentPairIndex + 1) % reviewPairs.length;

                // Show next pair with zoom-in animation
                pairs[currentPairIndex].classList.add('active', 'feedback-card-animated');
                if (dots[currentPairIndex]) {
                    dots[currentPairIndex].style.width = '24px';
                    dots[currentPairIndex].style.background = '#f59e0b';
                }
            }, 300);

        }, 5000);

        // Add click handlers to dots for manual navigation
        const dots = container.querySelectorAll('.feedback-dot');
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                const pairs = container.querySelectorAll('.feedback-pair-container');

                // Hide current pair
                pairs[currentPairIndex].classList.remove('active', 'feedback-card-animated');
                dots[currentPairIndex].style.width = '8px';
                dots[currentPairIndex].style.background = 'rgba(245, 158, 11, 0.3)';

                // Show clicked pair
                currentPairIndex = index;
                pairs[currentPairIndex].classList.add('active', 'feedback-card-animated');
                dots[currentPairIndex].style.width = '24px';
                dots[currentPairIndex].style.background = '#f59e0b';
            });
        });

        // Store interval ID to clear later if needed
        container.dataset.carouselInterval = carouselInterval;
    }
}

/**
 * Display "no recent feedback" state
 */
function displayNoRecentFeedback() {
    const container = document.getElementById('recent-feedback-container');
    if (!container) return;

    container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 2rem; color: var(--text-secondary);">
            <i class="fas fa-comment-slash" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3; color: var(--primary-color);"></i>
            <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem; color: var(--heading);">No Feedback Yet</h3>
            <p style="font-size: 0.95rem;">This student hasn't received any feedback from tutors or parents yet.</p>
        </div>
    `;
}

/**
 * Display error state for recent feedback
 */
function displayRecentFeedbackError() {
    const container = document.getElementById('recent-feedback-container');
    if (!container) return;

    container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary); background: rgba(239, 68, 68, 0.1); border-radius: 12px; border: 2px dashed rgba(239, 68, 68, 0.3);">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 0.75rem; color: #ef4444;"></i>
            <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem; color: var(--heading);">Failed to Load Feedback</h3>
            <p style="font-size: 0.875rem;">Unable to fetch recent feedback. Please try again later.</p>
        </div>
    `;
}

// Make functions available globally
window.loadStudentReviews = loadStudentReviews;
window.loadRecentFeedback = loadRecentFeedback;

console.log('✅ view-student-reviews.js loaded');
