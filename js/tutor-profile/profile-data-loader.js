// ============================================
// TUTOR PROFILE DATA LOADER
// Loads and populates all tutor profile data from backend
// ============================================

const TutorProfileDataLoader = {
    currentTutorId: null,
    profileData: null,
    _initialized: false,  // Guard to prevent multiple initializations

    // Initialize and load profile
    async init() {
        // Prevent multiple initializations
        if (this._initialized) {
            console.log('⚠️ TutorProfileDataLoader already initialized, skipping...');
            return;
        }
        this._initialized = true;

        try {
            // Wait for AuthManager to be ready before loading profile
            await this.waitForAuth();

            // Get tutor ID from URL (optional - if viewing another tutor's profile)
            this.currentTutorId = this.getTutorIdFromURL();

            // If no tutor ID in URL, this is the logged-in tutor viewing their own profile
            // The API will use the current user's session to determine the tutor
            if (!this.currentTutorId) {
                console.log('Loading profile for logged-in tutor');
            } else {
                console.log('Loading profile for tutor ID:', this.currentTutorId);
            }

            // Load all data
            await this.loadCompleteProfile();
        } catch (error) {
            console.error('Error initializing profile:', error);
        }
    },

    // Wait for AuthManager to be ready with valid token
    async waitForAuth(maxAttempts = 10, intervalMs = 100) {
        for (let i = 0; i < maxAttempts; i++) {
            // Check if AuthManager exists and has a token
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (token && window.AuthManager && window.AuthManager.token) {
                console.log('✅ AuthManager ready with token');
                return true;
            }

            // Also check if AuthManager just needs to restore from localStorage
            if (token && window.AuthManager && !window.AuthManager.token) {
                // Token exists in localStorage but AuthManager hasn't picked it up yet
                window.AuthManager.token = token;
                console.log('✅ Token restored to AuthManager from localStorage');
                return true;
            }

            if (token) {
                // Token exists in localStorage, good enough to proceed
                console.log('✅ Token found in localStorage, proceeding...');
                return true;
            }

            // Wait before next attempt
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        console.warn('⚠️ AuthManager not ready after waiting, proceeding anyway...');
        return false;
    },

    // Get tutor ID from URL parameters
    getTutorIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('tutor_id') || urlParams.get('id');
    },

    // Get current logged-in tutor's ID
    async getCurrentTutorId() {
        try {
            const user = await TutorProfileAPI.getCurrentUser();
            if (user && user.tutor_profile) {
                return user.tutor_profile.id;
            }
            return null;
        } catch (error) {
            console.error('Error getting current tutor ID:', error);
            return null;
        }
    },

    // Load complete profile data
    async loadCompleteProfile() {
        try {
            // Show loading state
            this.showLoading();

            // Fetch complete profile
            this.profileData = await TutorProfileAPI.getCompleteTutorProfile(this.currentTutorId);

            if (!this.profileData) {
                throw new Error('Failed to load profile data');
            }

            // Set the tutor ID from the loaded profile
            if (!this.currentTutorId && this.profileData.id) {
                this.currentTutorId = this.profileData.id;
            }

            // IMPORTANT: Sync profile data to TutorProfileState for modal population
            if (typeof TutorProfileState !== 'undefined') {
                TutorProfileState.setTutorProfile(this.profileData);
            }

            // Populate all sections
            this.populateHeroSection();
            this.populateProfileDetails();
            this.populateRatingMetrics();
            this.populateDashboardCards();
            this.populateWeeklyStats();
            this.populateConnectionStats();

            // Load additional data
            await Promise.all([
                this.loadReviews(),
                this.loadActivities(),
                this.loadTodaySchedule()
            ]);

            // Hide loading state
            this.hideLoading();

        } catch (error) {
            console.error('Error loading complete profile:', error);
            this.showError('Failed to load profile data');
        }
    },

    // Populate hero section
    populateHeroSection() {
        const data = this.profileData;

        // Hero titles - use database values with typewriter animation if available
        // Backend returns hero_titles as an array of strings
        if (data.hero_titles && Array.isArray(data.hero_titles) && data.hero_titles.length > 0 && typeof window.setTutorHeroTexts === 'function') {
            console.log('Setting hero titles from database:', data.hero_titles);

            // Use the database hero_titles array directly
            window.setTutorHeroTexts(data.hero_titles);
        } else {
            console.log('No hero_titles in database, using defaults');
        }

        // Hero subtitle - use database value or keep existing HTML default
        if (data.hero_subtitle) {
            this.updateElement('hero-subtitle', data.hero_subtitle);
        }

        // Hero stats with animation
        this.animateCounter('stat-students-taught', data.students_taught || 0, '+');
        this.animateCounter('stat-courses-created', data.courses_created || 0, '+');
        this.animateCounter('stat-hero-rating', data.rating || 0, '★', 1);
    },

    // Populate profile details section
    populateProfileDetails() {
        const data = this.profileData;

        // Debug logging - show what we received from API
        console.log('🔍 Profile data received from API:');
        console.log('  - grade_level:', data.grade_level);
        console.log('  - grades:', data.grades);
        console.log('  - languages:', data.languages);
        console.log('  - course_type:', data.course_type);
        console.log('  - sessionFormat:', data.sessionFormat);
        console.log('  - teaches_at:', data.teaches_at);

        // Basic info - Show NAME in header, USERNAME below it
        if (data.name) {
            // FIXED: Use specific ID selector to target profile header, NOT nav bar
            this.updateElement('tutorName', data.name);
        }

        // Username field - display @username below name (REQUIRED: reads from tutor_profiles.username)
        const usernameElement = document.getElementById('tutorUsername');
        if (usernameElement) {
            if (data.username) {
                usernameElement.textContent = '@' + data.username;
                usernameElement.style.display = 'block';
                console.log(`✅ Username loaded: @${data.username}`);
            } else {
                usernameElement.textContent = '';
                usernameElement.style.display = 'none';
                console.log('⚠️ Username is empty in database');
            }
        } else {
            console.error('❌ Element #tutorUsername not found');
        }

        if (data.bio) {
            this.updateElement('tutor-bio', data.bio);
        }
        if (data.quote) {
            this.updateElement('tutor-quote', data.quote);
        }
        // Location field (REQUIRED: reads from tutor_profiles.location)
        if (data.location && data.location.trim() !== '') {
            this.updateElement('tutor-location', data.location);
            console.log(`✅ Location loaded: ${data.location}`);
        } else {
            this.updateElement('tutor-location', 'Not specified');
            console.log('⚠️ Location is empty in database');
        }

        // Gender field (REQUIRED: reads from users.gender)
        const genderElement = document.getElementById('tutor-gender');
        const genderIcon = document.getElementById('gender-icon');
        if (genderElement) {
            if (data.gender && data.gender.trim() !== '') {
                genderElement.textContent = data.gender;
                // Update icon based on gender
                if (genderIcon) {
                    if (data.gender.toLowerCase() === 'male') {
                        genderIcon.textContent = '👨';
                    } else if (data.gender.toLowerCase() === 'female') {
                        genderIcon.textContent = '👩';
                    } else {
                        genderIcon.textContent = '👤';
                    }
                }
                console.log(`✅ Gender loaded: ${data.gender}`);
            } else {
                genderElement.textContent = 'Not specified';
                if (genderIcon) genderIcon.textContent = '👤';
                console.log('⚠️ Gender is empty in database');
            }
        } else {
            console.error('❌ Element #tutor-gender not found');
        }

        // Contact Information - Populate dynamically (matching view-tutor.html)
        this.updateContactInfo(data);

        // Teaching Method & Grade Level - load from packages and courses table
        // This fetches teaching methods from tutor_packages.session_format
        // and grade levels from courses table via the packages' course_ids
        this.loadTeachingMethodsAndGradeLevels();

        // Teaches At - update value only, preserve label
        const teachesAtValue = document.getElementById('tutor-teaches-at-field');
        if (teachesAtValue) {
            if (data.teaches_at && data.teaches_at.trim() !== '') {
                teachesAtValue.textContent = data.teaches_at;
                console.log(`✅ Teaches at loaded: ${data.teaches_at}`);
            } else {
                teachesAtValue.textContent = 'Not specified';
                console.log('⚠️ Teaches at is empty in database');
            }
        } else {
            console.error('❌ Element #tutor-teaches-at-field not found');
        }

        // Languages - update value only, preserve label (inline text version)
        const languagesValue = document.getElementById('tutor-languages-inline');
        if (languagesValue) {
            let languagesText = '';
            if (data.languages && Array.isArray(data.languages) && data.languages.length > 0) {
                languagesText = data.languages.join(', ');
            } else if (data.languages && typeof data.languages === 'string' && data.languages.trim() !== '') {
                languagesText = data.languages;
            }

            if (languagesText) {
                languagesValue.textContent = languagesText;
                console.log(`✅ Languages loaded: ${languagesText}`);
            } else {
                languagesValue.textContent = 'Not specified';
                console.log('⚠️ Languages is empty in database');
            }
        } else {
            console.error('❌ Element #tutor-languages-inline not found');
        }

        // Courses & Categories - fetch from courses table via API
        // This replaces the old subjects/course_type fields with data from the courses table
        this.loadTutorCoursesAndCategories();

        // Experience - update in experience badge and inline display
        this.updateExperience(data.experience || data.teaching_experience || 0);

        // Expertise Badge (REQUIRED: reads from tutor_profiles.expertise_badge)
        const expertiseBadge = document.getElementById('expertise-badge');
        if (expertiseBadge) {
            const badgeText = data.expertise_badge || 'Tutor';
            let badgeIcon = '🎓';
            let badgeClass = 'tutor'; // Default CSS class

            // Choose icon and CSS class based on expertise level
            if (badgeText.toLowerCase().includes('expert')) {
                badgeIcon = '🎓';
                badgeClass = 'expert';
            } else if (badgeText.toLowerCase().includes('intermediate')) {
                badgeIcon = '📚';
                badgeClass = 'intermediate';
            } else if (badgeText.toLowerCase().includes('beginner')) {
                badgeIcon = '📖';
                badgeClass = 'beginner';
            } else {
                badgeIcon = '🎓';
                badgeClass = 'tutor';
            }

            // Update both text and CSS class
            expertiseBadge.textContent = `${badgeIcon} ${badgeText}`;
            expertiseBadge.className = `profile-badge ${badgeClass}`;
            console.log(`✅ Expertise badge loaded: ${badgeText} (class: ${badgeClass})`);
        } else {
            console.error('❌ Element #expertise-badge not found');
        }

        // Verification Badge (REQUIRED: reads from tutor_profiles.is_verified and verification_status)
        const verificationBadge = document.getElementById('verification-badge');
        if (verificationBadge) {
            const isVerified = data.is_verified || false;
            const verificationStatus = data.verification_status || 'pending';

            if (isVerified && verificationStatus === 'verified') {
                // Verified tutor - show green verified badge
                verificationBadge.textContent = '✔ Verified Tutor';
                verificationBadge.className = 'profile-badge verified';
                verificationBadge.style.display = 'inline-block';
                console.log('✅ Verification badge: Verified');
            } else if (verificationStatus === 'pending') {
                // Pending verification - show orange pending badge
                verificationBadge.textContent = '⏳ Verification Pending';
                verificationBadge.className = 'profile-badge pending';
                verificationBadge.style.display = 'inline-block';
                console.log('⏳ Verification badge: Pending');
            } else if (verificationStatus === 'rejected') {
                // Rejected - show red rejected badge
                verificationBadge.textContent = '✖ Verification Rejected';
                verificationBadge.className = 'profile-badge rejected';
                verificationBadge.style.display = 'inline-block';
                console.log('❌ Verification badge: Rejected');
            } else if (verificationStatus === 'suspended') {
                // Suspended - show gray suspended badge
                verificationBadge.textContent = '⊘ Account Suspended';
                verificationBadge.className = 'profile-badge suspended';
                verificationBadge.style.display = 'inline-block';
                console.log('⊘ Verification badge: Suspended');
            } else {
                // Not verified - hide badge or show "Not Verified"
                verificationBadge.textContent = '○ Not Verified';
                verificationBadge.className = 'profile-badge not-verified';
                verificationBadge.style.display = 'inline-block';
                console.log('○ Verification badge: Not Verified');
            }
        } else {
            console.error('❌ Element #verification-badge not found');
        }

        this.updateElement('tutor-joined', data.joined || 'Recently joined');

        // Populate experience card (new field in profile header)
        const experienceYears = document.getElementById('tutor-years-experience');
        if (experienceYears) {
            experienceYears.textContent = data.teaching_experience || data.experience || 0;
        }

        // Rating section
        this.updateElement('tutor-rating', data.rating?.toFixed(1) || '0.0');
        this.updateElement('rating-count', `(${data.rating_count || 0} reviews)`);
        this.renderStars('rating-stars', data.rating || 0);

        // Images
        if (data.profile_picture) {
            this.updateImage('profile-avatar', data.profile_picture);
        }
        if (data.cover_image) {
            this.updateImage('cover-img', data.cover_image);
        }

        // Connection counts
        this.updateElement('connections-count', data.connections?.total_connections || 0);
        this.updateElement('students-count', data.connections?.students || 0);
        this.updateElement('colleagues-count', data.connections?.colleagues || 0);

        // Social media links - populate only if user has added them
        this.populateSocialLinks(data.social_links || {});
    },

    // Load teaching methods from packages and grade levels from courses table
    async loadTeachingMethodsAndGradeLevels() {
        const teachingMethodValue = document.getElementById('teaching-methods-inline');
        const gradeLevelValue = document.getElementById('tutor-grade-level');

        // Show loading state
        if (teachingMethodValue) teachingMethodValue.textContent = 'Loading...';
        if (gradeLevelValue) gradeLevelValue.textContent = 'Loading...';

        try {
            // Get the tutor ID - use currentTutorId or get from profile data
            const tutorId = this.currentTutorId || this.profileData?.id || this.profileData?.user_id;

            if (!tutorId) {
                console.warn('⚠️ No tutor ID available for fetching teaching methods');
                if (teachingMethodValue) teachingMethodValue.textContent = 'Not specified';
                if (gradeLevelValue) gradeLevelValue.textContent = 'Not specified';
                return;
            }

            // Fetch profile summary from the new API endpoint
            const response = await fetch(`http://localhost:8000/api/tutor/profile-summary/${tutorId}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch profile summary: ${response.status}`);
            }

            const data = await response.json();
            const teachingMethods = data.teaching_methods || [];
            const gradeLevels = data.grade_levels || [];

            // Update Teaching Methods display
            if (teachingMethodValue) {
                if (teachingMethods.length > 0) {
                    // Display teaching methods as comma-separated list
                    teachingMethodValue.textContent = teachingMethods.join(', ');
                    console.log(`✅ Teaching methods loaded from packages: ${teachingMethods.join(', ')}`);
                } else {
                    teachingMethodValue.textContent = 'Not specified';
                    console.log('⚠️ No teaching methods found in packages for this tutor');
                }
            }

            // Update Grade Level display
            if (gradeLevelValue) {
                if (gradeLevels.length > 0) {
                    // Display grade levels as comma-separated list
                    gradeLevelValue.textContent = gradeLevels.join(', ');
                    console.log(`✅ Grade levels loaded from courses: ${gradeLevels.join(', ')}`);
                } else {
                    gradeLevelValue.textContent = 'Not specified';
                    console.log('⚠️ No grade levels found in courses for this tutor');
                }
            }

        } catch (error) {
            console.error('❌ Error loading teaching methods and grade levels:', error);
            if (teachingMethodValue) teachingMethodValue.textContent = 'Not specified';
            if (gradeLevelValue) gradeLevelValue.textContent = 'Not specified';
        }
    },

    // Load tutor courses and categories from the courses table via API
    async loadTutorCoursesAndCategories() {
        const coursesContainer = document.getElementById('tutor-courses');
        const categoryContainer = document.getElementById('tutor-course-category');

        // Show loading state
        if (coursesContainer) coursesContainer.textContent = 'Loading...';
        if (categoryContainer) categoryContainer.textContent = 'Loading...';

        try {
            // Get the tutor ID - use currentTutorId or get from profile data
            const tutorId = this.currentTutorId || this.profileData?.id || this.profileData?.user_id;

            if (!tutorId) {
                console.warn('⚠️ No tutor ID available for fetching courses');
                if (coursesContainer) coursesContainer.textContent = 'Not specified';
                if (categoryContainer) categoryContainer.textContent = 'Not specified';
                return;
            }

            // Fetch courses from the courses table via API
            const response = await fetch(`http://localhost:8000/api/course-management/tutor/${tutorId}/courses`);

            if (!response.ok) {
                throw new Error(`Failed to fetch courses: ${response.status}`);
            }

            const data = await response.json();
            const courses = data.courses || [];
            const categories = data.categories || [];

            // Update Courses display
            if (coursesContainer) {
                if (courses.length > 0) {
                    // Display course names as comma-separated list
                    const courseNames = courses.map(c => c.course_name).join(', ');
                    coursesContainer.textContent = courseNames;
                    console.log(`✅ Courses loaded from courses table: ${courseNames}`);
                } else {
                    coursesContainer.textContent = 'No courses yet';
                    console.log('⚠️ No courses found in courses table for this tutor');
                }
            }

            // Update Course Category display
            if (categoryContainer) {
                if (categories.length > 0) {
                    // Display unique categories as comma-separated list
                    const uniqueCategories = [...new Set(categories)].join(', ');
                    categoryContainer.textContent = uniqueCategories;
                    console.log(`✅ Categories loaded from courses table: ${uniqueCategories}`);
                } else {
                    categoryContainer.textContent = 'Not specified';
                    console.log('⚠️ No categories found for this tutor');
                }
            }

        } catch (error) {
            console.error('❌ Error loading tutor courses:', error);
            if (coursesContainer) coursesContainer.textContent = 'Not specified';
            if (categoryContainer) categoryContainer.textContent = 'Not specified';
        }
    },

    // Update courses with comma-separated text (Contact Info style) - Legacy fallback
    updateCoursesList(courses) {
        const coursesContainer = document.getElementById('tutor-courses');
        if (!coursesContainer) {
            console.warn('⚠️ Courses container (#tutor-courses) not found');
            return;
        }

        // Handle both array and string formats
        let coursesText = '';
        if (Array.isArray(courses)) {
            coursesText = courses.join(', ');
        } else if (typeof courses === 'string') {
            coursesText = courses;
        }

        if (!coursesText || coursesText.trim() === '') {
            coursesContainer.textContent = 'Not specified';
        } else {
            coursesContainer.textContent = coursesText;
        }

        console.log(`✅ Updated courses: ${coursesText || 'Not specified'}`);
    },

    // Update experience in badge and inline displays
    updateExperience(years) {
        // Update experience badge in badges-row
        const experienceBadge = document.getElementById('experience-badge');
        if (experienceBadge) {
            const yearsNum = parseInt(years) || 0;
            const experienceText = yearsNum === 1 ? '1 Year' : `${yearsNum} Years`;
            experienceBadge.textContent = `💼 ${experienceText} Experience`;
            console.log(`✅ Updated experience badge: ${experienceText}`);
        }

        // Update inline experience displays (if any exist in profile header)
        const inlineExperience = document.getElementById('tutor-years-experience');
        if (inlineExperience) {
            inlineExperience.textContent = years || 0;
        }
    },

    // Populate social media links (show only filled platforms)
    populateSocialLinks(socialLinks) {
        const container = document.getElementById('social-links-container');
        if (!container) {
            console.error('❌ Social links container not found!');
            return;
        }

        const iconMap = {
            facebook: 'fab fa-facebook-f',
            twitter: 'fab fa-twitter',
            linkedin: 'fab fa-linkedin-in',
            instagram: 'fab fa-instagram',
            youtube: 'fab fa-youtube',
            telegram: 'fab fa-telegram-plane',
            website: 'fas fa-globe'
        };

        const titleMap = {
            facebook: 'Facebook',
            twitter: 'Twitter',
            linkedin: 'LinkedIn',
            instagram: 'Instagram',
            youtube: 'YouTube',
            telegram: 'Telegram',
            website: 'Website'
        };

        console.log('📱 Populating social links. Raw data:', socialLinks);
        console.log('📱 Type:', typeof socialLinks, 'IsObject:', socialLinks && typeof socialLinks === 'object');

        // Handle both object and array formats
        let entries = [];
        if (socialLinks && typeof socialLinks === 'object') {
            if (Array.isArray(socialLinks)) {
                // Array format: [{platform: 'facebook', url: 'https://...'}]
                entries = socialLinks.map(item => [item.platform, item.url]);
            } else {
                // Object format: {facebook: 'https://...', twitter: 'https://...'}
                entries = Object.entries(socialLinks);
            }
        }

        console.log('📱 Parsed entries:', entries);

        // Only show platforms that have URLs
        const html = entries
            .filter(([platform, url]) => url && url.trim() !== '')
            .map(([platform, url]) => {
                console.log(`  ✓ Adding ${platform}: ${url}`);
                return `
                <a href="${url}" class="social-link" title="${titleMap[platform] || platform}"
                   onclick="event.preventDefault(); window.open('${url}', '_blank');" target="_blank" rel="noopener noreferrer">
                    <i class="${iconMap[platform] || 'fas fa-link'}"></i>
                </a>
            `;
            }).join('');

        if (html) {
            container.innerHTML = html;
            const count = entries.filter(([_, url]) => url && url.trim() !== '').length;
            console.log(`✅ ${count} social link(s) populated successfully`);
        } else {
            container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.875rem; margin: 0;">No social links added</p>';
            console.log('ℹ️ No social links to display');
        }
    },

    // Populate rating metrics (detailed breakdown) - REQUIRED: All values calculated from tutor_reviews table
    populateRatingMetrics() {
        const metrics = this.profileData.rating_metrics || {};

        console.log('📊 Rating metrics from tutor_reviews table:', metrics);

        // Update metric scores in tooltip - 4-Factor Rating System (calculated from tutor_reviews table)
        // Find all metric-score elements in the rating tooltip
        const tooltip = document.getElementById('rating-tooltip');
        if (tooltip) {
            const metricElements = tooltip.querySelectorAll('.rating-metric');

            metricElements.forEach(metric => {
                const label = metric.querySelector('.metric-label')?.textContent.toLowerCase() || '';
                const scoreElement = metric.querySelector('.metric-score');
                const barElement = metric.querySelector('.metric-fill');

                let score = 0.0;

                if (label.includes('discipline')) {
                    score = metrics.discipline || 0.0;
                } else if (label.includes('punctuality')) {
                    score = metrics.punctuality || 0.0;
                } else if (label.includes('subject') || label.includes('understanding')) {
                    score = metrics.subject_understanding || 0.0;
                } else if (label.includes('communication')) {
                    score = metrics.communication || 0.0;
                }

                if (scoreElement) {
                    scoreElement.textContent = score.toFixed(1);
                }

                if (barElement) {
                    const percentage = (score / 5) * 100;
                    barElement.style.width = `${percentage}%`;
                }

                console.log(`  ✅ ${label}: ${score.toFixed(1)}/5.0`);
            });
        } else {
            console.error('❌ Rating tooltip not found');
        }
    },

    // Populate dashboard cards
    populateDashboardCards() {
        const stats = this.profileData.dashboard_stats || {};

        this.updateElement('stat-total-students', stats.total_students || 0);
        this.updateElement('stat-current-students', stats.current_students || 0);
        this.updateElement('stat-total-requests', stats.total_requests || 0);
        this.updateElement('stat-success-rate', `${stats.success_rate || 0}%`);
        this.updateElement('stat-response-time', stats.response_time_hours || 24);

        // Update earnings widget with historical data
        if (window.EarningsWidget && stats.monthly_earnings_history) {
            EarningsWidget.setData(stats.monthly_earnings_history);
        }
    },

    // Populate weekly stats
    populateWeeklyStats() {
        const weekly = this.profileData.weekly_stats || {};

        this.updateElement('sessions-this-week', weekly.sessions_this_week || 0);
        this.updateElement('hours-this-week', weekly.hours_this_week || 0);
        this.updateElement('attendance-rate', `${weekly.attendance_rate || 0}%`);
        this.updateElement('weekly-goal-progress', `${weekly.weekly_goal_progress || 0}%`);

        // Update progress bars
        this.updateProgressBar('sessions-progress-bar', weekly.sessions_this_week, 20);
        this.updateProgressBar('hours-progress-bar', weekly.hours_this_week, 32);
        this.updateProgressBar('attendance-progress-bar', weekly.attendance_rate, 100);
        this.updateProgressBar('weekly-goal-bar', weekly.weekly_goal_progress, 100);
    },

    // Populate connection statistics
    populateConnectionStats() {
        const connections = this.profileData.connections || {};

        this.updateElement('total-connections', connections.total_connections || 0);
        this.updateElement('total-students', connections.students || 0);
        this.updateElement('total-colleagues', connections.colleagues || 0);

        // Teaching streak
        this.updateElement('teaching-streak-days', this.profileData.teaching_streak_days || 0);
    },

    // Load and display reviews
    async loadReviews() {
        try {
            const reviews = await TutorProfileAPI.getTutorReviews(this.currentTutorId, 10);
            // Display in both dashboard and reviews panel
            this.displayReviews(reviews);
            this.displayDashboardReviews(reviews);
        } catch (error) {
            console.error('Error loading reviews:', error);
        }
    },

    // Display reviews in Success Stories style (Reviews Panel)
    displayReviews(reviews) {
        const container = document.getElementById('tutor-reviews-grid');
        if (!container) return;

        // If no reviews, show empty state
        if (!reviews || reviews.length === 0) {
            container.innerHTML = '<p class="no-data" style="grid-column: 1 / -1;">No reviews yet.</p>';
            return;
        }

        // Generate review cards in Success Stories style
        const allCards = reviews.map(review => {
            const reviewerName = review.reviewer_name || review.student_name || 'Anonymous';
            const reviewerPicture = review.reviewer_picture || review.student_profile_picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(reviewerName) + '&background=4F46E5&color=fff&size=128';

            return `
                <div class="success-story" style="display: none; opacity: 0;">
                    <div class="story-header">
                        <img src="${reviewerPicture}"
                             alt="${reviewerName}"
                             class="story-avatar"
                             onerror="this.style.display='none'; this.onerror=null;">
                        <div class="story-header-info">
                            <div class="story-student" data-full-name="${reviewerName}">
                                <span class="story-student-inner">${reviewerName}</span>
                            </div>
                            <div class="story-rating">${'⭐'.repeat(Math.round(review.rating))}</div>
                        </div>
                    </div>
                    <div class="story-quote">"${review.review_text || review.comment}"</div>
                    <div class="story-time">${this.getTimeAgo(review.created_at)}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = allCards;

        // Show first 2 cards
        const storyCards = container.querySelectorAll('.success-story');
        if (storyCards.length > 0) {
            storyCards[0].style.display = 'block';
            storyCards[0].style.opacity = '1';
        }
        if (storyCards.length > 1) {
            storyCards[1].style.display = 'block';
            storyCards[1].style.opacity = '1';
        }

        // Add marquee class to long names
        this.detectLongNames();

        // Only start carousel if more than 2 reviews
        if (reviews.length > 2) {
            this.startReviewsCarousel(reviews.length);
        }
    },

    // Detect long reviewer names and add marquee class
    detectLongNames() {
        const studentNames = document.querySelectorAll('.story-student');
        studentNames.forEach(nameElement => {
            const inner = nameElement.querySelector('.story-student-inner');
            if (inner && inner.scrollWidth > nameElement.clientWidth) {
                nameElement.classList.add('long-name');
            }
        });
    },

    // Start carousel animation for reviews (same as Success Stories)
    startReviewsCarousel(totalReviews) {
        let currentPairIndex = 0;
        const totalPairs = Math.ceil(totalReviews / 2);

        setInterval(() => {
            const container = document.getElementById('tutor-reviews-grid');
            if (!container) return;

            const storyCards = container.querySelectorAll('.success-story');
            if (storyCards.length === 0) return;

            // Fade out current pair
            const currentStart = currentPairIndex * 2;
            const currentEnd = Math.min(currentStart + 2, totalReviews);

            for (let i = currentStart; i < currentEnd; i++) {
                if (storyCards[i]) {
                    storyCards[i].style.transition = 'opacity 0.5s ease-in-out';
                    storyCards[i].style.opacity = '0';
                    setTimeout(() => {
                        storyCards[i].style.display = 'none';
                    }, 500);
                }
            }

            // Move to next pair
            currentPairIndex = (currentPairIndex + 1) % totalPairs;

            // Fade in next pair
            const nextStart = currentPairIndex * 2;
            const nextEnd = Math.min(nextStart + 2, totalReviews);

            setTimeout(() => {
                for (let i = nextStart; i < nextEnd; i++) {
                    if (storyCards[i]) {
                        storyCards[i].style.display = 'block';
                        storyCards[i].style.opacity = '0';
                        setTimeout(() => {
                            storyCards[i].style.transition = 'opacity 0.5s ease-in-out';
                            storyCards[i].style.opacity = '1';
                        }, 50);
                    }
                }
            }, 500);

        }, 5000); // Change every 5 seconds
    },

    // Get time ago for reviews
    getTimeAgo(dateString) {
        if (!dateString) return 'Recently';

        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
            }
        }

        return 'Just now';
    },

    // Display reviews in Dashboard section (Success Stories Style)
    displayDashboardReviews(reviews) {
        const container = document.getElementById('dashboard-reviews-grid');
        if (!container) return;

        // If no reviews, show empty state
        if (!reviews || reviews.length === 0) {
            container.innerHTML = '<p class="no-data" style="grid-column: 1 / -1;">No reviews yet.</p>';
            return;
        }

        // Show only first 4 reviews in dashboard (2 pairs for carousel)
        const dashboardReviews = reviews.slice(0, 4);

        // Generate review cards in Success Stories style
        const allCards = dashboardReviews.map(review => {
            const reviewerName = review.reviewer_name || review.student_name || 'Anonymous';
            const reviewerPicture = review.reviewer_picture || review.student_profile_picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(reviewerName) + '&background=4F46E5&color=fff&size=128';

            return `
                <div class="success-story" style="display: none; opacity: 0;">
                    <div class="story-header">
                        <img src="${reviewerPicture}"
                             alt="${reviewerName}"
                             class="story-avatar"
                             onerror="this.style.display='none'; this.onerror=null;">
                        <div class="story-header-info">
                            <div class="story-student" data-full-name="${reviewerName}">
                                <span class="story-student-inner">${reviewerName}</span>
                            </div>
                            <div class="story-rating">${'⭐'.repeat(Math.round(review.rating))}</div>
                        </div>
                    </div>
                    <div class="story-quote">"${review.review_text || review.comment}"</div>
                    <div class="story-time">${this.getTimeAgo(review.created_at)}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = allCards;

        // Show first 2 cards
        const storyCards = container.querySelectorAll('.success-story');
        if (storyCards.length > 0) {
            storyCards[0].style.display = 'block';
            storyCards[0].style.opacity = '1';
        }
        if (storyCards.length > 1) {
            storyCards[1].style.display = 'block';
            storyCards[1].style.opacity = '1';
        }

        // Add marquee class to long names
        this.detectLongNamesInContainer(container);

        // Only start carousel if more than 2 reviews
        if (dashboardReviews.length > 2) {
            this.startDashboardReviewsCarousel(dashboardReviews.length);
        }
    },

    // Detect long names in specific container
    detectLongNamesInContainer(container) {
        const studentNames = container.querySelectorAll('.story-student');
        studentNames.forEach(nameElement => {
            const inner = nameElement.querySelector('.story-student-inner');
            if (inner && inner.scrollWidth > nameElement.clientWidth) {
                nameElement.classList.add('long-name');
            }
        });
    },

    // Start carousel animation for dashboard reviews
    startDashboardReviewsCarousel(totalReviews) {
        let currentPairIndex = 0;
        const totalPairs = Math.ceil(totalReviews / 2);

        setInterval(() => {
            const container = document.getElementById('dashboard-reviews-grid');
            if (!container) return;

            const storyCards = container.querySelectorAll('.success-story');
            if (storyCards.length === 0) return;

            // Fade out current pair
            const currentStart = currentPairIndex * 2;
            const currentEnd = Math.min(currentStart + 2, totalReviews);

            for (let i = currentStart; i < currentEnd; i++) {
                if (storyCards[i]) {
                    storyCards[i].style.transition = 'opacity 0.5s ease-in-out';
                    storyCards[i].style.opacity = '0';
                    setTimeout(() => {
                        storyCards[i].style.display = 'none';
                    }, 500);
                }
            }

            // Move to next pair
            currentPairIndex = (currentPairIndex + 1) % totalPairs;

            // Fade in next pair
            const nextStart = currentPairIndex * 2;
            const nextEnd = Math.min(nextStart + 2, totalReviews);

            setTimeout(() => {
                for (let i = nextStart; i < nextEnd; i++) {
                    if (storyCards[i]) {
                        storyCards[i].style.display = 'block';
                        storyCards[i].style.opacity = '0';
                        setTimeout(() => {
                            storyCards[i].style.transition = 'opacity 0.5s ease-in-out';
                            storyCards[i].style.opacity = '1';
                        }, 50);
                    }
                }
            }, 500);

        }, 5000); // Change every 5 seconds
    },

    // Load and display activities
    async loadActivities() {
        try {
            const activities = await TutorProfileAPI.getTutorActivities(this.currentTutorId, 20);
            this.displayActivities(activities);
        } catch (error) {
            console.error('Error loading activities:', error);
        }
    },

    // Display activities
    displayActivities(activities) {
        const container = document.querySelector('.activity-ticker');
        if (!container || !activities || activities.length === 0) return;

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <span class="text-${activity.color || 'blue-500'}">${activity.icon || '📌'}</span>
                <div class="flex-1 text-sm">
                    <p class="text-gray-700">${activity.title}</p>
                    <p class="text-xs text-gray-500">${this.formatTimeAgo(activity.created_at)}</p>
                </div>
            </div>
        `).join('');
    },

    // Load and display today's schedule
    async loadTodaySchedule() {
        try {
            const schedule = await TutorProfileAPI.getTodaySchedule(this.currentTutorId);
            this.displayTodaySchedule(schedule);
        } catch (error) {
            console.error('Error loading today schedule:', error);
        }
    },

    // Display today's schedule
    displayTodaySchedule(schedule) {
        const container = document.querySelector('#today-schedule-container');
        if (!container || !schedule || schedule.length === 0) {
            if (container) {
                container.innerHTML = '<p class="text-sm text-gray-500">No sessions scheduled for today</p>';
            }
            return;
        }

        const colors = ['blue', 'green', 'purple', 'orange'];
        container.innerHTML = schedule.map((session, index) => `
            <div class="p-3 bg-${colors[index % colors.length]}-50 rounded-lg">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-sm font-semibold">${session.subject || 'Session'}</span>
                    <span class="text-xs text-gray-600">${session.start_time}</span>
                </div>
                <div class="text-xs text-gray-600">${session.grade_level || ''} - ${session.session_format || 'Online'}</div>
            </div>
        `).join('');
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

    updateMetricBar(id, score) {
        const element = document.querySelector(`#${id} .metric-fill, .${id}`);
        if (element && score) {
            const percentage = (score / 5) * 100;
            element.style.width = `${percentage}%`;
        }
    },

    updateProgressBar(id, current, total) {
        const element = document.getElementById(id);
        if (element) {
            const percentage = total > 0 ? (current / total) * 100 : 0;
            element.style.width = `${Math.min(percentage, 100)}%`;
        }
    },

    animateCounter(id, targetValue, suffix = '', decimals = 0) {
        const element = document.getElementById(id);
        if (!element) return;

        const duration = 2000;
        const startTime = performance.now();
        const startValue = 0;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const currentValue = startValue + (targetValue - startValue) * progress;
            element.textContent = currentValue.toFixed(decimals) + suffix;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    formatTimeAgo(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return this.formatDate(dateString);
    },

    showLoading() {
        // Show loading spinner or skeleton
        console.log('Loading profile data...');
    },

    hideLoading() {
        // Hide loading spinner
        console.log('Profile data loaded');
    },

    /**
     * Update contact information (matching view-parent.html card-based design)
     * Always show cards with placeholder text if data is missing
     */
    updateContactInfo(profile) {
        // Target the email-phone-container specifically by ID
        const contactContainer = document.getElementById('email-phone-container');
        if (!contactContainer) return;

        // Always show email card
        const emailHTML = `
            <div id="email-container" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: rgba(var(--button-bg-rgb), 0.05); border-radius: 12px;">
                <span style="font-size: 1.25rem;">📧</span>
                <div style="flex: 1; overflow: hidden;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.125rem;">Email</div>
                    <div id="tutor-email" style="color: ${profile.email ? 'var(--text)' : 'var(--text-muted)'}; font-size: 0.875rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; ${!profile.email ? 'font-style: italic;' : ''}">${profile.email || 'Email will be displayed here'}</div>
                </div>
            </div>
        `;

        // Always show phone card
        const phoneHTML = `
            <div id="phone-container" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: rgba(var(--button-bg-rgb), 0.05); border-radius: 12px;">
                <span style="font-size: 1.25rem;">📱</span>
                <div style="flex: 1;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.125rem;">Phone</div>
                    <div id="tutor-phone" style="color: ${profile.phone ? 'var(--text)' : 'var(--text-muted)'}; font-size: 0.875rem; font-weight: 500; ${!profile.phone ? 'font-style: italic;' : ''}">${profile.phone || 'Phone will be displayed here'}</div>
                </div>
            </div>
        `;

        contactContainer.innerHTML = emailHTML + phoneHTML;
    },

    showError(message) {
        console.error(message);
        // Don't use alert() - it blocks the page and creates bad UX
        // Instead, show a toast notification if available
        if (typeof TutorProfileUI !== 'undefined' && TutorProfileUI.showNotification) {
            TutorProfileUI.showNotification(message, 'error');
        } else {
            // Fallback: create a simple toast notification
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 5000);
        }
    }
};
