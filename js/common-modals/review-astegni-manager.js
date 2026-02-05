(function() {
    'use strict';

    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

    // Review data state
    let reviewData = {
        easeRating: 0,
        featuresRating: 0,
        supportRating: 0,
        valueRating: 0,
        reviewText: '',
        wouldRecommend: null
    };

    let hasExistingReview = false;  // Track if user has existing review

    /**
     * Open Review Astegni Modal
     */
    window.openReviewAstegniModal = function() {
        console.log('🔵 Opening Review Astegni Modal...');
        const modal = document.getElementById('review-astegni-modal');
        if (!modal) {
            console.error('❌ Review Astegni Modal not found! Modal may still be loading...');
            // Wait a bit and try again (in case modal is still being fetched)
            setTimeout(() => {
                const modalRetry = document.getElementById('review-astegni-modal');
                if (!modalRetry) {
                    console.error('❌ Review Astegni Modal still not found after retry!');
                    alert('⚠️ Modal is still loading. Please try again in a moment.');
                    return;
                }
                // Open the modal on retry
                modalRetry.classList.remove('hidden');
                modalRetry.classList.add('flex');
                modalRetry.style.display = 'flex';
                resetReviewForm();
                checkExistingReview();
                console.log('✅ Review Astegni Modal opened (after retry)');
            }, 500);
            return;
        }

        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.style.display = 'flex';

        // Reset form
        resetReviewForm();

        // Check for existing review
        checkExistingReview();

        console.log('✅ Review Astegni Modal opened');
    };

    /**
     * Close Review Astegni Modal
     */
    window.closeReviewAstegniModal = function() {
        const modal = document.getElementById('review-astegni-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            modal.style.display = 'none';
        }

        // Reset form and success screen
        document.getElementById('review-form-content')?.classList.remove('hidden');
        document.getElementById('review-success-content')?.classList.add('hidden');

        resetReviewForm();
    };

    function resetReviewForm() {
        // Reset ratings
        reviewData = {
            easeRating: 0,
            featuresRating: 0,
            supportRating: 0,
            valueRating: 0,
            reviewText: '',
            wouldRecommend: null
        };

        // Reset stars
        resetCategoryStars('ease');
        resetCategoryStars('features');
        resetCategoryStars('support');
        resetCategoryStars('value');

        // Reset text area
        const textarea = document.getElementById('review-text');
        if (textarea) {
            textarea.value = '';
        }
        updateCharCount();

        // Reset recommendation
        document.getElementById('recommend-yes')?.classList.remove('bg-green-600', 'text-white');
        document.getElementById('recommend-yes')?.classList.add('bg-gray-200', 'text-gray-700');
        document.getElementById('recommend-no')?.classList.remove('bg-red-600', 'text-white');
        document.getElementById('recommend-no')?.classList.add('bg-gray-200', 'text-gray-700');

        // Disable submit button and reset text
        const submitBtn = document.getElementById('submit-review-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Submit Review';
        }

        // Hide existing review banner
        document.getElementById('existing-review-banner')?.classList.add('hidden');

        // Reset existing review flag
        hasExistingReview = false;
    }

    function resetCategoryStars(category) {
        const stars = document.querySelectorAll(`#${category}-rating-stars .category-star`);
        stars.forEach(star => {
            star.classList.remove('text-yellow-400');
            star.classList.add('text-gray-300');
        });
    }

    /**
     * Set star rating for a category
     */
    window.setCategoryRating = function(category, rating) {
        console.log(`Setting ${category} rating to ${rating}`);

        // Update data
        switch(category) {
            case 'ease':
                reviewData.easeRating = rating;
                break;
            case 'features':
                reviewData.featuresRating = rating;
                break;
            case 'support':
                reviewData.supportRating = rating;
                break;
            case 'value':
                reviewData.valueRating = rating;
                break;
        }

        // Update stars visually
        const stars = document.querySelectorAll(`#${category}-rating-stars .category-star`);
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('text-gray-300');
                star.classList.add('text-yellow-400');
            } else {
                star.classList.remove('text-yellow-400');
                star.classList.add('text-gray-300');
            }
        });

        // Update submit button state
        updateSubmitButton();
    };

    /**
     * Set recommendation
     */
    window.setRecommendation = function(recommend) {
        reviewData.wouldRecommend = recommend;

        // Update button styles
        const yesBtn = document.getElementById('recommend-yes');
        const noBtn = document.getElementById('recommend-no');

        if (recommend) {
            yesBtn?.classList.remove('bg-gray-200', 'text-gray-700');
            yesBtn?.classList.add('bg-green-600', 'text-white');
            noBtn?.classList.remove('bg-red-600', 'text-white');
            noBtn?.classList.add('bg-gray-200', 'text-gray-700');
        } else {
            noBtn?.classList.remove('bg-gray-200', 'text-gray-700');
            noBtn?.classList.add('bg-red-600', 'text-white');
            yesBtn?.classList.remove('bg-green-600', 'text-white');
            yesBtn?.classList.add('bg-gray-200', 'text-gray-700');
        }

        updateSubmitButton();
    };

    function updateSubmitButton() {
        const submitBtn = document.getElementById('submit-review-btn');
        if (submitBtn) {
            // All 4 category ratings are required
            const allRatingsProvided = reviewData.easeRating > 0 &&
                                       reviewData.featuresRating > 0 &&
                                       reviewData.supportRating > 0 &&
                                       reviewData.valueRating > 0;
            submitBtn.disabled = !allRatingsProvided;

            // Update button text based on whether it's a new review or update
            if (allRatingsProvided) {
                if (hasExistingReview) {
                    submitBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Update Review';
                } else {
                    submitBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Submit Review';
                }
            }
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
                    // Set flag for existing review
                    hasExistingReview = true;

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
                    if (existingReview.pricing) {
                        setCategoryRating('value', existingReview.pricing);
                    }
                    if (existingReview.review_text) {
                        const textarea = document.getElementById('review-text');
                        if (textarea) {
                            textarea.value = existingReview.review_text;
                            reviewData.reviewText = existingReview.review_text;
                            updateCharCount();
                        }
                    }
                    if (existingReview.would_recommend !== null) {
                        setRecommendation(existingReview.would_recommend);
                    }

                    console.log('[checkExistingReview] Found existing review');
                }
            }
        } catch (error) {
            console.error('[checkExistingReview] Error:', error);
        }
    }

    /**
     * Submit review
     */
    window.submitAstegniReview = async function() {
        const submitBtn = document.getElementById('submit-review-btn');

        // Validate ratings
        if (!reviewData.easeRating || !reviewData.featuresRating ||
            !reviewData.supportRating || !reviewData.valueRating) {
            alert('⚠️ Please provide all 4 category ratings');
            return;
        }

        // Disable button and show loading
        submitBtn.disabled = true;
        const loadingText = hasExistingReview ? 'Updating...' : 'Submitting...';
        submitBtn.innerHTML = `<svg class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> ${loadingText}`;

        try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            if (!token) {
                alert('⚠️ Please log in to submit a review');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Submit Review';
                return;
            }

            // Get review text
            reviewData.reviewText = document.getElementById('review-text')?.value || '';

            const response = await fetch(`${API_BASE_URL}/api/platform-reviews/submit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ease_of_use: reviewData.easeRating,
                    features_quality: reviewData.featuresRating,
                    support_quality: reviewData.supportRating,
                    pricing: reviewData.valueRating,
                    review_text: reviewData.reviewText,
                    would_recommend: reviewData.wouldRecommend
                })
            });

            if (response.ok) {
                // Show success screen
                document.getElementById('review-form-content').classList.add('hidden');
                document.getElementById('review-success-content').classList.remove('hidden');

                // Load user's social links
                loadUserSocialLinksInModal();
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
     * Load and display user's social links in modal success screen
     * User's personal links appear FIRST (opening their actual pages), then platform buttons (opening homepages)
     */
    window.loadUserSocialLinksInModal = async function() {
        try {
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            if (!token) {
                console.log('[loadUserSocialLinksInModal] User not logged in');
                return;
            }

            // Fetch user data from API
            const response = await fetch(`${API_BASE_URL}/api/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.log('[loadUserSocialLinksInModal] Failed to fetch user data');
                return;
            }

            const userData = await response.json();
            const socialLinks = userData.social_links || {};

            console.log('[loadUserSocialLinksInModal] User social links:', socialLinks);

            // Social media platform configurations
            const platforms = {
                twitter: { color: '#000000', name: 'X' },
                linkedin: { color: '#0A66C2', name: 'LinkedIn' },
                facebook: { color: '#1877F2', name: 'Facebook' },
                instagram: { color: '#E4405F', name: 'Instagram' },
                youtube: { color: '#FF0000', name: 'YouTube' },
                github: { color: '#333333', name: 'GitHub' },
                tiktok: { color: '#000000', name: 'TikTok' },
                telegram: { color: '#0088cc', name: 'Telegram' },
                snapchat: { color: '#FFFC00', name: 'Snapchat' },
                whatsapp: { color: '#25D366', name: 'WhatsApp' }
            };

            // Get the all-social-links-container (the single container with both user links and platform buttons)
            const container = document.getElementById('all-social-links-container');

            if (!container) {
                console.log('[loadUserSocialLinksInModal] Container not found');
                return;
            }

            // Build user's personal social links and insert them at the BEGINNING
            let linksInserted = 0;
            for (const [platform, url] of Object.entries(socialLinks)) {
                if (url && url.trim() !== '') {
                    const config = platforms[platform.toLowerCase()];

                    if (config) {
                        const linkEl = document.createElement('button');
                        linkEl.onclick = function() {
                            window.open(url, '_blank');
                        };
                        linkEl.title = `${config.name} (My Profile)`;
                        linkEl.className = 'p-3 rounded-xl transition-opacity hover:opacity-90 text-white';
                        linkEl.style.cssText = `background-color: ${config.color};`;

                        // Add SVG icon (matching platform buttons)
                        const svgIcon = container.querySelector(`button[onclick*="'${platform}'"]`)?.querySelector('svg');
                        if (svgIcon) {
                            linkEl.innerHTML = svgIcon.outerHTML;
                        }

                        // Insert at the beginning of the container (before platform buttons)
                        container.insertBefore(linkEl, container.firstChild);
                        linksInserted++;
                        console.log(`✅ Inserted user's ${platform} link at beginning`);
                    }
                }
            }

            if (linksInserted > 0) {
                console.log(`[loadUserSocialLinksInModal] Inserted ${linksInserted} user social link(s) at beginning`);
            } else {
                console.log('[loadUserSocialLinksInModal] No user social links to display');
            }

        } catch (error) {
            console.error('[loadUserSocialLinksInModal] Error:', error);
        }
    };

    /**
     * Open social media platform homepage (for platform buttons)
     */
    window.openPlatform = function(platform) {
        const platformUrls = {
            twitter: 'https://x.com',
            linkedin: 'https://linkedin.com',
            facebook: 'https://facebook.com',
            instagram: 'https://instagram.com',
            youtube: 'https://youtube.com',
            github: 'https://github.com',
            tiktok: 'https://tiktok.com',
            telegram: 'https://t.me',
            snapchat: 'https://snapchat.com',
            whatsapp: 'https://wa.me'
        };

        const url = platformUrls[platform];
        if (url) {
            window.open(url, '_blank');
        }
    };

    function updateCharCount() {
        const textarea = document.getElementById('review-text');
        const charCount = document.getElementById('char-count');
        if (textarea && charCount) {
            const length = textarea.value.length;
            charCount.textContent = `${length}/500`;
        }
    }

    // Event listeners
    document.addEventListener('DOMContentLoaded', function() {
        const textarea = document.getElementById('review-text');
        if (textarea) {
            textarea.addEventListener('input', updateCharCount);
        }
    });

    console.log('✅ Review Astegni Manager: JavaScript loaded');
})();
