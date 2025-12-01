/**
 * Manage Contents - Profile Header Loader
 * Loads profile data from admin_profile and manage_contents_profile tables
 */

(function() {
    'use strict';

    const API_BASE_URL = 'https://api.astegni.com';

    /**
     * Load profile header data on page load
     */
    async function loadProfileHeader() {
        console.log('Loading profile header for manage-contents...');

        try {
            // Get admin email from authentication
            const adminEmail = getAdminEmail();

            if (!adminEmail) {
                console.error('No admin email found - cannot load profile');
                return;
            }

            console.log(`Loading profile for admin: ${adminEmail}`);

            // Fetch profile data from admin_profile and manage_contents_profile tables by email
            const response = await fetch(`${API_BASE_URL}/api/admin/manage-contents-profile/by-email/${encodeURIComponent(adminEmail)}`);

            if (!response.ok) {
                throw new Error('Failed to fetch profile data');
            }

            const profile = await response.json();
            updateProfileHeader(profile);
            updateStatistics(profile);

            console.log('Profile header loaded from database:', profile);

        } catch (error) {
            console.error('Error loading profile header:', error);
            // Keep fallback hardcoded values on error
        }
    }

    /**
     * Get admin email from authentication
     * Checks multiple sources: localStorage, authManager, JWT token
     */
    function getAdminEmail() {
        // Method 1: Check if authManager has current user
        if (typeof authManager !== 'undefined' && authManager && authManager.getCurrentUser) {
            const user = authManager.getCurrentUser();
            if (user && user.email) {
                return user.email;
            }
        }

        // Method 2: Check localStorage for currentUser
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.email) {
                    return user.email;
                }
            } catch (e) {
                console.error('Error parsing stored user:', e);
            }
        }

        // Method 3: Try to decode JWT token
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                const payload = JSON.parse(jsonPayload);
                if (payload.email) {
                    return payload.email;
                }
            } catch (e) {
                console.error('Error decoding token:', e);
            }
        }

        // No email found
        console.error('Could not find admin email from any source. Please ensure you are logged in.');
        return null;
    }

    /**
     * Update profile header with data from database
     */
    function updateProfileHeader(profile) {
        // Update profile picture if available
        const profileAvatar = document.querySelector('.profile-avatar');
        if (profileAvatar && profile.profile_picture) {
            // Fix path - remove leading slash if present and add ../
            const picturePath = profile.profile_picture.startsWith('/')
                ? '../' + profile.profile_picture.substring(1)
                : '../' + profile.profile_picture;
            profileAvatar.src = picturePath;
        }

        // Update cover picture if available
        const coverImg = document.querySelector('.cover-img');
        if (coverImg && profile.cover_picture) {
            // Fix path - remove leading slash if present and add ../
            const coverPath = profile.cover_picture.startsWith('/')
                ? '../' + profile.cover_picture.substring(1)
                : '../' + profile.cover_picture;
            coverImg.src = coverPath;
        }

        // Update name (profile-name h1)
        const profileNameEl = document.getElementById('adminName');
        if (profileNameEl) {
            if (profile.username) {
                profileNameEl.textContent = profile.username;
            } else if (profile.first_name && profile.father_name) {
                // Fallback to Ethiopian name format
                const displayName = `${profile.first_name} ${profile.father_name}`;
                profileNameEl.textContent = displayName;
            }
        }

        // Update badges from contents_profile
        const badgesRow = document.querySelector('.badges-row');
        if (badgesRow && profile.contents_profile && profile.contents_profile.badges && profile.contents_profile.badges.length > 0) {
            let badgesHTML = '';
            profile.contents_profile.badges.forEach(badge => {
                // Handle both object and string badge formats
                if (typeof badge === 'object') {
                    badgesHTML += `<span class="profile-badge ${badge.class || ''}">${badge.text || badge.label || ''}</span>`;
                } else {
                    badgesHTML += `<span class="profile-badge">${badge}</span>`;
                }
            });
            badgesRow.innerHTML = badgesHTML;
        }

        // Update rating from contents_profile
        const ratingValueEl = document.querySelector('.rating-value');
        if (ratingValueEl && profile.contents_profile && profile.contents_profile.rating !== undefined) {
            ratingValueEl.textContent = profile.contents_profile.rating.toFixed(1);
        }

        // Update review count from contents_profile
        const ratingCountEl = document.querySelector('.rating-count');
        if (ratingCountEl && profile.contents_profile && profile.contents_profile.total_reviews !== undefined) {
            ratingCountEl.textContent = `(${profile.contents_profile.total_reviews} reviews)`;
        }

        // Update rating stars
        const ratingStarsEl = document.querySelector('.rating-stars');
        if (ratingStarsEl && profile.contents_profile && profile.contents_profile.rating !== undefined) {
            const rating = profile.contents_profile.rating;
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 >= 0.5;
            let starsHTML = '';

            for (let i = 0; i < fullStars; i++) {
                starsHTML += '★';
            }
            if (hasHalfStar) {
                starsHTML += '★';
            }
            while (starsHTML.length < 5) {
                starsHTML += '☆';
            }

            ratingStarsEl.textContent = starsHTML;
        }

        // Update location/position (use position from contents_profile)
        const locationEl = document.querySelector('.profile-location span:last-child');
        if (locationEl) {
            if (profile.contents_profile && profile.contents_profile.position) {
                locationEl.textContent = profile.contents_profile.position;
            } else if (profile.departments && profile.departments.length > 0) {
                locationEl.textContent = profile.departments.join(', ') + ' | Content Management';
            } else {
                locationEl.textContent = 'Astegni Admin Panel | Content Management & Moderation';
            }
        }

        // Update email
        const emailEl = document.getElementById('adminEmail');
        if (emailEl && profile.email) {
            emailEl.textContent = profile.email;
        }

        // Update phone
        const phoneEl = document.getElementById('adminPhone');
        if (phoneEl && profile.phone_number) {
            phoneEl.textContent = profile.phone_number;
        } else if (phoneEl) {
            phoneEl.textContent = 'Not provided';
        }

        // Update quote from admin_profile
        const quoteEl = document.querySelector('.profile-quote span');
        if (quoteEl && profile.quote) {
            quoteEl.textContent = `"${profile.quote}"`;
        }

        // Update profile info grid
        const infoItems = document.querySelectorAll('.profile-info-grid .info-item');
        infoItems.forEach(item => {
            const label = item.querySelector('.info-label');
            const value = item.querySelector('.info-value');

            if (label && value) {
                const labelText = label.textContent.trim();

                if (labelText === 'Department:' && profile.departments && profile.departments.length > 0) {
                    value.textContent = profile.departments.join(', ');
                } else if (labelText === 'Employee ID:' && profile.contents_profile && profile.contents_profile.employee_id) {
                    value.textContent = profile.contents_profile.employee_id;
                } else if (labelText === 'Joined:' && profile.contents_profile && profile.contents_profile.joined_date) {
                    value.textContent = profile.contents_profile.joined_date;
                }
            }
        });

        // Update bio in info description
        const infoDescription = document.querySelector('.profile-info-grid .info-description p');
        if (infoDescription && profile.bio) {
            infoDescription.textContent = profile.bio;
        }

        // Store admin_id and email for later use
        window.currentAdminId = profile.admin_id;
        window.currentAdminEmail = profile.email;
    }

    /**
     * Update statistics cards with data from database
     */
    function updateStatistics(profile) {
        if (!profile.contents_profile) return;

        const stats = profile.contents_profile;

        // Update dashboard statistics
        const statCards = {
            'Verified Contents': stats.verified_contents,
            'Requested Contents': stats.requested_contents,
            'Rejected Contents': stats.rejected_contents,
            'Flagged Contents': stats.flagged_contents,
            'Total Storage': `${stats.total_storage_gb} GB`,
            'Approval Rate': `${stats.approval_rate}%`,
            'Avg Processing': `< ${stats.avg_processing_hours}hrs`,
            'User Satisfaction': `${stats.user_satisfaction}%`
        };

        // Update each stat card
        document.querySelectorAll('.card').forEach(card => {
            const heading = card.querySelector('h3');
            if (heading) {
                const cardTitle = heading.textContent.trim();
                if (statCards[cardTitle] !== undefined) {
                    const valueEl = card.querySelector('p');
                    if (valueEl) {
                        valueEl.textContent = statCards[cardTitle];
                    }
                }
            }
        });
    }

    /**
     * Load recent reviews from admin_reviews table
     */
    async function loadRecentReviews() {
        if (!window.currentAdminId) {
            console.warn('No admin_id available, skipping reviews load');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/manage-contents-reviews/${window.currentAdminId}`);

            if (!response.ok) {
                throw new Error('Failed to fetch reviews');
            }

            const data = await response.json();
            updateReviewsSection(data.reviews);

            console.log('Reviews loaded from database:', data.reviews);

        } catch (error) {
            console.error('Error loading reviews:', error);
            // Keep fallback hardcoded reviews on error
        }
    }

    /**
     * Update reviews section with data from database
     */
    function updateReviewsSection(reviews) {
        const reviewsContainer = document.querySelector('.card .space-y-4');
        if (!reviewsContainer || reviews.length === 0) return;

        // Clear existing reviews
        reviewsContainer.innerHTML = '';

        // Add each review
        reviews.forEach(review => {
            const reviewDiv = document.createElement('div');
            const borderColors = ['blue-500', 'green-500', 'purple-500', 'indigo-500', 'pink-500'];
            const borderColor = borderColors[Math.floor(Math.random() * borderColors.length)];

            // Generate stars based on rating
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

            // Calculate time ago
            const timeAgo = calculateTimeAgo(review.review_date);

            reviewDiv.className = `border-l-4 border-${borderColor} pl-4`;
            reviewDiv.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-semibold">${escapeHtml(review.reviewer_name)}</h4>
                        <p class="text-sm text-gray-600">From: ${escapeHtml(review.reviewer_role)}</p>
                    </div>
                    <div class="flex items-center">
                        <span class="text-yellow-400">${stars}</span>
                    </div>
                </div>
                <p class="text-gray-700">"${escapeHtml(review.review_text)}"</p>
                <p class="text-xs text-gray-500 mt-2">${timeAgo}</p>
            `;

            reviewsContainer.appendChild(reviewDiv);
        });
    }

    /**
     * Calculate time ago from date string
     */
    function calculateTimeAgo(dateString) {
        if (!dateString) return 'Recently';

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

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Populate edit profile modal with current data
     */
    window.openEditProfileModal = function() {
        const modal = document.getElementById('edit-profile-modal');
        if (!modal) return;

        // Get current admin email
        const adminEmail = window.currentAdminEmail || getAdminEmail();

        // Fetch current profile data
        fetch(`${API_BASE_URL}/api/admin/manage-contents-profile/by-email/${encodeURIComponent(adminEmail)}`)
            .then(response => response.json())
            .then(profile => {
                // Populate form fields
                document.getElementById('firstNameInput').value = profile.first_name || '';
                document.getElementById('fatherNameInput').value = profile.father_name || '';
                document.getElementById('grandfatherNameInput').value = profile.grandfather_name || '';
                document.getElementById('adminUsernameInput').value = profile.username || '';
                document.getElementById('emailInput').value = profile.email || '';
                document.getElementById('phoneNumberInput').value = profile.phone_number || '';
                document.getElementById('bioInput').value = profile.bio || '';
                document.getElementById('quoteInput').value = profile.quote || '';

                // Show modal
                modal.classList.remove('hidden');
            })
            .catch(error => {
                console.error('Error loading profile for edit:', error);
                // Show modal anyway with empty fields
                modal.classList.remove('hidden');
            });
    };

    /**
     * Close edit profile modal
     */
    window.closeEditProfileModal = function() {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    /**
     * Open upload profile picture modal
     */
    window.openUploadProfileModal = function() {
        console.log('Opening upload profile picture modal');
        // TODO: Implement profile picture upload modal
        alert('Upload Profile Picture\n\nThis feature will be implemented to upload profile pictures to the database.');
    };

    /**
     * Open upload cover image modal
     */
    window.openUploadCoverModal = function() {
        console.log('Opening upload cover image modal');
        // TODO: Implement cover image upload modal
        alert('Upload Cover Image\n\nThis feature will be implemented to upload cover images to the database.');
    };

    /**
     * Handle profile update form submission
     */
    window.handleProfileUpdate = async function(event) {
        event.preventDefault();

        if (!window.currentAdminId) {
            alert('Error: Admin ID not found. Please refresh the page.');
            return;
        }

        // Get form values
        const formData = {
            admin_id: window.currentAdminId,
            first_name: document.getElementById('firstNameInput').value,
            father_name: document.getElementById('fatherNameInput').value,
            grandfather_name: document.getElementById('grandfatherNameInput').value,
            username: document.getElementById('adminUsernameInput').value,
            phone_number: document.getElementById('phoneNumberInput').value,
            bio: document.getElementById('bioInput').value,
            quote: document.getElementById('quoteInput').value
        };

        try {
            // Build query string
            const params = new URLSearchParams(formData).toString();
            const response = await fetch(`${API_BASE_URL}/api/admin/manage-contents-profile?${params}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            // Success - reload profile data
            await loadProfileHeader();
            closeEditProfileModal();
            alert('Profile updated successfully!');

        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
        }
    };

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('Manage Contents Profile Loader initialized');

        // Load profile header
        await loadProfileHeader();

        // Load reviews after profile is loaded (need admin_id)
        setTimeout(loadRecentReviews, 500);
    });

})();
