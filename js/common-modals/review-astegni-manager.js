/**
 * Review Astegni Manager
 * Handles user reviews of the Astegni platform
 * Saves to astegni_admin_db.astegni_reviews table
 */

(function() {
    'use strict';

    // State
    let reviewData = {
        easeRating: 0,
        featuresRating: 0,
        supportRating: 0,
        valueRating: 0,
        reviewText: '',
        wouldRecommend: null
    };

    /**
     * Open Review Astegni Modal
     */
    window.openReviewAstegniModal = function() {
        console.log('🔵 Opening Review Astegni Modal...');
        const modal = document.getElementById('review-astegni-modal');
        if (!modal) {
            console.error('❌ Review Astegni Modal not found!');
            return;
        }

        // Reset form
        resetReviewForm();

        // Check if user already submitted a review
        checkExistingReview();

        modal.classList.remove('hidden');
        modal.classList.add('active');
        modal.style.display = 'flex';
        console.log('✅ Review Astegni Modal opened');
    };

    /**
     * Close Review Astegni Modal
     */
    window.closeReviewAstegniModal = function() {
        const modal = document.getElementById('review-astegni-modal');
        if (!modal) return;

        modal.classList.add('hidden');
        modal.classList.remove('active');
        modal.style.display = 'none';

        // Reset to form view
        document.getElementById('review-form-content').classList.remove('hidden');
        document.getElementById('review-success-content').classList.add('hidden');
    };

    /**
     * Reset review form
     */
    function resetReviewForm() {
        reviewData = {
            easeRating: 0,
            featuresRating: 0,
            supportRating: 0,
            valueRating: 0,
            reviewText: '',
            wouldRecommend: null
        };

        // Reset category stars
        resetCategoryStars('ease');
        resetCategoryStars('features');
        resetCategoryStars('support');
        resetCategoryStars('value');

        // Reset text
        const textarea = document.getElementById('review-text');
        if (textarea) textarea.value = '';
        updateCharCount();

        // Reset recommendation
        document.getElementById('recommend-yes')?.classList.remove('bg-green-600', 'text-white');
        document.getElementById('recommend-yes')?.classList.add('bg-gray-200', 'text-gray-700');
        document.getElementById('recommend-no')?.classList.remove('bg-red-600', 'text-white');
        document.getElementById('recommend-no')?.classList.add('bg-gray-200', 'text-gray-700');

        // Disable submit button
        const submitBtn = document.getElementById('submit-review-btn');
        if (submitBtn) submitBtn.disabled = true;

        // Hide existing review banner
        document.getElementById('existing-review-banner')?.classList.add('hidden');
    }

    function resetCategoryStars(category) {
        const stars = document.querySelectorAll(`#${category}-rating-stars .category-star`);
        stars.forEach(star => {
            star.classList.remove('text-yellow-400');
            star.classList.add('text-gray-300');
        });
    }

    /**
     * Set category rating
     */
    window.setCategoryRating = function(category, rating) {
        reviewData[`${category}Rating`] = rating;

        const stars = document.querySelectorAll(`#${category}-rating-stars .category-star`);
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('text-gray-300');
                star.classList.add('text-yellow-400');
            } else {
                star.classList.add('text-gray-300');
                star.classList.remove('text-yellow-400');
            }
        });

        // Update submit button state (all 4 ratings required)
        updateSubmitButton();
    };

    /**
     * Set recommendation
     */
    window.setRecommendation = function(value) {
        reviewData.wouldRecommend = value;

        const yesBtn = document.getElementById('recommend-yes');
        const noBtn = document.getElementById('recommend-no');

        if (value) {
            yesBtn.classList.remove('bg-gray-200', 'text-gray-700');
            yesBtn.classList.add('bg-green-600', 'text-white');
            noBtn.classList.remove('bg-red-600', 'text-white');
            noBtn.classList.add('bg-gray-200', 'text-gray-700');
        } else {
            yesBtn.classList.remove('bg-green-600', 'text-white');
            yesBtn.classList.add('bg-gray-200', 'text-gray-700');
            noBtn.classList.remove('bg-gray-200', 'text-gray-700');
            noBtn.classList.add('bg-red-600', 'text-white');
        }
    };

    /**
     * Update character count
     */
    function updateCharCount() {
        const textarea = document.getElementById('review-text');
        const counter = document.getElementById('review-char-count');
        if (textarea && counter) {
            const count = textarea.value.length;
            counter.textContent = count;
            if (count > 1000) {
                counter.classList.add('text-red-600');
                textarea.value = textarea.value.substring(0, 1000);
            } else {
                counter.classList.remove('text-red-600');
            }
        }
    }

    /**
     * Update submit button state
     */
    function updateSubmitButton() {
        const submitBtn = document.getElementById('submit-review-btn');
        if (submitBtn) {
            // All 4 category ratings are required
            const allRatingsProvided = reviewData.easeRating > 0 &&
                                       reviewData.featuresRating > 0 &&
                                       reviewData.supportRating > 0 &&
                                       reviewData.valueRating > 0;
            submitBtn.disabled = !allRatingsProvided;
        }
    }

    /**
     * Check if user already submitted a review
     */
    async function checkExistingReview() {
        try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/platform-reviews/my-review`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const existingReview = await response.json();
                if (existingReview && existingReview.id) {
                    // Show banner
                    document.getElementById('existing-review-banner')?.classList.remove('hidden');

                    // Pre-fill form with existing review (using new field names)
                    if (existingReview.ease_of_use) {
                        setCategoryRating('ease', existingReview.ease_of_use);
                    }
                    if (existingReview.features_quality) {
                        setCategoryRating('features', existingReview.features_quality);
                    }
                    if (existingReview.support_quality) {
                        setCategoryRating('support', existingReview.support_quality);
                    }
                    if (existingReview.overall_value) {
                        setCategoryRating('value', existingReview.overall_value);
                    }
                    if (existingReview.would_recommend !== null) {
                        setRecommendation(existingReview.would_recommend);
                    }
                    if (existingReview.review_text) {
                        const textarea = document.getElementById('review-text');
                        if (textarea) {
                            textarea.value = existingReview.review_text;
                            updateCharCount();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error checking existing review:', error);
        }
    }

    /**
     * Submit Astegni review
     */
    window.submitAstegniReview = async function() {
        const submitBtn = document.getElementById('submit-review-btn');
        if (!submitBtn || submitBtn.disabled) return;

        // Get review text
        const textarea = document.getElementById('review-text');
        reviewData.reviewText = textarea ? textarea.value : '';

        // Validate all 4 ratings are provided
        if (!reviewData.easeRating || !reviewData.featuresRating ||
            !reviewData.supportRating || !reviewData.valueRating) {
            alert('⚠️ Please provide all 4 category ratings');
            return;
        }

        // Disable button and show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<svg class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Submitting...';

        try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            if (!token) {
                alert('⚠️ Please log in to submit a review');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Submit Review';
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/platform-reviews/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ease_of_use: reviewData.easeRating,
                    features_quality: reviewData.featuresRating,
                    support_quality: reviewData.supportRating,
                    overall_value: reviewData.valueRating,
                    review_text: reviewData.reviewText || null,
                    would_recommend: reviewData.wouldRecommend
                })
            });

            if (response.ok) {
                // Show success screen
                document.getElementById('review-form-content').classList.add('hidden');
                document.getElementById('review-success-content').classList.remove('hidden');
            } else {
                const error = await response.json();
                alert(`❌ Error: ${error.detail || 'Failed to submit review'}`);
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Submit Review';
            }
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('❌ Failed to submit review. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Submit Review';
        }
    };

    /**
     * Share review on social media
     */
    window.shareReviewOn = function(platform) {
        const text = `I just reviewed Astegni! Check it out at astegni.com`;
        const url = 'https://astegni.com';

        switch (platform) {
            case 'twitter':
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                break;
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                break;
            case 'linkedin':
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
                break;
        }
    };

    // Event listeners
    document.addEventListener('DOMContentLoaded', function() {
        const textarea = document.getElementById('review-text');
        if (textarea) {
            textarea.addEventListener('input', updateCharCount);
        }
    });

    console.log('✅ Review Astegni Manager: JavaScript loaded');
})();
