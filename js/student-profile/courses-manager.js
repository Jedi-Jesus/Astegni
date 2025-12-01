// ============================================
// STUDENT COURSES MANAGER
// Manages My Courses panel - loading, filtering, and displaying enrolled courses
// ============================================

const StudentCoursesManager = {
    courses: [],
    filteredCourses: [],
    currentFilter: 'all',
    currentSearchQuery: '',
    isLoading: false,

    // Initialize the courses manager
    async init() {
        console.log('📚 Initializing StudentCoursesManager...');
        this.setupFilterListeners();
        await this.loadCourses();
    },

    // Setup filter chip click listeners
    setupFilterListeners() {
        const filterChips = document.querySelectorAll('#my-courses-panel .filter-chip');
        filterChips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                // Remove active class from all chips
                filterChips.forEach(c => c.classList.remove('active'));
                // Add active class to clicked chip
                e.target.classList.add('active');

                // Get filter value from chip text
                const filterText = e.target.textContent.trim().toLowerCase();
                let filterValue = 'all';

                if (filterText.includes('active')) {
                    filterValue = 'active';
                } else if (filterText.includes('completed')) {
                    filterValue = 'completed';
                } else if (filterText.includes('upcoming')) {
                    filterValue = 'upcoming';
                }

                this.currentFilter = filterValue;
                this.loadCourses(filterValue);
            });
        });
    },

    // Live search courses (client-side filtering)
    searchCourses(query) {
        this.currentSearchQuery = query.toLowerCase().trim();
        this.applyFilters();
    },

    // Apply both status filter and search query
    applyFilters() {
        if (!this.currentSearchQuery) {
            this.filteredCourses = [...this.courses];
        } else {
            this.filteredCourses = this.courses.filter(course => {
                const searchFields = [
                    course.course_title,
                    course.tutor_name,
                    course.tutor_username,
                    course.course_category,
                    course.course_level,
                    course.package_name,
                    course.status
                ].filter(Boolean).map(f => f.toLowerCase());

                return searchFields.some(field => field.includes(this.currentSearchQuery));
            });
        }

        // Update search count
        this.updateSearchCount();

        // Render filtered courses
        this.renderCourses();
    },

    // Update search result count
    updateSearchCount() {
        const countEl = document.getElementById('courses-search-count');
        if (!countEl) return;

        if (this.currentSearchQuery) {
            countEl.textContent = `${this.filteredCourses.length} of ${this.courses.length}`;
            countEl.classList.remove('hidden');
        } else {
            countEl.classList.add('hidden');
        }
    },

    // Load courses from API
    async loadCourses(status = null) {
        if (this.isLoading) return;

        this.isLoading = true;
        const coursesGrid = document.getElementById('courses-grid');

        if (!coursesGrid) {
            console.warn('courses-grid element not found');
            this.isLoading = false;
            return;
        }

        // Show loading state
        coursesGrid.innerHTML = `
            <div class="flex items-center justify-center py-12 col-span-full">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p class="text-gray-600 dark:text-gray-400">Loading your courses...</p>
                </div>
            </div>
        `;

        try {
            const response = await StudentProfileAPI.getEnrolledCourses(status);
            this.courses = response.courses || [];
            this.filteredCourses = [...this.courses];

            // Clear search input when loading new data
            const searchInput = document.getElementById('courses-search-input');
            if (searchInput) searchInput.value = '';
            this.currentSearchQuery = '';

            console.log(`📚 Loaded ${this.courses.length} courses`);
            this.updateSearchCount();
            this.renderCourses();
        } catch (error) {
            console.error('Error loading courses:', error);
            coursesGrid.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <p class="text-red-500">Failed to load courses. Please try again.</p>
                    <button onclick="StudentCoursesManager.loadCourses('${status || ''}')"
                            class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        Retry
                    </button>
                </div>
            `;
        } finally {
            this.isLoading = false;
        }
    },

    // Render courses to the grid
    renderCourses() {
        const coursesGrid = document.getElementById('courses-grid');

        if (!coursesGrid) return;

        // Use filteredCourses for display
        const coursesToDisplay = this.filteredCourses;

        if (this.courses.length === 0) {
            coursesGrid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-6xl mb-4">📚</div>
                    <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Courses Found</h3>
                    <p class="text-gray-500 dark:text-gray-400 mb-4">
                        ${this.currentFilter === 'all'
                            ? "You haven't enrolled in any courses yet."
                            : `No ${this.currentFilter} courses found.`}
                    </p>
                    <a href="../branch/find-tutors.html"
                       class="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                        Find Tutors & Courses
                    </a>
                </div>
            `;
            return;
        }

        // Show "no results" message when search returns nothing
        if (coursesToDisplay.length === 0 && this.currentSearchQuery) {
            coursesGrid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-6xl mb-4">🔍</div>
                    <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Matching Courses</h3>
                    <p class="text-gray-500 dark:text-gray-400 mb-4">
                        No courses match "${this.currentSearchQuery}"
                    </p>
                    <button onclick="document.getElementById('courses-search-input').value = ''; StudentCoursesManager.searchCourses('');"
                            class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        Clear Search
                    </button>
                </div>
            `;
            return;
        }

        coursesGrid.innerHTML = coursesToDisplay.map(course => this.createCourseCard(course)).join('');
    },

    // Create a single course card HTML
    createCourseCard(course) {
        const statusColors = {
            'active': { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200' },
            'completed': { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200' },
            'upcoming': { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-800 dark:text-yellow-200' }
        };

        const statusStyle = statusColors[course.status] || statusColors['active'];
        const progressWidth = course.progress || 0;

        // Format enrolled date
        const enrolledDate = course.enrolled_at
            ? new Date(course.enrolled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'N/A';

        // Generate star rating
        const fullStars = Math.floor(course.tutor_rating);
        const hasHalfStar = course.tutor_rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        const starsHtml = '★'.repeat(fullStars) + (hasHalfStar ? '⯨' : '') + '☆'.repeat(emptyStars);

        return `
            <div class="course-card bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700">
                <!-- Course Header with Icon/Thumbnail -->
                <div class="relative h-32 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    ${course.course_thumbnail
                        ? `<img src="${course.course_thumbnail}" alt="${course.course_title}" class="w-full h-full object-cover">`
                        : `<span class="text-5xl">${course.course_icon}</span>`
                    }
                    <!-- Status Badge -->
                    <span class="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}">
                        ${course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                    </span>
                </div>

                <!-- Course Content -->
                <div class="p-4">
                    <!-- Course Title -->
                    <h3 class="font-bold text-lg text-gray-800 dark:text-gray-200 mb-2 line-clamp-1">
                        ${course.course_title}
                    </h3>

                    <!-- Course Category & Level -->
                    <div class="flex flex-wrap gap-2 mb-3">
                        ${course.course_category ? `
                            <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                                ${course.course_category}
                            </span>
                        ` : ''}
                        ${course.course_level ? `
                            <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full">
                                ${course.course_level}
                            </span>
                        ` : ''}
                    </div>

                    <!-- Tutor Info -->
                    <div class="flex items-center gap-3 mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <img src="${course.tutor_profile_picture || '../system_images/default-avatar.png'}"
                             alt="${course.tutor_name}"
                             class="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-600">
                        <div class="flex-1 min-w-0">
                            <p class="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                                ${course.tutor_name}
                            </p>
                            <div class="flex items-center gap-1">
                                <span class="text-yellow-500 text-xs">${starsHtml}</span>
                                <span class="text-xs text-gray-500 dark:text-gray-400">
                                    (${course.tutor_review_count})
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Progress Bar -->
                    <div class="mb-3">
                        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>${progressWidth}%</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                 style="width: ${progressWidth}%"></div>
                        </div>
                    </div>

                    <!-- Course Details -->
                    <div class="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                        <div class="flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                            <span>${course.course_duration || 'Flexible'}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <span>${course.course_lessons} lessons</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <span>${enrolledDate}</span>
                        </div>
                        ${course.package_name ? `
                            <div class="flex items-center gap-1">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                                </svg>
                                <span>${course.package_name}</span>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-2">
                        <button onclick="StudentCoursesManager.viewCourse(${course.enrollment_id})"
                                class="flex-1 px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors">
                            ${course.status === 'completed' ? 'Review' : 'Continue'}
                        </button>
                        <button onclick="StudentCoursesManager.viewTutor(${course.tutor_id})"
                                class="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            Tutor
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // View course details
    viewCourse(enrollmentId) {
        // Navigate to course details or open whiteboard
        const course = this.courses.find(c => c.enrollment_id === enrollmentId);
        if (course) {
            console.log('Viewing course:', course);
            // TODO: Implement course details modal or navigation
            alert(`Course: ${course.course_title}\nStatus: ${course.status}\n\nWhiteboard feature coming soon!`);
        }
    },

    // View tutor profile
    viewTutor(tutorId) {
        window.location.href = `../view-profiles/view-tutor.html?id=${tutorId}`;
    }
};

// Auto-initialize when DOM is ready and on My Courses panel
document.addEventListener('DOMContentLoaded', () => {
    // Initialize when the my-courses-panel becomes visible
    const myCoursesPanel = document.getElementById('my-courses-panel');
    if (myCoursesPanel) {
        // Check if panel is already visible
        if (!myCoursesPanel.classList.contains('hidden')) {
            StudentCoursesManager.init();
        }

        // Also observe for visibility changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (!myCoursesPanel.classList.contains('hidden') && StudentCoursesManager.courses.length === 0) {
                        StudentCoursesManager.init();
                    }
                }
            });
        });

        observer.observe(myCoursesPanel, { attributes: true });
    }
});
console.log('=== courses-manager.js FINISHED ===');
