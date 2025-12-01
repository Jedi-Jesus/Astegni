// ============================================
// STUDENT PROFILE DATA LOADER
// Loads and populates all student profile data from backend
// ============================================

const StudentProfileDataLoader = {
    currentStudentId: null,
    profileData: null,

    // Initialize and load profile
    async init() {
        try {
            // Get student ID from URL (optional - if viewing another student's profile)
            this.currentStudentId = this.getStudentIdFromURL();

            // If no student ID in URL, this is the logged-in student viewing their own profile
            if (!this.currentStudentId) {
                console.log('Loading profile for logged-in student');
            } else {
                console.log('Loading profile for student ID:', this.currentStudentId);
            }

            // Load all data
            await this.loadCompleteProfile();
        } catch (error) {
            console.error('Error initializing student profile:', error);
        }
    },

    // Get student ID from URL parameters
    getStudentIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('student_id') || urlParams.get('id');
    },

    // Load complete profile data
    async loadCompleteProfile() {
        try {
            // Show loading state
            this.showLoading();

            // Fetch complete profile
            this.profileData = await StudentProfileAPI.getStudentProfile(this.currentStudentId);

            if (!this.profileData) {
                console.warn('No profile data returned from API');
                this.profileData = {}; // Empty object - will show "No ... yet" messages
            }

            // Set the student ID from the loaded profile
            if (!this.currentStudentId && this.profileData.id) {
                this.currentStudentId = this.profileData.id;
            }

            // IMPORTANT: Sync profile data to StudentProfileState for modal population
            if (typeof StudentProfileState !== 'undefined') {
                StudentProfileState.setStudentProfile(this.profileData);
            }

            // Populate all sections
            this.populateProfileHeader();
            this.populateDashboardStats();

            // Hide loading state
            this.hideLoading();

        } catch (error) {
            console.error('Error loading complete profile:', error);

            // Show loading failed message
            this.showError('Loading failed. Please refresh the page.');

            // Use empty object - will show "No ... yet" messages
            this.profileData = {};

            if (typeof StudentProfileState !== 'undefined') {
                StudentProfileState.setStudentProfile(this.profileData);
            }

            this.populateProfileHeader();
            this.populateDashboardStats();
            this.hideLoading();
        }
    },

    // Populate dashboard stats from dashboard_stats object
    populateDashboardStats() {
        const stats = this.profileData.dashboard_stats || {};

        // Total Courses - from enrolled_courses table
        this.updateElement('stat-total-courses', stats.total_courses || 0);

        // Active Courses - from enrolled_courses table (not completed)
        this.updateElement('stat-active-courses', stats.active_courses || 0);

        // My Tutors - from enrolled_students table (distinct tutors)
        this.updateElement('stat-tutors', stats.my_tutors || 0);

        // Improvement Rate - from student profile
        this.updateElement('stat-improvement-rate', `${stats.improvement_rate || 0}%`);

        // Rating - from student_reviews table (average)
        this.updateElement('stat-rating', (stats.rating || 0).toFixed(1));

        console.log('📊 Dashboard stats populated:', stats);
    },

    // Populate profile header section
    populateProfileHeader() {
        const data = this.profileData;

        // Basic info - Show USERNAME from student_profiles table (role-specific username)
        if (data.username) {
            // Use username from student_profiles table - ensure it's on one line
            const displayName = String(data.username).replace(/[\n\r]/g, ' ').trim();
            // FIXED: Use specific ID selector to target profile header, NOT nav bar
            this.updateElement('studentName', displayName);
        } else {
            // Fallback: Show "Student Profile" if no username
            this.updateElement('studentName', 'Student Profile');
        }

        // Gender - always show, with "No gender yet" if empty
        const genderEl = document.getElementById('student-gender');
        if (data.gender) {
            if (genderEl) {
                genderEl.textContent = data.gender.charAt(0).toUpperCase() + data.gender.slice(1);
                genderEl.style.color = 'var(--text)';
                genderEl.style.fontStyle = 'normal';
            }
        } else {
            if (genderEl) {
                genderEl.textContent = 'No gender yet';
                genderEl.style.color = 'var(--text-muted)';
                genderEl.style.fontStyle = 'italic';
            }
        }

        // Email - always show, with "No email yet" if empty
        const emailEl = document.getElementById('student-email');
        if (data.email) {
            if (emailEl) {
                emailEl.textContent = data.email;
                emailEl.style.color = 'var(--text)';
                emailEl.style.fontStyle = 'normal';
            }
        } else {
            if (emailEl) {
                emailEl.textContent = 'No email yet';
                emailEl.style.color = 'var(--text-muted)';
                emailEl.style.fontStyle = 'italic';
            }
        }

        // Phone - always show, with "No phone yet" if empty
        const phoneEl = document.getElementById('student-phone');
        if (data.phone) {
            if (phoneEl) {
                phoneEl.textContent = data.phone;
                phoneEl.style.color = 'var(--text)';
                phoneEl.style.fontStyle = 'normal';
            }
        } else {
            if (phoneEl) {
                phoneEl.textContent = 'No phone yet';
                phoneEl.style.color = 'var(--text-muted)';
                phoneEl.style.fontStyle = 'italic';
            }
        }

        // Hero Title (rotating text animation) - from hero_title array
        if (data.hero_title && Array.isArray(data.hero_title) && data.hero_title.length > 0) {
            const heroTitleEl = document.getElementById('typedText');
            if (heroTitleEl) {
                // Use first hero title (or implement rotation later)
                heroTitleEl.textContent = data.hero_title[0];
            }
        }

        // Hero Subtitle - from hero_subtitle array (single value)
        if (data.hero_subtitle && Array.isArray(data.hero_subtitle) && data.hero_subtitle.length > 0) {
            const heroSubtitleEl = document.getElementById('hero-subtitle');
            if (heroSubtitleEl) {
                heroSubtitleEl.textContent = data.hero_subtitle[0];
            }
        } else if (data.hero_subtitle && typeof data.hero_subtitle === 'string') {
            const heroSubtitleEl = document.getElementById('hero-subtitle');
            if (heroSubtitleEl) {
                heroSubtitleEl.textContent = data.hero_subtitle;
            }
        }

        // Subjects (Interested In) - use interested_in field from DB
        const subjectsEl = document.getElementById('student-subjects');
        if (data.interested_in && Array.isArray(data.interested_in) && data.interested_in.length > 0) {
            const subjectsText = data.interested_in.join(', ');
            if (subjectsEl) {
                subjectsEl.textContent = subjectsText;
                subjectsEl.style.color = 'var(--text)';
                subjectsEl.style.fontStyle = 'normal';
            }

            // Update subject badge
            const subjectBadge = document.getElementById('subject-badge');
            if (subjectBadge) {
                subjectBadge.textContent = `📚 ${data.interested_in[0]}`; // Show first subject
            }
        } else if (data.subjects && Array.isArray(data.subjects) && data.subjects.length > 0) {
            // Fallback to old field name
            const subjectsText = data.subjects.join(', ');
            if (subjectsEl) {
                subjectsEl.textContent = subjectsText;
                subjectsEl.style.color = 'var(--text)';
                subjectsEl.style.fontStyle = 'normal';
            }
        } else if (data.interested_in && typeof data.interested_in === 'string') {
            if (subjectsEl) {
                subjectsEl.textContent = data.interested_in;
                subjectsEl.style.color = 'var(--text)';
                subjectsEl.style.fontStyle = 'normal';
            }
        } else {
            if (subjectsEl) {
                subjectsEl.textContent = 'No interests yet';
                subjectsEl.style.color = 'var(--text-muted)';
                subjectsEl.style.fontStyle = 'italic';
            }
        }

        // Grade Level - always show, with "No grade yet" if empty
        const gradeEl = document.getElementById('student-grade');
        if (data.grade_level) {
            if (gradeEl) {
                gradeEl.textContent = data.grade_level;
                gradeEl.style.color = 'var(--text)';
                gradeEl.style.fontStyle = 'normal';
            }
        } else {
            if (gradeEl) {
                gradeEl.textContent = 'No grade yet';
                gradeEl.style.color = 'var(--text-muted)';
                gradeEl.style.fontStyle = 'italic';
            }
        }

        // Studying At (school/institution) - always show, with "No school yet" if empty
        const schoolEl = document.getElementById('student-school');
        if (data.school || data.institution || data.studying_at) {
            if (schoolEl) {
                schoolEl.textContent = data.school || data.institution || data.studying_at;
                schoolEl.style.color = 'var(--text)';
                schoolEl.style.fontStyle = 'normal';
            }
        } else {
            if (schoolEl) {
                schoolEl.textContent = 'No school yet';
                schoolEl.style.color = 'var(--text-muted)';
                schoolEl.style.fontStyle = 'italic';
            }
        }

        // Preferred Learning Method - always show, with "No learning methods yet" if empty
        const learningMethodsEl = document.getElementById('student-learning-methods');
        if (data.learning_methods && Array.isArray(data.learning_methods) && data.learning_methods.length > 0) {
            const methodsText = data.learning_methods.join(', ');
            if (learningMethodsEl) {
                learningMethodsEl.textContent = methodsText;
                learningMethodsEl.style.color = 'var(--text)';
                learningMethodsEl.style.fontStyle = 'normal';
            }
        } else if (data.learning_methods && typeof data.learning_methods === 'string') {
            if (learningMethodsEl) {
                learningMethodsEl.textContent = data.learning_methods;
                learningMethodsEl.style.color = 'var(--text)';
                learningMethodsEl.style.fontStyle = 'normal';
            }
        } else if (data.learning_method && Array.isArray(data.learning_method) && data.learning_method.length > 0) {
            // Alternative field name (singular)
            const methodsText = data.learning_method.join(', ');
            if (learningMethodsEl) {
                learningMethodsEl.textContent = methodsText;
                learningMethodsEl.style.color = 'var(--text)';
                learningMethodsEl.style.fontStyle = 'normal';
            }
        } else if (data.preferred_learning_method) {
            // Another alternative field name
            if (learningMethodsEl) {
                learningMethodsEl.textContent = data.preferred_learning_method;
                learningMethodsEl.style.color = 'var(--text)';
                learningMethodsEl.style.fontStyle = 'normal';
            }
        } else {
            if (learningMethodsEl) {
                learningMethodsEl.textContent = 'No learning methods yet';
                learningMethodsEl.style.color = 'var(--text-muted)';
                learningMethodsEl.style.fontStyle = 'italic';
            }
        }

        // Languages - always show, with "No languages yet" if empty
        const languagesEl = document.getElementById('student-languages');
        if (data.languages && Array.isArray(data.languages) && data.languages.length > 0) {
            const languagesText = data.languages.join(', ');
            if (languagesEl) {
                languagesEl.textContent = languagesText;
                languagesEl.style.color = 'var(--text)';
                languagesEl.style.fontStyle = 'normal';
            }
        } else if (data.preferred_languages && Array.isArray(data.preferred_languages) && data.preferred_languages.length > 0) {
            // Alternative field name
            const languagesText = data.preferred_languages.join(', ');
            if (languagesEl) {
                languagesEl.textContent = languagesText;
                languagesEl.style.color = 'var(--text)';
                languagesEl.style.fontStyle = 'normal';
            }
        } else if (data.languages && typeof data.languages === 'string') {
            if (languagesEl) {
                languagesEl.textContent = data.languages;
                languagesEl.style.color = 'var(--text)';
                languagesEl.style.fontStyle = 'normal';
            }
        } else {
            if (languagesEl) {
                languagesEl.textContent = 'No languages yet';
                languagesEl.style.color = 'var(--text-muted)';
                languagesEl.style.fontStyle = 'italic';
            }
        }

        // Hobbies & Interests - always show, with "No hobbies yet" if empty
        const hobbiesEl = document.getElementById('student-hobbies');
        if (data.hobbies && Array.isArray(data.hobbies) && data.hobbies.length > 0) {
            const hobbiesText = data.hobbies.join(', ');
            if (hobbiesEl) {
                hobbiesEl.textContent = hobbiesText;
                hobbiesEl.style.color = 'var(--text)';
                hobbiesEl.style.fontStyle = 'normal';
            }
        } else if (data.interests && Array.isArray(data.interests) && data.interests.length > 0) {
            // Alternative field name
            const interestsText = data.interests.join(', ');
            if (hobbiesEl) {
                hobbiesEl.textContent = interestsText;
                hobbiesEl.style.color = 'var(--text)';
                hobbiesEl.style.fontStyle = 'normal';
            }
        } else if (data.hobbies && typeof data.hobbies === 'string') {
            if (hobbiesEl) {
                hobbiesEl.textContent = data.hobbies;
                hobbiesEl.style.color = 'var(--text)';
                hobbiesEl.style.fontStyle = 'normal';
            }
        } else {
            if (hobbiesEl) {
                hobbiesEl.textContent = 'No hobbies yet';
                hobbiesEl.style.color = 'var(--text-muted)';
                hobbiesEl.style.fontStyle = 'italic';
            }
        }

        // Bio (About Me) - always show, with "No bio yet" if empty
        const bioEl = document.getElementById('student-bio');
        if (data.bio || data.about) {
            if (bioEl) {
                bioEl.textContent = data.bio || data.about;
                bioEl.style.color = 'var(--text)';
                bioEl.style.fontStyle = 'normal';
            }
        } else {
            if (bioEl) {
                bioEl.textContent = 'No bio yet';
                bioEl.style.color = 'var(--text-muted)';
                bioEl.style.fontStyle = 'italic';
            }
        }

        // Quote - always show, with "No quote yet" if empty
        const quoteEl = document.getElementById('student-quote');
        if (data.quote && Array.isArray(data.quote) && data.quote.length > 0) {
            // Quote is an array - use first quote
            if (quoteEl) {
                quoteEl.textContent = `"${data.quote[0]}"`;
                quoteEl.style.color = 'var(--text)';
                quoteEl.style.fontStyle = 'italic';
            }
        } else if (data.quote && typeof data.quote === 'string') {
            // Quote is a string
            if (quoteEl) {
                quoteEl.textContent = data.quote.startsWith('"') ? data.quote : `"${data.quote}"`;
                quoteEl.style.color = 'var(--text)';
                quoteEl.style.fontStyle = 'italic';
            }
        } else {
            if (quoteEl) {
                quoteEl.textContent = 'No quote yet';
                quoteEl.style.color = 'var(--text-muted)';
                quoteEl.style.fontStyle = 'italic';
            }
        }

        // Location - always show, with "No location yet" if empty
        const locationEl = document.getElementById('student-location');
        if (data.location) {
            if (locationEl) {
                locationEl.textContent = data.location;
                locationEl.style.color = 'var(--text)';
                locationEl.style.fontStyle = 'normal';
            }
        } else {
            if (locationEl) {
                locationEl.textContent = 'No location yet';
                locationEl.style.color = 'var(--text-muted)';
                locationEl.style.fontStyle = 'italic';
            }
        }

        // Joined date
        if (data.joined) {
            this.updateElement('student-joined', data.joined);
        }

        // Images
        if (data.profile_picture) {
            this.updateImage('profile-avatar', data.profile_picture);
        }
        if (data.cover_image) {
            this.updateImage('cover-img', data.cover_image);
        }

        // Connections
        this.updateElement('connections-count', data.connections?.total_connections || 0);
        this.updateElement('classmates-count', data.connections?.classmates || 45);
        this.updateElement('tutors-count', data.connections?.tutors || 3);

        // Rating
        if (data.rating) {
            this.updateElement('student-rating', data.rating.toFixed(1));
            this.renderStars('rating-stars', data.rating);
        }
        if (data.rating_count) {
            this.updateElement('rating-count', `(${data.rating_count} reviews)`);
        }
    },

    // Utility functions
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    },

    updateImage(id, src) {
        const element = document.getElementById(id);
        if (element && src) {
            element.src = src;
        }
    },

    renderStars(id, rating) {
        const element = document.getElementById(id);
        if (element) {
            const fullStars = Math.floor(rating);
            const halfStar = rating % 1 >= 0.5;
            const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

            element.innerHTML = '★'.repeat(fullStars) +
                                (halfStar ? '⯨' : '') +
                                '☆'.repeat(emptyStars);
        }
    },

    showLoading() {
        console.log('📥 Loading student profile data...');
        // Add loading spinner if exists
        const loadingElement = document.getElementById('profile-loading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
    },

    hideLoading() {
        console.log('✅ Student profile data loaded successfully');
        // Hide loading spinner if exists
        const loadingElement = document.getElementById('profile-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    },

    showError(message) {
        console.error('❌ Profile Error:', message);
        // Show user-friendly error without alert (too intrusive)
        const errorElement = document.getElementById('profile-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }
};
