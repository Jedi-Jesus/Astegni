// manage-courses-live-widget.js - Live Course Requests Widget Database Integration
// Loads real-time course requests from database into the scrolling widget

(function() {
    'use strict';

    // Use global API_BASE_URL set by api-config.js
    const API_BASE_URL_LOCAL = window.API_BASE_URL || 'http://localhost:8000';
    const REFRESH_INTERVAL = 30000; // Refresh every 30 seconds
    let refreshTimer = null;

    // ============================================
    // DATABASE LOADING FOR LIVE WIDGET
    // ============================================

    /**
     * Load course requests from all tables and display in live widget
     */
    async function loadLiveCourseRequests() {
        try {
            console.log('Loading live course requests for widget...');

            // Fetch from all tables to show mixed statuses (using new dual-database endpoints)
            const [requests, active, rejected, suspended] = await Promise.all([
                fetch(`${API_BASE_URL_LOCAL}/api/admin/courses/pending`).then(r => r.json()).catch(() => ({courses: []})),
                fetch(`${API_BASE_URL_LOCAL}/api/admin/courses/verified`).then(r => r.json()).catch(() => ({courses: []})),
                fetch(`${API_BASE_URL_LOCAL}/api/admin/courses/rejected`).then(r => r.json()).catch(() => ({courses: []})),
                fetch(`${API_BASE_URL_LOCAL}/api/admin/courses/suspended`).then(r => r.json()).catch(() => ({courses: []}))
            ]);

            // Combine all courses with their status
            const allCourses = [];

            // Add pending requests (NEW status)
            if (requests.courses && requests.courses.length > 0) {
                requests.courses.forEach(course => {
                    allCourses.push({
                        ...course,
                        status: 'new',
                        statusLabel: 'NEW',
                        time: course.created_at,
                        id: course.request_id
                    });
                });
            }

            // Add active courses (APPROVED status)
            if (active.courses && active.courses.length > 0) {
                active.courses.slice(0, 3).forEach(course => { // Limit to recent 3
                    allCourses.push({
                        ...course,
                        status: 'approved',
                        statusLabel: 'APPROVED',
                        time: course.approved_at || course.created_at,
                        id: course.course_id
                    });
                });
            }

            // Add rejected courses (REJECTED status)
            if (rejected.courses && rejected.courses.length > 0) {
                rejected.courses.slice(0, 2).forEach(course => { // Limit to recent 2
                    allCourses.push({
                        ...course,
                        status: 'rejected',
                        statusLabel: 'REJECTED',
                        time: course.rejected_at || course.created_at,
                        id: course.rejected_id
                    });
                });
            }

            // Add suspended courses (PENDING status - under review)
            if (suspended.courses && suspended.courses.length > 0) {
                suspended.courses.forEach(course => {
                    allCourses.push({
                        ...course,
                        status: 'pending',
                        statusLabel: 'PENDING',
                        time: course.suspended_at || course.created_at,
                        id: course.suspended_id
                    });
                });
            }

            // Sort by most recent first
            allCourses.sort((a, b) => {
                const timeA = a.time ? new Date(a.time) : new Date(0);
                const timeB = b.time ? new Date(b.time) : new Date(0);
                return timeB - timeA;
            });

            // Update the widget
            updateLiveWidget(allCourses);

            console.log(`Live widget loaded with ${allCourses.length} courses from database`);

        } catch (error) {
            console.error('Error loading live course requests:', error);
            showFallbackWidget();
        }
    }

    /**
     * Update the live widget with course data
     */
    function updateLiveWidget(courses) {
        const scrollContainer = document.querySelector('.course-requests-scroll');
        if (!scrollContainer) {
            console.warn('Live widget scroll container not found');
            return;
        }

        // Clear existing content
        scrollContainer.innerHTML = '';

        if (courses.length === 0) {
            // Show empty state
            scrollContainer.innerHTML = `
                <div class="course-request-item" style="text-align: center; padding: 2rem;">
                    <div class="text-gray-400 mb-2">
                        <i class="fas fa-inbox" style="font-size: 2rem;"></i>
                    </div>
                    <div class="text-sm text-gray-500">No course requests yet</div>
                    <div class="text-xs text-gray-400 mt-1">New requests will appear here</div>
                </div>
            `;
            return;
        }

        // Create items for each course
        courses.forEach(course => {
            const item = createLiveWidgetItem(course);
            scrollContainer.appendChild(item);
        });

        // Duplicate items for seamless infinite scroll (if more than 3 items)
        if (courses.length > 3) {
            courses.forEach(course => {
                const item = createLiveWidgetItem(course);
                scrollContainer.appendChild(item);
            });
        }
    }

    /**
     * Create a single widget item for a course
     */
    function createLiveWidgetItem(course) {
        const div = document.createElement('div');
        div.className = 'course-request-item';

        // Get icon based on category
        const icon = getCategoryIcon(course.category);
        const iconColor = getCategoryColor(course.category);

        // Get status tag HTML
        const statusTag = getStatusTag(course.status, course.statusLabel);

        // Format relative time
        const timeAgo = course.time ? formatRelativeTime(new Date(course.time)) : 'Recently';

        // Get instructor name (requested_by or generate from title)
        const instructor = course.requested_by || generateInstructorName(course.title);

        div.innerHTML = `
            <div class="request-content">
                <div class="request-header">
                    <i class="${icon} ${iconColor}"></i>
                    <span class="course-name">${escapeHtml(truncate(course.title, 25))}</span>
                    ${statusTag}
                </div>
                <div class="request-info">
                    <span class="course-type">${escapeHtml(course.level || 'Various Levels')}</span>
                    <span class="instructor">${escapeHtml(instructor)}</span>
                </div>
                <div class="request-footer">
                    <span class="timestamp">${timeAgo}</span>
                    <button class="action-btn" onclick="viewCourseFromWidget('${escapeHtml(course.id)}')">Review</button>
                </div>
            </div>
        `;

        return div;
    }

    /**
     * Get Font Awesome icon for category
     */
    function getCategoryIcon(category) {
        const icons = {
            'Mathematics': 'fas fa-calculator',
            'Science': 'fas fa-flask',
            'Chemistry': 'fas fa-flask',
            'Biology': 'fas fa-microscope',
            'Physics': 'fas fa-atom',
            'Languages': 'fas fa-language',
            'English': 'fas fa-language',
            'Amharic': 'fas fa-language',
            'Technology': 'fas fa-laptop-code',
            'Computer Science': 'fas fa-laptop-code',
            'Programming': 'fas fa-code',
            'Business': 'fas fa-chart-line',
            'Economics': 'fas fa-chart-line',
            'Arts': 'fas fa-palette',
            'Music': 'fas fa-music',
            'History': 'fas fa-globe-africa',
            'Geography': 'fas fa-map',
            'Literature': 'fas fa-book'
        };

        return icons[category] || 'fas fa-book';
    }

    /**
     * Get color class for category
     */
    function getCategoryColor(category) {
        const colors = {
            'Mathematics': 'text-blue-600',
            'Science': 'text-purple-600',
            'Chemistry': 'text-purple-600',
            'Biology': 'text-indigo-600',
            'Physics': 'text-cyan-600',
            'Languages': 'text-green-600',
            'English': 'text-green-600',
            'Technology': 'text-orange-600',
            'Business': 'text-teal-600',
            'Arts': 'text-pink-600',
            'Music': 'text-pink-600',
            'History': 'text-red-600'
        };

        return colors[category] || 'text-gray-600';
    }

    /**
     * Get status tag HTML
     */
    function getStatusTag(status, label) {
        const tags = {
            'new': `<span class="status-tag new">${label}</span>`,
            'pending': `<span class="status-tag pending">${label}</span>`,
            'approved': `<span class="status-tag approved">${label}</span>`,
            'rejected': `<span class="status-tag rejected">${label}</span>`
        };

        return tags[status] || `<span class="status-tag">${label}</span>`;
    }

    /**
     * Generate instructor name from course title (fallback)
     */
    function generateInstructorName(title) {
        const ethiopianNames = [
            'Dr. Alemayehu', 'Prof. Tigist', 'Mr. Solomon', 'Ms. Marta',
            'Dr. Bekele', 'Ms. Helen', 'Prof. Haile', 'Mr. Daniel'
        ];

        // Use title hash to consistently pick the same name for the same course
        const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return ethiopianNames[hash % ethiopianNames.length];
    }

    /**
     * Truncate text to max length
     */
    function truncate(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Format relative time (e.g., "2 minutes ago")
     */
    function formatRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    /**
     * Show fallback widget with message
     */
    function showFallbackWidget() {
        const scrollContainer = document.querySelector('.course-requests-scroll');
        if (!scrollContainer) return;

        scrollContainer.innerHTML = `
            <div class="course-request-item" style="text-align: center; padding: 2rem;">
                <div class="text-gray-400 mb-2">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i>
                </div>
                <div class="text-sm text-gray-500">Unable to load courses</div>
                <div class="text-xs text-gray-400 mt-1">Check backend connection</div>
            </div>
        `;
    }

    /**
     * View course from widget (redirect to appropriate view)
     */
    window.viewCourseFromWidget = function(courseId) {
        console.log('Viewing course from widget:', courseId);

        // Determine which function to call based on ID prefix
        if (courseId.startsWith('REQ-CRS-')) {
            // Pending request
            if (typeof window.viewCourseRequest === 'function') {
                window.switchPanel('requested'); // Switch to requests panel
                setTimeout(() => window.viewCourseRequest(courseId), 300);
            }
        } else if (courseId.startsWith('CRS-')) {
            // Active course
            if (typeof window.viewCourse === 'function') {
                window.switchPanel('verified'); // Switch to active panel
                setTimeout(() => window.viewCourse(courseId), 300);
            }
        } else if (courseId.startsWith('REJ-CRS-')) {
            // Rejected course
            if (typeof window.viewCourseRequest === 'function') {
                window.switchPanel('rejected'); // Switch to rejected panel
                setTimeout(() => window.viewCourseRequest(courseId), 300);
            }
        } else if (courseId.startsWith('SUS-CRS-')) {
            // Suspended course
            if (typeof window.viewCourse === 'function') {
                window.switchPanel('suspended'); // Switch to suspended panel
                setTimeout(() => window.viewCourse(courseId), 300);
            }
        }
    };

    /**
     * Start auto-refresh timer
     */
    function startAutoRefresh() {
        // Clear existing timer
        if (refreshTimer) {
            clearInterval(refreshTimer);
        }

        // Set new timer
        refreshTimer = setInterval(() => {
            console.log('Auto-refreshing live widget...');
            loadLiveCourseRequests();
        }, REFRESH_INTERVAL);
    }

    /**
     * Stop auto-refresh timer
     */
    function stopAutoRefresh() {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    // Auto-load widget data on page load
    document.addEventListener('DOMContentLoaded', function() {
        if (window.location.href.includes('manage-courses.html')) {
            console.log('Initializing Live Course Requests Widget from Database...');

            // Initial load after brief delay
            setTimeout(() => {
                loadLiveCourseRequests();
                startAutoRefresh();
            }, 1000);

            // Stop auto-refresh when page is hidden (performance optimization)
            document.addEventListener('visibilitychange', function() {
                if (document.hidden) {
                    stopAutoRefresh();
                } else {
                    loadLiveCourseRequests();
                    startAutoRefresh();
                }
            });
        }
    });

    // Expose functions globally
    window.LiveCourseWidget = {
        load: loadLiveCourseRequests,
        startAutoRefresh: startAutoRefresh,
        stopAutoRefresh: stopAutoRefresh
    };

})();
