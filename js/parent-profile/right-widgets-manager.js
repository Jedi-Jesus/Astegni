// ============================================
// PARENT PROFILE RIGHT WIDGETS MANAGER
// ============================================
// Manages all right sidebar widgets for parent profile
// including children's progress, upcoming meetings, etc.

class ParentRightWidgetsManager {
    constructor() {
        this.API_BASE_URL = 'http://localhost:8000';
        this.user = null;
        this.childrenProgressData = null;
        this.tutorCarouselInterval = null; // Store carousel interval
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    async initialize() {
        console.log('[ParentRightWidgets] Initializing...');

        try {
            // Get current user from AuthManager
            if (window.AuthManager && window.AuthManager.user) {
                this.user = window.AuthManager.user;
                console.log('[ParentRightWidgets] User loaded:', this.user);
            } else {
                console.warn('[ParentRightWidgets] No user found in AuthManager');
                return;
            }

            // Initialize all widgets
            await this.initializeAllWidgets();

            console.log('[ParentRightWidgets] Initialization complete');
        } catch (error) {
            console.error('[ParentRightWidgets] Initialization error:', error);
        }
    }

    async initializeAllWidgets() {
        // Initialize Children's Progress Widget
        await this.initializeProgressWidget();

        // Initialize This Week's Schedule Widget
        await this.initializeWeekScheduleWidget();

        // Initialize Trending Tutors Widget (if exists)
        this.initializeTrendingTutorsWidget();
    }

    // ============================================
    // CHILDREN'S PROGRESS WIDGET
    // ============================================

    async initializeProgressWidget() {
        console.log('[ParentRightWidgets] Initializing Children Progress Widget...');

        const widget = document.getElementById('children-progress-widget');
        if (!widget) {
            console.warn('[ParentRightWidgets] Children progress widget not found');
            return;
        }

        // For now, just show the coming soon state
        // When the feature is ready, uncomment the following line:
        // await this.loadChildrenProgress();

        this.showProgressComingSoon();
    }

    async loadChildrenProgress() {
        try {
            // Show loading state
            this.showProgressLoading();

            // Get token from localStorage
            const token = localStorage.getItem('access_token');
            if (!token) {
                console.error('[ParentRightWidgets] No access token found');
                this.showProgressError('Please log in to view progress data');
                return;
            }

            // Fetch children's progress data from API
            // This endpoint doesn't exist yet - it will be implemented when progress tracking is ready
            const response = await fetch(`${this.API_BASE_URL}/api/parent/children-progress`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.childrenProgressData = data;

            // Display progress data
            this.displayProgressData(data);

        } catch (error) {
            console.error('[ParentRightWidgets] Error loading children progress:', error);
            this.showProgressError('Unable to load progress data');
        }
    }

    showProgressLoading() {
        this.hideAllProgressStates();
        const loadingState = document.getElementById('progress-loading-state');
        if (loadingState) {
            loadingState.classList.remove('hidden');
        }
    }

    showProgressComingSoon() {
        this.hideAllProgressStates();
        const comingSoonState = document.getElementById('progress-coming-soon-state');
        if (comingSoonState) {
            comingSoonState.classList.remove('hidden');
        }
    }

    showProgressError(message = 'Unable to load progress data') {
        this.hideAllProgressStates();
        const errorState = document.getElementById('progress-error-state');
        if (errorState) {
            errorState.classList.remove('hidden');
            const errorMessage = errorState.querySelector('p');
            if (errorMessage) {
                errorMessage.textContent = message;
            }
        }
    }

    hideAllProgressStates() {
        const states = [
            'progress-loading-state',
            'progress-coming-soon-state',
            'progress-data-state',
            'progress-error-state'
        ];

        states.forEach(stateId => {
            const element = document.getElementById(stateId);
            if (element) {
                element.classList.add('hidden');
            }
        });
    }

    displayProgressData(data) {
        this.hideAllProgressStates();

        const dataState = document.getElementById('progress-data-state');
        if (!dataState) return;

        // Clear existing content
        dataState.innerHTML = '';

        // Check if there are children
        if (!data.children || data.children.length === 0) {
            dataState.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem;">
                    <i class="fas fa-user-plus" style="font-size: 2.5rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">
                        No children added yet
                    </p>
                </div>
            `;
            dataState.classList.remove('hidden');
            return;
        }

        // Display each child's progress
        data.children.forEach((child, index) => {
            const progressColor = this.getProgressColor(child.progress);
            const childElement = document.createElement('div');
            childElement.className = 'space-y-2';
            childElement.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="text-sm" style="color: var(--text-secondary);">
                        ${this.escapeHtml(child.name)} - Overall
                    </span>
                    <span class="font-semibold" style="color: ${progressColor};">
                        ${child.progress}%
                    </span>
                </div>
                <div class="w-full rounded-full h-2" style="background: var(--bg-secondary);">
                    <div class="h-2 rounded-full" style="width: ${child.progress}%; background: ${progressColor}; transition: width 0.5s ease;"></div>
                </div>
            `;
            dataState.appendChild(childElement);
        });

        // Display family average if available
        if (data.familyAverage !== undefined) {
            const avgColor = this.getProgressColor(data.familyAverage);
            const avgElement = document.createElement('div');
            avgElement.className = 'space-y-2 pt-2';
            avgElement.style.borderTop = '1px solid var(--border)';
            avgElement.style.marginTop = '0.75rem';
            avgElement.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="text-sm font-semibold" style="color: var(--heading);">
                        Family Average
                    </span>
                    <span class="font-semibold" style="color: ${avgColor};">
                        ${data.familyAverage}%
                    </span>
                </div>
                <div class="w-full rounded-full h-2" style="background: var(--bg-secondary);">
                    <div class="h-2 rounded-full" style="width: ${data.familyAverage}%; background: ${avgColor}; transition: width 0.5s ease;"></div>
                </div>
            `;
            dataState.appendChild(avgElement);
        }

        dataState.classList.remove('hidden');
    }

    getProgressColor(progress) {
        if (progress >= 90) return '#10B981'; // green
        if (progress >= 75) return '#3B82F6'; // blue
        if (progress >= 60) return '#F59E0B'; // orange
        return '#EF4444'; // red
    }

    // ============================================
    // THIS WEEK'S SCHEDULE WIDGET
    // ============================================

    async initializeWeekScheduleWidget() {
        console.log('[ParentRightWidgets] Initializing This Week\'s Schedule Widget...');

        const widget = document.getElementById('this-week-schedule-widget');
        if (!widget) {
            console.warn('[ParentRightWidgets] Week schedule widget not found');
            return;
        }

        // Load this week's schedule and sessions
        await this.loadThisWeekSchedule();
    }

    async loadThisWeekSchedule() {
        try {
            // Show loading state
            this.showWeekScheduleLoading();

            // Get token from localStorage
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');
            if (!token) {
                console.error('[ParentRightWidgets] No access token found');
                this.showWeekScheduleEmpty();
                return;
            }

            // Fetch schedules and sessions from API
            const [schedulesRes, sessionsRes] = await Promise.allSettled([
                fetch(`${this.API_BASE_URL}/api/schedules`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                fetch(`${this.API_BASE_URL}/api/parent/sessions`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);

            let schedules = [];
            let sessions = [];

            // Process schedules response
            if (schedulesRes.status === 'fulfilled' && schedulesRes.value.ok) {
                schedules = await schedulesRes.value.json();
                console.log('[ParentRightWidgets] Loaded schedules:', schedules.length);
            }

            // Process sessions response
            if (sessionsRes.status === 'fulfilled' && sessionsRes.value.ok) {
                sessions = await sessionsRes.value.json();
                console.log('[ParentRightWidgets] Loaded sessions:', sessions.length);
            }

            // Filter to only this week's items
            const thisWeekItems = this.filterThisWeekItems([...schedules, ...sessions]);

            console.log('[ParentRightWidgets] This week items:', thisWeekItems.length);

            // Display the items
            if (thisWeekItems.length === 0) {
                this.showWeekScheduleEmpty();
            } else {
                this.displayWeekScheduleData(thisWeekItems);
            }

        } catch (error) {
            console.error('[ParentRightWidgets] Error loading week schedule:', error);
            this.showWeekScheduleError();
        }
    }

    filterThisWeekItems(items) {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7); // End of week
        endOfWeek.setHours(23, 59, 59, 999);

        return items.filter(item => {
            // Check if item has a date field (schedule or session)
            let itemDate = null;

            // For schedules, check start_time or scheduled_date
            if (item.start_time) {
                itemDate = new Date(item.start_time);
            } else if (item.scheduled_date) {
                itemDate = new Date(item.scheduled_date);
            } else if (item.date) {
                itemDate = new Date(item.date);
            } else if (item.start_date) {
                itemDate = new Date(item.start_date);
            }

            // Check if date is within this week
            if (itemDate) {
                return itemDate >= startOfWeek && itemDate <= endOfWeek;
            }

            return false;
        }).sort((a, b) => {
            // Sort by date ascending
            const dateA = new Date(a.start_time || a.scheduled_date || a.date || a.start_date);
            const dateB = new Date(b.start_time || b.scheduled_date || b.date || b.start_date);
            return dateA - dateB;
        });
    }

    showWeekScheduleLoading() {
        this.hideAllWeekScheduleStates();
        const loadingState = document.getElementById('week-schedule-loading');
        if (loadingState) {
            loadingState.classList.remove('hidden');
        }
    }

    showWeekScheduleEmpty() {
        this.hideAllWeekScheduleStates();
        const emptyState = document.getElementById('week-schedule-empty');
        if (emptyState) {
            emptyState.classList.remove('hidden');
        }

        // Hide view all button
        const viewAllBtn = document.getElementById('view-all-schedule-btn');
        if (viewAllBtn) {
            viewAllBtn.classList.add('hidden');
        }

        // Update count badge
        const countBadge = document.getElementById('week-item-count');
        if (countBadge) {
            countBadge.textContent = '0';
        }
    }

    showWeekScheduleError() {
        this.hideAllWeekScheduleStates();
        const errorState = document.getElementById('week-schedule-error');
        if (errorState) {
            errorState.classList.remove('hidden');
        }
    }

    hideAllWeekScheduleStates() {
        const states = [
            'week-schedule-loading',
            'week-schedule-empty',
            'week-schedule-data',
            'week-schedule-error'
        ];

        states.forEach(stateId => {
            const element = document.getElementById(stateId);
            if (element) {
                element.classList.add('hidden');
            }
        });
    }

    displayWeekScheduleData(items) {
        this.hideAllWeekScheduleStates();

        const dataContainer = document.getElementById('week-schedule-data');
        if (!dataContainer) return;

        // Clear existing content
        dataContainer.innerHTML = '';

        // Limit to 5 items max
        const displayItems = items.slice(0, 5);

        displayItems.forEach(item => {
            const itemElement = this.createWeekScheduleItem(item);
            dataContainer.appendChild(itemElement);
        });

        dataContainer.classList.remove('hidden');

        // Update count badge
        const countBadge = document.getElementById('week-item-count');
        if (countBadge) {
            countBadge.textContent = items.length.toString();
        }

        // Show view all button if there are more items
        const viewAllBtn = document.getElementById('view-all-schedule-btn');
        if (viewAllBtn && items.length > 0) {
            viewAllBtn.classList.remove('hidden');
        }
    }

    createWeekScheduleItem(item) {
        const itemElement = document.createElement('div');
        itemElement.className = 'week-schedule-item';

        // Determine if it's a schedule or session
        const isSession = item.hasOwnProperty('session_id') || item.hasOwnProperty('completed_at');

        // Get date and time
        const itemDate = new Date(item.start_time || item.scheduled_date || item.date || item.start_date);
        const dayOfWeek = this.getDayOfWeek(itemDate);
        const timeStr = this.formatTime(itemDate);

        // Get title and description
        const title = item.title || item.subject || item.course || 'Untitled';
        const description = item.description || item.notes || '';

        // Determine color based on day or status
        const colorClass = this.getScheduleItemColor(itemDate);

        itemElement.innerHTML = `
            <div class="p-3 rounded-lg transition-all cursor-pointer hover:shadow-md"
                 style="background: ${colorClass}; border-left: 4px solid var(--primary-color);">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-sm font-semibold" style="color: var(--heading);">
                        ${this.escapeHtml(title)}
                    </span>
                    <span class="text-xs" style="color: var(--text-secondary);">${dayOfWeek}</span>
                </div>
                <div class="text-xs" style="color: var(--text-secondary);">
                    <i class="fas fa-clock" style="margin-right: 0.25rem;"></i>
                    ${timeStr}
                    ${isSession ? '<span style="margin-left: 0.5rem; padding: 0.125rem 0.375rem; background: var(--success); color: white; border-radius: 4px; font-size: 0.65rem;">Session</span>' : ''}
                </div>
                ${description ? `<div class="text-xs mt-1" style="color: var(--text-secondary);">${this.escapeHtml(description)}</div>` : ''}
            </div>
        `;

        return itemElement;
    }

    getDayOfWeek(date) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Check if today
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        }
        // Check if tomorrow
        if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        }

        // Return day name
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    }

    formatTime(date) {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutesStr} ${ampm}`;
    }

    getScheduleItemColor(date) {
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();

        if (isToday) {
            return 'rgba(59, 130, 246, 0.1)'; // Blue tint for today
        } else {
            return 'var(--bg-secondary)'; // Default background
        }
    }

    // ============================================
    // TRENDING TUTORS WIDGET
    // ============================================

    async initializeTrendingTutorsWidget() {
        console.log('[ParentRightWidgets] Initializing Trending Tutors Widget...');

        const widget = document.getElementById('trending-tutors-widget');
        if (!widget) {
            console.warn('[ParentRightWidgets] Trending tutors widget not found');
            return;
        }

        // Load top score tutors
        await this.loadTrendingTutors();
    }

    async loadTrendingTutors() {
        try {
            // Show loading state
            this.showTrendingTutorsLoading();

            // Get token from localStorage
            const token = localStorage.getItem('access_token') || localStorage.getItem('token');

            // Fetch tutors from API (sorted by score/rating)
            const response = await fetch(`${this.API_BASE_URL}/api/tutors?page=1&limit=10`, {
                method: 'GET',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : undefined,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const tutors = data.tutors || [];  // Extract tutors array from response object
            console.log('[ParentRightWidgets] Loaded tutors:', tutors.length);

            // Sort tutors by rating (highest first)
            const sortedTutors = tutors.sort((a, b) => (b.rating || 0) - (a.rating || 0));

            // Get top 6 tutors
            const topTutors = sortedTutors.slice(0, 6);

            // Display the tutors
            if (topTutors.length === 0) {
                this.showTrendingTutorsEmpty();
            } else {
                this.displayTrendingTutors(topTutors);
            }

        } catch (error) {
            console.error('[ParentRightWidgets] Error loading trending tutors:', error);
            this.showTrendingTutorsError();
        }
    }

    showTrendingTutorsLoading() {
        this.hideAllTrendingTutorsStates();
        const loadingState = document.getElementById('trending-tutors-loading');
        if (loadingState) {
            loadingState.classList.remove('hidden');
        }
    }

    showTrendingTutorsEmpty() {
        this.hideAllTrendingTutorsStates();
        const emptyState = document.getElementById('trending-tutors-empty');
        if (emptyState) {
            emptyState.classList.remove('hidden');
        }

        // Update count badge
        const countBadge = document.getElementById('trending-tutors-count');
        if (countBadge) {
            countBadge.textContent = '0';
        }

        // Hide explore button
        const exploreBtn = document.getElementById('explore-more-tutors-btn');
        if (exploreBtn) {
            exploreBtn.classList.add('hidden');
        }
    }

    showTrendingTutorsError() {
        this.hideAllTrendingTutorsStates();
        const errorState = document.getElementById('trending-tutors-error');
        if (errorState) {
            errorState.classList.remove('hidden');
        }
    }

    hideAllTrendingTutorsStates() {
        const states = [
            'trending-tutors-loading',
            'trending-tutors-empty',
            'trending-tutors-data',
            'trending-tutors-error'
        ];

        states.forEach(stateId => {
            const element = document.getElementById(stateId);
            if (element) {
                element.classList.add('hidden');
            }
        });
    }

    displayTrendingTutors(tutors) {
        this.hideAllTrendingTutorsStates();

        const dataContainer = document.getElementById('trending-tutors-data');
        if (!dataContainer) return;

        // Clear existing content
        dataContainer.innerHTML = '';

        // Create tutor cards with fade animation
        tutors.forEach((tutor, index) => {
            const tutorCard = this.createTrendingTutorCard(tutor, index);
            dataContainer.appendChild(tutorCard);
        });

        dataContainer.classList.remove('hidden');

        // Update count badge
        const countBadge = document.getElementById('trending-tutors-count');
        if (countBadge) {
            countBadge.textContent = tutors.length.toString();
        }

        // Show explore button
        const exploreBtn = document.getElementById('explore-more-tutors-btn');
        if (exploreBtn) {
            exploreBtn.classList.remove('hidden');
        }

        // Start carousel animation
        this.startTutorCarousel(tutors.length);
    }

    createTrendingTutorCard(tutor, index) {
        const tutorElement = document.createElement('div');
        tutorElement.className = 'trending-tutor-card';
        tutorElement.style.cssText = `
            position: absolute;
            width: 100%;
            opacity: ${index === 0 ? 1 : 0};
            transition: opacity 0.6s ease-in-out;
            ${index === 0 ? '' : 'pointer-events: none;'}
        `;
        tutorElement.setAttribute('data-index', index);

        // Get tutor name
        let tutorName;
        if (tutor.full_name) {
            tutorName = tutor.full_name;
        } else if (tutor.last_name) {
            tutorName = `${tutor.first_name || 'Unknown'} ${tutor.last_name}`.trim();
        } else {
            tutorName = `${tutor.first_name || 'Unknown'} ${tutor.father_name || 'Tutor'}`.trim();
        }

        // Get profile picture
        const profilePicture = tutor.profile_picture || this.getDefaultAvatar(tutor.first_name || tutorName);

        // Get rating
        const rating = tutor.rating !== undefined && tutor.rating !== null
            ? parseFloat(tutor.rating).toFixed(1)
            : '0.0';

        // Get subject (first course or default)
        const subject = Array.isArray(tutor.courses) && tutor.courses.length > 0
            ? tutor.courses[0]
            : 'Tutor';

        // Generate stars
        const stars = this.generateStars(parseFloat(rating));

        tutorElement.innerHTML = `
            <div class="flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer"
                 style="background: var(--bg-secondary); hover:background: var(--card-bg);"
                 onclick="window.location.href='../view-profiles/view-tutor.html?id=${tutor.id}'">
                <img src="${this.escapeHtml(profilePicture)}"
                     alt="${this.escapeHtml(tutorName)}"
                     class="w-12 h-12 rounded-full object-cover"
                     style="border: 2px solid var(--border);"
                     onerror="this.src='../uploads/system_images/system_profile_pictures/default-avatar.jpg'">
                <div class="flex-1" style="min-width: 0;">
                    <p class="font-semibold text-sm truncate" style="color: var(--heading);">
                        ${this.escapeHtml(tutorName)}
                    </p>
                    <div style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem;">
                        <span style="color: #FFC107;">${stars}</span>
                        <span style="color: var(--text-secondary);">${rating}</span>
                        <span style="color: var(--text-secondary);">•</span>
                        <span style="color: var(--text-secondary);" class="truncate">${this.escapeHtml(subject)}</span>
                    </div>
                </div>
                <button class="px-3 py-1 text-xs font-semibold rounded transition-colors"
                        style="background: var(--primary-color); color: white; border: none; cursor: pointer;"
                        onclick="event.stopPropagation(); window.location.href='../view-profiles/view-tutor.html?id=${tutor.id}'">
                    View
                </button>
            </div>
        `;

        return tutorElement;
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        return '★'.repeat(fullStars) +
               (hasHalfStar ? '☆' : '') +
               '☆'.repeat(emptyStars);
    }

    startTutorCarousel(tutorCount) {
        // Clear any existing interval
        if (this.tutorCarouselInterval) {
            clearInterval(this.tutorCarouselInterval);
        }

        if (tutorCount <= 1) return; // No carousel needed for 1 or 0 tutors

        let currentIndex = 0;

        this.tutorCarouselInterval = setInterval(() => {
            const dataContainer = document.getElementById('trending-tutors-data');
            if (!dataContainer) {
                clearInterval(this.tutorCarouselInterval);
                return;
            }

            const cards = dataContainer.querySelectorAll('.trending-tutor-card');
            if (cards.length === 0) {
                clearInterval(this.tutorCarouselInterval);
                return;
            }

            // Fade out current card
            const currentCard = cards[currentIndex];
            if (currentCard) {
                currentCard.style.opacity = '0';
                currentCard.style.pointerEvents = 'none';
            }

            // Move to next card
            currentIndex = (currentIndex + 1) % tutorCount;

            // Fade in next card
            const nextCard = cards[currentIndex];
            if (nextCard) {
                nextCard.style.opacity = '1';
                nextCard.style.pointerEvents = 'auto';
            }
        }, 5000); // Change every 5 seconds
    }

    getDefaultAvatar(name) {
        // Generate a default avatar based on first letter
        const firstLetter = (name || 'U').charAt(0).toUpperCase();
        return `https://ui-avatars.com/api/?name=${firstLetter}&background=8B5CF6&color=fff&size=128`;
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// ============================================
// GLOBAL FUNCTIONS
// ============================================

window.loadChildrenProgress = async function() {
    if (window.parentRightWidgetsManager) {
        await window.parentRightWidgetsManager.loadChildrenProgress();
    }
};

window.loadThisWeekSchedule = async function() {
    if (window.parentRightWidgetsManager) {
        await window.parentRightWidgetsManager.loadThisWeekSchedule();
    }
};

window.switchToSchedulePanel = function() {
    // Switch to the schedule panel
    if (typeof switchPanel === 'function') {
        switchPanel('schedules');
    } else if (window.panelManager && typeof window.panelManager.switchPanel === 'function') {
        window.panelManager.switchPanel('schedules');
    } else {
        console.warn('[ParentRightWidgets] Panel switching function not found');
    }
};

window.loadTrendingTutors = async function() {
    if (window.parentRightWidgetsManager) {
        await window.parentRightWidgetsManager.loadTrendingTutors();
    }
};

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.parentRightWidgetsManager && window.parentRightWidgetsManager.tutorCarouselInterval) {
        clearInterval(window.parentRightWidgetsManager.tutorCarouselInterval);
    }
});

// ============================================
// AUTO-INITIALIZATION
// ============================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[ParentRightWidgets] DOM loaded, creating manager...');
        window.parentRightWidgetsManager = new ParentRightWidgetsManager();
        window.parentRightWidgetsManager.initialize();
    });
} else {
    console.log('[ParentRightWidgets] DOM already loaded, creating manager immediately...');
    window.parentRightWidgetsManager = new ParentRightWidgetsManager();
    window.parentRightWidgetsManager.initialize();
}

console.log('[ParentRightWidgets] Manager script loaded');
