/**
 * Manage Contents - Profile Header Loader
 * Loads profile data from astegni_admin_db (admin_profile and manage_contents_profile tables)
 *
 * Uses AdminDBService from shared/admin-api-service.js
 */

(function() {
    'use strict';

    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

    /**
     * Load profile header data from astegni_admin_db on page load
     */
    async function loadProfileHeader() {
        console.log('Loading profile header for manage-contents from astegni_admin_db...');

        try {
            // Get admin email from authentication
            const adminEmail = getAdminEmail();

            if (!adminEmail) {
                console.error('No admin email found - cannot load profile');
                return;
            }

            console.log(`Loading profile for admin: ${adminEmail}`);

            let profile;

            // Use AdminDBService if available, otherwise direct fetch
            if (window.AdminDBService) {
                profile = await window.AdminDBService.getManageProfileByEmail('manage_contents_profile', adminEmail);
            } else {
                // Fetch profile data from astegni_admin_db via /api/admin-db/* endpoint
                const response = await fetch(`${API_BASE_URL}/api/admin-db/manage/manage_contents_profile/by-email/${encodeURIComponent(adminEmail)}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch profile data');
                }

                profile = await response.json();
            }

            updateProfileHeader(profile);
            updateStatistics(profile);

            console.log('Profile header loaded from astegni_admin_db:', profile);

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

        // Update badges from manage_contents_profile
        const badgesRow = document.querySelector('.badges-row');
        if (badgesRow && profile.badges && profile.badges.length > 0) {
            let badgesHTML = '';
            profile.badges.forEach(badge => {
                // Handle both object and string badge formats
                if (typeof badge === 'object') {
                    badgesHTML += `<span class="profile-badge ${badge.class || ''}">${badge.text || badge.label || ''}</span>`;
                } else {
                    badgesHTML += `<span class="profile-badge">${badge}</span>`;
                }
            });
            badgesRow.innerHTML = badgesHTML;
        }

        // Update rating from admin_reviews (calculated live in backend)
        const ratingValueEl = document.querySelector('.rating-value');
        if (ratingValueEl && profile.rating !== undefined) {
            ratingValueEl.textContent = profile.rating.toFixed(1);
        }

        // Update review count from admin_reviews
        const ratingCountEl = document.querySelector('.rating-count');
        if (ratingCountEl && profile.total_reviews !== undefined) {
            ratingCountEl.textContent = `(${profile.total_reviews} reviews)`;
        }

        // Update rating stars based on admin_reviews rating
        const ratingStarsEl = document.querySelector('.rating-stars');
        if (ratingStarsEl && profile.rating !== undefined) {
            const rating = profile.rating;
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

        // Update location from manage_contents_profile.location array
        const locationEl = document.querySelector('.profile-location span:last-child');
        if (locationEl) {
            if (profile.location && Array.isArray(profile.location) && profile.location.length > 0) {
                // Show locations from profile (respecting display_location setting)
                // display_location = whether to show location publicly (default true)
                // allow_location = whether system can use GPS to detect location (separate setting)
                if (profile.display_location !== false) {
                    locationEl.textContent = profile.location.join(', ');
                } else {
                    locationEl.textContent = 'Location hidden';
                }
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
     * Load recent reviews from astegni_admin_db (admin_reviews table)
     */
    async function loadRecentReviews() {
        if (!window.currentAdminId) {
            console.warn('No admin_id available, skipping reviews load');
            return;
        }

        try {
            let reviews;

            // Use AdminDBService if available, otherwise direct fetch
            if (window.AdminDBService) {
                reviews = await window.AdminDBService.getRecentAdminReviews({
                    adminId: window.currentAdminId,
                    department: 'manage-contents',
                    limit: 3
                });
            } else {
                const response = await fetch(`${API_BASE_URL}/api/admin-db/reviews/recent?admin_id=${window.currentAdminId}&department=manage-contents&limit=3`);

                if (!response.ok) {
                    throw new Error('Failed to fetch reviews');
                }

                reviews = await response.json();
            }

            updateReviewsSection(reviews);

            console.log('Reviews loaded from astegni_admin_db:', reviews);

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
     * Populate edit profile modal with current data from astegni_admin_db
     */
    window.openEditProfileModal = async function() {
        const modal = document.getElementById('edit-profile-modal');
        if (!modal) return;

        // Get current admin email
        const adminEmail = window.currentAdminEmail || getAdminEmail();

        try {
            let profile;

            // Use AdminDBService if available, otherwise direct fetch
            if (window.AdminDBService) {
                profile = await window.AdminDBService.getManageProfileByEmail('manage_contents_profile', adminEmail);
            } else {
                // Fetch current profile data from astegni_admin_db
                const response = await fetch(`${API_BASE_URL}/api/admin-db/manage/manage_contents_profile/by-email/${encodeURIComponent(adminEmail)}`);
                profile = await response.json();
            }

            // Store current profile for later use
            window.currentProfile = profile;

            // Populate form fields
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            };

            setVal('editUsername', profile.username);
            setVal('editBio', profile.bio);
            setVal('editQuote', profile.quote);
            setVal('editHeroSubtitle', profile.hero_subtitle);

            // Hero titles - populate array fields
            if (typeof populateHeroTitles === 'function') {
                populateHeroTitles(profile.hero_title);
            }

            // Locations - populate array fields
            if (typeof populateLocations === 'function') {
                populateLocations(profile.location);
            }

            // Languages - populate checkboxes
            const languages = profile.languages || [];
            ['English', 'Amharic', 'Oromo', 'Tigrinya', 'Somali'].forEach(lang => {
                const checkbox = document.getElementById(`lang${lang}`);
                if (checkbox) {
                    checkbox.checked = languages.includes(lang);
                }
            });

            // Allow Location checkbox (GPS detection permission)
            const allowLocationCheckbox = document.getElementById('editAllowLocation');
            if (allowLocationCheckbox) {
                allowLocationCheckbox.checked = profile.allow_location || false;
            }

            // Display Location checkbox (public visibility)
            const displayLocationCheckbox = document.getElementById('editDisplayLocation');
            if (displayLocationCheckbox) {
                displayLocationCheckbox.checked = profile.display_location !== false; // Default to true
            }

            // Show modal
            modal.classList.remove('hidden');

            // Initialize geolocation UI (show/hide detect button based on allow_location state)
            if (typeof initGeolocationUI === 'function') {
                initGeolocationUI();
            }
        } catch (error) {
            console.error('Error loading profile for edit:', error);
            // Show modal anyway with empty fields
            modal.classList.remove('hidden');
        }
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
     * Handle profile update form submission - saves to astegni_admin_db
     */
    window.handleProfileUpdate = async function(event) {
        event.preventDefault();

        if (!window.currentAdminId) {
            alert('Error: Admin ID not found. Please refresh the page.');
            return;
        }

        // Helper to get input value
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };

        // Get languages from checkboxes
        const languages = [];
        ['English', 'Amharic', 'Oromo', 'Tigrinya', 'Somali'].forEach(lang => {
            const checkbox = document.getElementById(`lang${lang}`);
            if (checkbox && checkbox.checked) {
                languages.push(lang);
            }
        });

        // Get hero_title and location arrays
        const heroTitles = typeof getHeroTitles === 'function' ? getHeroTitles() : [];
        const locations = typeof getLocations === 'function' ? getLocations() : [];

        // Get allow_location checkbox value (GPS detection permission)
        const allowLocationCheckbox = document.getElementById('editAllowLocation');
        const allowLocation = allowLocationCheckbox ? allowLocationCheckbox.checked : false;

        // Get display_location checkbox value (public visibility)
        const displayLocationCheckbox = document.getElementById('editDisplayLocation');
        const displayLocation = displayLocationCheckbox ? displayLocationCheckbox.checked : true;

        // Get form values
        const formData = {
            username: getVal('editUsername'),
            bio: getVal('editBio'),
            quote: getVal('editQuote'),
            location: locations,
            hero_title: heroTitles,
            hero_subtitle: getVal('editHeroSubtitle'),
            languages: languages,
            allow_location: allowLocation,
            display_location: displayLocation
        };

        try {
            // Use AdminDBService if available, otherwise direct fetch
            if (window.AdminDBService) {
                await window.AdminDBService.updateManageProfile('manage_contents_profile', window.currentAdminId, formData);
            } else {
                const response = await fetch(`${API_BASE_URL}/api/admin-db/manage/manage_contents_profile/${window.currentAdminId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    throw new Error('Failed to update profile');
                }
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
