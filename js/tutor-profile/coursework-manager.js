/**
 * Coursework Manager for Tutor Profile
 * Handles coursework creation, management, and student assessment
 */

class CourseworkManager {
    constructor() {
        this.courseworks = [];
        this.currentCoursework = null;
        this.currentQuestionIndex = 0;
        this.studentAnswers = [];
        this.timerInterval = null;
        this.selectedStudentId = null;
        this.questionEditors = {}; // Store Quill instances for questions
        this.answerEditors = {}; // Store Quill instances for answers
        this.API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

        // Students loaded from enrolled_students API
        this.students = [];
        this.studentsLoaded = false;

        // Courses loaded from courses API
        this.courses = [];
        this.coursesLoaded = false;
        this.selectedCourseId = null;

        // Track where we came from for proper back navigation
        this.previousModal = null; // 'myQuizzes' or 'giveCoursework' or null

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCourseworksFromAPI();
        this.loadEnrolledStudents();
        this.loadCourses();
    }

    /**
     * Load enrolled students from the API (enrolled_students table)
     */
    async loadEnrolledStudents() {
        try {
            const data = await this.apiRequest('/api/session-requests/tutor/my-students');

            // Transform API response to match our expected format
            this.students = data.map(student => ({
                id: student.student_id,  // student_profiles.id
                userId: student.student_user_id,  // users.id for chat
                name: student.student_name || 'Unknown Student',
                profilePic: student.profile_picture || '../uploads/system_images/system_profile_pictures/boy-user-image.jpg',
                grade: student.student_grade || 'N/A',
                packageName: student.package_name || 'N/A',
                courseNames: student.course_names || [],  // Course names from courses table
                email: student.contact_email,
                phone: student.contact_phone,
                enrolledAt: student.accepted_at
            }));

            this.studentsLoaded = true;
            console.log(`Loaded ${this.students.length} enrolled students`);
        } catch (error) {
            console.error('Failed to load enrolled students:', error);
            // Fallback to empty array - students must be enrolled first
            this.students = [];
            this.studentsLoaded = true;
        }
    }

    /**
     * Load courses from the tutor's packages (tutor_packages table)
     * Extracts unique courses from all packages the tutor has created
     */
    async loadCourses() {
        try {
            // Fetch tutor's packages which contain their courses
            const packages = await this.apiRequest('/api/tutor/packages');

            // Extract unique courses from all packages
            const courseMap = new Map();

            (packages || []).forEach(pkg => {
                const courses = pkg.courses || [];
                courses.forEach(course => {
                    // Only add if not already in map (to avoid duplicates)
                    if (!courseMap.has(course.id)) {
                        courseMap.set(course.id, {
                            id: course.id,
                            name: course.course_name || course.name || 'Unnamed Course',
                            category: course.course_category || course.category || 'General',
                            level: course.course_level || course.level || 'All Levels',
                            description: course.course_description || course.description || '',
                            icon: this.getCourseIcon(course.course_category || course.category),
                            packageName: pkg.name  // Track which package this course belongs to
                        });
                    }
                });
            });

            // Convert map to array
            this.courses = Array.from(courseMap.values());

            this.coursesLoaded = true;
            console.log(`Loaded ${this.courses.length} courses from ${packages.length} packages`);
        } catch (error) {
            console.error('Failed to load courses from packages:', error);
            // Fallback to empty array
            this.courses = [];
            this.coursesLoaded = true;
        }
    }

    /**
     * Get icon for a course category
     */
    getCourseIcon(category) {
        const categoryIcons = {
            'mathematics': '📐', 'math': '📐',
            'physics': '⚛️', 'science': '🔬',
            'chemistry': '🧪', 'biology': '🧬',
            'english': '🇬🇧', 'language': '🗣️', 'languages': '🗣️',
            'amharic': '🇪🇹', 'oromo': '🇪🇹',
            'music': '🎵', 'arts': '🎨', 'art': '🎨',
            'business': '📊', 'technology': '💻', 'tech': '💻',
            'programming': '💻', 'special needs': '♿',
            'photography': '📸', 'cooking': '👨‍🍳', 'dance': '💃'
        };
        const catLower = (category || '').toLowerCase();
        return categoryIcons[catLower] || '📚';
    }

    // ========== API HELPER METHODS ==========

    async getAuthToken() {
        return localStorage.getItem('token') || localStorage.getItem('access_token');
    }

    async apiRequest(endpoint, method = 'GET', body = null) {
        const token = await this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = {
            method,
            headers
        };

        if (body && method !== 'GET') {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${this.API_BASE_URL}${endpoint}`, options);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Setup coursework search in sidebar (debounced)
        setTimeout(() => {
            this.setupCourseworkSearch();
        }, 500);
    }

    /**
     * Setup coursework search functionality in the sidebar
     * Searches by: coursework title, coursework type, course name, student name
     */
    setupCourseworkSearch() {
        const searchInput = document.getElementById('courseworkTutorSearch');
        if (!searchInput) return;

        let debounceTimer;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const query = e.target.value.toLowerCase().trim();
                this.filterCourseworks(query);
            }, 300);
        });
    }

    /**
     * Filter courseworks by search query
     * Searches: coursework title (courseName), type (quizType), course title, student name
     */
    filterCourseworks(query) {
        // Determine which modal is currently active and use the correct container
        const myQuizzesModal = document.getElementById('courseworkMyCourseworksModal');
        const giveModal = document.getElementById('courseworkGiveModal');

        let listContainer = null;

        if (myQuizzesModal && myQuizzesModal.classList.contains('active')) {
            listContainer = document.getElementById('courseworkTutorFilterList');
        } else if (giveModal && giveModal.classList.contains('active')) {
            listContainer = document.getElementById('courseworkTutorList');
        } else {
            listContainer = document.getElementById('courseworkTutorFilterList') || document.getElementById('courseworkTutorList');
        }
        if (!listContainer) return;

        listContainer.innerHTML = '';

        // If no query, show all courseworks
        if (!query) {
            this.updateCourseworkList();
            return;
        }

        // Filter courseworks by multiple fields
        const filtered = this.courseworks.filter(coursework => {
            // Get person name (tutor or student depending on data)
            let personName = '';
            if (coursework.tutor_name || coursework.tutorName) {
                personName = (coursework.tutor_name || coursework.tutorName || '').toLowerCase();
            } else {
                const studentId = coursework.studentId || coursework.student_id;
                const student = this.students.find(s => s.id === studentId);
                personName = student ? student.name.toLowerCase() : '';
            }

            // Get coursework fields
            const title = (coursework.title || '').toLowerCase();
            const courseName = (coursework.courseName || coursework.course_name || '').toLowerCase();
            const quizType = (coursework.quizType || coursework.coursework_type || coursework.quiz_type || '').toLowerCase();

            // Search in all fields (title, course name, type, person name)
            return title.includes(query) ||
                   courseName.includes(query) ||
                   quizType.includes(query) ||
                   personName.includes(query);
        });

        if (filtered.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No courseworks found</p>';
            return;
        }

        filtered.forEach(coursework => {
            const title = coursework.title || coursework.courseName || coursework.course_name || 'Untitled';
            const courseName = coursework.courseName || coursework.course_name || '';
            const quizType = coursework.quizType || coursework.coursework_type || coursework.quiz_type || 'N/A';
            const status = coursework.status || 'draft';

            // Auto-detect based on data: if tutor_name exists, show it; otherwise show student name
            let personName = 'Unknown';
            if (coursework.tutor_name || coursework.tutorName) {
                // This is a student's coursework - show tutor name
                personName = coursework.tutor_name || coursework.tutorName || 'Unknown Tutor';
            } else {
                // This is a tutor's coursework - show student name
                const studentId = coursework.studentId || coursework.student_id;
                const student = this.students.find(s => s.id === studentId);
                personName = student ? student.name : 'Unknown Student';
            }

            const quizItem = document.createElement('div');
            quizItem.className = 'p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded transition';
            quizItem.innerHTML = `
                <div class="font-semibold">${title}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">${personName} • ${quizType}</div>
                ${courseName ? `<div class="text-xs text-gray-400 dark:text-gray-500">${courseName}</div>` : ''}
                <div class="text-xs text-gray-500">${status === 'posted' ? 'Posted' : 'Draft'}</div>
            `;

            quizItem.addEventListener('click', () => {
                this.viewCourseworkDetails(coursework.id);
            });

            listContainer.appendChild(quizItem);
        });
    }

    // ========== MODAL MANAGEMENT ==========

    openMainModal() {
        const modal = document.getElementById('courseworkMainModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.updateNotifications();

            // Check current role from localStorage or authManager
            const currentRole = (localStorage.getItem('currentRole') ||
                               (window.authManager && window.authManager.getCurrentRole ?
                                window.authManager.getCurrentRole() : 'tutor')).toLowerCase();

            console.log('[CourseworkManager] Current role:', currentRole);

            // Get button elements
            const giveCourseworkBtn = modal.querySelector('.coursework-btn-primary');
            const myCourseworksBtn = document.getElementById('myCourseworksBtn');

            console.log('[CourseworkManager] Buttons found:', {
                giveCoursework: !!giveCourseworkBtn,
                myCourseworks: !!myCourseworksBtn
            });

            if (currentRole === 'student') {
                console.log('[CourseworkManager] Student role detected - setting up student UI');
                // For students: Hide "Give a Coursework" button
                if (giveCourseworkBtn) {
                    giveCourseworkBtn.classList.add('hidden');
                }
                // Show "My Quizzes" button for students
                if (myCourseworksBtn) {
                    myCourseworksBtn.classList.remove('hidden');
                    myCourseworksBtn.innerHTML = `
                        <span class="coursework-btn-icon">📚</span>
                        <span>My Quizzes</span>
                        <span class="coursework-notification-badge" id="courseworkMyBadge"></span>
                    `;
                }

                // Auto-load student's courseworks into sidebar when modal opens
                console.log('[CourseworkManager] Calling loadMyCourseworks() for student sidebar');
                this.loadMyCourseworks();
            } else {
                // For tutors: Show original buttons
                if (giveCourseworkBtn) {
                    giveCourseworkBtn.classList.remove('hidden');
                }
                // Hide "My Quizzes" for tutors
                if (myCourseworksBtn) {
                    myCourseworksBtn.classList.add('hidden');
                }
            }

            // Update coursework type dropdown based on role
            this.updateCourseworkTypeOptions(currentRole);
        }
    }

    /**
     * Update coursework type dropdown options based on user role
     * Tutors see all types, other roles only see Self-work
     */
    updateCourseworkTypeOptions(role) {
        const typeSelect = document.getElementById('courseworkType');
        if (!typeSelect) return;

        if (role === 'tutor') {
            // Tutors see all coursework types
            typeSelect.innerHTML = `
                <option value="">Select Coursework Type</option>
                <option value="Classwork">Classwork</option>
                <option value="Homework">Homework</option>
                <option value="Assignment">Assignment</option>
                <option value="Project">Project</option>
                <option value="Quiz">Quiz</option>
                <option value="Exam">Exam</option>
                <option value="Self-work">Self-work</option>
            `;
        } else {
            // Students, parents, and other roles only see Self-work
            typeSelect.innerHTML = `
                <option value="">Select Coursework Type</option>
                <option value="Self-work">Self-work</option>
            `;
        }
    }

    closeAllModals() {
        // Save quiz state if a quiz is in progress
        this.saveQuizStateIfActive();

        const modals = document.querySelectorAll('.coursework-modal');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = 'auto';

        // Stop timer but don't clear state (already saved)
        this.stopQuizTimer();

        // Clear My Courseworks countdown timer
        if (this.myCourseworksCountdownInterval) {
            clearInterval(this.myCourseworksCountdownInterval);
            this.myCourseworksCountdownInterval = null;
        }

        // Reset viewing results flag
        this.isViewingResults = false;
    }

    /**
     * Save quiz state to localStorage if a quiz is currently being taken
     * This allows resuming the quiz later from the same point
     */
    saveQuizStateIfActive() {
        // Don't save if quiz was just submitted
        if (this.quizSubmitted) return;

        // Only save if we're actively taking a quiz
        if (!this.currentCoursework || !this.currentCoursework.id) return;

        // Check if the view details modal is open (where quiz is taken)
        const modal = document.getElementById('courseworkViewDetailsModal');
        if (!modal || !modal.classList.contains('active')) return;

        // Check if we have student answers (indicating quiz in progress)
        if (!this.studentAnswers || this.studentAnswers.length === 0) return;

        // Calculate remaining time for timed quizzes
        const timeLimit = this.currentCoursework.time_limit || this.currentCoursework.quizTime || 0;
        let savedTimeRemaining = null;

        if (timeLimit > 0 && this.quizTimeRemaining !== undefined) {
            savedTimeRemaining = this.quizTimeRemaining;
        }

        const quizState = {
            courseworkId: this.currentCoursework.id,
            answers: this.studentAnswers,
            currentQuestionIndex: this.currentQuestionIndex,
            timeRemaining: savedTimeRemaining,
            timeElapsed: this.quizTimeElapsed || 0,
            savedAt: Date.now()
        };

        // Save to localStorage with coursework-specific key
        const storageKey = `quizState_${this.currentCoursework.id}`;
        localStorage.setItem(storageKey, JSON.stringify(quizState));

        console.log('[CourseworkManager] Quiz state saved:', quizState);
    }

    /**
     * Restore quiz state from localStorage if available
     * @param {string} courseworkId - The coursework ID to restore state for
     * @returns {object|null} - The saved state or null if not found/expired
     */
    restoreQuizState(courseworkId) {
        const storageKey = `quizState_${courseworkId}`;
        const savedState = localStorage.getItem(storageKey);

        if (!savedState) return null;

        try {
            const state = JSON.parse(savedState);

            // Check if saved state is older than 24 hours (expire stale states)
            const hoursSinceSave = (Date.now() - state.savedAt) / (1000 * 60 * 60);
            if (hoursSinceSave > 24) {
                localStorage.removeItem(storageKey);
                return null;
            }

            return state;
        } catch (e) {
            console.error('Error parsing saved quiz state:', e);
            localStorage.removeItem(storageKey);
            return null;
        }
    }

    /**
     * Clear saved quiz state after successful submission
     * @param {string} courseworkId - The coursework ID to clear state for
     */
    clearQuizState(courseworkId) {
        const storageKey = `quizState_${courseworkId}`;
        localStorage.removeItem(storageKey);
        console.log('[CourseworkManager] Quiz state cleared for:', courseworkId);
    }

    openGiveCourseworkModal() {
        this.closeAllModals();
        this.previousModal = 'giveCoursework'; // Track that we came from Give Coursework
        const modal = document.getElementById('courseworkGiveModal');
        if (modal) {
            modal.classList.add('active');
            this.resetCourseworkForm();
            this.updateCourseworkList();

            // Update coursework type dropdown based on current role
            const currentRole = localStorage.getItem('currentRole') ||
                               (window.authManager && window.authManager.getCurrentRole ?
                                window.authManager.getCurrentRole() : 'tutor');
            this.updateCourseworkTypeOptions(currentRole);

            // Update modal titles based on role
            const contentTitle = modal.querySelector('.coursework-content-title');
            const sidebarTitle = modal.querySelector('.coursework-sidebar-title');
            const titleLabel = modal.querySelector('label[for="courseworkTitle"], .coursework-form-label');
            const studentSearchWrapper = modal.querySelector('.coursework-student-search-wrapper');
            const studentLabel = studentSearchWrapper?.closest('.coursework-form-group');

            if (currentRole === 'student') {
                // Change titles for students
                if (contentTitle) {
                    contentTitle.innerHTML = '<span>✨</span> Create a Self-work';
                }
                if (sidebarTitle) {
                    sidebarTitle.innerHTML = '<span>📋</span> My Self-works';
                }
                // Hide student search field for students (they create self-work for themselves)
                if (studentLabel) {
                    studentLabel.style.display = 'none';
                }
            } else {
                // Reset titles for tutors
                if (contentTitle) {
                    contentTitle.innerHTML = '<span>✨</span> Create a Coursework';
                }
                if (sidebarTitle) {
                    sidebarTitle.innerHTML = '<span>📋</span> My Courseworks';
                }
                // Show student search field for tutors
                if (studentLabel) {
                    studentLabel.style.display = '';
                }
            }

            // Setup search fields after modal is visible
            setTimeout(() => {
                this.setupStudentSearch();
                this.setupCourseSearch();
                this.setupCourseworkSearch();

                // Focus on appropriate field
                if (currentRole === 'student') {
                    const titleInput = document.getElementById('courseworkTitle');
                    if (titleInput) titleInput.focus();
                } else {
                    const studentSearch = document.getElementById('courseworkStudentSearch');
                    if (studentSearch) studentSearch.focus();
                }
            }, 100);
        }
    }

    openMyCourseworksModal() {
        this.closeAllModals();
        this.previousModal = 'myQuizzes'; // Track that we came from My Quizzes
        const modal = document.getElementById('courseworkMyCourseworksModal');
        if (modal) {
            modal.classList.add('active');
            this.loadMyCourseworks();
        }
    }

    // DEPRECATED: View Answers modal removed - grading now happens via coursework details modal
    // openViewAnswersModal() {
    //     this.closeAllModals();
    //     const modal = document.getElementById('courseworkViewAnswersModal');
    //     if (modal) {
    //         modal.classList.add('active');
    //         this.loadStudentAnswers();
    //     }
    // }

    // ========== COURSEWORK CREATION ==========

    resetCourseworkForm() {
        // Clear form fields
        const titleInput = document.getElementById('courseworkTitle');
        if (titleInput) titleInput.value = '';
        document.getElementById('courseworkCourseName').value = '';
        document.getElementById('courseworkType').value = '';
        document.getElementById('courseworkTime').value = '20';
        document.getElementById('courseworkDays').value = '';

        // Clear selected student
        this.selectedStudentId = null;
        document.getElementById('courseworkSelectedStudent').innerHTML = '';

        // Clear selected course
        this.selectedCourseId = null;
        const courseSearchInput = document.getElementById('courseworkCourseSearch');
        if (courseSearchInput) courseSearchInput.value = '';
        const selectedCourseDiv = document.getElementById('courseworkSelectedCourse');
        if (selectedCourseDiv) selectedCourseDiv.innerHTML = '';

        // Clear questions
        document.getElementById('courseworkQuestionsContainer').innerHTML = '';
        this.questionEditors = {};

        this.currentCoursework = null;
    }

    setupStudentSearch() {
        const searchInput = document.getElementById('courseworkStudentSearch');
        const resultsDiv = document.getElementById('courseworkStudentSearchResults');

        if (!searchInput || !resultsDiv) {
            console.log('Student search elements not found, will retry...');
            return false;
        }

        // Remove any existing listeners by cloning
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);

        // Live search on input - only show results when typing
        newSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length === 0) {
                resultsDiv.classList.add('hidden');
                return;
            }
            this.showStudentResults(query, resultsDiv);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.coursework-student-search-wrapper')) {
                resultsDiv.classList.add('hidden');
            }
        });

        console.log('Student search setup complete. Students loaded:', this.students.length);
        return true;
    }

    /**
     * Show student search results based on query
     * Searches by: name, grade level, package/course name, email
     */
    showStudentResults(query, resultsDiv) {
        if (!resultsDiv) return;

        // Check if students are still loading
        if (!this.studentsLoaded) {
            resultsDiv.innerHTML = '<div class="coursework-dropdown-item text-gray-500">Loading students...</div>';
            resultsDiv.classList.remove('hidden');
            return;
        }

        // Check if no students are enrolled
        if (this.students.length === 0) {
            resultsDiv.innerHTML = '<div class="coursework-dropdown-item text-gray-500">No enrolled students. Students must accept your session request first.</div>';
            resultsDiv.classList.remove('hidden');
            return;
        }

        // Filter students by name, grade, package, course names, or email
        const filtered = this.students.filter(s => {
            const name = (s.name || '').toLowerCase();
            const grade = (s.grade || '').toLowerCase();
            const email = (s.email || '').toLowerCase();
            const packageName = (s.packageName || '').toLowerCase();
            // Join course names into searchable string
            const courseNames = (s.courseNames || []).join(' ').toLowerCase();
            return name.includes(query) || grade.includes(query) || email.includes(query) || packageName.includes(query) || courseNames.includes(query);
        });

        if (filtered.length === 0) {
            resultsDiv.innerHTML = '<div class="coursework-dropdown-item text-gray-500">No matching students found</div>';
            resultsDiv.classList.remove('hidden');
            return;
        }

        resultsDiv.innerHTML = filtered.map(student => {
            // Display course names if available, otherwise show package name
            const coursesDisplay = student.courseNames && student.courseNames.length > 0
                ? student.courseNames.join(', ')
                : (student.packageName && student.packageName !== 'N/A' ? student.packageName : '');

            return `
                <div class="coursework-dropdown-item" onclick="courseworkManager.selectStudent(${student.id})">
                    <img src="${student.profilePic}" alt="${student.name}">
                    <div>
                        <span class="font-medium">${student.name}</span>
                        ${student.grade && student.grade !== 'N/A' ? `<span class="text-xs text-gray-500 ml-2">${student.grade}</span>` : ''}
                        ${coursesDisplay ? `<span class="text-xs text-gray-400 ml-1">(${coursesDisplay})</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        resultsDiv.classList.remove('hidden');
    }

    selectStudent(studentId) {
        const student = this.students.find(s => s.id === studentId);
        if (!student) return;

        this.selectedStudentId = studentId;

        const selectedDiv = document.getElementById('courseworkSelectedStudent');
        selectedDiv.innerHTML = `
            <div class="coursework-selected-item">
                <img src="${student.profilePic}" alt="${student.name}">
                <span>${student.name}</span>
                <button class="coursework-selected-item-remove" onclick="courseworkManager.removeStudent()">✕</button>
            </div>
        `;

        // Clear search
        document.getElementById('courseworkStudentSearch').value = '';
        document.getElementById('courseworkStudentSearchResults').classList.add('hidden');

        // Clear selected course when student changes (courses are student-specific)
        this.removeCourse();
    }

    removeStudent() {
        this.selectedStudentId = null;
        document.getElementById('courseworkSelectedStudent').innerHTML = '';

        // Also clear selected course since it was based on the previous student
        this.removeCourse();
    }

    // ========== COURSE SEARCH ==========

    /**
     * Setup course search functionality
     * Live search that shows results only when typing
     */
    setupCourseSearch() {
        const searchInput = document.getElementById('courseworkCourseSearch');
        const resultsDiv = document.getElementById('courseworkCourseSearchResults');

        if (!searchInput || !resultsDiv) {
            console.log('Course search elements not found, will retry...');
            return false;
        }

        // Remove any existing listeners by cloning
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);

        // Live search on input - only show results when typing
        newSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length === 0) {
                resultsDiv.classList.add('hidden');
                return;
            }
            this.showCourseResults(query, resultsDiv);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.coursework-course-search-wrapper')) {
                resultsDiv.classList.add('hidden');
            }
        });

        console.log('Course search setup complete. Courses loaded:', this.courses.length);
        return true;
    }

    /**
     * Show course search results based on query
     * Searches by: name, category, level
     * IMPORTANT: Only shows courses from the selected student's subscribed package
     */
    showCourseResults(query, resultsDiv) {
        if (!resultsDiv) return;

        // Check if a student is selected first
        if (!this.selectedStudentId) {
            resultsDiv.innerHTML = '<div class="coursework-dropdown-item text-gray-500">Please select a student first to see their available courses.</div>';
            resultsDiv.classList.remove('hidden');
            return;
        }

        // Get the selected student's course names
        const selectedStudent = this.students.find(s => s.id === this.selectedStudentId);
        if (!selectedStudent) {
            resultsDiv.innerHTML = '<div class="coursework-dropdown-item text-gray-500">Student not found.</div>';
            resultsDiv.classList.remove('hidden');
            return;
        }

        const studentCourseNames = (selectedStudent.courseNames || []).map(name => name.toLowerCase());

        // Check if student has any courses
        if (studentCourseNames.length === 0) {
            resultsDiv.innerHTML = '<div class="coursework-dropdown-item text-gray-500">This student has no courses in their subscribed package.</div>';
            resultsDiv.classList.remove('hidden');
            return;
        }

        // Check if courses are still loading
        if (!this.coursesLoaded) {
            resultsDiv.innerHTML = '<div class="coursework-dropdown-item text-gray-500">Loading courses...</div>';
            resultsDiv.classList.remove('hidden');
            return;
        }

        // Filter courses:
        // 1. Must be in the student's subscribed package courses
        // 2. Must match the search query
        const filtered = this.courses.filter(c => {
            const courseName = (c.name || '').toLowerCase();
            const category = (c.category || '').toLowerCase();
            const level = (c.level || '').toLowerCase();

            // First check if course is in student's package
            const isStudentCourse = studentCourseNames.includes(courseName);
            if (!isStudentCourse) return false;

            // Then check if matches search query
            return courseName.includes(query) || category.includes(query) || level.includes(query);
        });

        if (filtered.length === 0) {
            // Check if there are any courses for this student at all
            const studentCourses = this.courses.filter(c =>
                studentCourseNames.includes((c.name || '').toLowerCase())
            );

            if (studentCourses.length === 0) {
                resultsDiv.innerHTML = '<div class="coursework-dropdown-item text-gray-500">No matching courses found in the student\'s package.</div>';
            } else {
                resultsDiv.innerHTML = '<div class="coursework-dropdown-item text-gray-500">No courses matching your search. Try: ' +
                    studentCourses.slice(0, 3).map(c => c.name).join(', ') + '</div>';
            }
            resultsDiv.classList.remove('hidden');
            return;
        }

        resultsDiv.innerHTML = filtered.map(course => `
            <div class="coursework-dropdown-item coursework-course-item" onclick="courseworkManager.selectCourse(${course.id})">
                <span class="coursework-course-icon">${course.icon}</span>
                <div class="coursework-course-info">
                    <span class="font-medium">${course.name}</span>
                    <span class="text-xs text-gray-500">${course.category}${course.level && course.level !== 'All Levels' ? ' • ' + course.level : ''}</span>
                </div>
            </div>
        `).join('');

        resultsDiv.classList.remove('hidden');
    }

    /**
     * Select a course from search results
     */
    selectCourse(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;

        this.selectedCourseId = courseId;

        // Set hidden input value
        document.getElementById('courseworkCourseName').value = course.name;

        // Show selected course
        const selectedDiv = document.getElementById('courseworkSelectedCourse');
        selectedDiv.innerHTML = `
            <div class="coursework-selected-item coursework-selected-course">
                <span class="coursework-course-icon">${course.icon}</span>
                <span>${course.name}</span>
                <span class="text-xs text-gray-400">${course.category}</span>
                <button class="coursework-selected-item-remove" onclick="courseworkManager.removeCourse()">✕</button>
            </div>
        `;

        // Clear search
        document.getElementById('courseworkCourseSearch').value = '';
        document.getElementById('courseworkCourseSearchResults').classList.add('hidden');
    }

    /**
     * Remove selected course
     */
    removeCourse() {
        this.selectedCourseId = null;
        document.getElementById('courseworkCourseName').value = '';
        document.getElementById('courseworkSelectedCourse').innerHTML = '';
    }

    addQuestion() {
        const container = document.getElementById('courseworkQuestionsContainer');
        const questionNumber = container.children.length + 1;
        const questionId = `question_${Date.now()}_${questionNumber}`;

        const questionHtml = `
            <div class="coursework-question-item" data-question-id="${questionId}">
                <div class="coursework-question-header-row">
                    <span class="coursework-question-number">Question ${questionNumber}</span>
                    <div class="coursework-question-points">
                        <label class="coursework-form-label-inline">
                            <span>🎯</span> Points:
                        </label>
                        <input type="number" class="coursework-points-input" data-points min="1" max="100" value="1" placeholder="1">
                    </div>
                    <button class="coursework-question-remove" onclick="courseworkManager.removeQuestion('${questionId}')">✕</button>
                </div>

                <div class="coursework-form-group">
                    <label class="coursework-form-label">
                        <span>📝</span> Question Text
                    </label>
                    <div id="${questionId}_editor" class="coursework-editor-wrapper"></div>
                </div>

                <div class="coursework-form-group">
                    <label class="coursework-form-label">
                        <span>📊</span> Question Type
                    </label>
                    <select class="coursework-form-select" onchange="courseworkManager.handleQuestionTypeChange('${questionId}', this.value)">
                        <option value="">Select Type</option>
                        <option value="multipleChoice">Multiple Choice</option>
                        <option value="trueFalse">True/False</option>
                        <option value="openEnded">Open Ended</option>
                    </select>
                </div>

                <div id="${questionId}_options" class="coursework-question-options hidden"></div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', questionHtml);

        // Initialize Quill editor for this question
        setTimeout(() => {
            this.initQuestionEditor(questionId);
        }, 100);

        // Update question numbers
        this.updateQuestionNumbers();
    }

    initQuestionEditor(questionId) {
        const editorId = `${questionId}_editor`;
        const container = document.getElementById(editorId);

        if (!container || this.questionEditors[questionId]) return;

        // Create toolbar
        const toolbarId = `${editorId}_toolbar`;
        container.innerHTML = `
            <div id="${toolbarId}"></div>
            <div id="${editorId}_container"></div>
        `;

        const quill = new Quill(`#${editorId}_container`, {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: `#${toolbarId}`,
                    handlers: {}
                }
            },
            placeholder: 'Enter your question here...',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            }
        });

