/**
 * Course & School Trending Tracker
 *
 * Tracks course and school views/searches for trending rankings
 * Integrates with find-tutors filtering system
 */

class CourseSchoolTrendingTracker {
    constructor() {
        this.API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
        this.pendingCourseIds = new Set();
        this.pendingSchoolIds = new Set();
        this.debounceTimer = null;
        this.DEBOUNCE_DELAY = 2000; // 2 seconds

        // Map to track course names to IDs (populated from backend data)
        this.courseNameToIdMap = new Map();
        this.schoolNameToIdMap = new Map();
    }

    /**
     * Track views immediately (no debouncing)
     */
    async trackViews(courseIds = [], schoolIds = []) {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');

        // Filter out invalid IDs and convert to numbers
        courseIds = courseIds.filter(id => id && !isNaN(id)).map(id => parseInt(id));
        schoolIds = schoolIds.filter(id => id && !isNaN(id)).map(id => parseInt(id));

        if (courseIds.length === 0 && schoolIds.length === 0) {
            return;
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/courses-schools/track-views`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    course_ids: courseIds,
                    school_ids: schoolIds
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`📊 Tracked ${data.courses_updated || 0} courses, ${data.schools_updated || 0} schools`);
            } else {
                console.warn('Failed to track course/school views:', response.status);
            }
        } catch (error) {
            console.error('Error tracking course/school views:', error);
        }
    }

    /**
     * Queue views with debouncing to reduce API calls
     */
    queueViews(courseIds = [], schoolIds = [], delay = null) {
        // Add to pending sets
        courseIds.forEach(id => {
            if (id && !isNaN(id)) {
                this.pendingCourseIds.add(parseInt(id));
            }
        });

        schoolIds.forEach(id => {
            if (id && !isNaN(id)) {
                this.pendingSchoolIds.add(parseInt(id));
            }
        });

        // Clear existing timer
        clearTimeout(this.debounceTimer);

        // Set new timer
        const actualDelay = delay !== null ? delay : this.DEBOUNCE_DELAY;
        this.debounceTimer = setTimeout(() => {
            const courses = Array.from(this.pendingCourseIds);
            const schools = Array.from(this.pendingSchoolIds);

            if (courses.length > 0 || schools.length > 0) {
                this.trackViews(courses, schools);
            }

            // Clear pending sets
            this.pendingCourseIds.clear();
            this.pendingSchoolIds.clear();
        }, actualDelay);
    }

    /**
     * Extract course and school IDs from tutors based on current filters
     * This is called when tutors are loaded/displayed
     */
    extractFromTutors(tutors, filters = {}) {
        if (!tutors || tutors.length === 0) {
            return { courseIds: [], schoolIds: [] };
        }

        const courseIds = new Set();
        const schoolIds = new Set();

        // If user searched by subject/course, track it
        if (filters.subject) {
            const courseId = this.getCourseIdFromName(filters.subject);
            if (courseId) {
                courseIds.add(courseId);
            }
        }

        // Extract schools from tutors' teaches_at field
        tutors.forEach(tutor => {
            if (tutor.teaches_at) {
                const schoolId = this.getSchoolIdFromName(tutor.teaches_at);
                if (schoolId) {
                    schoolIds.add(schoolId);
                }
            }

            // Extract courses from tutor's subjects array (if available)
            if (tutor.subjects && Array.isArray(tutor.subjects)) {
                tutor.subjects.forEach(subject => {
                    const courseId = this.getCourseIdFromName(subject);
                    if (courseId) {
                        courseIds.add(courseId);
                    }
                });
            }
        });

        return {
            courseIds: Array.from(courseIds),
            schoolIds: Array.from(schoolIds)
        };
    }

    /**
     * Get course ID from course name (requires course data to be loaded)
     */
    getCourseIdFromName(courseName) {
        if (!courseName) return null;
        return this.courseNameToIdMap.get(courseName.toLowerCase().trim());
    }

    /**
     * Get school ID from school name (requires school data to be loaded)
     */
    getSchoolIdFromName(schoolName) {
        if (!schoolName) return null;
        return this.schoolNameToIdMap.get(schoolName.toLowerCase().trim());
    }

    /**
     * Load course and school mappings from backend
     * Should be called on page initialization
     */
    async loadMappings() {
        try {
            // Load course mappings (if endpoint exists)
            try {
                const courseResponse = await fetch(`${this.API_BASE_URL}/api/courses?limit=1000`);
                if (courseResponse.ok) {
                    const courseData = await courseResponse.json();
                    const courses = courseData.courses || courseData || [];
                    courses.forEach(course => {
                        if (course.id && course.course_name) {
                            this.courseNameToIdMap.set(
                                course.course_name.toLowerCase().trim(),
                                course.id
                            );
                        }
                    });
                    console.log(`📚 Loaded ${this.courseNameToIdMap.size} course mappings`);
                }
            } catch (e) {
                console.log('Course endpoint not available yet');
            }

            // Load school mappings
            try {
                const schoolResponse = await fetch(`${this.API_BASE_URL}/api/schools?limit=1000`);
                if (schoolResponse.ok) {
                    const schoolData = await schoolResponse.json();
                    const schools = schoolData.schools || schoolData || [];
                    schools.forEach(school => {
                        if (school.id && school.name) {
                            this.schoolNameToIdMap.set(
                                school.name.toLowerCase().trim(),
                                school.id
                            );
                        }
                    });
                    console.log(`🏫 Loaded ${this.schoolNameToIdMap.size} school mappings`);
                }
            } catch (e) {
                console.log('School endpoint not available yet');
            }
        } catch (error) {
            console.error('Failed to load course/school mappings:', error);
        }
    }

    /**
     * Track based on search filters
     * Called when user applies filters
     */
    trackFromFilters(filters = {}) {
        const courseIds = [];
        const schoolIds = [];

        // Track course if subject filter is applied
        if (filters.subject) {
            const courseId = this.getCourseIdFromName(filters.subject);
            if (courseId) {
                courseIds.push(courseId);
            }
        }

        // Track school if location/school filter is applied (if such filter exists)
        if (filters.school || filters.teaches_at) {
            const schoolName = filters.school || filters.teaches_at;
            const schoolId = this.getSchoolIdFromName(schoolName);
            if (schoolId) {
                schoolIds.push(schoolId);
            }
        }

        if (courseIds.length > 0 || schoolIds.length > 0) {
            this.queueViews(courseIds, schoolIds);
        }
    }
}

// Create global instance
const CourseSchoolTracker = new CourseSchoolTrendingTracker();

// Auto-initialize mappings when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        CourseSchoolTracker.loadMappings();
    });
} else {
    CourseSchoolTracker.loadMappings();
}
