        /**
         * Update Rating Display with data from tutor_reviews table
         * Uses the new 4-factor rating system:
         * 1. Subject Understanding (renamed from subject_matter)
         * 2. Communication
         * 3. Discipline
         * 4. Punctuality
         */
        async function updateRatingDisplay() {
            try {
                // Wait a bit for auth system to initialize and set user in localStorage
                let retries = 0;
                const maxRetries = 10;
                let token = localStorage.getItem('token') || localStorage.getItem('access_token');
                let user = JSON.parse(localStorage.getItem('currentUser') || '{}');

                // Retry mechanism: wait for user to be set by auth system
                while ((!token || !user.id) && retries < maxRetries) {
                    console.log(`⏳ [Rating Display] Waiting for auth system... (attempt ${retries + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 200));
                    token = localStorage.getItem('token') || localStorage.getItem('access_token');
                    user = JSON.parse(localStorage.getItem('currentUser') || '{}');
                    retries++;
                }

                if (!token || !user.id) {
                    console.log('⚠️ No user logged in after waiting, skipping rating display update');
                    return;
                }

                console.log('✅ [Rating Display] User loaded, proceeding with rating update');

                // Get tutor profile to find tutor_id
                const profileResponse = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/tutor/profile', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!profileResponse.ok) {
                    console.error('Failed to fetch tutor profile:', profileResponse.status);
                    return;
                }

                const tutorProfile = await profileResponse.json();
                const tutorId = tutorProfile.id;
                console.log('✅ Tutor profile ID:', tutorId);

                // Fetch reviews from tutor_reviews table
                const reviewsResponse = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/tutor/${tutorId}/reviews`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                // Initialize variables
                let overallRating = 0;
                let reviewCount = 0;
                let metrics = {
                    subject_understanding: 0,
                    communication: 0,
                    discipline: 0,
                    punctuality: 0
                };

                if (!reviewsResponse.ok) {
                    console.warn('No reviews found for tutor, using defaults');
                } else {
                    const reviews = await reviewsResponse.json();
                    console.log('✅ Reviews loaded from tutor_reviews table:', reviews);

                    // Calculate metrics from reviews
                    reviewCount = reviews.length || 0;
                    let totalSubject = 0, totalComm = 0, totalDisc = 0, totalPunct = 0, totalOverall = 0;

                    reviews.forEach(review => {
                        totalSubject += review.subject_understanding_rating || 0;
                        totalComm += review.communication_rating || 0;
                        totalDisc += review.discipline_rating || 0;
                        totalPunct += review.punctuality_rating || 0;
                        totalOverall += review.rating || 0;
                    });

                    overallRating = reviewCount > 0 ? (totalOverall / reviewCount) : 0;
                    metrics = {
                        subject_understanding: reviewCount > 0 ? (totalSubject / reviewCount) : 0,
                        communication: reviewCount > 0 ? (totalComm / reviewCount) : 0,
                        discipline: reviewCount > 0 ? (totalDisc / reviewCount) : 0,
                        punctuality: reviewCount > 0 ? (totalPunct / reviewCount) : 0
                    };
                }

                console.log('📊 Calculated ratings:', { overallRating, reviewCount, metrics });

                // Update overall rating display
                const ratingValueElement = document.getElementById('tutor-rating');
                if (ratingValueElement) {
                    ratingValueElement.textContent = overallRating.toFixed(1);
                }

                // Update review count
                const ratingCountElement = document.getElementById('rating-count');
                if (ratingCountElement) {
                    ratingCountElement.textContent = `(${reviewCount} review${reviewCount !== 1 ? 's' : ''})`;
                }

                // Update rating stars display
                const starsElement = document.getElementById('rating-stars');
                if (starsElement) {
                    const fullStars = Math.floor(overallRating);
                    const hasHalfStar = (overallRating % 1) >= 0.5;
                    let starsHTML = '★'.repeat(fullStars);
                    if (hasHalfStar && fullStars < 5) {
                        starsHTML += '☆';
                    }
                    starsHTML += '☆'.repeat(5 - fullStars - (hasHalfStar ? 1 : 0));
                    starsElement.textContent = starsHTML;
                }

                // Update rating tooltip with 4-factor breakdown
                // The metrics object should have: subject_understanding, communication, discipline, punctuality
                updateMetric('subject_understanding', metrics.subject_understanding || 0, 'Subject Understanding');
                updateMetric('communication', metrics.communication || 0, 'Communication Skills');
                updateMetric('discipline', metrics.discipline || 0, 'Discipline');
                updateMetric('punctuality', metrics.punctuality || 0, 'Punctuality');

                console.log('✅ Rating display updated with 4-factor system');
            } catch (error) {
                console.error('❌ Error updating rating display:', error);
            }
        }

        /**
         * Update a specific metric in the rating tooltip
         */
        function updateMetric(metricId, value, label) {
            // Find all rating metrics
            const ratingMetrics = document.querySelectorAll('.rating-metric');

            ratingMetrics.forEach(metric => {
                const labelElement = metric.querySelector('.metric-label');
                if (labelElement && labelElement.textContent.trim() === label) {
                    // Update the score
                    const scoreElement = metric.querySelector('.metric-score');
                    if (scoreElement) {
                        scoreElement.textContent = value.toFixed(1);
                    }

                    // Update the progress bar
                    const fillElement = metric.querySelector('.metric-fill');
                    if (fillElement) {
                        const percentage = (value / 5) * 100;
                        fillElement.style.width = `${percentage}%`;
                    }
                }
            });
        }

        // Update rating display on page load
        document.addEventListener('DOMContentLoaded', function () {
            // Wait a bit for profile data to load first
            setTimeout(() => {
                updateRatingDisplay();
            }, 500);
        });

        console.log('✅ Rating Display Update (4-Factor System): JavaScript loaded');
   