        this.questionEditors[questionId] = quill;
    }

    handleQuestionTypeChange(questionId, type) {
        const optionsDiv = document.getElementById(`${questionId}_options`);

        if (!type) {
            optionsDiv.classList.add('hidden');
            return;
        }

        optionsDiv.classList.remove('hidden');

        if (type === 'multipleChoice') {
            optionsDiv.innerHTML = `
                <div class="coursework-form-group">
                    <label class="coursework-form-label">
                        <span>✓</span> Multiple Choice Options
                    </label>
                    <div class="space-y-2">
                        <input type="text" class="coursework-form-input" placeholder="Option A" data-option="A">
                        <input type="text" class="coursework-form-input" placeholder="Option B" data-option="B">
                        <input type="text" class="coursework-form-input" placeholder="Option C" data-option="C">
                        <input type="text" class="coursework-form-input" placeholder="Option D" data-option="D">
                    </div>
                </div>
                <div class="coursework-form-group">
                    <label class="coursework-form-label">
                        <span>✅</span> Correct Answer
                    </label>
                    <select class="coursework-form-select" data-correct-answer>
                        <option value="">Select correct answer</option>
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                    </select>
                </div>
            `;
        } else if (type === 'trueFalse') {
            optionsDiv.innerHTML = `
                <div class="coursework-form-group">
                    <label class="coursework-form-label">
                        <span>✅</span> Correct Answer
                    </label>
                    <select class="coursework-form-select" data-correct-answer>
                        <option value="">Select correct answer</option>
                        <option value="true">True</option>
                        <option value="false">False</option>
                    </select>
                </div>
            `;
        } else if (type === 'openEnded') {
            optionsDiv.innerHTML = `
                <div class="coursework-form-group">
                    <label class="coursework-form-label">
                        <span>📝</span> Sample Answer (Optional)
                    </label>
                    <div id="${questionId}_answer_editor" class="coursework-editor-wrapper"></div>
                </div>
            `;

            // Initialize rich text editor for answer
            setTimeout(() => {
                this.initAnswerEditor(`${questionId}_answer`);
            }, 100);
        }
    }

    initAnswerEditor(editorId) {
        const container = document.getElementById(`${editorId}_editor`);

        if (!container || this.answerEditors[editorId]) return;

        const toolbarId = `${editorId}_toolbar`;
        container.innerHTML = `
            <div id="${toolbarId}"></div>
            <div id="${editorId}_container"></div>
        `;

        const quill = new Quill(`#${editorId}_container`, {
            theme: 'snow',
            placeholder: 'Enter sample answer...',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            }
        });

        this.answerEditors[editorId] = quill;
    }

    removeQuestion(questionId) {
        const questionItem = document.querySelector(`[data-question-id="${questionId}"]`);
        if (questionItem) {
            // Cleanup editors
            if (this.questionEditors[questionId]) {
                delete this.questionEditors[questionId];
            }

            questionItem.remove();
            this.updateQuestionNumbers();
        }
    }

    updateQuestionNumbers() {
        const questions = document.querySelectorAll('.coursework-question-item');
        questions.forEach((q, index) => {
            const numberSpan = q.querySelector('.coursework-question-number');
            if (numberSpan) {
                numberSpan.textContent = `Question ${index + 1}`;
            }
        });
    }

    // ========== COURSEWORK SAVING ==========

    /**
     * Validate coursework form for saving (less strict)
     * Student and course are optional for drafts
     */
    validateCourseworkFormForSave() {
        // Title is required for both save and post
        const title = document.getElementById('courseworkTitle')?.value.trim();
        if (!title) {
            this.showToast('Please enter a coursework title', 'error');
            return false;
        }

        const quizType = document.getElementById('courseworkType').value;
        if (!quizType) {
            this.showToast('Please select coursework type', 'error');
            return false;
        }

        const quizTime = document.getElementById('courseworkTime').value;
        if (!quizTime || quizTime < 1) {
            this.showToast('Please enter valid time limit', 'error');
            return false;
        }

        const quizDays = document.getElementById('courseworkDays').value;
        // Allow 0 days (means only time limit applies)
        if (quizDays === '' || quizDays === null || quizDays === undefined) {
            this.showToast('Please enter days to complete (0 for time limit only)', 'error');
            return false;
        }
        if (parseInt(quizDays) < 0) {
            this.showToast('Days cannot be negative', 'error');
            return false;
        }

        const questions = document.querySelectorAll('.coursework-question-item');
        if (questions.length === 0) {
            this.showToast('Please add at least one question', 'error');
            return false;
        }

        return true;
    }

    /**
     * Validate coursework form for posting (strict)
     * Student and course are required to post
     */
    validateCourseworkForm() {
        // For posting, student is required
        if (!this.selectedStudentId) {
            this.showToast('Please select a student to post coursework', 'error');
            return false;
        }

        // For posting, course is required
        const courseName = document.getElementById('courseworkCourseName').value.trim();
        if (!courseName) {
            this.showToast('Please select a course to post coursework', 'error');
            return false;
        }

        // Use save validation for the rest
        return this.validateCourseworkFormForSave();
    }

    collectCourseworkData() {
        const title = document.getElementById('courseworkTitle')?.value.trim() || '';
        const courseName = document.getElementById('courseworkCourseName').value.trim();
        const quizType = document.getElementById('courseworkType').value;
        const quizTime = parseInt(document.getElementById('courseworkTime').value);
        const quizDays = parseInt(document.getElementById('courseworkDays').value);

        const questions = [];
        const questionItems = document.querySelectorAll('.coursework-question-item');

        questionItems.forEach(item => {
            const questionId = item.getAttribute('data-question-id');
            const quillEditor = this.questionEditors[questionId];
            const questionText = quillEditor ? quillEditor.root.innerHTML : '';

            const typeSelect = item.querySelector('.coursework-form-select');
            const questionType = typeSelect ? typeSelect.value : '';

            // Get points from the input field
            const pointsInput = item.querySelector('[data-points]');
            const points = pointsInput ? parseInt(pointsInput.value) || 1 : 1;

            const question = {
                text: questionText,
                type: questionType,
                points: points
            };

            // Get options and correct answer based on type
            if (questionType === 'multipleChoice') {
                const options = item.querySelectorAll('[data-option]');
                question.choices = Array.from(options).map(o => o.value.trim()).filter(v => v);

                const correctAnswer = item.querySelector('[data-correct-answer]');
                question.correctAnswer = correctAnswer ? correctAnswer.value : '';
            } else if (questionType === 'trueFalse') {
                const correctAnswer = item.querySelector('[data-correct-answer]');
                question.correctAnswer = correctAnswer ? correctAnswer.value : '';
            } else if (questionType === 'openEnded') {
                const answerEditor = this.answerEditors[`${questionId}_answer`];
                question.sampleAnswer = answerEditor ? answerEditor.root.innerHTML : '';
            }

            questions.push(question);
        });

        return {
            studentId: this.selectedStudentId,
            title,
            courseName,
            quizType,
            quizTime,
            quizDays,
            questions
        };
    }

    async saveCoursework() {
        // Use less strict validation for saving drafts
        if (!this.validateCourseworkFormForSave()) return;

        const quizData = this.collectCourseworkData();

        try {
            let response;
            if (this.currentCoursework && this.currentCoursework.id) {
                // Update existing coursework
                response = await this.apiRequest(`/api/coursework/${this.currentCoursework.id}`, 'PUT', {
                    student_id: quizData.studentId || null,
                    title: quizData.title,
                    course_name: quizData.courseName || '',
                    coursework_type: quizData.quizType,
                    time_limit: quizData.quizTime,
                    days_to_complete: quizData.quizDays,
                    questions: quizData.questions,
                    status: 'draft'
                });
            } else {
                // Create new coursework (student_id and course_name can be null for drafts)
                response = await this.apiRequest('/api/coursework/create', 'POST', {
                    student_id: quizData.studentId || null,
                    title: quizData.title,
                    course_name: quizData.courseName || '',
                    coursework_type: quizData.quizType,
                    time_limit: quizData.quizTime,
                    days_to_complete: quizData.quizDays,
                    questions: quizData.questions,
                    status: 'draft'
                });
            }

            this.showToast('Coursework saved successfully!', 'success');
            await this.loadCourseworksFromAPI();
            this.updateCourseworkList();

            // Clear the form after saving
            this.resetCourseworkForm();
        } catch (error) {
            this.showToast('Error saving coursework: ' + error.message, 'error');
        }
    }

    async postCoursework() {
        // Use strict validation for posting (student and course required)
        if (!this.validateCourseworkForm()) return;

        const quizData = this.collectCourseworkData();

        try {
            let response;
            if (this.currentCoursework && this.currentCoursework.id) {
                // Update existing coursework and post it
                response = await this.apiRequest(`/api/coursework/${this.currentCoursework.id}`, 'PUT', {
                    student_id: quizData.studentId,
                    title: quizData.title,
                    course_name: quizData.courseName,
                    coursework_type: quizData.quizType,
                    time_limit: quizData.quizTime,
                    days_to_complete: quizData.quizDays,
                    questions: quizData.questions,
                    status: 'posted'
                });
            } else {
                // Create new coursework and post it
                response = await this.apiRequest('/api/coursework/create', 'POST', {
                    student_id: quizData.studentId,
                    title: quizData.title,
                    course_name: quizData.courseName,
                    coursework_type: quizData.quizType,
                    time_limit: quizData.quizTime,
                    days_to_complete: quizData.quizDays,
                    questions: quizData.questions,
                    status: 'posted'
                });
            }

            this.showToast('Coursework posted successfully!', 'success');
            await this.loadCourseworksFromAPI();

            // Clear the form after posting
            this.resetCourseworkForm();

            this.closeAllModals();
            this.updateNotifications();
        } catch (error) {
            this.showToast('Error posting coursework: ' + error.message, 'error');
        }
    }

    // ========== STORAGE ==========

    async loadCourseworksFromAPI() {
        try {
            const response = await this.apiRequest('/api/coursework/tutor/list');
            console.log('[CourseworkManager] loadCourseworksFromAPI - raw response:', response);
            if (response.success) {
                this.courseworks = response.courseworks || [];
                // Log each coursework's submission_status for debugging
                this.courseworks.forEach((cw, i) => {
                    console.log(`[CourseworkManager] Coursework[${i}]: id=${cw.id}, title="${cw.title}", submission_status="${cw.submission_status}"`);
                });
            }
        } catch (error) {
            console.error('Error loading courseworks from API:', error);
            // Fallback to localStorage for offline support
            this.loadCourseworksFromStorage();
        }
    }

    saveCourseworksToStorage() {
        try {
            localStorage.setItem('tutorCourseworks', JSON.stringify(this.courseworks));
        } catch (e) {
            console.error('Error saving courseworks:', e);
        }
    }

    loadCourseworksFromStorage() {
        try {
            const stored = localStorage.getItem('tutorCourseworks');
            if (stored) {
                this.courseworks = JSON.parse(stored);
            }
        } catch (e) {
            console.error('Error loading courseworks:', e);
            this.courseworks = [];
        }
    }

    // ========== UI UPDATES ==========

    updateCourseworkList() {
        console.log('[CourseworkManager] updateCourseworkList() called');
        console.log('[CourseworkManager] this.courseworks:', this.courseworks);
        console.log('[CourseworkManager] this.courseworks.length:', this.courseworks?.length);

        // Determine which modal is currently active and use the correct container
        const myQuizzesModal = document.getElementById('courseworkMyCourseworksModal');
        const giveModal = document.getElementById('courseworkGiveModal');

        let listContainer = null;

        // Check which modal is active and use the corresponding container
        if (myQuizzesModal && myQuizzesModal.classList.contains('active')) {
            listContainer = document.getElementById('courseworkTutorFilterList');
            console.log('[CourseworkManager] My Quizzes modal is active, using courseworkTutorFilterList:', listContainer);
        } else if (giveModal && giveModal.classList.contains('active')) {
            listContainer = document.getElementById('courseworkTutorList');
            console.log('[CourseworkManager] Give modal is active, using courseworkTutorList:', listContainer);
        } else {
            // Fallback: try both
            listContainer = document.getElementById('courseworkTutorFilterList') || document.getElementById('courseworkTutorList');
            console.log('[CourseworkManager] No active modal found, fallback container:', listContainer);
        }

        console.log('[CourseworkManager] Final listContainer element:', listContainer);
        if (!listContainer) {
            console.log('[CourseworkManager] ERROR: listContainer not found!');
            return;
        }

        console.log('[CourseworkManager] Clearing listContainer innerHTML');
        listContainer.innerHTML = '';

        if (this.courseworks.length === 0) {
            console.log('[CourseworkManager] No courseworks to display');
            listContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No courseworks yet</p>';
            return;
        }

        // Determine what to show based on coursework data structure:
        // - If coursework has tutor_name, it's a student's view (show unique tutors for filtering)
        // - If coursework has student_id but no tutor_name, it's a tutor's view (show individual courseworks)
        const hasStudentCourseworks = this.courseworks.length > 0 &&
            (this.courseworks[0].tutor_name || this.courseworks[0].tutorName);
        console.log('[CourseworkManager] hasStudentCourseworks (has tutor_name):', hasStudentCourseworks);

        // For student view (My Quizzes modal), show unique tutors for filtering
        if (hasStudentCourseworks && myQuizzesModal && myQuizzesModal.classList.contains('active')) {
            // Group courseworks by tutor and show unique tutor cards
            const tutorMap = new Map();
            this.courseworks.forEach(coursework => {
                const tutorName = coursework.tutor_name || coursework.tutorName || 'Unknown Tutor';
                const tutorPicture = coursework.tutor_picture || null;
                if (!tutorMap.has(tutorName)) {
                    tutorMap.set(tutorName, { name: tutorName, picture: tutorPicture, count: 0 });
                }
                tutorMap.get(tutorName).count++;
            });

            // Add "All Tutors" option first
            const allTutorsItem = document.createElement('div');
            allTutorsItem.className = 'p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded transition tutor-filter-item active';
            allTutorsItem.dataset.tutorName = '';
            allTutorsItem.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-content-center text-white font-bold text-lg">
                        <span style="margin: auto;">*</span>
                    </div>
                    <div>
                        <div class="font-semibold">All Tutors</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">${this.courseworks.length} quiz${this.courseworks.length !== 1 ? 'zes' : ''}</div>
                    </div>
                </div>
            `;
            allTutorsItem.addEventListener('click', () => {
                this.filterMyQuizzesByTutor('');
                // Update active state
                listContainer.querySelectorAll('.tutor-filter-item').forEach(item => item.classList.remove('active'));
                allTutorsItem.classList.add('active');
            });
            listContainer.appendChild(allTutorsItem);

            // Add each unique tutor
            tutorMap.forEach((tutor, tutorName) => {
                const tutorItem = document.createElement('div');
                tutorItem.className = 'p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded transition tutor-filter-item';
                tutorItem.dataset.tutorName = tutorName;

                const initials = tutorName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
                const profilePic = tutor.picture
                    ? `<img src="${tutor.picture}" alt="${tutorName}" class="w-10 h-10 rounded-full object-cover">`
                    : `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">${initials}</div>`;

                tutorItem.innerHTML = `
                    <div class="flex items-center gap-3">
                        ${profilePic}
                        <div>
                            <div class="font-semibold">${tutorName}</div>
                            <div class="text-sm text-gray-600 dark:text-gray-400">${tutor.count} quiz${tutor.count !== 1 ? 'zes' : ''}</div>
                        </div>
                    </div>
                `;

                tutorItem.addEventListener('click', () => {
                    this.filterMyQuizzesByTutor(tutorName);
                    // Update active state
                    listContainer.querySelectorAll('.tutor-filter-item').forEach(item => item.classList.remove('active'));
                    tutorItem.classList.add('active');
                });

                listContainer.appendChild(tutorItem);
            });
            console.log(`[CourseworkManager] Added ${tutorMap.size} unique tutor cards + All Tutors option`);
            return;
        }

        // For tutor view (Give Coursework modal), show individual courseworks
        this.courseworks.forEach((coursework, index) => {
            // Handle both camelCase and snake_case property names
            const title = coursework.title || coursework.courseName || coursework.course_name || 'Untitled';
            const courseName = coursework.courseName || coursework.course_name || '';
            const quizType = coursework.quizType || coursework.coursework_type || coursework.quiz_type || 'N/A';
            const status = coursework.status || coursework.coursework_status || 'draft';
            const submissionStatus = coursework.submission_status || coursework.submissionStatus || null;

            // Auto-detect based on data: if tutor_name exists, show it; otherwise show student name
            let personName = 'Unknown';
            if (coursework.tutor_name || coursework.tutorName) {
                // This is a student's coursework - show tutor name
                personName = coursework.tutor_name || coursework.tutorName || 'Unknown Tutor';
            } else {
                // This is a tutor's coursework - show student name
                const studentId = coursework.studentId || coursework.student_id;
                const student = this.students.find(s => s.id === studentId);
                personName = student ? student.name : 'Unknown Student';
            }

            // Check if student has submitted - show Grade label
            const isSubmitted = submissionStatus === 'submitted' || submissionStatus === 'awaiting_grade';
            const isGraded = submissionStatus === 'graded' || submissionStatus === 'completed';

            // Format posted date/time
            const postedAt = coursework.posted_at || coursework.postedAt;
            let postedDateStr = '';
            if (status === 'posted' && postedAt) {
                const postedDate = new Date(postedAt);
                if (!isNaN(postedDate.getTime())) {
                    postedDateStr = postedDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                    });
                }
            }

            console.log(`[CourseworkManager] Coursework ${index}: personName="${personName}", submissionStatus="${submissionStatus}"`);
            const quizItem = document.createElement('div');
            quizItem.className = 'p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded transition';
            quizItem.dataset.courseworkId = coursework.id;
            quizItem.dataset.submissionStatus = submissionStatus || '';

            // Build the card HTML with optional Grade label and posted date
            let cardHTML = `
                <div class="flex items-center justify-between">
                    <div class="font-semibold flex-1">${title}</div>
                    ${isSubmitted ? '<span class="coursework-grade-label needs-grading">Grade</span>' : ''}
                    ${isGraded ? '<span class="coursework-grade-label graded">Graded</span>' : ''}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">${personName} • ${quizType}</div>
                ${courseName ? `<div class="text-xs text-gray-400 dark:text-gray-500">${courseName}</div>` : ''}
                <div class="text-xs text-gray-500">${status === 'posted' ? `Posted${postedDateStr ? ` • ${postedDateStr}` : ''}` : 'Draft'}</div>
            `;
            quizItem.innerHTML = cardHTML;

            quizItem.addEventListener('click', () => {
                this.viewCourseworkDetails(coursework.id);
            });

            listContainer.appendChild(quizItem);
            console.log(`[CourseworkManager] Appended quizItem ${index} to listContainer`);
        });
        console.log(`[CourseworkManager] Done adding ${this.courseworks.length} items. listContainer.children.length:`, listContainer.children.length);
    }

    /**
     * Filter the My Quizzes table by tutor name
     * @param {string} tutorName - The tutor name to filter by, or empty string for all
     */
    filterMyQuizzesByTutor(tutorName) {
        const tableBody = document.getElementById('courseworkMyTableBody');
        if (!tableBody) return;

        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            // The tutor name is in the 3rd column (index 2)
            const tutorCell = row.querySelector('td:nth-child(3)');
            if (tutorCell) {
                const rowTutorName = tutorCell.textContent.trim();
                if (tutorName === '' || rowTutorName === tutorName) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        });
    }

    async viewCourseworkDetails(quizId) {
        const coursework = this.courseworks.find(q => q.id === quizId);
        if (!coursework) return;

        // Preserve submission_status from list data (not included in detail API)
        const submissionStatus = coursework.submission_status || coursework.submissionStatus || null;

        // Fetch full details including questions from API
        try {
            const response = await this.apiRequest(`/api/coursework/${quizId}`);
            if (response.success) {
                this.currentCoursework = {
                    ...response.coursework,
                    questions: response.questions || [],
                    // Preserve submission_status from list data
                    submission_status: submissionStatus
                };
            } else {
                this.currentCoursework = coursework;
            }
        } catch (error) {
            console.error('Error fetching coursework details:', error);
            this.currentCoursework = coursework;
        }

        console.log('[CourseworkManager] viewCourseworkDetails - submission_status:', this.currentCoursework.submission_status);
        this.openViewCourseworkDetailsModal();
    }

    openViewCourseworkDetailsModal() {
        if (!this.currentCoursework) return;

        this.closeAllModals();
        const modal = document.getElementById('courseworkViewDetailsModal');
        if (!modal) return;

        modal.classList.add('active');

        // Initialize sidebar filter state
        this.detailsSidebarFilter = 'all';
        this.detailsSidebarSearch = '';
        this.isGradingView = false; // Track if we're in grading view
        this.isViewingGrading = false; // Track if we're viewing grading results

        // Reset filter tabs to 'all'
        const filterTabs = modal.querySelectorAll('.coursework-filter-tab');
        filterTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.filter === 'all');
        });

        // Clear search input
        const searchInput = document.getElementById('courseworkDetailsSearch');
        if (searchInput) searchInput.value = '';

        // Update sidebar header with student info
        this.updateDetailsSidebarHeader();

        // Populate sidebar with courseworks
        this.renderDetailsSidebarList();

        // Render the details
        this.renderCourseworkDetails();

        // Update title and buttons for details view
        this.updateDetailsViewState();
    }

    /**
     * Update the view state (title, buttons) based on whether we're in grading or details view
     */
    updateDetailsViewState() {
        const titleEl = document.getElementById('courseworkDetailsTitle');
        const submitGradeBtn = document.getElementById('courseworkSubmitGradeBtn');
        const gradeBtn = document.getElementById('courseworkGradeBtn');
        const editGradeBtn = document.getElementById('courseworkEditGradeBtn');
        const viewGradingBtn = document.getElementById('courseworkViewGradingBtn');
        const editBtn = document.getElementById('courseworkEditBtn');
        const postBtn = document.getElementById('courseworkPostFromViewBtn');
        const deleteBtn = document.getElementById('courseworkDeleteBtn');

        if (this.isGradingView) {
            // Grading view state (editing grades)
            if (titleEl) titleEl.innerHTML = '<span>📝</span> Grade Submission';
            submitGradeBtn?.classList.remove('hidden');
            gradeBtn?.classList.add('hidden');
            editGradeBtn?.classList.add('hidden');
            viewGradingBtn?.classList.add('hidden');
            editBtn?.classList.add('hidden');
            postBtn?.classList.add('hidden');
            deleteBtn?.classList.add('hidden');
        } else if (this.isViewingGrading) {
            // Viewing grading results state (read-only) - show Edit Grade button
            if (titleEl) titleEl.innerHTML = '<span>📊</span> Grading Results';
            submitGradeBtn?.classList.add('hidden');
            gradeBtn?.classList.add('hidden');
            editGradeBtn?.classList.remove('hidden');  // Show Edit Grade button when viewing graded results
            viewGradingBtn?.classList.add('hidden');
            editBtn?.classList.add('hidden');
            postBtn?.classList.add('hidden');
            deleteBtn?.classList.add('hidden');
        } else {
            // Details view state
            if (titleEl) titleEl.innerHTML = '<span>📋</span> Coursework Details';
            submitGradeBtn?.classList.add('hidden');
            editGradeBtn?.classList.add('hidden');

            // Show/hide buttons based on coursework status
            const coursework = this.currentCoursework;
            if (coursework) {
                const status = coursework.status || 'draft';
                const submissionStatus = coursework.submission_status || coursework.submissionStatus;
                const isGraded = submissionStatus === 'graded' || submissionStatus === 'completed';

                // Show Grade button only if submitted and awaiting grade
                if (status === 'posted' && (submissionStatus === 'submitted' || submissionStatus === 'awaiting_grade')) {
                    gradeBtn?.classList.remove('hidden');
                } else {
                    gradeBtn?.classList.add('hidden');
                }

                // Show View Grading button if graded
                if (isGraded) {
                    viewGradingBtn?.classList.remove('hidden');
                } else {
                    viewGradingBtn?.classList.add('hidden');
                }

                // Show Edit and Delete for drafts
                if (status === 'draft') {
                    editBtn?.classList.remove('hidden');
                    postBtn?.classList.remove('hidden');
                    deleteBtn?.classList.remove('hidden');
                } else {
                    editBtn?.classList.add('hidden');
                    postBtn?.classList.add('hidden');
                    deleteBtn?.classList.add('hidden');
                }
            }
        }
    }

    /**
     * Handle back button click - goes back to the previous modal or exits grading/viewing mode
     */
    goBackFromDetails() {
        if (this.isGradingView) {
            // Exit grading view, return to details view
            this.isGradingView = false;
            this.renderCourseworkDetails();
            this.updateDetailsViewState();
        } else if (this.isViewingGrading) {
            // Exit viewing grading results, return to details view
            this.isViewingGrading = false;
            this.renderCourseworkDetails();
            this.updateDetailsViewState();
        } else {
            // Go back to the previous modal based on where we came from
            this.closeAllModals();
            if (this.previousModal === 'myQuizzes') {
                this.openMyCourseworksModal();
            } else {
                // Default to give coursework modal for tutors
                this.openGiveCourseworkModal();
            }
        }
    }

    /**
     * Update the sidebar header with student name only
     * Metadata (course, type, time, etc.) is now shown in each coursework card
     */
    updateDetailsSidebarHeader() {
        const headerEl = document.getElementById('courseworkDetailsSidebarHeader');
        if (!headerEl) return;

        const coursework = this.currentCoursework;
        if (!coursework) {
            headerEl.innerHTML = '';
            return;
        }

        // Check if this is a student view (has tutor_name) or tutor view
        const isStudentView = coursework.tutor_name || coursework.tutor_full_name;

        let headerHTML = '';
        if (isStudentView) {
            // For students: show "My Courseworks" and count
            const courseworkCount = this.courseworks.length;
            headerHTML = `
                <div class="sidebar-info-item sidebar-info-student">
                    <span class="sidebar-info-icon">📚</span>
                    <div class="sidebar-info-content">
                        <span class="sidebar-info-label">My Courseworks</span>
                        <span class="sidebar-info-value">${courseworkCount} Total</span>
                    </div>
                </div>
            `;
        } else {
            // For tutors: show student name and their coursework count
            const studentId = coursework.studentId || coursework.student_id;
            const student = this.students.find(s => s.id === studentId);
            const studentName = student ? student.name : (coursework.student_full_name || 'Unknown Student');

            // Count courseworks for this student
            const studentCourseworks = this.courseworks.filter(c =>
                (c.studentId || c.student_id) === studentId
            );

            headerHTML = `
                <div class="sidebar-info-item sidebar-info-student">
                    <span class="sidebar-info-icon">👤</span>
                    <div class="sidebar-info-content">
                        <span class="sidebar-info-label">Student</span>
                        <span class="sidebar-info-value">${studentName}</span>
                    </div>
                </div>
                <div class="sidebar-info-count">
                    ${studentCourseworks.length} Coursework${studentCourseworks.length !== 1 ? 's' : ''}
                </div>
            `;
        }

        headerEl.innerHTML = headerHTML;
    }

    /**
     * Render the sidebar list with courseworks for current student
     */
    renderDetailsSidebarList() {
        const listContainer = document.getElementById('courseworkDetailsSidebarList');
        if (!listContainer) return;

        const coursework = this.currentCoursework;
        if (!coursework) {
            listContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No coursework selected</p>';
            return;
        }

        // Check if this is a student view (has tutor_name) or tutor view (has student_id)
        const isStudentView = coursework.tutor_name || coursework.tutor_full_name;

        let filteredCourseworks;
        if (isStudentView) {
            // For students: show all their courseworks (all belong to them)
            filteredCourseworks = [...this.courseworks];
        } else {
            // For tutors: filter by student_id
            const studentId = coursework.studentId || coursework.student_id;
            filteredCourseworks = this.courseworks.filter(c =>
                (c.studentId || c.student_id) === studentId
            );
        }

        // Apply status filter
        if (this.detailsSidebarFilter && this.detailsSidebarFilter !== 'all') {
            filteredCourseworks = filteredCourseworks.filter(c => {
                // Handle both tutor API (status) and student API (coursework_status)
                const status = c.status || c.coursework_status || 'draft';
                const submissionStatus = c.submission_status || c.submissionStatus || null;

                switch (this.detailsSidebarFilter) {
                    case 'draft':
                        return status === 'draft';
                    case 'posted':
                        return status === 'posted' && !submissionStatus;
                    case 'submitted':
                        return submissionStatus === 'submitted' || submissionStatus === 'awaiting_grade';
                    case 'graded':
                        return submissionStatus === 'graded' || submissionStatus === 'completed';
                    default:
                        return true;
                }
            });
        }

        // Apply search filter
        if (this.detailsSidebarSearch) {
            const query = this.detailsSidebarSearch.toLowerCase();
            filteredCourseworks = filteredCourseworks.filter(c => {
                const title = (c.title || '').toLowerCase();
                const courseName = (c.courseName || c.course_name || '').toLowerCase();
                const quizType = (c.quizType || c.coursework_type || c.quiz_type || '').toLowerCase();
                return title.includes(query) || courseName.includes(query) || quizType.includes(query);
            });
        }

        listContainer.innerHTML = '';

        if (filteredCourseworks.length === 0) {
            listContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No courseworks found</p>';
            return;
        }

        filteredCourseworks.forEach(c => {
            const title = c.title || c.courseName || c.course_name || 'Untitled';
            const courseName = c.courseName || c.course_name || 'N/A';
            const quizType = c.quizType || c.coursework_type || c.quiz_type || 'N/A';
            const quizTime = c.quizTime || c.time_limit || 0;
            const quizDays = c.quizDays || c.days_to_complete || 0;
            // Handle both tutor API (status) and student API (coursework_status)
            const status = c.status || c.coursework_status || 'draft';
            const submissionStatus = c.submission_status || c.submissionStatus || null;
            const isActive = c.id === coursework.id;
            const questions = c.questions || [];
            const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

            // Calculate due date
            let dueDateStr = 'Not set';
            if (c.dueDate || c.due_date) {
                const dueDate = new Date(c.dueDate || c.due_date);
                if (!isNaN(dueDate.getTime())) {
                    dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
            } else if (quizDays > 0 && (c.created_at || c.createdAt)) {
                const createdDate = new Date(c.created_at || c.createdAt);
                if (!isNaN(createdDate.getTime())) {
                    const dueDate = new Date(createdDate);
                    dueDate.setDate(dueDate.getDate() + quizDays);
                    dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
            }

            // Format posted date
            const postedAt = c.posted_at || c.postedAt;
            let postedDateStr = '';
            if (postedAt) {
                const postedDate = new Date(postedAt);
                if (!isNaN(postedDate.getTime())) {
                    postedDateStr = postedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
            }

            // Determine display status
            let statusClass = 'status-draft';
            let statusText = 'Draft';
            if (status === 'posted') {
                if (submissionStatus === 'graded' || submissionStatus === 'completed') {
                    statusClass = 'status-graded';
                    statusText = 'Graded';
                } else if (submissionStatus === 'submitted' || submissionStatus === 'awaiting_grade') {
                    statusClass = 'status-submitted';
                    statusText = 'Submitted';
                } else {
                    statusClass = 'status-posted';
                    statusText = 'Posted';
                }
            }

            const item = document.createElement('div');
            item.className = `coursework-sidebar-item${isActive ? ' active' : ''}`;
            item.dataset.courseworkId = c.id;
            item.innerHTML = `
                <div class="coursework-sidebar-item-header">
                    <span class="coursework-sidebar-item-title">${title}</span>
                    <span class="coursework-sidebar-item-status ${statusClass}">${statusText}</span>
                </div>
                <div class="coursework-sidebar-item-details">
                    <div class="coursework-card-row">
                        <span class="coursework-card-label">Course:</span>
                        <span class="coursework-card-value">${courseName}</span>
                    </div>
                    <div class="coursework-card-row">
                        <span class="coursework-card-label">Type:</span>
                        <span class="coursework-card-value">${quizType}</span>
                    </div>
                    <div class="coursework-card-meta-grid">
                        <div class="coursework-card-meta-item">
                            <span class="coursework-card-meta-label">Time</span>
                            <span class="coursework-card-meta-value">${quizTime}m</span>
                        </div>
                        <div class="coursework-card-meta-item">
                            <span class="coursework-card-meta-label">Due</span>
                            <span class="coursework-card-meta-value">${dueDateStr}</span>
                        </div>
                        <div class="coursework-card-meta-item">
                            <span class="coursework-card-meta-label">Points</span>
                            <span class="coursework-card-meta-value">${totalPoints}</span>
                        </div>
                        ${postedDateStr ? `
                        <div class="coursework-card-meta-item">
                            <span class="coursework-card-meta-label">Posted</span>
                            <span class="coursework-card-meta-value">${postedDateStr}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;

            item.addEventListener('click', () => {
                this.viewCourseworkDetails(c.id);
            });

            listContainer.appendChild(item);
        });
    }

    /**
     * Filter the details sidebar by status
     * @param {string} filter - 'all', 'draft', 'posted', or 'submitted'
     */
    filterDetailsSidebar(filter) {
        this.detailsSidebarFilter = filter;

        // Update active tab
        const modal = document.getElementById('courseworkViewDetailsModal');
        if (modal) {
            const tabs = modal.querySelectorAll('.coursework-filter-tab');
            tabs.forEach(tab => {
                tab.classList.toggle('active', tab.dataset.filter === filter);
            });
        }

        this.renderDetailsSidebarList();
    }

    /**
     * Search the details sidebar
     * @param {string} query - Search query
     */
    searchDetailsSidebar(query) {
        this.detailsSidebarSearch = query.toLowerCase().trim();
        this.renderDetailsSidebarList();
    }

    async renderCourseworkDetails() {
        const detailsContainer = document.getElementById('courseworkDetailsContent');
        if (!detailsContainer) return;

        const coursework = this.currentCoursework;
        if (!coursework) {
            detailsContainer.innerHTML = '<p class="text-gray-500 text-center py-4">No coursework selected</p>';
            return;
        }

        // Get questions for display
        const questions = coursework.questions || [];
        const status = coursework.status || 'draft';

        // Get submission status
        const submissionStatus = coursework.submission_status || coursework.submissionStatus || null;
        const isSubmitted = submissionStatus === 'submitted' || submissionStatus === 'awaiting_grade';
        const isGraded = submissionStatus === 'graded' || submissionStatus === 'completed';
        const isPosted = status === 'posted';

        console.log('[CourseworkManager] renderCourseworkDetails - submissionStatus:', submissionStatus, 'isSubmitted:', isSubmitted, 'isGraded:', isGraded, 'isPosted:', isPosted);

        // If graded, fetch and display graded results with tutor feedback
        if (isGraded) {
            // Set flag so Edit Grade button shows
            this.isViewingGrading = true;
            this.updateDetailsViewState();
            await this.renderGradedResults(detailsContainer, coursework);
            return; // Exit early since updateDetailsViewState handles buttons
        } else {
            // Show regular question preview
            this.isViewingGrading = false;
            this.renderQuestionPreview(detailsContainer, questions);
        }

        // Update buttons visibility
        const postBtn = document.getElementById('courseworkPostFromViewBtn');
        const editBtn = document.getElementById('courseworkEditBtn');
        const deleteBtn = document.getElementById('courseworkDeleteBtn');
        const gradeBtn = document.getElementById('courseworkGradeBtn');
        const viewGradingBtn = document.getElementById('courseworkViewGradingBtn');

        // Hide Post button if already posted
        if (postBtn) {
            postBtn.style.display = isPosted ? 'none' : 'inline-flex';
        }

        // Hide Edit/Delete buttons when coursework is posted
        if (editBtn) {
            editBtn.style.display = isPosted ? 'none' : 'inline-flex';
        }
        if (deleteBtn) {
            deleteBtn.style.display = isPosted ? 'none' : 'inline-flex';
        }

        // Show Grade button when student has submitted (and not yet graded)
        if (gradeBtn) {
            gradeBtn.style.display = isSubmitted ? 'inline-flex' : 'none';
            gradeBtn.classList.remove('hidden');
            if (!isSubmitted) {
                gradeBtn.classList.add('hidden');
            }
        }

        // Show View Grading button when coursework has been graded
        if (viewGradingBtn) {
            viewGradingBtn.style.display = isGraded ? 'inline-flex' : 'none';
            viewGradingBtn.classList.remove('hidden');
            if (!isGraded) {
                viewGradingBtn.classList.add('hidden');
            }
        }
    }

    /**
     * Render the question preview (for drafts/posted courseworks)
     */
    renderQuestionPreview(detailsContainer, questions) {
        let detailsHTML = `
            <div class="coursework-questions-preview">
                <h3 class="coursework-section-title">Questions (${questions.length})</h3>
        `;

        if (questions.length === 0) {
            detailsHTML += '<p class="text-gray-500 text-center py-4">No questions added yet</p>';
        } else {
            questions.forEach((q, index) => {
                // Handle both camelCase and snake_case from API
                const questionPoints = q.points || 1;
                const questionType = q.type || q.question_type || 'unknown';
                const questionText = q.text || q.question_text || 'No question text';
                const correctAnswer = q.correctAnswer || q.correct_answer || '';
                const sampleAnswer = q.sampleAnswer || q.sample_answer || '';

                detailsHTML += `
                    <div class="coursework-question-preview">
                        <div class="coursework-question-header">
                            <span class="coursework-question-number">Question ${index + 1}</span>
                            <span class="coursework-question-points-badge">🎯 ${questionPoints} pt${questionPoints !== 1 ? 's' : ''}</span>
                            <span class="coursework-question-type-badge">${this.formatQuestionType(questionType)}</span>
                        </div>
                        <div class="coursework-question-text">${questionText}</div>
                `;

                if (questionType === 'multipleChoice' && q.choices && q.choices.length > 0) {
                    detailsHTML += '<div class="coursework-choices">';
                    q.choices.forEach((choice, i) => {
                        const letter = String.fromCharCode(65 + i);
                        const isCorrect = correctAnswer.toUpperCase() === letter;
                        detailsHTML += `
                            <div class="coursework-choice ${isCorrect ? 'correct-choice' : ''}">
                                <span class="choice-letter">${letter}.</span>
                                <span>${choice}</span>
                                ${isCorrect ? '<span class="correct-indicator">✓</span>' : ''}
                            </div>
                        `;
                    });
                    detailsHTML += '</div>';
                } else if (questionType === 'trueFalse') {
                    detailsHTML += `
                        <div class="coursework-answer">
                            <strong>Correct Answer:</strong>
                            <span class="correct-answer">${correctAnswer === 'true' ? 'True' : 'False'}</span>
                        </div>
                    `;
                } else if (questionType === 'openEnded' && sampleAnswer) {
                    detailsHTML += `
                        <div class="coursework-answer">
                            <strong>Sample Answer:</strong>
                            <div class="sample-answer">${sampleAnswer}</div>
                        </div>
                    `;
                }

                detailsHTML += '</div>';
            });
        }

        detailsHTML += '</div>';
        detailsContainer.innerHTML = detailsHTML;
    }

    /**
     * Render graded results with student answers and tutor feedback
     */
    async renderGradedResults(detailsContainer, coursework) {
        const courseworkId = coursework.id;

        // Show loading
        detailsContainer.innerHTML = '<p class="text-gray-500 text-center py-4">Loading graded results...</p>';

        try {
            // Determine which endpoint to use based on actual user role from localStorage
            // NOT based on tutor_name presence (which exists for both roles)
            const currentRole = (localStorage.getItem('currentRole') ||
                               (window.authManager && window.authManager.getCurrentRole ?
                                window.authManager.getCurrentRole() : 'tutor')).toLowerCase();

            const isStudentView = currentRole === 'student';
            console.log('[CourseworkManager] renderGradedResults - currentRole:', currentRole, 'isStudentView:', isStudentView);

            const endpoint = isStudentView
                ? `/api/coursework/${courseworkId}/student-results`
                : `/api/coursework/${courseworkId}/submission`;

            // Fetch submission data from API
            const response = await this.apiRequest(endpoint);

            if (!response.success) {
                detailsContainer.innerHTML = '<p class="text-red-500 text-center py-4">Failed to load graded results</p>';
                return;
            }

            const submission = response.submission;
            const questions = response.questions || [];
            const answers = response.answers || [];

            // Debug: Log answers to verify tutor_feedback is present
            console.log('[CourseworkManager] renderGradedResults - answers:', answers);
            console.log('[CourseworkManager] renderGradedResults - submission:', submission);

            // Create answer lookup map (use string keys to avoid type mismatches)
            const answerMap = {};
            answers.forEach(a => {
                answerMap[String(a.question_id)] = a;
            });
            console.log('[CourseworkManager] renderGradedResults - answerMap:', answerMap);

            // Get student name
            const studentId = coursework.studentId || coursework.student_id;
            const student = this.students.find(s => s.id === studentId);
            const studentName = student ? student.name : (coursework.student_full_name || 'Unknown Student');

            // Calculate totals
            const totalPossiblePoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
            const scoredPoints = submission.scored_points || 0;
            const gradePercentage = submission.grade_percentage || 0;

            // Determine grade class
            let gradeClass = 'grade-poor';
            if (gradePercentage >= 90) gradeClass = 'grade-excellent';
            else if (gradePercentage >= 70) gradeClass = 'grade-good';
            else if (gradePercentage >= 50) gradeClass = 'grade-average';

            let detailsHTML = `
                <div class="coursework-grading-header">
                    <div class="grading-header-title">Graded Results</div>
                    <div class="grading-header-meta">
                        <div class="grading-meta-item">
                            <span class="grading-meta-label">Student</span>
                            <span class="grading-meta-value">${studentName}</span>
                        </div>
                        <div class="grading-meta-item">
                            <span class="grading-meta-label">Graded</span>
                            <span class="grading-meta-value">${submission.graded_at ? new Date(submission.graded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                        </div>
                        <div class="grading-meta-item grading-meta-points ${gradeClass}">
                            <span class="grading-meta-label">Score</span>
                            <span class="grading-meta-value">${scoredPoints} / ${totalPossiblePoints} (${gradePercentage.toFixed(1)}%)</span>
                        </div>
                    </div>
                </div>

                <div class="coursework-grading-questions">
            `;

            questions.forEach((q, index) => {
                const questionId = q.id;
                const studentAnswer = answerMap[String(questionId)] || {};
                const questionPoints = q.points || 1;
                const questionType = q.question_type || q.type || 'unknown';
                const questionText = q.question_text || q.text || 'No question text';
                const correctAnswer = q.correct_answer || q.correctAnswer || '';
                const studentAnswerText = studentAnswer.answer_text || 'No answer provided';
                const pointsAwarded = studentAnswer.points_awarded || 0;
                const tutorFeedback = studentAnswer.tutor_feedback || '';
                const isCorrect = studentAnswer.is_correct;

                detailsHTML += `
                    <div class="coursework-grading-question">
                        <div class="coursework-question-header">
                            <span class="coursework-question-number">Question ${index + 1}</span>
                            <span class="coursework-question-type-badge">${this.formatQuestionType(questionType)}</span>
                            <span class="coursework-question-points-badge">${pointsAwarded} / ${questionPoints} pt${questionPoints !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="coursework-question-text">${questionText}</div>
                `;

                // Show student's answer based on question type
                if (questionType === 'multipleChoice' && q.choices && q.choices.length > 0) {
                    detailsHTML += '<div class="coursework-choices mt-2">';
                    const choices = typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices;
                    choices.forEach((choice, i) => {
                        const letter = String.fromCharCode(65 + i);
                        const isCorrectChoice = correctAnswer.toUpperCase() === letter;
                        const isStudentChoice = studentAnswerText.toUpperCase() === letter;
                        let choiceClass = '';
                        if (isCorrectChoice && isStudentChoice) choiceClass = 'correct-choice';
                        else if (isStudentChoice && !isCorrectChoice) choiceClass = 'incorrect-choice';
                        else if (isCorrectChoice) choiceClass = 'correct-choice faded';

                        detailsHTML += `
                            <div class="coursework-choice ${choiceClass}">
                                <span class="choice-letter">${letter}.</span>
                                <span>${choice}</span>
                                ${isStudentChoice ? '<span class="student-choice-indicator">← Student\'s answer</span>' : ''}
                                ${isCorrectChoice ? '<span class="correct-indicator">✓ Correct</span>' : ''}
                            </div>
                        `;
                    });
                    detailsHTML += '</div>';
                } else if (questionType === 'trueFalse') {
                    const isStudentCorrect = studentAnswerText.toLowerCase() === correctAnswer.toLowerCase();
                    detailsHTML += `
                        <div class="coursework-tf-answer mt-2">
                            <div class="tf-answer-row">
                                <div class="tf-student-answer ${isStudentCorrect ? 'tf-correct' : 'tf-incorrect'}">
                                    <span class="tf-label">Student's Answer</span>
                                    <span class="tf-value">${studentAnswerText || 'No answer'}</span>
                                </div>
                                ${isStudentCorrect ? `
                                    <div class="tf-result tf-result-correct">
                                        <span class="tf-check">✓</span>
                                        <span>Correct</span>
                                    </div>
                                ` : `
                                    <div class="tf-correct-answer">
                                        <span class="tf-label">Correct Answer</span>
                                        <span class="tf-value">${correctAnswer}</span>
                                    </div>
                                `}
                            </div>
                        </div>
                    `;
                } else {
                    // Open-ended
                    detailsHTML += `
                        <div class="coursework-answer mt-2">
                            <p><strong>Student's Answer:</strong></p>
                            <div class="student-answer-box">${studentAnswerText}</div>
                            ${q.sample_answer || q.sampleAnswer ? `
                                <p class="mt-2"><strong>Sample Answer:</strong></p>
                                <div class="sample-answer-box">${q.sample_answer || q.sampleAnswer}</div>
                            ` : ''}
                        </div>
                    `;
                }

                // Show tutor feedback if provided
                if (tutorFeedback) {
                    detailsHTML += `
                        <div class="coursework-tutor-feedback mt-3">
                            <div class="tutor-feedback-label">
                                <span class="tutor-feedback-icon">💬</span>
                                <strong>Tutor Feedback:</strong>
                            </div>
                            <div class="tutor-feedback-text">${tutorFeedback}</div>
                        </div>
                    `;
                }

                detailsHTML += '</div>';
            });

            detailsHTML += '</div>';

            // Show overall feedback if provided
            if (submission.tutor_feedback) {
                detailsHTML += `
                    <div class="coursework-overall-feedback-display mt-4">
                        <div class="overall-feedback-label">
                            <span class="overall-feedback-icon">📝</span>
                            <strong>Overall Feedback:</strong>
                        </div>
                        <div class="overall-feedback-text">${submission.tutor_feedback}</div>
                    </div>
                `;
            }

            detailsContainer.innerHTML = detailsHTML;

        } catch (error) {
            console.error('Error fetching graded results:', error);
            detailsContainer.innerHTML = '<p class="text-red-500 text-center py-4">Error loading graded results</p>';
        }
    }

    formatQuestionType(type) {
        const types = {
            'multipleChoice': 'Multiple Choice',
            'trueFalse': 'True/False',
            'openEnded': 'Open Ended'
        };
        return types[type] || type;
    }

    /**
     * View grading results - shows how the tutor graded the coursework (read-only view)
     */
    async viewGradingResults() {
        if (!this.currentCoursework) {
            console.error('No coursework selected');
            return;
        }

        const detailsContainer = document.getElementById('courseworkDetailsContent');
        if (!detailsContainer) return;

        // Set a flag to track we're in grading view mode
        this.isViewingGrading = true;

        // Update buttons state (this will show Edit Grade button and update title)
        this.updateDetailsViewState();

        // Render the graded results
        await this.renderGradedResults(detailsContainer, this.currentCoursework);
    }

    // ========== GRADING FUNCTIONALITY ==========

    /**
     * Open grading view - transforms details modal to show student's answers for grading
     */
    async openGradingView() {
        if (!this.currentCoursework) {
            console.error('No coursework selected for grading');
            return;
        }

        const courseworkId = this.currentCoursework.id;
        console.log('[CourseworkManager] Opening grading view for coursework:', courseworkId);

        try {
            // Fetch submission data from API
            const response = await this.apiRequest(`/api/coursework/${courseworkId}/submission`);

            if (!response.success) {
                this.showToast('Failed to load submission', 'error');
                return;
            }

            this.currentSubmission = response.submission;
            this.currentSubmissionAnswers = response.answers || [];
            this.currentSubmissionQuestions = response.questions || [];

            this.renderGradingView();

        } catch (error) {
            console.error('Error fetching submission for grading:', error);
            this.showToast('Error loading submission', 'error');
        }
    }

    /**
     * Render the grading view in the details modal
     */
    renderGradingView() {
        const detailsContainer = document.getElementById('courseworkDetailsContent');
        if (!detailsContainer) return;

        const coursework = this.currentCoursework;
        const submission = this.currentSubmission;
        const questions = this.currentSubmissionQuestions;
        const answers = this.currentSubmissionAnswers;

        // Get student name
        const studentId = coursework.studentId || coursework.student_id;
        const student = this.students.find(s => s.id === studentId);
        const studentName = student ? student.name : (coursework.student_full_name || 'Unknown Student');

        // Create answer lookup map
        const answerMap = {};
        answers.forEach(a => {
            answerMap[a.question_id] = a;
        });

        // Calculate total possible points
        const totalPossiblePoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

        // Format submission time
        const submittedDate = new Date(submission.submitted_at);
        const submittedStr = submittedDate.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit'
        });
        const timeTakenMin = Math.floor((submission.time_taken || 0) / 60);
        const timeTakenSec = (submission.time_taken || 0) % 60;

        let gradingHTML = `
            <div class="coursework-grading-header">
                <div class="grading-header-title">${coursework.title || coursework.course_name || 'Coursework'}</div>
                <div class="grading-header-meta">
                    <div class="grading-meta-item">
                        <span class="grading-meta-label">Student</span>
                        <span class="grading-meta-value">${studentName}</span>
                    </div>
                    <div class="grading-meta-item">
                        <span class="grading-meta-label">Submitted</span>
                        <span class="grading-meta-value">${submittedStr}</span>
                    </div>
                    <div class="grading-meta-item">
                        <span class="grading-meta-label">Time Taken</span>
                        <span class="grading-meta-value">${timeTakenMin}m ${timeTakenSec}s</span>
                    </div>
                    <div class="grading-meta-item grading-meta-points">
                        <span class="grading-meta-label">Points</span>
                        <span class="grading-meta-value"><span id="gradingHeaderPoints">0</span> / ${totalPossiblePoints}</span>
                    </div>
                </div>
            </div>

            <div class="coursework-grading-questions">
        `;

        questions.forEach((q, index) => {
            const questionId = q.id;
            const studentAnswer = answerMap[questionId] || {};
            const questionPoints = q.points || 1;
            const questionType = q.question_type || q.type || 'unknown';
            const questionText = q.question_text || q.text || 'No question text';
            const correctAnswer = q.correct_answer || q.correctAnswer || '';
            const studentAnswerText = studentAnswer.answer_text || 'No answer provided';

            // Check if auto-graded (multiple choice / true-false)
            const isAutoGraded = questionType === 'multipleChoice' || questionType === 'trueFalse';

            // Calculate correctness for auto-graded types if not already set by backend
            let isCorrect = studentAnswer.is_correct;
            if (isCorrect === undefined || isCorrect === null) {
                if (questionType === 'trueFalse' && correctAnswer) {
                    // True/False: compare case-insensitive
                    isCorrect = studentAnswerText.toLowerCase() === correctAnswer.toLowerCase();
                } else if (questionType === 'multipleChoice' && correctAnswer) {
                    // Multiple Choice: compare the letter (A, B, C, D)
                    isCorrect = studentAnswerText.toUpperCase() === correctAnswer.toUpperCase();
                }
            }

            // Calculate points: use stored value, or auto-calculate for auto-graded types
            const pointsAwarded = studentAnswer.points_awarded !== null && studentAnswer.points_awarded !== undefined
                ? studentAnswer.points_awarded
                : (isAutoGraded && isCorrect ? questionPoints : 0);

            gradingHTML += `
                <div class="coursework-grading-question" data-question-id="${questionId}">
                    <div class="coursework-question-header">
                        <span class="coursework-question-number">Question ${index + 1}</span>
                        <span class="coursework-question-type-badge">${this.formatQuestionType(questionType)}</span>
                        <span class="coursework-question-points-badge">Max: ${questionPoints} pt${questionPoints !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="coursework-question-text">${questionText}</div>
            `;

            // Show choices for multiple choice
            if (questionType === 'multipleChoice' && q.choices && q.choices.length > 0) {
                gradingHTML += '<div class="coursework-choices mt-2">';
                q.choices.forEach((choice, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const isCorrectChoice = correctAnswer.toUpperCase() === letter;
                    const isStudentChoice = studentAnswerText.toUpperCase() === letter;
                    let choiceClass = '';
                    if (isCorrectChoice && isStudentChoice) choiceClass = 'correct-choice';
                    else if (isStudentChoice && !isCorrectChoice) choiceClass = 'incorrect-choice';
                    else if (isCorrectChoice) choiceClass = 'correct-choice faded';

                    gradingHTML += `
                        <div class="coursework-choice ${choiceClass}">
                            <span class="choice-letter">${letter}.</span>
                            <span>${choice}</span>
                            ${isStudentChoice ? '<span class="student-choice-indicator">← Student\'s answer</span>' : ''}
                            ${isCorrectChoice ? '<span class="correct-indicator">✓ Correct</span>' : ''}
                        </div>
                    `;
                });
                gradingHTML += '</div>';
            } else if (questionType === 'trueFalse') {
                const isStudentCorrect = studentAnswerText.toLowerCase() === correctAnswer.toLowerCase();
                gradingHTML += `
                    <div class="coursework-tf-answer mt-2">
                        <div class="tf-answer-row">
                            <div class="tf-student-answer ${isStudentCorrect ? 'tf-correct' : 'tf-incorrect'}">
                                <span class="tf-label">Student's Answer</span>
                                <span class="tf-value">${studentAnswerText || 'No answer'}</span>
                            </div>
                            ${isStudentCorrect ? `
                                <div class="tf-result tf-result-correct">
                                    <span class="tf-check">✓</span>
                                    <span>Correct</span>
                                </div>
                            ` : `
                                <div class="tf-correct-answer">
                                    <span class="tf-label">Correct Answer</span>
                                    <span class="tf-value">${correctAnswer}</span>
                                </div>
                            `}
                        </div>
                    </div>
                `;
            } else {
                // Open-ended - show sample answer and student's answer
                gradingHTML += `
                    <div class="coursework-answer mt-2">
                        <p><strong>Student's Answer:</strong></p>
                        <div class="student-answer-box">${studentAnswerText}</div>
                        ${q.sample_answer || q.sampleAnswer ? `
                            <p class="mt-2"><strong>Sample Answer:</strong></p>
                            <div class="sample-answer-box">${q.sample_answer || q.sampleAnswer}</div>
                        ` : ''}
                    </div>
                `;
            }

            // Points input field
            gradingHTML += `
                <div class="coursework-grading-input mt-3">
                    <div class="grading-input-row">
                        <div class="grading-input-group">
                            <label class="grading-input-label">Points Awarded</label>
                            <div class="grading-input-wrapper">
                                <input type="number"
                                       class="coursework-grade-points-input"
                                       data-question-id="${questionId}"
                                       data-max-points="${questionPoints}"
                                       min="0"
                                       max="${questionPoints}"
                                       step="0.5"
                                       value="${pointsAwarded}"
                                       ${isAutoGraded ? 'readonly' : ''}>
                                <span class="grading-input-max">/ ${questionPoints}</span>
                            </div>
                        </div>
                        ${isAutoGraded ? `
                            <div class="auto-graded-badge ${isCorrect ? 'auto-graded-correct' : 'auto-graded-incorrect'}">
                                <span class="auto-graded-icon">${isCorrect ? '✓' : '✗'}</span>
                                <span class="auto-graded-text">Auto-graded</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="coursework-grading-feedback mt-2">
                    <label class="block text-sm font-medium mb-1">Feedback (optional):</label>
                    <textarea class="coursework-grade-feedback-input"
                              data-question-id="${questionId}"
                              rows="2"
                              placeholder="Add feedback for this answer...">${studentAnswer.tutor_feedback || ''}</textarea>
                </div>
            </div>
            `;
        });

        gradingHTML += `
            </div>

            <div class="coursework-grading-footer">
                <div class="coursework-grading-overall">
                    <label class="grading-feedback-label">Overall Feedback (optional)</label>
                    <textarea id="courseworkOverallFeedback"
                              class="coursework-overall-feedback-input"
                              rows="3"
                              placeholder="Add overall feedback for this submission...">${submission.tutor_feedback || ''}</textarea>
                </div>
            </div>
        `;

        detailsContainer.innerHTML = gradingHTML;

        // Set grading view state and update buttons
        this.isGradingView = true;
        this.updateDetailsViewState();

        // Add event listeners to update totals in real-time
        const pointsInputs = detailsContainer.querySelectorAll('.coursework-grade-points-input');
        pointsInputs.forEach(input => {
            input.addEventListener('input', () => this.updateGradingTotals());
        });

        // Calculate initial totals
        this.updateGradingTotals();
    }

    /**
     * Update grading totals when points are changed
     */
    updateGradingTotals() {
        const pointsInputs = document.querySelectorAll('.coursework-grade-points-input');
        let totalPoints = 0;
        let maxPoints = 0;

        pointsInputs.forEach(input => {
            const value = parseFloat(input.value) || 0;
            const max = parseFloat(input.dataset.maxPoints) || 1;
            totalPoints += value;
            maxPoints += max;
        });

        const percentage = maxPoints > 0 ? (totalPoints / maxPoints * 100) : 0;

        // Update header points display
        const headerPointsEl = document.getElementById('gradingHeaderPoints');
        if (headerPointsEl) {
            headerPointsEl.textContent = totalPoints;
            // Add color based on percentage
            const metaItem = headerPointsEl.closest('.grading-meta-item');
            if (metaItem) {
                metaItem.classList.remove('grade-excellent', 'grade-good', 'grade-average', 'grade-poor');
                if (percentage >= 90) metaItem.classList.add('grade-excellent');
                else if (percentage >= 70) metaItem.classList.add('grade-good');
                else if (percentage >= 50) metaItem.classList.add('grade-average');
                else metaItem.classList.add('grade-poor');
            }
        }
    }

    /**
     * Submit the grade for the current coursework
     */
    async submitGrade() {
        if (!this.currentCoursework) {
            this.showToast('No coursework selected', 'error');
            return;
        }

        const courseworkId = this.currentCoursework.id;
        const pointsInputs = document.querySelectorAll('.coursework-grade-points-input');
        const feedbackInputs = document.querySelectorAll('.coursework-grade-feedback-input');
        const overallFeedback = document.getElementById('courseworkOverallFeedback')?.value || '';

        // Build question grades array
        const questionGrades = [];
        pointsInputs.forEach((input, index) => {
            const questionId = input.dataset.questionId;
            const pointsAwarded = parseFloat(input.value) || 0;
            const feedback = feedbackInputs[index]?.value || '';

            questionGrades.push({
                question_id: questionId,
                points_awarded: pointsAwarded,
                feedback: feedback || null
            });
        });

        try {
            const response = await this.apiRequest('/api/coursework/grade', 'POST', {
                coursework_id: courseworkId,
                question_grades: questionGrades,
                overall_feedback: overallFeedback || null
            });

            if (response.success) {
                this.showToast(`Graded successfully! Score: ${response.scored_points}/${response.total_points} (${response.grade_percentage}%)`, 'success');

                // Update coursework status locally
                if (this.currentCoursework) {
                    this.currentCoursework.status = 'graded';
                }

                // Reset grading view state
                this.isGradingView = false;
                this.updateDetailsViewState();

                // Refresh coursework list
                await this.loadMyCourseworks();

                // Close modal after a short delay
                setTimeout(() => this.closeAllModals(), 1500);
            } else {
                this.showToast(response.message || 'Failed to submit grade', 'error');
            }
        } catch (error) {
            console.error('Error submitting grade:', error);
            this.showToast('Error submitting grade', 'error');
        }
    }

    /**
     * Edit the grade for an already graded coursework
     * This opens the grading view with pre-filled values from the previous grading
     */
    async editGrade() {
        if (!this.currentCoursework) {
            this.showToast('No coursework selected', 'error');
            return;
        }

        const courseworkId = this.currentCoursework.id;

        try {
            // Fetch the submission data to get the current grades
            const submissionResponse = await this.apiRequest(`/api/coursework/${courseworkId}/submission`);

            if (!submissionResponse || !submissionResponse.submission) {
                this.showToast('No submission found for this coursework', 'error');
                return;
            }

            const submission = submissionResponse.submission;
            const answers = submissionResponse.answers || [];

            // Open grading view first
            await this.openGradingView();

            // Wait for DOM to be ready
            setTimeout(() => {
                // Pre-fill the grades and feedback from previous grading
                const pointsInputs = document.querySelectorAll('.coursework-grade-points-input');
                const feedbackInputs = document.querySelectorAll('.coursework-grade-feedback-input');

                // Map answers by question_id for easy lookup
                const answersMap = {};
                answers.forEach(answer => {
                    answersMap[answer.question_id] = answer;
                });

                // Fill in each question's grade and feedback
                pointsInputs.forEach((input, index) => {
                    const questionId = input.dataset.questionId;
                    const answer = answersMap[questionId];

                    if (answer) {
                        // Set points awarded
                        input.value = answer.points_awarded || 0;

                        // Set feedback if exists
                        if (feedbackInputs[index] && answer.tutor_feedback) {
                            feedbackInputs[index].value = answer.tutor_feedback;
                        }
                    }
                });

                // Pre-fill overall feedback
                const overallFeedbackEl = document.getElementById('courseworkOverallFeedback');
                if (overallFeedbackEl && submission.tutor_feedback) {
                    overallFeedbackEl.value = submission.tutor_feedback;
                }

                this.showToast('Edit the grades and submit to update', 'info');
            }, 300);

        } catch (error) {
            console.error('Error loading grade for editing:', error);
            this.showToast('Error loading grade data', 'error');
        }
    }

    editCurrentCoursework() {
        console.log('🔧 editCurrentCoursework called');
        console.log('🔧 this.currentCoursework:', this.currentCoursework);

        if (!this.currentCoursework) {
            console.error('❌ No currentCoursework set!');
            return;
        }

        // Save coursework data before opening modal (resetCourseworkForm will clear this.currentCoursework)
        const courseworkToEdit = { ...this.currentCoursework };
        console.log('🔧 Saved coursework data for editing:', courseworkToEdit);

        // Close view modal and open edit modal
        this.closeAllModals();
        this.openGiveCourseworkModal();

        // Restore the coursework reference after reset
        this.currentCoursework = courseworkToEdit;

        // Wait for modal to open and DOM to be ready, then populate form
        setTimeout(() => {
            console.log('🔧 Calling loadCourseworkForEditing after timeout');
            this.loadCourseworkForEditing(courseworkToEdit);
        }, 200);
    }

    loadCourseworkForEditing(coursework) {
        console.log('📝 loadCourseworkForEditing called with:', coursework);

        // Handle different property naming conventions (camelCase vs snake_case from API)
        const title = coursework.title || '';
        const courseName = coursework.courseName || coursework.course_name || '';
        const quizType = coursework.quizType || coursework.coursework_type || coursework.quiz_type || '';
        const quizTime = coursework.quizTime || coursework.time_limit || 20;
        const quizDays = coursework.quizDays || coursework.days_to_complete || '';
        const studentId = coursework.studentId || coursework.student_id;
        const questions = coursework.questions || [];

        console.log('📝 Parsed values:', { title, courseName, quizType, quizTime, quizDays, studentId, questionsCount: questions.length });

        // Check if DOM elements exist
        const titleEl = document.getElementById('courseworkTitle');
        const courseNameEl = document.getElementById('courseworkCourseName');
        const typeEl = document.getElementById('courseworkType');
        const timeEl = document.getElementById('courseworkTime');
        const daysEl = document.getElementById('courseworkDays');

        console.log('📝 DOM elements found:', {
            titleEl: !!titleEl,
            courseNameEl: !!courseNameEl,
            typeEl: !!typeEl,
            timeEl: !!timeEl,
            daysEl: !!daysEl
        });

        // Populate form with coursework data
        if (titleEl) titleEl.value = title;
        if (courseNameEl) courseNameEl.value = courseName;
        if (typeEl) typeEl.value = quizType;
        if (timeEl) timeEl.value = quizTime;
        if (daysEl) daysEl.value = quizDays;

        // Select student
        this.selectedStudentId = studentId;
        const student = this.students.find(s => s.id === studentId);
        if (student) {
            const selectedDiv = document.getElementById('courseworkSelectedStudent');
            selectedDiv.innerHTML = `
                <div class="coursework-selected-item">
                    <img src="${student.profilePic}" alt="${student.name}">
                    <span>${student.name}</span>
                    <button class="coursework-selected-item-remove" onclick="courseworkManager.removeStudent()">✕</button>
                </div>
            `;
        }

        // Clear and rebuild questions
        const container = document.getElementById('courseworkQuestionsContainer');
        container.innerHTML = '';
        this.questionEditors = {};
        this.answerEditors = {};

        questions.forEach((question, index) => {
            // Handle both camelCase and snake_case from API
            const qText = question.text || question.question_text || '';
            const qType = question.type || question.question_type || '';
            const qPoints = question.points || 1;
            const qCorrectAnswer = question.correctAnswer || question.correct_answer || '';
            const qSampleAnswer = question.sampleAnswer || question.sample_answer || '';
            const qChoices = question.choices || [];

            this.addQuestion();

            // Wait for editor to initialize, then populate
            setTimeout(() => {
                const questionItems = document.querySelectorAll('.coursework-question-item');
                const questionItem = questionItems[index];
                if (!questionItem) return;

                const questionId = questionItem.getAttribute('data-question-id');

                // Set question text in Quill editor
                const quillEditor = this.questionEditors[questionId];
                if (quillEditor) {
                    quillEditor.root.innerHTML = qText;
                }

                // Set points for the question
                const pointsInput = questionItem.querySelector('[data-points]');
                if (pointsInput) {
                    pointsInput.value = qPoints;
                }

                // Set question type
                const typeSelect = questionItem.querySelector('.coursework-form-select');
                if (typeSelect) {
                    typeSelect.value = qType;
                    if (qType) {
                        this.handleQuestionTypeChange(questionId, qType);
                    }

                    // Wait for options to render
                    setTimeout(() => {
                        if (qType === 'multipleChoice' && qChoices.length > 0) {
                            const options = questionItem.querySelectorAll('[data-option]');
                            qChoices.forEach((choice, i) => {
                                if (options[i]) options[i].value = choice;
                            });
                            const correctAnswer = questionItem.querySelector('[data-correct-answer]');
                            if (correctAnswer) correctAnswer.value = qCorrectAnswer;
                        } else if (qType === 'trueFalse') {
                            const correctAnswer = questionItem.querySelector('[data-correct-answer]');
                            if (correctAnswer) correctAnswer.value = qCorrectAnswer;
                        } else if (qType === 'openEnded' && qSampleAnswer) {
                            const answerEditor = this.answerEditors[`${questionId}_answer`];
                            if (answerEditor) {
                                answerEditor.root.innerHTML = qSampleAnswer;
                            }
                        }
                    }, 200);
                }
            }, 100 * (index + 1));
        });
    }

    async deleteCurrentCoursework() {
        if (!this.currentCoursework) return;

        if (!confirm('Are you sure you want to delete this coursework? This action cannot be undone.')) {
            return;
        }

        try {
            await this.apiRequest(`/api/coursework/${this.currentCoursework.id}`, 'DELETE');
            this.showToast('Courseworkdeleted successfully!', 'success');
            await this.loadCourseworksFromAPI();
            this.closeAllModals();
            this.currentCoursework = null;
        } catch (error) {
            this.showToast('Error deleting coursework: ' + error.message, 'error');
        }
    }

    async postCurrentCoursework() {
        if (!this.currentCoursework) return;

        const student = this.students.find(s => s.id === this.currentCoursework.student_id || s.id === this.currentCoursework.studentId);
        const studentName = student ? student.name : 'Unknown Student';

        if (!confirm(`Are you sure you want to post this courseworkto ${studentName}?`)) {
            return;
        }

        try {
            await this.apiRequest(`/api/coursework/${this.currentCoursework.id}`, 'PUT', {
                status: 'posted'
            });
            this.showToast('Courseworkposted successfully!', 'success');
            await this.loadCourseworksFromAPI();
            this.closeAllModals();
            this.updateNotifications();
        } catch (error) {
            this.showToast('Error posting coursework: ' + error.message, 'error');
        }
    }

    async loadMyCourseworks() {
        console.log('[CourseworkManager] loadMyCourseworks() called');
        // Load courseworks assigned to the current student from API
        const tableBody = document.getElementById('courseworkMyTableBody');
        console.log('[CourseworkManager] tableBody element:', tableBody);
        if (!tableBody) {
            console.log('[CourseworkManager] No tableBody found - still updating sidebar');
        }

        // Show loading state
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-gray-500 py-8">Loading your quizzes...</td></tr>';
        }

        try {
            // Call the student coursework API
            console.log('[CourseworkManager] Fetching /api/coursework/student/list');
            const data = await this.apiRequest('/api/coursework/student/list');
            console.log('[CourseworkManager] API response:', data);

            if (!data.success || !data.courseworks || data.courseworks.length === 0) {
                console.log('[CourseworkManager] No courseworks found');
                if (tableBody) {
                    tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-gray-500 py-8">No quizzes assigned yet</td></tr>';
                }
                // Also clear the sidebar
                this.courseworks = [];
                this.updateCourseworkList();
                return;
            }

            // Store courseworks for sidebar display (shows tutor names for students)
            console.log('[CourseworkManager] Storing', data.courseworks.length, 'courseworks');
            console.log('[CourseworkManager] First coursework tutor_name:', data.courseworks[0]?.tutor_name);
            this.courseworks = data.courseworks;
            this.updateCourseworkList();

            tableBody.innerHTML = data.courseworks.map(coursework => {
                const dueDate = coursework.due_date ? new Date(coursework.due_date) : null;
                const now = new Date();
                const dueDateStr = dueDate ? dueDate.toLocaleDateString() : 'No due date';
                const daysToComplete = coursework.days_to_complete || 0;
                const timeLimit = coursework.time_limit || 0;

                // Calculate days left with more detail
                let daysLeftDisplay = '';
                let daysLeftClass = '';
                let isOverdue = false;

                if (dueDate) {
                    const diffMs = dueDate - now;
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
                    const diffMinutes = Math.ceil(diffMs / (1000 * 60));

                    // Special handling for 0-day courseworks (time-limit only)
                    if (daysToComplete === 0) {
                        if (diffMs <= 0) {
                            isOverdue = true;
                            daysLeftDisplay = `<span class="text-red-500 font-semibold">Time expired!</span>`;
                            daysLeftClass = 'overdue';
                        } else if (diffMinutes <= 60) {
                            // Show countdown in minutes for time-limited coursework
                            daysLeftDisplay = `<span class="text-orange-500 font-semibold coursework-time-countdown" data-due="${dueDate.toISOString()}">${diffMinutes} min left</span>`;
                            daysLeftClass = 'due-today';
                        } else {
                            const hours = Math.floor(diffMinutes / 60);
                            const mins = diffMinutes % 60;
                            daysLeftDisplay = `<span class="text-orange-500 font-semibold coursework-time-countdown" data-due="${dueDate.toISOString()}">${hours}h ${mins}m left</span>`;
                            daysLeftClass = 'due-today';
                        }
                    } else if (diffDays < 0) {
                        isOverdue = true;
                        daysLeftDisplay = `<span class="text-red-500 font-semibold">Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}</span>`;
                        daysLeftClass = 'overdue';
                    } else if (diffDays === 0) {
                        if (diffHours > 0) {
                            daysLeftDisplay = `<span class="text-orange-500 font-semibold">Due in ${diffHours} hour${diffHours !== 1 ? 's' : ''}</span>`;
                        } else {
                            daysLeftDisplay = `<span class="text-red-500 font-semibold">Due now!</span>`;
                        }
                        daysLeftClass = 'due-today';
                    } else if (diffDays === 1) {
                        daysLeftDisplay = `<span class="text-orange-500 font-semibold">Due tomorrow</span>`;
                        daysLeftClass = 'due-soon';
                    } else if (diffDays <= 3) {
                        daysLeftDisplay = `<span class="text-yellow-600">${diffDays} days left</span>`;
                        daysLeftClass = 'due-soon';
                    } else {
                        daysLeftDisplay = `<span class="text-green-600">${diffDays} days left</span>`;
                        daysLeftClass = 'plenty-time';
                    }
                }

                // Check if there's saved progress for this quiz
                const savedState = this.restoreQuizState(coursework.id);
                let savedTimeDisplay = '';

                if (savedState && savedState.timeRemaining !== null && savedState.timeRemaining !== undefined) {
                    const savedMins = Math.floor(savedState.timeRemaining / 60);
                    const savedSecs = savedState.timeRemaining % 60;
                    savedTimeDisplay = `<div class="text-xs text-blue-500">Saved: ${savedMins}:${savedSecs.toString().padStart(2, '0')} left</div>`;
                }

                // Determine status display
                // Backend uses: 'submitted', 'graded', 'in_progress', null/undefined for not started
                const submissionStatus = coursework.submission_status || 'not_started';
                let statusBadge = '';
                let actionButton = '';

                if (submissionStatus === 'submitted' || submissionStatus === 'completed' || submissionStatus === 'graded') {
                    // Quiz has been submitted - show simple "Completed" status
                    // Grade details will be shown in View Results
                    statusBadge = `<span class="coursework-status-badge status-posted">Completed</span>`;
                    actionButton = `
                        <button class="coursework-btn coursework-btn-view" onclick="courseworkManager.viewCourseworkResults('${coursework.id}')">
                            <span>📊</span> View Results
                        </button>
                    `;
                } else if (submissionStatus === 'in_progress' || savedState) {
                    // Show in progress if there's saved state
                    statusBadge = '<span class="coursework-status-badge status-draft">In Progress</span>';
                    actionButton = `
                        <button class="coursework-btn coursework-btn-edit" onclick="courseworkManager.takeCoursework('${coursework.id}')">
                            <span>📝</span> Continue
                        </button>
                    `;
                } else if (isOverdue) {
                    // Allow taking overdue quizzes but show warning
                    statusBadge = '<span class="coursework-status-badge status-overdue">Not Started (Overdue)</span>';
                    actionButton = `
                        <button class="coursework-btn coursework-btn-warning" onclick="courseworkManager.takeCoursework('${coursework.id}')">
                            <span>⚠️</span> Take Quiz (Late)
                        </button>
                    `;
                } else {
                    statusBadge = '<span class="coursework-status-badge">Not Started</span>';
                    actionButton = `
                        <button class="coursework-btn coursework-btn-edit" onclick="courseworkManager.takeCoursework('${coursework.id}')">
                            <span>📝</span> Take Quiz
                        </button>
                    `;
                }

                return `
                    <tr class="${daysLeftClass}">
                        <td>
                            <div class="flex items-center gap-2">
                                <span>${coursework.title || coursework.course_name || 'N/A'}</span>
                            </div>
                        </td>
                        <td>${coursework.coursework_type || 'Quiz'}</td>
                        <td>${coursework.tutor_name || 'Unknown Tutor'}</td>
                        <td>
                            <div>${coursework.time_limit || 0} min</div>
                            ${savedTimeDisplay}
                        </td>
                        <td>
                            <div>${dueDateStr}</div>
                            <small>${daysLeftDisplay}</small>
                        </td>
                        <td>${statusBadge}</td>
                        <td>${actionButton}</td>
                    </tr>
                `;
            }).join('');

            // Start countdown timers for 0-day courseworks
            this.startMyCourseworksCountdownTimers();

        } catch (error) {
            console.error('Error loading my courseworks:', error);
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-red-500 py-8">Error loading quizzes. Please try again.</td></tr>';
        }
    }

    /**
     * Start countdown timers for 0-day (time-limit only) courseworks in My Quizzes table
     */
    startMyCourseworksCountdownTimers() {
        // Clear any existing countdown interval
        if (this.myCourseworksCountdownInterval) {
            clearInterval(this.myCourseworksCountdownInterval);
        }

        const updateCountdowns = () => {
            const countdownElements = document.querySelectorAll('.coursework-time-countdown');
            const now = new Date();

            countdownElements.forEach(element => {
                const dueDate = new Date(element.dataset.due);
                const diffMs = dueDate - now;

                if (diffMs <= 0) {
                    element.textContent = 'Time expired!';
                    element.classList.remove('text-orange-500');
                    element.classList.add('text-red-500');
                } else {
                    const diffMinutes = Math.ceil(diffMs / (1000 * 60));
                    if (diffMinutes <= 60) {
                        const mins = Math.floor(diffMs / (1000 * 60));
                        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
                        element.textContent = `${mins}:${secs.toString().padStart(2, '0')} left`;
                    } else {
                        const hours = Math.floor(diffMinutes / 60);
                        const mins = diffMinutes % 60;
                        element.textContent = `${hours}h ${mins}m left`;
                    }
                }
            });
        };

        // Update every second for accurate countdown
        this.myCourseworksCountdownInterval = setInterval(updateCountdowns, 1000);

        // Initial update
        updateCountdowns();
    }

    async viewCourseworkResults(courseworkId) {
        // View the results of a completed coursework
        console.log('viewCourseworkResults called with:', courseworkId);

        // Track that we came from My Quizzes for proper back navigation
        this.previousModal = 'myQuizzes';

        try {
            // Fetch coursework details with questions and student's answers
            console.log('Fetching results from API...');
            const response = await this.apiRequest(`/api/coursework/${courseworkId}/results`);
            console.log('API response:', response);

            if (!response.success) {
                this.showToast('Failed to load results', 'error');
                return;
            }

            this.currentCoursework = response.coursework;
            const submission = response.submission;
            const questions = response.questions || [];
            const answers = response.answers || [];

            // Open the view details modal to show results
            console.log('Looking for modal...');
            const modal = document.getElementById('courseworkViewDetailsModal');
            console.log('Modal found:', modal);
            if (!modal) {
                console.error('Modal not found! Make sure coursework-view-details-modal.html is loaded.');
                this.showToast('Results modal not found. Please refresh the page.', 'error');
                return;
            }

            // Close other modals first
            const modals = document.querySelectorAll('.coursework-modal');
            modals.forEach(m => m.classList.remove('active'));

            modal.classList.add('active');

            // Set flag to indicate we're viewing results (only show graded items in sidebar)
            this.isViewingResults = true;

            // Set the sidebar filter to 'graded' to only show graded courseworks
            this.detailsSidebarFilter = 'graded';

            // Update filter tabs to show 'graded' as active
            const filterTabs = modal.querySelectorAll('.coursework-filter-tab');
            filterTabs.forEach(tab => {
                tab.classList.toggle('active', tab.dataset.filter === 'graded');
            });

            // Load the sidebar with coursework cards (only graded ones)
            this.updateDetailsSidebarHeader();
            this.renderDetailsSidebarList();

            const detailsContainer = document.getElementById('courseworkDetailsContent');
            if (!detailsContainer) return;

            const coursework = this.currentCoursework;
            const courseName = coursework.course_name || coursework.title || 'Quiz';
            const quizType = coursework.coursework_type || 'Quiz';
            const tutorName = coursework.tutor_name || 'Your Tutor';

            // Check if graded - use status field, not grade_percentage (which can be 0 after auto-calc)
            const isGraded = submission && (submission.status === 'graded' || submission.status === 'completed');
            const scoreDisplay = isGraded
                ? `${submission.scored_points}/${submission.total_points} (${Math.round(submission.grade_percentage)}%)`
                : 'Pending';
            const timeTaken = submission && submission.time_taken
                ? this.formatTimeTaken(submission.time_taken)
                : 'N/A';

            // Build questions and answers HTML
            let questionsHTML = '';
            questions.forEach((q, idx) => {
                // Use string comparison to handle type mismatches between question ID types
                const studentAnswer = answers.find(a => String(a.question_id) === String(q.id));
                const answerText = studentAnswer ? studentAnswer.answer_text : 'No answer';
                const isCorrect = studentAnswer ? studentAnswer.is_correct : null;
                const pointsAwarded = studentAnswer ? (studentAnswer.points_awarded || 0) : 0;
                const maxPoints = q.points || 1;
                const tutorFeedback = studentAnswer ? (studentAnswer.tutor_feedback || '') : '';

                // Parse choices if available
                let choices = q.choices || [];
                if (typeof choices === 'string') {
                    try { choices = JSON.parse(choices); } catch (e) { choices = []; }
                }

                // Determine answer status styling
                let answerStatusClass = '';
                let answerStatusIcon = '';
                if (isCorrect === true) {
                    answerStatusClass = 'answer-correct';
                    answerStatusIcon = '✓';
                } else if (isCorrect === false) {
                    answerStatusClass = 'answer-incorrect';
                    answerStatusIcon = '✗';
                } else {
                    answerStatusClass = 'answer-pending';
                    answerStatusIcon = '?';
                }

                questionsHTML += `
                    <div class="result-question-card ${answerStatusClass}">
                        <div class="result-question-header">
                            <span class="result-question-number">Q${idx + 1}</span>
                            <span class="result-question-type">${this.formatQuestionTypeForQuiz(q.question_type || q.type || '')}</span>
                            <span class="result-question-points">${pointsAwarded}/${maxPoints} pts</span>
                            <span class="result-status-icon">${answerStatusIcon}</span>
                        </div>
                        <div class="result-question-text">${q.question_text || q.text || 'Question'}</div>

                        <div class="result-answer-section">
                            <div class="result-your-answer">
                                <strong>Your Answer:</strong>
                                <span class="${answerStatusClass}">${answerText || 'No answer provided'}</span>
                            </div>
                            ${q.correct_answer ? `
                                <div class="result-correct-answer">
                                    <strong>Correct Answer:</strong>
                                    <span>${q.correct_answer}</span>
                                </div>
                            ` : ''}
                            ${tutorFeedback ? `
                                <div class="coursework-tutor-feedback mt-3">
                                    <div class="tutor-feedback-label">
                                        <span class="tutor-feedback-icon">💬</span>
                                        <strong>Tutor Feedback:</strong>
                                    </div>
                                    <div class="tutor-feedback-text">${tutorFeedback}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });

            // Reminder message for tutor grading with button
            const tutorId = coursework.tutor_id;
            const reminderHTML = !isGraded ? `
                <div class="tutor-reminder-banner">
                    <span class="reminder-icon">🔔</span>
                    <div class="reminder-content">
                        <strong>Waiting for Grade</strong>
                        <p>Your quiz is awaiting ${tutorName}'s review.</p>
                    </div>
                    <button class="coursework-btn coursework-btn-remind" onclick="courseworkManager.remindTutorToGrade('${courseworkId}', ${tutorId}, '${tutorName}', '${courseName}')">
                        <span>📩</span> Remind Tutor
                    </button>
                </div>
            ` : '';

            detailsContainer.innerHTML = `
                <div class="quiz-results-container">
                    <div class="results-header">
                        <h2 class="results-title">${courseName}</h2>
                        <span class="results-type-badge">${quizType}</span>
                    </div>

                    ${reminderHTML}

                    <div class="results-summary">
                        <div class="summary-item">
                            <span class="summary-label">Score</span>
                            <span class="summary-value ${isGraded ? 'score-graded' : 'score-pending'}">${scoreDisplay}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Time Taken</span>
                            <span class="summary-value">${timeTaken}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Questions</span>
                            <span class="summary-value">${questions.length}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Tutor</span>
                            <span class="summary-value">${tutorName}</span>
                        </div>
                    </div>

                    <div class="results-questions">
                        <h3 class="results-section-title">Your Answers</h3>
                        ${questionsHTML || '<p class="text-gray-500">No questions found</p>'}
                    </div>

                    ${submission && submission.tutor_feedback ? `
                        <div class="coursework-overall-feedback-display mt-4">
                            <div class="overall-feedback-label">
                                <span class="overall-feedback-icon">📝</span>
                                <strong>Overall Feedback from Tutor:</strong>
                            </div>
                            <div class="overall-feedback-text">${submission.tutor_feedback}</div>
                        </div>
                    ` : ''}

                    <div class="results-actions">
                        <button class="coursework-btn coursework-btn-back" onclick="courseworkManager.goBackFromDetails()">
                            <span>←</span> Back
                        </button>
                        <button class="coursework-btn coursework-btn-cancel" onclick="courseworkManager.closeAllModals()">
                            <span>✕</span> Close
                        </button>
                    </div>
                </div>
            `;

            // Hide all default modal action buttons (we're showing our own in the results view)
            const editBtn = document.getElementById('courseworkEditBtn');
            const postBtn = document.getElementById('courseworkPostFromViewBtn');
            const deleteBtn = document.getElementById('courseworkDeleteBtn');
            const backBtn = document.getElementById('courseworkBackBtn');
            const gradeBtn = document.getElementById('courseworkGradeBtn');
            const submitGradeBtn = document.getElementById('courseworkSubmitGradeBtn');
            const editGradeBtn = document.getElementById('courseworkEditGradeBtn');
            if (editBtn) editBtn.style.display = 'none';
            if (postBtn) postBtn.style.display = 'none';
            if (deleteBtn) deleteBtn.style.display = 'none';
            if (backBtn) backBtn.style.display = 'none';
            if (gradeBtn) gradeBtn.style.display = 'none';
            if (submitGradeBtn) submitGradeBtn.style.display = 'none';
            if (editGradeBtn) editGradeBtn.style.display = 'none';

        } catch (error) {
            console.error('Error loading coursework results:', error);
            // Show more specific error message
            const errorMsg = error.message || 'Unknown error';
            this.showToast(`Error: ${errorMsg}`, 'error');
        }
    }

    formatTimeTaken(seconds) {
        if (!seconds) return 'N/A';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins > 0) {
            return `${mins}m ${secs}s`;
        }
        return `${secs}s`;
    }

    /**
     * Remind tutor to grade a quiz - bumps it to the top of their grading queue
     */
    async remindTutorToGrade(courseworkId, tutorId, tutorName, courseName) {
        try {
            // Show loading state on button
            const btn = document.querySelector('.coursework-btn-remind');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span>⏳</span> Sending...';
            }

            // Call the remind endpoint - this bumps the coursework to top of tutor's list
            const response = await this.apiRequest(`/api/coursework/${courseworkId}/remind`, 'POST');

            if (response.success) {
                this.showToast(`Reminder sent to ${tutorName}! Your quiz is now at the top of their grading queue.`, 'success');

                // Update button to show success
                if (btn) {
                    btn.innerHTML = '<span>✓</span> Reminder Sent';
                    btn.classList.add('reminder-sent');
                }
            } else {
                this.showToast(response.detail || 'Could not send reminder. Try again later.', 'error');
                // Reset button
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<span>📩</span> Remind Tutor';
                }
            }
        } catch (error) {
            console.error('Error sending reminder:', error);
            this.showToast('Could not send reminder. Please try again.', 'error');

            // Reset button on error
            const btn = document.querySelector('.coursework-btn-remind');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<span>📩</span> Remind Tutor';
            }
        }
    }

    async takeCoursework(courseworkId) {
        // Fetch coursework details with questions
        try {
            const response = await this.apiRequest(`/api/coursework/${courseworkId}`);
            if (!response.success) {
                this.showToast('Failed to load quiz', 'error');
                return;
            }

            this.currentCoursework = {
                ...response.coursework,
                questions: response.questions || []
            };

            // Check for saved state (resume from where left off)
            const savedState = this.restoreQuizState(courseworkId);

            if (savedState) {
                // Restore saved state
                this.studentAnswers = savedState.answers || new Array(this.currentCoursework.questions.length).fill(null);
                this.currentQuestionIndex = savedState.currentQuestionIndex || 0;

                // Restore time if it was a timed quiz
                if (savedState.timeRemaining !== null && savedState.timeRemaining !== undefined) {
                    this.quizTimeRemaining = savedState.timeRemaining;
                }
                if (savedState.timeElapsed) {
                    this.quizTimeElapsed = savedState.timeElapsed;
                }

                this.showToast('Resuming from where you left off...', 'info');
                console.log('[CourseworkManager] Restored quiz state:', savedState);
            } else {
                // Fresh start - initialize empty answers
                this.studentAnswers = new Array(this.currentCoursework.questions.length).fill(null);
                this.currentQuestionIndex = 0;
                this.quizTimeRemaining = undefined;
                this.quizTimeElapsed = 0;
            }

            // Open the take quiz modal
            this.openTakeQuizModal(savedState);

        } catch (error) {
            console.error('Error loading coursework:', error);
            this.showToast('Error loading quiz. Please try again.', 'error');
        }
    }

    openTakeQuizModal(savedState = null) {
        // Don't call closeAllModals here - it would save state we just restored
        // Just close other modals without saving
        const modals = document.querySelectorAll('.coursework-modal');
        modals.forEach(modal => {
            modal.classList.remove('active');
        });

        // Use the view details modal but render it for taking the quiz
        const modal = document.getElementById('courseworkViewDetailsModal');
        if (!modal) {
            this.showToast('Quiz modal not found', 'error');
            return;
        }

        modal.classList.add('active');

        // Start the timer (passing savedState so it can restore time)
        this.startQuizTimer(savedState);

        this.renderTakeQuizView();
    }

    startQuizTimer(savedState = null) {
        // Clear any existing timer
        if (this.quizTimerInterval) {
            clearInterval(this.quizTimerInterval);
        }

        const timeLimit = this.currentCoursework.time_limit || this.currentCoursework.quizTime || 0;

        if (timeLimit > 0) {
            // Check if we're restoring from saved state
            if (savedState && savedState.timeRemaining !== null && savedState.timeRemaining !== undefined) {
                // Resume from saved time
                this.quizTimeRemaining = savedState.timeRemaining;
            } else if (this.quizTimeRemaining === undefined || this.quizTimeRemaining === null) {
                // Fresh start - convert minutes to seconds
                this.quizTimeRemaining = timeLimit * 60;
            }
            // else: keep existing quizTimeRemaining value

            this.quizStartTime = Date.now();

            this.quizTimerInterval = setInterval(() => {
                this.quizTimeRemaining--;

                // Update timer display
                this.updateTimerDisplay();

                // Auto-submit when time runs out
                if (this.quizTimeRemaining <= 0) {
                    clearInterval(this.quizTimerInterval);
                    this.showToast('Time is up! Submitting your quiz...', 'warning');
                    this.submitQuiz();
                }

                // Warning at 5 minutes remaining
                if (this.quizTimeRemaining === 300) {
                    this.showToast('5 minutes remaining!', 'warning');
                }

                // Warning at 1 minute remaining
                if (this.quizTimeRemaining === 60) {
                    this.showToast('1 minute remaining!', 'warning');
                }
            }, 1000);
        } else {
            // No time limit - count up
            this.quizTimeElapsed = 0;
            this.quizStartTime = Date.now();

            this.quizTimerInterval = setInterval(() => {
                this.quizTimeElapsed++;
                this.updateTimerDisplay();
            }, 1000);
        }
    }

    updateTimerDisplay() {
        const timerElement = document.getElementById('quizTimer');
        if (!timerElement) return;

        const timeLimit = this.currentCoursework.time_limit || this.currentCoursework.quizTime || 0;

        if (timeLimit > 0) {
            // Countdown timer
            const minutes = Math.floor(this.quizTimeRemaining / 60);
            const seconds = this.quizTimeRemaining % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            // Add warning class when low on time
            if (this.quizTimeRemaining <= 60) {
                timerElement.classList.add('timer-critical');
            } else if (this.quizTimeRemaining <= 300) {
                timerElement.classList.add('timer-warning');
            }
        } else {
            // Count up timer
            const minutes = Math.floor(this.quizTimeElapsed / 60);
            const seconds = this.quizTimeElapsed % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    stopQuizTimer() {
        if (this.quizTimerInterval) {
            clearInterval(this.quizTimerInterval);
            this.quizTimerInterval = null;
        }
    }

    getTimeTaken() {
        // Return time taken in seconds
        if (this.quizStartTime) {
            return Math.floor((Date.now() - this.quizStartTime) / 1000);
        }
        return 0;
    }

    renderTakeQuizView() {
        const detailsContainer = document.getElementById('courseworkDetailsContent');
        if (!detailsContainer) return;

        const coursework = this.currentCoursework;
        if (!coursework || !coursework.questions || coursework.questions.length === 0) {
            detailsContainer.innerHTML = '<p class="text-gray-500 text-center py-8">No questions in this quiz</p>';
            return;
        }

        const questions = coursework.questions;
        const currentQ = questions[this.currentQuestionIndex];
        const courseName = coursework.course_name || coursework.courseName || 'Quiz';
        const quizType = coursework.coursework_type || coursework.quizType || 'Quiz';
        const timeLimit = coursework.time_limit || coursework.quizTime || 0;
        const totalQuestions = questions.length;
        const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

        // Parse choices if it's a string
        let choices = currentQ.choices || [];
        if (typeof choices === 'string') {
            try {
                choices = JSON.parse(choices);
            } catch (e) {
                choices = [];
            }
        }

        // Get the saved answer for this question
        const savedAnswer = this.studentAnswers[this.currentQuestionIndex];

        // Normalize question type
        const qType = (currentQ.type || currentQ.question_type || '').toLowerCase().replace(/[_-]/g, '');

        let questionHTML = '';

        if (qType === 'truefalse' || qType === 'tf') {
            // True/False - Radio buttons
            questionHTML = `
                <div class="quiz-choices quiz-true-false">
                    <label class="quiz-choice ${savedAnswer === 'True' ? 'selected' : ''}" onclick="courseworkManager.selectAnswer('True')">
                        <span class="quiz-radio ${savedAnswer === 'True' ? 'checked' : ''}"></span>
                        <span class="choice-text">True</span>
                    </label>
                    <label class="quiz-choice ${savedAnswer === 'False' ? 'selected' : ''}" onclick="courseworkManager.selectAnswer('False')">
                        <span class="quiz-radio ${savedAnswer === 'False' ? 'checked' : ''}"></span>
                        <span class="choice-text">False</span>
                    </label>
                </div>
            `;
        } else if (qType === 'multiplechoice' || qType === 'mc' || qType === 'singlechoice') {
            // Multiple Choice (single answer) - Radio buttons
            questionHTML = `
                <div class="quiz-choices">
                    ${choices.map((choice, idx) => `
                        <label class="quiz-choice ${savedAnswer === choice ? 'selected' : ''}" onclick="courseworkManager.selectAnswer('${choice.replace(/'/g, "\\'")}')">
                            <span class="quiz-radio ${savedAnswer === choice ? 'checked' : ''}"></span>
                            <span class="choice-label">${String.fromCharCode(65 + idx)}.</span>
                            <span class="choice-text">${choice}</span>
                        </label>
                    `).join('')}
                </div>
            `;
        } else if (qType === 'checkbox' || qType === 'multiselect' || qType === 'multipleanswer') {
            // Checkbox (multiple answers allowed)
            const savedAnswers = Array.isArray(savedAnswer) ? savedAnswer : [];
            questionHTML = `
                <div class="quiz-choices quiz-checkbox">
                    ${choices.map((choice, idx) => `
                        <label class="quiz-choice ${savedAnswers.includes(choice) ? 'selected' : ''}" onclick="courseworkManager.toggleCheckboxAnswer('${choice.replace(/'/g, "\\'")}')">
                            <span class="quiz-checkbox-icon ${savedAnswers.includes(choice) ? 'checked' : ''}"></span>
                            <span class="choice-label">${String.fromCharCode(65 + idx)}.</span>
                            <span class="choice-text">${choice}</span>
                        </label>
                    `).join('')}
                </div>
                <p class="quiz-hint">Select all that apply</p>
            `;
        } else {
            // Short answer or essay (openEnded, essay, shortAnswer)
            questionHTML = `
                <div class="quiz-text-answer">
                    <textarea id="quizTextAnswer" class="quiz-textarea" placeholder="Type your answer here..." rows="4">${savedAnswer || ''}</textarea>
                </div>
            `;
        }

        // Calculate timer display
        let timerDisplay = '';
        if (timeLimit > 0) {
            const mins = Math.floor((this.quizTimeRemaining || timeLimit * 60) / 60);
            const secs = (this.quizTimeRemaining || timeLimit * 60) % 60;
            const timerClass = this.quizTimeRemaining <= 60 ? 'timer-critical' : this.quizTimeRemaining <= 300 ? 'timer-warning' : '';
            timerDisplay = `<span class="quiz-timer ${timerClass}" id="quizTimer">${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}</span>`;
        } else {
            const mins = Math.floor((this.quizTimeElapsed || 0) / 60);
            const secs = (this.quizTimeElapsed || 0) % 60;
            timerDisplay = `<span class="quiz-timer quiz-timer-countup" id="quizTimer">${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}</span>`;
        }

        detailsContainer.innerHTML = `
            <div class="take-quiz-container">
                <div class="quiz-header">
                    <div class="quiz-header-top">
                        <h3 class="quiz-title">${courseName} - ${quizType}</h3>
                        <div class="quiz-timer-container">
                            <span class="timer-icon">⏱️</span>
                            ${timerDisplay}
                        </div>
                    </div>
                    <div class="quiz-meta">
                        <span class="quiz-meta-item">
                            <span class="icon">📝</span> ${totalQuestions} Questions
                        </span>
                        <span class="quiz-meta-item">
                            <span class="icon">⭐</span> ${totalPoints} Points
                        </span>
                    </div>
                </div>

                <div class="quiz-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${((this.currentQuestionIndex + 1) / totalQuestions) * 100}%"></div>
                    </div>
                    <span class="progress-text">Question ${this.currentQuestionIndex + 1} of ${totalQuestions}</span>
                </div>

                <div class="quiz-question-card">
                    <div class="question-header">
                        <span class="question-number">Q${this.currentQuestionIndex + 1}</span>
                        <span class="question-type-badge">${this.formatQuestionTypeForQuiz(qType)}</span>
                        <span class="question-points">${currentQ.points || 1} point${(currentQ.points || 1) > 1 ? 's' : ''}</span>
                    </div>
                    <div class="question-text">${currentQ.text || currentQ.question_text || 'No question text'}</div>
                    ${questionHTML}
                </div>

                <div class="quiz-navigation">
                    <button class="coursework-btn coursework-btn-cancel" onclick="courseworkManager.prevQuestion()" ${this.currentQuestionIndex === 0 ? 'disabled' : ''}>
                        <span>◀</span> Previous
                    </button>

                    ${this.currentQuestionIndex === totalQuestions - 1 ? `
                        <button class="coursework-btn coursework-btn-post" onclick="courseworkManager.submitQuiz()">
                            <span>✅</span> Submit Quiz
                        </button>
                    ` : `
                        <button class="coursework-btn coursework-btn-edit" onclick="courseworkManager.nextQuestion()">
                            Next <span>▶</span>
                        </button>
                    `}
                </div>

                <div class="quiz-question-dots">
                    ${questions.map((q, idx) => `
                        <span class="question-dot ${idx === this.currentQuestionIndex ? 'current' : ''} ${this.studentAnswers[idx] !== null && this.studentAnswers[idx] !== '' && (!Array.isArray(this.studentAnswers[idx]) || this.studentAnswers[idx].length > 0) ? 'answered' : ''}"
                              onclick="courseworkManager.goToQuestion(${idx})" title="Question ${idx + 1}">
                            ${idx + 1}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;

        // Hide tutor action buttons when taking quiz
        const editBtn = document.getElementById('courseworkEditBtn');
        const postBtn = document.getElementById('courseworkPostFromViewBtn');
        const deleteBtn = document.getElementById('courseworkDeleteBtn');
        if (editBtn) editBtn.style.display = 'none';
        if (postBtn) postBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';

        // Add listener for text answers
        const textArea = document.getElementById('quizTextAnswer');
        if (textArea) {
            textArea.addEventListener('input', (e) => {
                this.studentAnswers[this.currentQuestionIndex] = e.target.value;
            });
        }
    }

    selectAnswer(answer) {
        this.studentAnswers[this.currentQuestionIndex] = answer;
        // Re-render to show selection
        this.renderTakeQuizView();
    }

    toggleCheckboxAnswer(answer) {
        // For checkbox/multi-select questions
        let currentAnswers = this.studentAnswers[this.currentQuestionIndex];
        if (!Array.isArray(currentAnswers)) {
            currentAnswers = [];
        }

        const idx = currentAnswers.indexOf(answer);
        if (idx === -1) {
            currentAnswers.push(answer);
        } else {
            currentAnswers.splice(idx, 1);
        }

        this.studentAnswers[this.currentQuestionIndex] = currentAnswers;
        this.renderTakeQuizView();
    }

    formatQuestionTypeForQuiz(qType) {
        const typeMap = {
            'truefalse': 'True/False',
            'tf': 'True/False',
            'multiplechoice': 'Multiple Choice',
            'mc': 'Multiple Choice',
            'singlechoice': 'Single Choice',
            'checkbox': 'Select All',
            'multiselect': 'Select All',
            'multipleanswer': 'Multiple Answers',
            'openended': 'Short Answer',
            'essay': 'Essay',
            'shortanswer': 'Short Answer'
        };
        return typeMap[qType] || 'Question';
    }

    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.renderTakeQuizView();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.currentCoursework.questions.length - 1) {
            this.currentQuestionIndex++;
            this.renderTakeQuizView();
        }
    }

    goToQuestion(index) {
        if (index >= 0 && index < this.currentCoursework.questions.length) {
            this.currentQuestionIndex = index;
            this.renderTakeQuizView();
        }
    }

    async submitQuiz() {
        // Stop the timer
        this.stopQuizTimer();

        // Check if the due date has passed
        const dueDate = this.currentCoursework.due_date ? new Date(this.currentCoursework.due_date) : null;
        const isOverdue = dueDate && dueDate < new Date();

        if (isOverdue) {
            // Show sad emoji modal for expired quizzes
            this.showExpiredQuizModal();
            return;
        }

        // Check if all questions are answered
        const unanswered = this.studentAnswers.filter(a => {
            if (a === null || a === '') return true;
            if (Array.isArray(a) && a.length === 0) return true;
            return false;
        }).length;

        if (unanswered > 0) {
            const confirmed = confirm(`You have ${unanswered} unanswered question(s). Do you want to submit anyway?`);
            if (!confirmed) {
                // Restart timer if user cancels
                this.startQuizTimer();
                return;
            }
        }

        // Get time taken in seconds
        const timeTaken = this.getTimeTaken();

        // Prepare submission data
        const submissionData = {
            coursework_id: this.currentCoursework.id,
            answers: this.currentCoursework.questions.map((q, idx) => ({
                question_id: q.id,
                answer_text: Array.isArray(this.studentAnswers[idx])
                    ? this.studentAnswers[idx].join('|||')  // Join multiple answers with separator
                    : (this.studentAnswers[idx] || '')
            })),
            time_taken: timeTaken
        };

        try {
            const response = await this.apiRequest('/api/coursework/submit', 'POST', submissionData);

            if (response.success) {
                // Mark quiz as submitted so closeAllModals doesn't re-save state
                this.quizSubmitted = true;

                // Clear saved quiz state after successful submission
                this.clearQuizState(this.currentCoursework.id);

                // Clear current coursework to prevent state saving
                const courseworkId = this.currentCoursework.id;
                this.currentCoursework = null;
                this.studentAnswers = [];

                const minutes = Math.floor(timeTaken / 60);
                const seconds = timeTaken % 60;
                const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                this.showToast(`Quiz submitted! Score: ${response.scored_points}/${response.total_points} (${response.grade_percentage}%) - Time: ${timeStr}`, 'success');
                this.closeAllModals();
                // Refresh the my quizzes list
                this.loadMyCourseworks();

                // Reset flag
                this.quizSubmitted = false;
            } else {
                this.showToast('Failed to submit quiz: ' + (response.detail || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error submitting quiz:', error);
            this.showToast('Error submitting quiz. Please try again.', 'error');
        }
    }

    /**
     * Show modal for expired/overdue quiz submission attempt
     */
    showExpiredQuizModal() {
        const detailsContainer = document.getElementById('courseworkDetailsContent');
        if (!detailsContainer) return;

        const coursework = this.currentCoursework;
        const dueDate = new Date(coursework.due_date);
        const now = new Date();
        const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));

        detailsContainer.innerHTML = `
            <div class="expired-quiz-container">
                <div class="expired-quiz-emoji">😢</div>
                <h2 class="expired-quiz-title">Time Has Passed</h2>
                <p class="expired-quiz-message">
                    Unfortunately, this quiz was due on <strong>${dueDate.toLocaleDateString()}</strong>
                    and is now <strong>${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue</strong>.
                </p>
                <p class="expired-quiz-submessage">
                    Your submission cannot be accepted because the deadline has passed.
                </p>
                <div class="expired-quiz-info">
                    <div class="info-item">
                        <span class="info-label">Quiz:</span>
                        <span class="info-value">${coursework.course_name || coursework.title || 'Quiz'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Due Date:</span>
                        <span class="info-value text-red-500">${dueDate.toLocaleDateString()} at ${dueDate.toLocaleTimeString()}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Questions Answered:</span>
                        <span class="info-value">${this.studentAnswers.filter(a => a !== null && a !== '' && (!Array.isArray(a) || a.length > 0)).length} of ${this.currentCoursework.questions.length}</span>
                    </div>
                </div>
                <p class="expired-quiz-advice">
                    Please contact your tutor if you believe there was an error or need an extension.
                </p>
                <div class="expired-quiz-actions">
                    <button class="coursework-btn coursework-btn-cancel" onclick="courseworkManager.closeAllModals()">
                        <span>✕</span> Close
                    </button>
                </div>
            </div>
        `;

        // Clear saved state since it can't be submitted
        this.clearQuizState(coursework.id);
    }

    loadStudentAnswers() {
        // This would load student submissions
        // For now, create sample data
        const tableBody = document.getElementById('courseworkAnswerTableBody');
        if (!tableBody) return;

        // Sample: Show submitted courseworks with mock data
        const submittedCourseworks = this.courseworks.filter(q => q.status === 'posted').slice(0, 3);

        if (submittedCourseworks.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-gray-500 py-8">No answers submitted yet</td></tr>';
            return;
        }

        tableBody.innerHTML = submittedCourseworks.map((coursework, index) => {
            const student = this.students.find(s => s.id === coursework.studentId);
            const studentName = student ? student.name : 'Unknown';
            const dueDate = new Date(coursework.dueDate);
            const dueDateStr = dueDate.toLocaleDateString();
            const statuses = ['Submitted', 'Not Submitted', 'In Progress'];
            const status = statuses[index % statuses.length];

            return `
                <tr>
                    <td>${coursework.courseName}</td>
                    <td>${coursework.quizType}</td>
                    <td>${dueDateStr}</td>
                    <td>
                        <span class="coursework-status-badge ${status === 'Submitted' ? 'status-posted' : 'status-draft'}">
                            ${status}
                        </span>
                    </td>
                    <td>
                        ${status === 'Submitted' ? `
                            <button class="coursework-btn coursework-btn-edit" onclick="courseworkManager.gradeCoursework('${coursework.id}')">
                                <span>✏️</span> Grade
                            </button>
                        ` : '-'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    gradeCoursework(quizId) {
        const coursework= this.courseworks.find(q => q.id === quizId);
        if (!coursework) return;

        this.currentCoursework= coursework;
        this.openGradingModal();
    }

    openGradingModal() {
        this.closeAllModals();
        const modal = document.getElementById('courseworkGradingModal');
        if (!modal) {
            // Create modal dynamically if it doesn't exist
            this.createGradingModal();
            return;
        }

        modal.classList.add('active');
        this.renderGradingContent();
    }

    createGradingModal() {
        // This would be added to HTML, for now show toast
        this.showToast('Grading interface coming in Phase 2!', 'info');
    }

    renderGradingContent() {
        const container = document.getElementById('courseworkGradingContent');
        if (!container) return;

        const coursework= this.currentCoursework;
        const student = this.students.find(s => s.id === coursework.studentId);

        let html = `
            <div class="grading-header">
                <h3>${student ? student.name : 'Unknown'}'s Answers</h3>
                <p>Course: ${coursework.courseName}</p>
            </div>
            <div class="grading-questions">
        `;

        coursework.questions.forEach((q, index) => {
            // Mock student answer
            const studentAnswer = this.getMockStudentAnswer(q);

            html += `
                <div class="grading-question-item">
                    <div class="coursework-question-header">
                        <span class="coursework-question-number">Question ${index + 1}</span>
                    </div>
                    <div class="coursework-question-text">${q.text}</div>
                    <div class="student-answer-section">
                        <strong>Student's Answer:</strong>
                        <div class="student-answer">${studentAnswer}</div>
                    </div>
                    ${q.type !== 'openEnded' ? `
                        <div class="correct-answer-section">
                            <strong>Correct Answer:</strong>
                            <div class="correct-answer">${this.getCorrectAnswerDisplay(q)}</div>
                        </div>
                    ` : ''}
                    <div class="marking-buttons">
                        <button class="coursework-mark-correct-btn" onclick="courseworkManager.markAnswer('${q.id}', true)">
                            <span>✓</span> Correct
                        </button>
                        <button class="coursework-mark-wrong-btn" onclick="courseworkManager.markAnswer('${q.id}', false)">
                            <span>✗</span> Wrong
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    getMockStudentAnswer(question) {
        if (question.type === 'multipleChoice') {
            return 'Option C';
        } else if (question.type === 'trueFalse') {
            return 'True';
        } else {
            return '<p>This is a sample student answer for the open-ended question. The student wrote a detailed response explaining their understanding of the topic.</p>';
        }
    }

    getCorrectAnswerDisplay(question) {
        if (question.type === 'multipleChoice') {
            return `Option ${question.correctAnswer}`;
        } else if (question.type === 'trueFalse') {
            return question.correctAnswer === 'true' ? 'True' : 'False';
        }
        return 'N/A';
    }

    markAnswer(questionId, isCorrect) {
        // Store marking in courseworkdata
        if (!this.currentCoursework.grades) {
            this.currentCoursework.grades = {};
        }

        this.currentCoursework.grades[questionId] = isCorrect;

        // Update UI
        const button = event.target.closest('button');
        const container = button.parentElement;
        const correctBtn = container.querySelector('.coursework-mark-correct-btn');
        const wrongBtn = container.querySelector('.coursework-mark-wrong-btn');

        correctBtn.classList.remove('active');
        wrongBtn.classList.remove('active');

        if (isCorrect) {
            correctBtn.classList.add('active');
        } else {
            wrongBtn.classList.add('active');
        }

        this.showToast(`Answer marked as ${isCorrect ? 'correct' : 'wrong'}`, 'success');
    }

    updateNotifications() {
        // Count new/pending items
        const postedCourseworks = this.courseworks.filter(q => q.status === 'posted').length;

        const badge = document.querySelector('.coursework-notification-badge');
        if (badge) {
            if (postedCourseworks > 0) {
                badge.textContent = postedCourseworks;
                badge.classList.add('active');
            } else {
                badge.classList.remove('active');
            }
        }
    }

    // ========== UTILITIES ==========

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('courseworkToast');
        if (!toast) return;

        const icon = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        }[type] || 'ℹ️';

        toast.className = `coursework-toast-notification active ${type}`;
        toast.innerHTML = `
            <span class="coursework-toast-icon">${icon}</span>
            <span class="coursework-toast-message">${message}</span>
        `;

        setTimeout(() => {
            toast.classList.remove('active');
        }, 3000);
    }
}

// Initialize CourseworkManager
let courseworkManager;

document.addEventListener('DOMContentLoaded', () => {
    courseworkManager = new CourseworkManager();
    // Student search is now set up when the modal opens (openGiveCourseworkModal)
});

// Global function for HTML onclick
function openCourseworkMaker() {
    if (courseworkManager) {
        // Open Give Coursework modal directly instead of Main modal
        courseworkManager.openGiveCourseworkModal();
    }
}

// Global function for "Give Coursework" button in student details modal
function openGiveCourseworkModal() {
    if (courseworkManager) {
        // Get the current student ID from the student details modal context
        const studentId = currentStudentDetailsId || window.currentStudentDetailsId;

        // Close the student details modal first using the proper function
        if (typeof closeStudentDetailsModal === 'function') {
            closeStudentDetailsModal();
        } else if (typeof TutorModalManager !== 'undefined' && TutorModalManager.closeStudentDetails) {
            TutorModalManager.closeStudentDetails();
        }

        if (studentId) {
            // Pre-select this student in the coursework manager
            courseworkManager.selectedStudentId = studentId;
            console.log('[openGiveCourseworkModal] Pre-selecting student:', studentId);
        }

        // Open the Give Coursework modal
        courseworkManager.openGiveCourseworkModal();

        // Pre-populate the student UI if we have a student ID (using same format as selectStudent)
        if (studentId) {
            setTimeout(() => {
                const student = courseworkManager.students?.find(s => s.id === studentId);
                if (student) {
                    const selectedDiv = document.getElementById('courseworkSelectedStudent');
                    if (selectedDiv) {
                        selectedDiv.innerHTML = `
                            <div class="coursework-selected-item">
                                <img src="${student.profilePic || '/uploads/system_images/system_profile_pictures/woman-user.jpg'}" alt="${student.name}">
                                <span>${student.name}</span>
                                <button class="coursework-selected-item-remove" onclick="courseworkManager.removeStudent()">✕</button>
                            </div>
                        `;
                    }
                }
            }, 150);
        }
    } else {
        console.error('[openGiveCourseworkModal] courseworkManager not initialized');
    }
}

// ============================================
// STUDENT COURSEWORK MANAGER
// Manages courseworks for specific students
// ============================================

const StudentCourseworkManager = {
    currentStudentId: null,
    courseworks: [],
    currentTab: 'active',

    /**
     * Initialize the manager with a student ID
     */
    init(studentId) {
        this.currentStudentId = studentId;
        console.log('📝 StudentCourseworkManager initialized for student:', studentId);
    },

    /**
     * Switch between coursework tabs
     */
    switchTab(tab) {
        this.currentTab = tab;

        // Update tab buttons
        document.querySelectorAll('.coursework-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Load courseworks for the selected tab
        this.loadCourseworks(tab);
    },

    /**
     * Load courseworks for the current student from courseworkManager
     */
    async loadCourseworks(status = 'active') {
        const container = document.getElementById('student-courseworks');
        if (!container) return;

        // Show loading state
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                <p>Loading courseworks...</p>
            </div>
        `;

        try {
            // Get student ID from the modal
            if (!this.currentStudentId) {
                console.warn('No student ID set');
                container.innerHTML = `
                    <div class="col-span-full card p-6 text-center text-gray-500">
                        <p>Student information not available</p>
                    </div>
                `;
                return;
            }

            // Check if courseworkManager exists
            if (typeof courseworkManager === 'undefined') {
                container.innerHTML = `
                    <div class="col-span-full card p-6 text-center text-yellow-500">
                        <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                        <p>courseworkManager not loaded</p>
                        <p class="text-sm mt-2">Please ensure coursework-manager.js is included</p>
                    </div>
                `;
                return;
            }

            // Get all courseworks from courseworkManager
            let allCourseworks = courseworkManager.courseworks || [];

            // Filter courseworks for this specific student by status
            let studentCourseworks = allCourseworks.filter(coursework => {
                const matchesStudent = coursework.studentId === this.currentStudentId ||
                                      coursework.student_id === this.currentStudentId ||
                                      (Array.isArray(coursework.students) && coursework.students.includes(this.currentStudentId));

                // Filter by status/tab
                if (status === 'active') {
                    return matchesStudent && !coursework.posted && !coursework.isCompleted;
                } else if (status === 'completed') {
                    return matchesStudent && coursework.isCompleted;
                } else if (status === 'draft') {
                    return matchesStudent && !coursework.posted && !coursework.isCompleted;
                }
                return matchesStudent;
            });

            this.courseworks = studentCourseworks;

            if (studentCourseworks.length === 0) {
                const emptyMessages = {
                    'active': 'No active courseworks',
                    'completed': 'No completed courseworks',
                    'draft': 'No draft courseworks'
                };

                container.innerHTML = `
                    <div class="col-span-full card p-6 text-center text-gray-500">
                        <i class="fas fa-clipboard-list text-3xl mb-3"></i>
                        <p>${emptyMessages[status]}</p>
                        <p class="text-sm mt-2">Create a new coursework to get started</p>
                    </div>
                `;
                return;
            }

            // Render coursework cards
            container.innerHTML = studentCourseworks.map(coursework => this.renderCourseworkCard(coursework)).join('');

        } catch (error) {
            console.error('Error loading courseworks:', error);
            container.innerHTML = `
                <div class="col-span-full card p-6 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                    <p>Failed to load courseworks</p>
                    <p class="text-sm mt-2">${error.message}</p>
                </div>
            `;
        }
    },

    /**
     * Render a coursework card
     */
    renderCourseworkCard(coursework) {
        const statusColors = {
            'active': 'bg-green-100 text-green-800',
            'completed': 'bg-blue-100 text-blue-800',
            'draft': 'bg-yellow-100 text-yellow-800',
            'expired': 'bg-gray-100 text-gray-800'
        };

        const statusIcons = {
            'active': '▶️',
            'completed': '✅',
            'draft': '📝',
            'expired': '⏰'
        };

        const createdDate = new Date(coursework.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const dueDate = coursework.due_date ? new Date(coursework.due_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : 'No deadline';

        const statusClass = statusColors[coursework.status] || 'bg-gray-100 text-gray-800';
        const statusIcon = statusIcons[coursework.status] || '📝';

        const score = coursework.score !== null ? `${coursework.score}/${coursework.total_points}` : 'Not graded';

        return `
            <div class="card p-4 hover:shadow-lg transition">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-bold text-lg">${coursework.title}</h4>
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${statusClass}">
                        ${statusIcon} ${coursework.status}
                    </span>
                </div>

                <div class="space-y-2 mb-4">
                    <div class="flex items-center gap-2 text-sm">
                        <i class="fas fa-book text-gray-500"></i>
                        <span style="color: var(--text-secondary);">${coursework.subject || 'General'}</span>
                    </div>
                    <div class="flex items-center gap-2 text-sm">
                        <i class="fas fa-question-circle text-gray-500"></i>
                        <span style="color: var(--text-secondary);">
                            ${coursework.question_count || 0} question${coursework.question_count !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div class="flex items-center gap-2 text-sm">
                        <i class="fas fa-calendar text-gray-500"></i>
                        <span style="color: var(--text-secondary);">Due: ${dueDate}</span>
                    </div>
                    ${coursework.status === 'completed' ? `
                        <div class="flex items-center gap-2 text-sm">
                            <i class="fas fa-trophy text-yellow-500"></i>
                            <span class="font-medium" style="color: var(--primary-color);">Score: ${score}</span>
                        </div>
                    ` : ''}
                    ${coursework.description ? `
                        <div class="text-sm text-gray-600 mt-2">
                            ${coursework.description}
                        </div>
                    ` : ''}
                </div>

                <div class="flex gap-2">
                    ${coursework.status === 'active' ? `
                        <button
                            onclick="StudentCourseworkManager.assignCoursework(${coursework.id})"
                            class="flex-1 btn-primary"
                            style="padding: 8px; font-size: 0.875rem;">
                            <i class="fas fa-paper-plane"></i> Assign
                        </button>
                    ` : coursework.status === 'completed' ? `
                        <button
                            onclick="StudentCourseworkManager.viewResults(${coursework.id})"
                            class="flex-1 btn-secondary"
                            style="padding: 8px; font-size: 0.875rem;">
                            <i class="fas fa-chart-bar"></i> View Results
                        </button>
                    ` : `
                        <button
                            onclick="StudentCourseworkManager.editCoursework(${coursework.id})"
                            class="flex-1 btn-secondary"
                            style="padding: 8px; font-size: 0.875rem;">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    `}
                    <button
                        onclick="StudentCourseworkManager.deleteCoursework(${coursework.id})"
                        class="btn-secondary"
                        style="padding: 8px; font-size: 0.875rem;"
                        title="Delete coursework">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Create a new coursework - Opens courseworkManager modal with student pre-selected
     */
    createNewCoursework() {
        if (!this.currentStudentId) {
            alert('❌ No student selected');
            return;
        }

        // Check if courseworkManager exists (from coursework-manager.js)
        if (typeof courseworkManager !== 'undefined') {
            // Pre-select this student in the coursework manager
            courseworkManager.selectedStudentId = this.currentStudentId;

            // Open the Give Coursework modal
            courseworkManager.openGiveCourseworkModal();

            // Pre-populate the student search with the student's name (if available)
            setTimeout(() => {
                const student = courseworkManager.students?.find(s => s.id === this.currentStudentId);
                if (student) {
                    const selectedDiv = document.getElementById('courseworkSelectedStudent');
                    if (selectedDiv) {
                        selectedDiv.innerHTML = `
                            <div class="selected-student">
                                <img src="${student.profilePicture || '/uploads/system_images/system_profile_pictures/woman-user.jpg'}" alt="${student.name}">
                                <div>
                                    <strong>${student.name}</strong>
                                    <p>${student.grade}</p>
                                </div>
                            </div>
                        `;
                    }
                }
            }, 100);
        } else {
            alert('❌ courseworkManager not loaded. Please ensure coursework-manager.js is included.');
        }
    },

    /**
     * Edit an existing coursework - Opens courseworkManager edit modal
     */
    editCoursework(courseworkId) {
        if (typeof courseworkManager !== 'undefined') {
            const coursework = courseworkManager.courseworks.find(q => q.id === courseworkId);
            if (coursework) {
                courseworkManager.loadCourseworkForEditing(coursework);
            }
        } else {
            alert('❌ courseworkManager not loaded');
        }
    },

    /**
     * Assign/Post coursework to student
     */
    async assignCoursework(courseworkId) {
        if (typeof courseworkManager !== 'undefined') {
            const coursework = courseworkManager.courseworks.find(q => q.id === courseworkId);
            if (coursework) {
                if (confirm(`Post "${coursework.courseName}" coursework to the student?`)) {
                    try {
                        await courseworkManager.postCoursework(courseworkId);
                        this.loadCourseworks(this.currentTab); // Reload
                    } catch (error) {
                        console.error('Error posting coursework:', error);
                    }
                }
            }
        } else {
            alert('❌ courseworkManager not loaded');
        }
    },

    /**
     * View coursework results - Opens courseworkManager view details modal with graded results
     */
    async viewResults(courseworkId = null) {
        if (typeof courseworkManager !== 'undefined') {
            // Track that we came from My Quizzes for proper back navigation
            courseworkManager.previousModal = 'myQuizzes';

            // Ensure courseworks are loaded for the sidebar
            if (!courseworkManager.courseworks || courseworkManager.courseworks.length === 0) {
                await courseworkManager.loadMyCourseworks();
            }

            // If specific coursework ID provided, view its details
            if (courseworkId) {
                // Find the coursework
                const coursework = courseworkManager.courseworks.find(c => c.id === courseworkId);
                if (coursework) {
                    // View the coursework details (this will show graded results if graded)
                    await courseworkManager.viewCourseworkDetails(courseworkId);
                } else {
                    console.error('Coursework not found:', courseworkId);
                    alert('Coursework not found');
                }
            } else {
                // No specific coursework - open the my quizzes modal to see the list
                courseworkManager.openMyCourseworksModal();
            }
        } else {
            alert('❌ courseworkManager not loaded');
        }
    },

    /**
     * Delete a coursework - Delegates to courseworkManager
     */
    async deleteCoursework(courseworkId) {
        if (typeof courseworkManager !== 'undefined') {
            const coursework = courseworkManager.courseworks.find(q => q.id === courseworkId);
            if (coursework && confirm(`Delete coursework "${coursework.courseName}"?`)) {
                try {
                    await courseworkManager.deleteCoursework(courseworkId);
                    this.loadCourseworks(this.currentTab); // Reload
                } catch (error) {
                    console.error('Error deleting coursework:', error);
                }
            }
        } else {
            alert('❌ courseworkManager not loaded');
        }
    }
};

// Export to window
window.StudentCourseworkManager = StudentCourseworkManager;
