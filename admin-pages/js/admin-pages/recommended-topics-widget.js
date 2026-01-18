/**
 * Recommended Topics Widget Loader
 * Fetches and displays recommended topics from courses and schools
 */

class RecommendedTopicsWidget {
    constructor(containerId = 'recommended-topics-widget') {
        this.containerId = containerId;
        this.apiBaseUrl = window.location.hostname === 'astegni.com' || window.location.hostname === 'www.astegni.com'
            ? 'https://api.astegni.com'
            : 'http://localhost:8000';
    }

    /**
     * Initialize the widget
     */
    async init() {
        await this.loadRecommendedTopics();
    }

    /**
     * Fetch recommended topics from API
     */
    async loadRecommendedTopics() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`Recommended topics widget container not found: ${this.containerId}`);
            return;
        }

        try {
            // Show loading state
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-spinner fa-spin text-2xl mb-2 text-blue-500"></i>
                    <p class="text-sm text-gray-500">Loading topics...</p>
                </div>
            `;

            const response = await fetch(`${this.apiBaseUrl}/api/admin/recommended-topics?limit=10`);

            if (!response.ok) {
                throw new Error(`Failed to fetch topics: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.topics && data.topics.length > 0) {
                this.renderTopics(data.topics, container);
            } else {
                this.renderEmptyState(container);
            }
        } catch (error) {
            console.error('Error loading recommended topics:', error);
            this.renderErrorState(container, error.message);
        }
    }

    /**
     * Render topics list - courses first (prominent), then schools (compact)
     */
    renderTopics(topics, container) {
        // Separate courses and schools
        const courses = topics.filter(t => t.type === 'course');
        const schools = topics.filter(t => t.type === 'school');

        let html = '';

        // Render courses first (larger, more prominent)
        if (courses.length > 0) {
            html += '<div class="courses-section mb-4">';
            courses.forEach((topic, index) => {
                const ratingStars = this.generateStars(topic.rating);
                html += `
                    <div class="topic-item course-item p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer mb-2 border border-blue-200 dark:border-blue-800"
                         data-topic="${topic.name}"
                         data-type="course">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-2xl">📚</span>
                                    <h4 class="font-bold text-base text-gray-800 dark:text-gray-200">${topic.name}</h4>
                                </div>
                                <div class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    <span class="px-2 py-0.5 bg-blue-500 text-white rounded font-medium">
                                        Course
                                    </span>
                                    <span class="font-semibold">${topic.count.toLocaleString()} students</span>
                                </div>
                                ${topic.rating > 0 ? `
                                    <div class="flex items-center gap-1">
                                        <div class="flex text-yellow-400 text-sm">
                                            ${ratingStars}
                                        </div>
                                        <span class="text-xs text-gray-600 dark:text-gray-400 font-medium">${topic.rating}</span>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="text-2xl font-bold text-blue-200 dark:text-blue-800">
                                #${index + 1}
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Render schools (compact, below courses)
        if (schools.length > 0) {
            html += '<div class="schools-section">';
            html += '<div class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Schools</div>';
            schools.forEach((topic, index) => {
                const ratingStars = this.generateStars(topic.rating);
                html += `
                    <div class="topic-item school-item p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer mb-1"
                         data-topic="${topic.name}"
                         data-type="school">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2 flex-1">
                                <span class="text-lg">🏫</span>
                                <div class="flex-1">
                                    <h5 class="font-semibold text-xs text-gray-700 dark:text-gray-300">${topic.name}</h5>
                                    <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span>${topic.count.toLocaleString()} students</span>
                                        ${topic.rating > 0 ? `
                                            <span class="flex items-center gap-1">
                                                <div class="flex text-yellow-400" style="font-size: 10px;">
                                                    ${ratingStars}
                                                </div>
                                                <span>${topic.rating}</span>
                                            </span>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="text-sm font-bold text-gray-300 dark:text-gray-600">
                                #${index + 1}
                            </div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Show message if no topics
        if (courses.length === 0 && schools.length === 0) {
            html = '<div class="text-center py-4 text-gray-500 text-sm">No topics available</div>';
        }

        container.innerHTML = html;

        // Add click handlers
        container.querySelectorAll('.topic-item').forEach(item => {
            item.addEventListener('click', () => {
                const topicName = item.dataset.topic;
                const topicType = item.dataset.type;
                this.onTopicClick(topicName, topicType);
            });
        });
    }

    /**
     * Generate star rating HTML
     */
    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        return stars;
    }

    /**
     * Render empty state
     */
    renderEmptyState(container) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-inbox text-4xl text-gray-300 mb-2"></i>
                <p class="text-sm text-gray-500">No topics available</p>
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderErrorState(container, errorMessage) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-2"></i>
                <p class="text-sm text-red-600">Failed to load topics</p>
                <p class="text-xs text-gray-500 mt-1">${errorMessage}</p>
                <button onclick="recommendedTopicsWidget.loadRecommendedTopics()"
                        class="mt-3 px-4 py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600">
                    Retry
                </button>
            </div>
        `;
    }

    /**
     * Handle topic click
     */
    onTopicClick(topicName, topicType) {
        console.log(`Topic clicked: ${topicName} (${topicType})`);

        // Check if we're in admin pages or user pages
        const isAdminPage = window.location.pathname.includes('admin-pages');
        const isProfilePage = window.location.pathname.includes('profile-pages');

        // Navigate to appropriate page based on type and context
        if (topicType === 'course') {
            if (isAdminPage) {
                // Admin: Navigate to manage courses page with filter
                window.location.href = `manage-courses.html?category=${encodeURIComponent(topicName)}`;
            } else {
                // User: Navigate to find-tutors page (courses are taught by tutors)
                const basePath = isProfilePage ? '../branch/' : '/branch/';
                window.location.href = `${basePath}find-tutors.html?subject=${encodeURIComponent(topicName)}`;
            }
        } else if (topicType === 'school') {
            if (isAdminPage) {
                // Admin: Navigate to manage schools page with filter
                window.location.href = `manage-schools.html?level=${encodeURIComponent(topicName)}`;
            } else {
                // User: Navigate to find-tutors page filtered by school level
                const basePath = isProfilePage ? '../branch/' : '/branch/';
                window.location.href = `${basePath}find-tutors.html?school_level=${encodeURIComponent(topicName)}`;
            }
        }
    }
}

// Global instance
let recommendedTopicsWidget;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('recommended-topics-widget');
    if (container) {
        recommendedTopicsWidget = new RecommendedTopicsWidget();
        recommendedTopicsWidget.init();
    }
});
