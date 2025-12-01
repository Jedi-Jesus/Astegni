// manage-courses-dashboard-loader.js - Dynamic Dashboard Data Loader
// Fetches and populates all dashboard data from database

(function() {
    'use strict';

    const API_BASE_URL = 'https://api.astegni.com';

    // ============================================
    // LOAD ALL DASHBOARD DATA
    // ============================================

    /**
     * Load all dashboard data on page load
     */
    async function loadAllDashboardData() {
        console.log('Loading all dashboard data from database...');

        try {
            // Load data in parallel for better performance
            await Promise.all([
                loadDailyQuotas(),
                loadAchievements(),
                loadFireStreak(),
                loadProfileStats(),
                loadPanelStatistics('dashboard')
            ]);

            console.log('All dashboard data loaded successfully');

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            showNotification('Failed to load some dashboard data', 'warning');
        }
    }

    // ============================================
    // DAILY QUOTAS
    // ============================================

    async function loadDailyQuotas() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin-dashboard/daily-quotas?admin_id=1`);

            if (!response.ok) {
                throw new Error('Failed to fetch daily quotas');
            }

            const quotas = await response.json();
            updateDailyQuotasWidget(quotas);

            console.log('Daily quotas loaded:', quotas.length);

        } catch (error) {
            console.error('Error loading daily quotas:', error);
            // Keep fallback hardcoded values on error
        }
    }

    function updateDailyQuotasWidget(quotas) {
        // Find each quota section and update it
        const quotaWidgetContainer = document.querySelector('.admin-widget-card .space-y-3');
        if (!quotaWidgetContainer) {
            console.warn('Daily quota widget container not found');
            return;
        }

        // Build new HTML for quotas
        let quotasHTML = '';

        quotas.forEach(quota => {
            const capitalizedCategory = quota.category.charAt(0).toUpperCase() + quota.category.slice(1);
            const colorClass = getQuotaColorClass(quota.category);

            quotasHTML += `
                <div class="flex justify-between items-center">
                    <span class="text-sm text-gray-600">${capitalizedCategory}</span>
                    <span class="font-semibold">${quota.current_count}/${quota.quota_limit}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="${colorClass} h-2 rounded-full" style="width: ${quota.percentage}%"></div>
                </div>
            `;
        });

        quotaWidgetContainer.innerHTML = quotasHTML;
    }

    function getQuotaColorClass(category) {
        const colors = {
            'active': 'bg-green-500',
            'pending': 'bg-yellow-500',
            'rejected': 'bg-red-500',
            'suspended': 'bg-orange-500',
            'archived': 'bg-gray-500'
        };
        return colors[category] || 'bg-blue-500';
    }

    // ============================================
    // ACHIEVEMENTS
    // ============================================

    async function loadAchievements() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin-dashboard/achievements?admin_id=1`);

            if (!response.ok) {
                throw new Error('Failed to fetch achievements');
            }

            const achievements = await response.json();
            updateAchievementsSection(achievements);

            console.log('Achievements loaded:', achievements.length);

        } catch (error) {
            console.error('Error loading achievements:', error);
            // Keep fallback hardcoded values on error
        }
    }

    function updateAchievementsSection(achievements) {
        // Find achievements container in dashboard panel
        const achievementsContainer = document.querySelector('#dashboard-panel .grid.grid-cols-3.md\\:grid-cols-6');
        if (!achievementsContainer) {
            console.warn('Achievements container not found');
            return;
        }

        // Build HTML for achievements
        let achievementsHTML = '';

        achievements.forEach(ach => {
            achievementsHTML += `
                <div class="text-center">
                    <div class="text-3xl mb-2">${ach.icon}</div>
                    <div class="text-sm">${ach.title}</div>
                    <div class="text-xs text-gray-500">${ach.earned_period || ''}</div>
                </div>
            `;
        });

        achievementsContainer.innerHTML = achievementsHTML;
    }

    // ============================================
    // FIRE STREAK
    // ============================================

    async function loadFireStreak() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin-dashboard/fire-streak?admin_id=1`);

            if (!response.ok) {
                throw new Error('Failed to fetch fire streak');
            }

            const streak = await response.json();
            updateFireStreakWidget(streak);

            console.log('Fire streak loaded:', streak.current_streak);

        } catch (error) {
            console.error('Error loading fire streak:', error);
            // Keep fallback hardcoded values on error
        }
    }

    function updateFireStreakWidget(streak) {
        // Update the fire streak widget
        const streakNumberEl = document.querySelector('.admin-widget-card:has(.text-4xl.font-bold.text-orange-500) .text-4xl.font-bold.text-orange-500');
        const streakGridEl = document.querySelector('.admin-widget-card:has(.text-4xl.font-bold.text-orange-500) .grid.grid-cols-7');

        if (streakNumberEl) {
            streakNumberEl.textContent = streak.current_streak;
        }

        if (streakGridEl && streak.weekly_pattern) {
            let gridHTML = '';
            streak.weekly_pattern.forEach(isActive => {
                const opacity = isActive ? '' : 'opacity-30';
                gridHTML += `<span class="text-xs ${opacity}">🔥</span>`;
            });
            streakGridEl.innerHTML = gridHTML;
        }
    }

    // ============================================
    // PROFILE STATS
    // ============================================

    async function loadProfileStats() {
        try {
            // Get admin email from authentication
            const adminEmail = getAdminEmail();

            if (!adminEmail) {
                console.error('No admin email found - cannot load profile');
                return;
            }

            console.log(`Loading profile for admin: ${adminEmail}`);

            // Fetch profile data from admin_profile and manage_courses_profile tables by email
            const response = await fetch(`${API_BASE_URL}/api/admin/manage-courses-profile/by-email/${encodeURIComponent(adminEmail)}`);

            if (!response.ok) {
                throw new Error('Failed to fetch profile stats');
            }

            const profile = await response.json();
            updateProfileHeader(profile);

            console.log('Profile stats loaded from database:', profile);

        } catch (error) {
            console.error('Error loading profile stats:', error);
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

    function updateProfileHeader(profile) {
        // Update profile picture if available
        const profileAvatar = document.querySelector('.profile-avatar');
        if (profileAvatar && profile.profile_picture) {
            profileAvatar.src = profile.profile_picture;
        }

        // Update cover picture if available
        const coverImg = document.querySelector('.cover-img');
        if (coverImg && profile.cover_picture) {
            coverImg.src = profile.cover_picture;
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

        // Update badges from courses_profile
        const badgesRow = document.querySelector('.badges-row');
        if (badgesRow && profile.courses_profile && profile.courses_profile.badges && profile.courses_profile.badges.length > 0) {
            let badgesHTML = '';
            profile.courses_profile.badges.forEach(badge => {
                // Handle both object and string badge formats
                if (typeof badge === 'object') {
                    badgesHTML += `<span class="profile-badge ${badge.class || ''}">${badge.text || badge.label || ''}</span>`;
                } else {
                    badgesHTML += `<span class="profile-badge">${badge}</span>`;
                }
            });
            badgesRow.innerHTML = badgesHTML;
        }

        // Update rating from courses_profile
        const ratingValueEl = document.querySelector('.rating-value');
        if (ratingValueEl && profile.courses_profile && profile.courses_profile.rating !== undefined) {
            ratingValueEl.textContent = profile.courses_profile.rating.toFixed(1);
        }

        // Update review count from courses_profile
        const ratingCountEl = document.querySelector('.rating-count');
        if (ratingCountEl && profile.courses_profile && profile.courses_profile.total_reviews !== undefined) {
            ratingCountEl.textContent = `(${profile.courses_profile.total_reviews} reviews)`;
        }

        // Update rating stars
        const ratingStarsEl = document.querySelector('.rating-stars');
        if (ratingStarsEl && profile.courses_profile && profile.courses_profile.rating !== undefined) {
            const rating = profile.courses_profile.rating;
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

        // Update location (use departments from admin_profile)
        const locationEl = document.querySelector('.profile-location span:last-child');
        if (locationEl) {
            if (profile.courses_profile && profile.courses_profile.position) {
                locationEl.textContent = profile.courses_profile.position;
            } else if (profile.departments && profile.departments.length > 0) {
                locationEl.textContent = profile.departments.join(', ');
            } else {
                locationEl.textContent = 'Course Management';
            }
        }

        // Update quote from admin_profile
        const quoteEl = document.querySelector('.profile-quote span');
        if (quoteEl && profile.quote) {
            quoteEl.textContent = `"${profile.quote}"`;
        }

        // Update email
        const emailEl = document.getElementById('profile-email');
        if (emailEl && profile.email) {
            emailEl.textContent = profile.email;
        }

        // Update phone
        const phoneEl = document.getElementById('profile-phone');
        if (phoneEl && profile.phone_number) {
            phoneEl.textContent = profile.phone_number;
        }

        // Update department/position in profile info
        const infoItems = document.querySelectorAll('.profile-info-grid .info-item');
        infoItems.forEach(item => {
            const label = item.querySelector('.info-label');
            const value = item.querySelector('.info-value');

            if (label && value) {
                if (label.textContent.includes('Department')) {
                    if (profile.departments && profile.departments.length > 0) {
                        value.textContent = profile.departments.join(', ');
                    } else if (profile.courses_profile && profile.courses_profile.position) {
                        value.textContent = profile.courses_profile.position;
                    }
                } else if (label.textContent.includes('Employee ID')) {
                    // Could add employee_id field to admin_profile if needed
                    value.textContent = `EMP-${profile.id.toString().padStart(5, '0')}`;
                } else if (label.textContent.includes('Joined')) {
                    const joinDate = profile.courses_profile?.joined_date || profile.created_at;
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

        // Update bio from admin_profile
        const bioEl = document.querySelector('.info-description p');
        if (bioEl && profile.bio) {
            bioEl.textContent = profile.bio;
        }
    }

    // ============================================
    // PANEL STATISTICS
    // ============================================

    async function loadPanelStatistics(panelName) {
        try {
            // Special handling for requested panel - use new status-based endpoint
            if (panelName === 'requested') {
                await loadRequestedPanelStats();
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/admin-dashboard/panel-statistics/${panelName}?admin_id=1`);

            if (!response.ok) {
                throw new Error(`Failed to fetch ${panelName} statistics`);
            }

            const statistics = await response.json();
            updatePanelStats(panelName, statistics);

            console.log(`${panelName} panel statistics loaded:`, statistics.length);

        } catch (error) {
            console.error(`Error loading ${panelName} statistics:`, error);
            // Keep fallback hardcoded values on error
        }
    }

    /**
     * Load statistics for Requested Courses Panel using status-based data
     */
    async function loadRequestedPanelStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/course-management/requests/stats/by-status`);

            if (!response.ok) {
                throw new Error('Failed to fetch request statistics');
            }

            const stats = await response.json();

            // Update the requested panel stats with real status-based data
            const requestedPanel = document.querySelector('#requested-panel .dashboard-grid');
            if (!requestedPanel) {
                console.warn('Requested panel stats grid not found');
                return;
            }

            const statCards = requestedPanel.querySelectorAll('.card.p-4');

            // Update each stat card
            if (statCards[0]) { // New Requests
                const valueEl = statCards[0].querySelector('.text-2xl.font-bold');
                if (valueEl) {
                    animateStatUpdate(valueEl, stats.new || 0, 'text-yellow-600');
                }
            }

            if (statCards[1]) { // Under Review
                const valueEl = statCards[1].querySelector('.text-2xl.font-bold');
                if (valueEl) {
                    animateStatUpdate(valueEl, stats.under_review || 0, 'text-blue-600');
                }
            }

            if (statCards[2]) { // Approved Today
                const valueEl = statCards[2].querySelector('.text-2xl.font-bold');
                if (valueEl) {
                    animateStatUpdate(valueEl, stats.approved_today || 0, 'text-green-600');
                }
            }

            if (statCards[3]) { // Rejected (Total)
                const valueEl = statCards[3].querySelector('.text-2xl.font-bold');
                if (valueEl) {
                    animateStatUpdate(valueEl, stats.rejected_total || 0, 'text-red-600');
                }
            }

            console.log('Requested panel stats loaded with status tracking:', stats);

        } catch (error) {
            console.error('Error loading requested panel stats:', error);
        }
    }

    /**
     * Animate stat value update
     */
    function animateStatUpdate(element, newValue, colorClass) {
        element.style.opacity = '0.5';

        setTimeout(() => {
            element.textContent = newValue;
            element.className = 'text-2xl font-bold';
            if (colorClass) {
                element.classList.add(colorClass);
            }
            element.style.transition = 'opacity 0.3s ease';
            element.style.opacity = '1';
        }, 150);
    }

    function updatePanelStats(panelName, statistics) {
        // Find the panel's stats grid
        let panelSelector;
        if (panelName === 'dashboard') {
            panelSelector = '#dashboard-panel .dashboard-grid';
        } else {
            panelSelector = `#${panelName}-panel .dashboard-grid`;
        }

        const statsGrid = document.querySelector(panelSelector);
        if (!statsGrid) {
            console.warn(`Stats grid not found for panel: ${panelName}`);
            return;
        }

        // Get existing stat cards
        const statCards = statsGrid.querySelectorAll('.card.p-4');

        // Update each stat card based on order with smooth animation
        statistics.forEach((stat, index) => {
            if (statCards[index]) {
                const valueEl = statCards[index].querySelector('.text-2xl.font-bold');
                if (valueEl) {
                    // Add fade effect for smooth update
                    valueEl.style.opacity = '0.5';

                    setTimeout(() => {
                        valueEl.textContent = stat.stat_value;

                        // Apply color classes for certain stats
                        valueEl.className = 'text-2xl font-bold';
                        if (stat.stat_key.includes('pending') || stat.stat_key.includes('new_requests')) {
                            valueEl.classList.add('text-yellow-600');
                        } else if (stat.stat_key.includes('rejected')) {
                            valueEl.classList.add('text-red-600');
                        } else if (stat.stat_key.includes('suspended') || stat.stat_key.includes('currently_suspended')) {
                            valueEl.classList.add('text-orange-600');
                        } else if (stat.stat_key.includes('archived')) {
                            valueEl.classList.add('text-gray-600');
                        } else if (stat.stat_key.includes('approved') || stat.stat_key.includes('reconsidered')) {
                            valueEl.classList.add('text-green-600');
                        }

                        // Fade back in
                        valueEl.style.transition = 'opacity 0.3s ease';
                        valueEl.style.opacity = '1';
                    }, 150);
                }
            }
        });
    }

    // ============================================
    // PANEL SWITCHING HANDLER
    // ============================================

    /**
     * Load panel-specific statistics when switching panels
     */
    document.addEventListener('panelChanged', function(event) {
        const panelName = event.detail.panelName;
        console.log(`Panel switched to: ${panelName}`);

        // Load statistics for the new panel
        if (['dashboard', 'verified', 'requested', 'rejected', 'suspended'].includes(panelName)) {
            loadPanelStatistics(panelName);
        }
    });

    // ============================================
    // AUTO-REFRESH
    // ============================================

    /**
     * Auto-refresh dashboard data every 5 minutes
     */
    function startAutoRefresh() {
        setInterval(() => {
            console.log('Auto-refreshing dashboard data...');
            loadAllDashboardData();

            // Also refresh current panel statistics
            const currentPanel = getCurrentActivePanel();
            if (currentPanel && ['dashboard', 'verified', 'requested', 'rejected', 'suspended'].includes(currentPanel)) {
                loadPanelStatistics(currentPanel);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    /**
     * Get the currently active panel
     */
    function getCurrentActivePanel() {
        // Check if panelManager is available
        if (window.panelManager && typeof window.panelManager.getActivePanel === 'function') {
            return window.panelManager.getActivePanel();
        }

        // Fallback: find active panel from DOM
        const activePanel = document.querySelector('.panel-content.active');
        if (activePanel && activePanel.id) {
            return activePanel.id.replace('-panel', '');
        }

        return null;
    }

    // ============================================
    // NOTIFICATION HELPER
    // ============================================

    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-0`;

        // Set color based on type
        switch(type) {
            case 'success':
                notification.className += ' bg-green-500 text-white';
                break;
            case 'warning':
                notification.className += ' bg-yellow-500 text-white';
                break;
            case 'error':
                notification.className += ' bg-red-500 text-white';
                break;
            default:
                notification.className += ' bg-blue-500 text-white';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    document.addEventListener('DOMContentLoaded', function() {
        if (window.location.href.includes('manage-courses.html')) {
            console.log('Initializing Dashboard Data Loader...');

            // Load all data after a brief delay
            setTimeout(() => {
                loadAllDashboardData();
                startAutoRefresh();
            }, 500);
        }
    });

    /**
     * Refresh current panel statistics
     */
    function refreshCurrentPanel() {
        const currentPanel = getCurrentActivePanel();
        if (currentPanel) {
            console.log(`Manually refreshing ${currentPanel} panel statistics...`);

            if (['dashboard', 'verified', 'requested', 'rejected', 'suspended'].includes(currentPanel)) {
                loadPanelStatistics(currentPanel);

                // If dashboard, also refresh widgets
                if (currentPanel === 'dashboard') {
                    loadDailyQuotas();
                    loadAchievements();
                    loadFireStreak();
                }

                showNotification(`${currentPanel.charAt(0).toUpperCase() + currentPanel.slice(1)} statistics refreshed`, 'success');
            }
        }
    }

    /**
     * Refresh all panels statistics in background
     */
    function refreshAllPanels() {
        console.log('Refreshing all panel statistics...');
        const panels = ['dashboard', 'verified', 'requested', 'rejected', 'suspended'];

        panels.forEach(panel => {
            loadPanelStatistics(panel);
        });

        showNotification('All statistics updated', 'success');
    }

    // Expose functions globally if needed
    window.DashboardLoader = {
        loadAll: loadAllDashboardData,
        loadQuotas: loadDailyQuotas,
        loadAchievements: loadAchievements,
        loadStreak: loadFireStreak,
        loadProfile: loadProfileStats,
        loadPanelStats: loadPanelStatistics,
        refreshCurrent: refreshCurrentPanel,
        refreshAll: refreshAllPanels
    };

})();
