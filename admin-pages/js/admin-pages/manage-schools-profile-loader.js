/**
 * Manage Schools - Profile Header Loader
 * Loads profile data from admin_profile and manage_schools_profile tables
 */

(function() {
    'use strict';

    // Use existing API_BASE_URL if available, otherwise auto-detect environment
    const PROFILE_API_BASE = (typeof API_BASE_URL !== 'undefined')
        ? API_BASE_URL
        : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:8000'
            : 'https://api.astegni.com');

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
            const response = await fetch(`${PROFILE_API_BASE}/api/admin/schools/profile/by-email/${encodeURIComponent(adminEmail)}`);

            if (!response.ok) {
                throw new Error('Failed to fetch profile data');
            }

            const profile = await response.json();
            updateProfileHeader(profile);
            loadDepartmentSwitcher(profile);

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
     * Load department switcher in navbar dropdown
     * NOTE: This function does NOT modify the user's current department.
     * It only updates the UI to show/hide the department switcher.
     * This matches the behavior of other admin pages (manage-courses, manage-advertisers, etc.)
     */
    function loadDepartmentSwitcher(profile) {
        const switcher = document.getElementById('department-switcher-section');
        const options = document.getElementById('department-options');

        if (!switcher || !options) return;

        // Get departments from admin_profile.departments (TEXT[] array from database)
        let departments = profile?.departments || [];

        // If departments is not an array or empty, hide switcher
        if (!Array.isArray(departments) || departments.length === 0) {
            switcher.classList.add('hidden');
            return;
        }

        // Get current admin user from localStorage (do NOT modify it)
        const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
        const currentDept = adminUser.department;

        // Check if user is from system-settings department (has access to all departments)
        const isSystemSettings = currentDept === 'manage-system-settings' ||
                                 departments.includes('manage-system-settings');

        // System-settings users have full access - hide the department switcher
        if (isSystemSettings) {
            switcher.classList.add('hidden');
            return;
        }

        // Show department switcher only if user has multiple departments
        if (departments.length > 1) {
            switcher.classList.remove('hidden');

            options.innerHTML = departments.map(dept => {
                const isActive = dept === currentDept;
                const icon = getDepartmentIcon(dept);
                const label = formatDepartmentName(dept);

                return `
                    <a href="javascript:void(0)" onclick="switchDepartment('${dept}')" class="department-option ${isActive ? 'active' : ''}">
                        <i class="fas ${icon}"></i>
                        <span>${label}</span>
                        ${isActive ? '<i class="fas fa-check ml-auto text-green-500"></i>' : ''}
                    </a>
                `;
            }).join('');
        } else {
            // Single department, hide switcher
            switcher.classList.add('hidden');
        }
    }

    /**
     * Switch to a different department
     * Saves the selected department to adminUser and navigates to it
     * Syncs with auth.js department switching
     */
    function switchDepartment(dept) {
        // Save the selected department to adminUser in localStorage (same as auth.js)
        const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
        adminUser.department = dept;
        localStorage.setItem('adminUser', JSON.stringify(adminUser));
        // Navigate to the department page
        window.location.href = getDepartmentLink(dept);
    }

    // Expose switchDepartment globally
    window.switchDepartment = switchDepartment;

    function getDepartmentIcon(dept) {
        const icons = {
            'manage-courses': 'fa-graduation-cap',
            'manage-schools': 'fa-school',
            'manage-campaigns': 'fa-bullhorn',
            'manage-credentials': 'fa-certificate',
            'manage-contents': 'fa-photo-video',
            'manage-customers': 'fa-users',
            'manage-system-settings': 'fa-cog'
        };
        return icons[dept] || 'fa-folder';
    }

    function formatDepartmentName(dept) {
        // Format as "Manage Schools", "Manage Courses", etc.
        return dept.split('-').map(
            word => word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    function getDepartmentLink(dept) {
        return `${dept}.html`;
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
        // Clean username - remove trailing "..." or " ..." patterns
        let cleanUsername = profile.username ? profile.username.replace(/\s*\.{2,}$/, '').trim() : '';

        if (usernameEl && cleanUsername && cleanUsername !== '') {
            usernameEl.textContent = cleanUsername;
        } else if (usernameEl && profile.first_name && profile.father_name) {
            // Fallback to Ethiopian name format
            const displayName = `${profile.first_name} ${profile.father_name}`;
            usernameEl.textContent = displayName;
        }

        // Update badges from manage_schools_profile
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

        // Update location from manage_schools_profile.location array
        const locationEl = document.querySelector('.profile-location span:last-child');
        if (locationEl) {
            if (profile.location && Array.isArray(profile.location) && profile.location.length > 0) {
                // Show locations from profile (respecting display_location setting)
                if (profile.display_location !== false) {
                    locationEl.textContent = profile.location.join(', ');
                } else {
                    locationEl.textContent = 'Location hidden';
                }
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
                    const joinDate = profile.created_at;
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
