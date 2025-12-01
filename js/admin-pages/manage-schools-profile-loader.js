/**
 * Manage Schools - Profile Header Loader
 * Loads profile data from admin_profile and manage_schools_profile tables
 */

(function() {
    'use strict';

    const API_BASE_URL = 'https://api.astegni.com';

    /**
     * Load profile header data on page load
     */
    async function loadProfileHeader() {
        console.log('Loading profile header for manage-schools...');

        try {
            // Get admin email from authentication
            const adminEmail = getAdminEmail();

            if (!adminEmail) {
                console.error('No admin email found - cannot load profile');
                return;
            }

            console.log(`Loading profile for admin: ${adminEmail}`);

            // Fetch profile data from admin_profile and manage_schools_profile tables by email
            const response = await fetch(`${API_BASE_URL}/api/admin/manage-schools-profile/by-email/${encodeURIComponent(adminEmail)}`);

            if (!response.ok) {
                throw new Error('Failed to fetch profile data');
            }

            const profile = await response.json();
            updateProfileHeader(profile);

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

        // Fallback for testing - remove in production
        console.warn('Could not find admin email, using test email');
        return 'test1@example.com';
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

        // Update username (display name)
        const usernameEl = document.getElementById('adminUsername');
        if (usernameEl && profile.username) {
            usernameEl.textContent = profile.username;
        } else if (usernameEl && profile.first_name && profile.father_name) {
            // Fallback to Ethiopian name format
            const displayName = `${profile.first_name} ${profile.father_name}`;
            usernameEl.textContent = displayName;
        }

        // Update badges from schools_profile
        const badgesRow = document.querySelector('.badges-row');
        if (badgesRow && profile.schools_profile && profile.schools_profile.badges && profile.schools_profile.badges.length > 0) {
            let badgesHTML = '';
            profile.schools_profile.badges.forEach(badge => {
                // Handle both object and string badge formats
                if (typeof badge === 'object') {
                    badgesHTML += `<span class="profile-badge ${badge.class || ''}">${badge.text || badge.label || ''}</span>`;
                } else {
                    badgesHTML += `<span class="profile-badge">${badge}</span>`;
                }
            });
            badgesRow.innerHTML = badgesHTML;
        }

        // Update rating from schools_profile
        const ratingValueEl = document.querySelector('.rating-value');
        if (ratingValueEl && profile.schools_profile && profile.schools_profile.rating !== undefined) {
            ratingValueEl.textContent = profile.schools_profile.rating.toFixed(1);
        }

        // Update review count from schools_profile
        const ratingCountEl = document.querySelector('.rating-count');
        if (ratingCountEl && profile.schools_profile && profile.schools_profile.total_reviews !== undefined) {
            ratingCountEl.textContent = `(${profile.schools_profile.total_reviews} reviews)`;
        }

        // Update rating stars
        const ratingStarsEl = document.querySelector('.rating-stars');
        if (ratingStarsEl && profile.schools_profile && profile.schools_profile.rating !== undefined) {
            const rating = profile.schools_profile.rating;
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

        // Update location/position (use position from schools_profile)
        const locationEl = document.querySelector('.profile-location span:last-child');
        if (locationEl) {
            if (profile.schools_profile && profile.schools_profile.position) {
                locationEl.textContent = profile.schools_profile.position;
            } else if (profile.departments && profile.departments.length > 0) {
                locationEl.textContent = profile.departments.join(', ') + ' | School Management';
            } else {
                locationEl.textContent = 'Astegni Admin Panel | School Registration & Management';
            }
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
                if (label.textContent.includes('Email')) {
                    value.textContent = profile.email || 'N/A';
                } else if (label.textContent.includes('Phone')) {
                    value.textContent = profile.phone_number || 'N/A';
                } else if (label.textContent.includes('Department')) {
                    if (profile.departments && profile.departments.length > 0) {
                        value.textContent = profile.departments.join(', ');
                    } else if (profile.schools_profile && profile.schools_profile.position) {
                        value.textContent = 'Educational Services';
                    }
                } else if (label.textContent.includes('Employee ID')) {
                    // Could add employee_id field to admin_profile if needed
                    value.textContent = `ADM-${new Date().getFullYear()}-${profile.id.toString().padStart(3, '0')}`;
                } else if (label.textContent.includes('Joined')) {
                    const joinDate = profile.schools_profile?.joined_date || profile.created_at;
                    if (joinDate) {
                        const date = new Date(joinDate);
                        value.textContent = date.toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric'
                        });
                    }
                }
            }
        });

        // Update bio/description
        const descriptionEl = document.querySelector('.info-description p');
        if (descriptionEl && profile.bio) {
            descriptionEl.textContent = profile.bio;
        }
    }

    /**
     * Get admin email for use by other modules
     */
    window.getAdminEmailFromPage = function() {
        return getAdminEmail();
    };

    /**
     * Reload profile header after updates
     */
    window.reloadProfileHeader = async function() {
        await loadProfileHeader();
    };

    // Export for use in profile edit modal
    window.SchoolsProfileLoader = {
        loadProfile: loadProfileHeader,
        getAdminEmail: getAdminEmail
    };

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        if (window.location.href.includes('manage-schools.html')) {
            console.log('Schools Profile Loader initialized');
            loadProfileHeader();
        }
    });

})();
