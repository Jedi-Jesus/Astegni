/**
 * View Tutor Database Loader
 * Comprehensive data loader for view-tutor.html from database
 * Replaces all hardcoded data with dynamic DB data
 */

// API_BASE_URL is already defined in view-extension-modals.js (loaded earlier)

// Global variable to store current package for modal
window.currentPackageData = null;

// Global variable to store parent's children for search
window.parentChildrenCache = null;
window.selectedChildData = null;

class ViewTutorDBLoader {
    constructor(tutorId, byUserId = false) {
        this.tutorId = tutorId;
        this.byUserId = byUserId;  // Whether ID is user.id or tutor_profile.id
        this.data = {
            profile: null,
            stats: null,
            reviews: [],
            achievements: [],
            certificates: [],
            experience: [],
            videos: [],
            packages: [],
            weekAvailability: [],
            similarTutors: []
        };
    }

    /**
     * Initialize and load all data
     */
    async init() {
        try {
            console.log('🔄 Loading tutor profile from database...');
            console.log('📊 Tutor ID:', this.tutorId);
            console.log('🔑 By User ID:', this.byUserId);
            console.log('🌐 API Base URL:', window.API_BASE_URL || 'UNDEFINED!');

            // Load all data in parallel for better performance
            await Promise.all([
                this.loadMainProfile(),
                this.loadReviews(),
                this.loadAchievements(),
                this.loadCertificates(),
                this.loadExperience(),
                this.loadVideos(),
                this.loadPackages(),
                this.loadWeekAvailability(),
                this.loadSimilarTutors()
            ]);

            // Populate all sections
            this.populateAllSections();

            console.log('✅ All data loaded successfully!', this.data);

        } catch (error) {
            console.error('❌ Error loading tutor data:', error);
            console.error('❌ Error details:', error.message, error.stack);
            this.showErrorMessage('Failed to load tutor profile. Please refresh the page.');
        }
    }

    /**
     * Load main profile and stats
     */
    async loadMainProfile() {
        try {
            // Build URL with by_user_id parameter if needed
            const url = this.byUserId
                ? `${API_BASE_URL}/api/view-tutor/${this.tutorId}?by_user_id=true`
                : `${API_BASE_URL}/api/view-tutor/${this.tutorId}`;

            console.log('📡 Fetching tutor profile from:', url);

            const response = await fetch(url);
            console.log('📥 Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
                throw new Error(`Failed to fetch profile: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('📦 Profile data received:', data);

            this.data.profile = data.profile;
            this.data.stats = data.stats;

            // Expose tutor data globally for connection manager
            window.currentTutorData = data.profile;

            console.log('✓ Profile loaded:', data.profile);
        } catch (error) {
            console.error('❌ Error loading profile:', error);
            throw error;
        }
    }

    /**
     * Load tutor reviews
     */
    async loadReviews(limit = 10) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/view-tutor/${this.tutorId}/reviews?limit=${limit}`);
            if (!response.ok) throw new Error('Failed to fetch reviews');

            const data = await response.json();
            this.data.reviews = data.reviews;

            console.log(`✓ Loaded ${data.reviews.length} reviews`);
        } catch (error) {
            console.error('Error loading reviews:', error);
            this.data.reviews = [];
        }
    }

    /**
     * Load tutor achievements
     */
    async loadAchievements() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/view-tutor/${this.tutorId}/achievements`);
            if (!response.ok) throw new Error('Failed to fetch achievements');

            const data = await response.json();
            this.data.achievements = data.achievements;

            console.log(`✓ Loaded ${data.achievements.length} achievements`);
        } catch (error) {
            console.error('Error loading achievements:', error);
            this.data.achievements = [];
        }
    }

    /**
     * Load tutor certificates
     */
    async loadCertificates() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/view-tutor/${this.tutorId}/certificates`);
            if (!response.ok) throw new Error('Failed to fetch certificates');

            const data = await response.json();
            this.data.certificates = data.certificates;

            console.log(`✓ Loaded ${data.certificates.length} certificates`);
        } catch (error) {
            console.error('Error loading certificates:', error);
            this.data.certificates = [];
        }
    }

    /**
     * Load tutor experience
     */
    async loadExperience() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/view-tutor/${this.tutorId}/experience`);
            if (!response.ok) throw new Error('Failed to fetch experience');

            const data = await response.json();
            this.data.experience = data.experience;

            console.log(`✓ Loaded ${data.experience.length} experience records`);
        } catch (error) {
            console.error('Error loading experience:', error);
            this.data.experience = [];
        }
    }

    /**
     * Load tutor videos
     */
    async loadVideos() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/view-tutor/${this.tutorId}/videos`);
            if (!response.ok) throw new Error('Failed to fetch videos');

            const data = await response.json();
            this.data.videos = data.videos;

            console.log(`✓ Loaded ${data.videos.length} videos`);
        } catch (error) {
            console.error('Error loading videos:', error);
            this.data.videos = [];
        }
    }

    /**
     * Load tutor packages
     */
    async loadPackages() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/view-tutor/${this.tutorId}/packages`);
            if (!response.ok) throw new Error('Failed to fetch packages');

            const data = await response.json();
            this.data.packages = data.packages;

            console.log(`✓ Loaded ${data.packages.length} packages`);
        } catch (error) {
            console.error('Error loading packages:', error);
            this.data.packages = [];
        }
    }

    /**
     * Load featured schedules and sessions for availability widget
     */
    async loadWeekAvailability() {
        try {
            const byUserIdParam = this.byUserId ? '?by_user_id=true' : '';

            // Fetch featured schedules and sessions
            const response = await fetch(`${API_BASE_URL}/api/view-tutor/${this.tutorId}/availability/featured${byUserIdParam}`);

            if (!response.ok) {
                console.warn('Featured availability endpoint not found, using fallback');
                // Fallback to regular availability
                const fallbackRes = await fetch(`${API_BASE_URL}/api/view-tutor/${this.tutorId}/availability/week${byUserIdParam}`);
                if (fallbackRes.ok) {
                    const data = await fallbackRes.json();
                    this.data.weekAvailability = data.availability || [];
                } else {
                    this.data.weekAvailability = [];
                }
                return;
            }

            const data = await response.json();
            this.data.featuredSchedules = data.schedules || [];
            this.data.featuredSessions = data.sessions || [];
            this.data.weekAvailability = [...(data.schedules || []), ...(data.sessions || [])];

            console.log(`✓ Loaded ${this.data.featuredSchedules.length} featured schedules and ${this.data.featuredSessions.length} featured sessions`);
        } catch (error) {
            console.error('Error loading availability:', error);
            this.data.featuredSchedules = [];
            this.data.featuredSessions = [];
            this.data.weekAvailability = [];
        }
    }

    /**
     * Load similar tutors
     */
    async loadSimilarTutors() {
        try {
            const byUserIdParam = this.byUserId ? '&by_user_id=true' : '';
            const response = await fetch(`${API_BASE_URL}/api/view-tutor/${this.tutorId}/similar?limit=8${byUserIdParam}`);
            if (!response.ok) throw new Error('Failed to fetch similar tutors');

            const data = await response.json();
            this.data.similarTutors = data.similar_tutors || [];

            console.log('✓ Loaded similar tutors:', this.data.similarTutors.length);
        } catch (error) {
            console.error('Error loading similar tutors:', error);
            this.data.similarTutors = [];
        }
    }

    /**
     * Populate all sections of the page
     */
    populateAllSections() {
        // Store data globally for modal access
        if (window.viewTutorExtensionsData) {
            window.viewTutorExtensionsData.achievements = this.data.achievements;
            window.viewTutorExtensionsData.certifications = this.data.certificates;
            window.viewTutorExtensionsData.experience = this.data.experience;
        }

        this.populateHeroSection();
        this.populateProfileHeader();
        this.populateQuickStats();
        this.populateSuccessStoriesSection();
        this.populateReviewsPanel();
        this.populateCertificationsPanel();
        this.populateExperiencePanel();
        this.populateAchievementsPanel();
        this.populateVideosPanel();
        this.populatePackagesPanel();
        this.populateSuccessWidget();
        this.populateSubjectsWidget();
        this.populatePricingWidget();
        this.populateAvailabilityWidget();
        // this.populateAchievementsWidget(); // Widget removed from HTML
        this.populateSimilarTutorsPanel();
        this.populateRelatedTutorsSection();
    }

    /**
     * Populate Hero Section
     */
    populateHeroSection() {
        const profile = this.data.profile;
        if (!profile) return;

        const heroSubtitleEl = document.getElementById('hero-subtitle');

        // Start typewriter effect with hero_titles from database
        if (window.startTypewriterWithData) {
            window.startTypewriterWithData(profile.hero_titles);
        }

        if (heroSubtitleEl && profile.hero_subtitle) {
            heroSubtitleEl.textContent = profile.hero_subtitle;
        }
    }

    /**
     * Populate Profile Header
     */
    populateProfileHeader() {
        const profile = this.data.profile;
        if (!profile) return;

        // Name and Username
        const nameEl = document.getElementById('tutorName');
        if (nameEl) {
            // Display name in one row with username as subheader (read username from tutor_profile.username, not email)
            const usernameDisplay = profile.username ? `@${profile.username}` : '';
            nameEl.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                    <span style="font-size: 2rem; font-weight: bold; color: var(--text-primary); word-wrap: break-word; overflow-wrap: break-word;">${profile.full_name}</span>
                    ${usernameDisplay ? `<span style="font-size: 0.95rem; color: var(--text-muted); font-weight: 500;">${usernameDisplay}</span>` : ''}
                </div>
            `;
        }

        // Badges - Always display with appropriate messages
        const badgesRow = document.querySelector('.badges-row');
        if (badgesRow && profile) {
            let badgesHTML = '';

            // Verified badge - check verification_status and is_verified from tutor_profiles
            if (profile.is_verified || profile.verification_status === 'verified') {
                badgesHTML += `
                    <span class="profile-badge verified" style="background: rgba(34, 197, 94, 0.1); color: #22c55e; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
                        ✔ Verified Tutor
                    </span>
                `;
            } else if (profile.verification_status === 'pending') {
                badgesHTML += `
                    <span class="profile-badge pending" style="background: rgba(251, 191, 36, 0.1); color: #fbbf24; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
                        ⏳ Verification Pending
                    </span>
                `;
            } else if (profile.verification_status === 'rejected') {
                badgesHTML += `
                    <span class="profile-badge rejected" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
                        ✗ Verification Rejected
                    </span>
                `;
            } else {
                badgesHTML += `
                    <span class="profile-badge not-verified" style="background: rgba(156, 163, 175, 0.1); color: #9ca3af; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
                        ✗ Not Verified
                    </span>
                `;
            }

            // Expertise badge from tutor_profiles.expertise_badge
            if (profile.expertise_badge) {
                const expertiseBadgeMap = {
                    'Master Tutor': { emoji: '👑', color: '#9333ea', bg: 'rgba(147, 51, 234, 0.1)' },
                    'Expert Tutor': { emoji: '🏆', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
                    'Senior Tutor': { emoji: '⭐', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
                    'Tutor': { emoji: '📚', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }
                };

                const badgeInfo = expertiseBadgeMap[profile.expertise_badge] || expertiseBadgeMap['Tutor'];
                badgesHTML += `
                    <span class="profile-badge expertise" style="background: ${badgeInfo.bg}; color: ${badgeInfo.color}; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
                        ${badgeInfo.emoji} ${profile.expertise_badge}
                    </span>
                `;
            }

            // Suspension badge - show if tutor is suspended
            if (profile.is_suspended) {
                badgesHTML += `
                    <span class="profile-badge suspended" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.875rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
                        🚫 Suspended
                    </span>
                `;
            }

            badgesRow.innerHTML = badgesHTML;
        }

        // Profile Picture
        const avatarEl = document.getElementById('profile-avatar');
        if (avatarEl && profile.profile_picture) {
            avatarEl.src = profile.profile_picture;
        }

        // Cover Image
        const coverEl = document.getElementById('cover-img');
        if (coverEl && profile.cover_image) {
            coverEl.src = profile.cover_image;
        }

        // Rating with Tooltip
        const ratingValueEl = document.querySelector('.rating-value');
        const ratingCountEl = document.querySelector('.rating-count');

        if (ratingValueEl) ratingValueEl.textContent = profile.rating.toFixed(1);
        if (ratingCountEl) ratingCountEl.textContent = `(${profile.rating_count} reviews)`;

        // Update rating breakdown tooltip from database (using existing HTML structure)
        // NO LONGER DYNAMICALLY INSERTING TOOLTIP - using pre-existing HTML in view-tutor.html
        if (profile.rating_breakdown) {
            const breakdown = profile.rating_breakdown;

            // Map database fields to display elements
            const mappings = [
                { dbField: 'discipline', scoreId: 'rating-discipline', barId: 'bar-discipline' },
                { dbField: 'punctuality', scoreId: 'rating-punctuality', barId: 'bar-punctuality' },
                { dbField: 'knowledge_level', scoreId: 'rating-knowledge', barId: 'bar-knowledge' },
                { dbField: 'communication_skills', scoreId: 'rating-communication', barId: 'bar-communication' }
            ];

            mappings.forEach(({ dbField, scoreId, barId }) => {
                const scoreEl = document.getElementById(scoreId);
                const barEl = document.getElementById(barId);

                if (breakdown[dbField] !== undefined && breakdown[dbField] !== null) {
                    const score = parseFloat(breakdown[dbField]);

                    // Update score text
                    if (scoreEl) {
                        scoreEl.textContent = score.toFixed(1);
                    }

                    // Update progress bar width (score out of 5, so percentage is score * 20)
                    if (barEl) {
                        const percentage = (score / 5) * 100;
                        barEl.style.width = `${percentage}%`;
                    }
                } else {
                    // No data - show N/A
                    if (scoreEl) {
                        scoreEl.textContent = 'N/A';
                    }
                    if (barEl) {
                        barEl.style.width = '0%';
                    }
                }
            });

            console.log('✅ Rating breakdown updated from database (view-tutor-db-loader.js):', breakdown);
        }

        // Stars
        this.updateStars(profile.rating);

        // Location - target the nested span that contains the text
        const locationEl = document.querySelector('.profile-location span span');
        if (locationEl) {
            const locationParts = [];
            if (profile.location) locationParts.push(profile.location);
            locationEl.textContent = locationParts.length > 0 ? locationParts.join(', ') : 'Location not specified';
            // Update styling for populated location
            if (locationParts.length > 0) {
                locationEl.style.color = 'var(--text)';
                locationEl.style.fontStyle = 'normal';
            }
        }

        // Profile Info Grid
        this.updateProfileInfoGrid(profile);

        // Quote with proper spacing and empty state
        const quoteEl = document.querySelector('.profile-quote');
        if (quoteEl) {
            if (profile.quote) {
                quoteEl.innerHTML = `
                    <span style="color: var(--text);">"${profile.quote}"</span>
                `;
                quoteEl.style.marginBottom = '1.5rem'; // Add spacing before About section
            } else {
                quoteEl.innerHTML = `
                    <span style="color: var(--text-muted); font-style: italic;">No quote</span>
                `;
                quoteEl.style.marginBottom = '1.5rem'; // Add spacing before About section
            }
        }

        // Bio/About
        const aboutEl = document.querySelector('.profile-about p');
        if (aboutEl) {
            if (profile.bio) {
                aboutEl.textContent = profile.bio;
                aboutEl.style.fontStyle = 'normal';
            } else {
                aboutEl.textContent = 'No bio available';
                aboutEl.style.fontStyle = 'italic';
                aboutEl.style.color = 'var(--text-muted)';
            }
        }

        // Social Links
        if (profile.social_links) {
            this.updateSocialLinks(profile.social_links);
        }
    }

    /**
     * Update star rating display (using unicode stars matching HTML styling)
     */
    updateStars(rating) {
        const starsContainer = document.querySelector('.rating-stars');
        if (!starsContainer) return;

        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;

        let starsHTML = '';
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) {
                // Filled star (unicode)
                starsHTML += '★';
            } else if (i === fullStars && hasHalfStar) {
                // Half star (unicode) - using ⯨ for half-filled appearance
                starsHTML += '⯨';
            } else {
                // Empty star (unicode)
                starsHTML += '☆';
            }
        }
        starsContainer.innerHTML = starsHTML;
    }

    /**
     * Update profile info grid
     */
    updateProfileInfoGrid(profile) {
        // Update Teaches At - target value only, preserve label
        const teachesAtValue = document.getElementById('tutor-teaches-at-field');
        if (teachesAtValue) {
            teachesAtValue.textContent = profile.teaches_at || 'Not specified';
        }

        // Update Languages - target value only, preserve label (inline text version)
        const languagesValue = document.getElementById('tutor-languages-inline');
        if (languagesValue) {
            const languages = profile.languages || profile.language || [];
            const languageArray = Array.isArray(languages) ? languages : (languages ? [languages] : []);
            if (languageArray.length > 0) {
                languagesValue.textContent = languageArray.join(', ');
            } else {
                languagesValue.textContent = 'Not specified';
            }
        }

        // Hobbies & Interests - always show, with "No hobbies yet" if empty
        const hobbiesEl = document.getElementById('tutor-hobbies');
        if (hobbiesEl) {
            if (profile.hobbies && Array.isArray(profile.hobbies) && profile.hobbies.length > 0) {
                const hobbiesText = profile.hobbies.join(', ');
                hobbiesEl.textContent = hobbiesText;
                hobbiesEl.style.color = 'var(--text)';
                hobbiesEl.style.fontStyle = 'normal';
            } else if (profile.hobbies && typeof profile.hobbies === 'string' && profile.hobbies.trim() !== '') {
                hobbiesEl.textContent = profile.hobbies;
                hobbiesEl.style.color = 'var(--text)';
                hobbiesEl.style.fontStyle = 'normal';
            } else {
                hobbiesEl.textContent = 'No hobbies yet';
                hobbiesEl.style.color = 'var(--text-muted)';
                hobbiesEl.style.fontStyle = 'italic';
            }
        }

        // Update Gender
        const genderValue = document.getElementById('tutor-gender');
        if (genderValue) {
            const gender = profile.gender || '';
            if (gender) {
                // Capitalize first letter
                genderValue.textContent = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
            } else {
                genderValue.textContent = 'Not specified';
            }
        }

        // Update Course Type - target value only, preserve label (Skills style)
        const courseTypeValue = document.getElementById('tutor-course-type-field');
        if (courseTypeValue) {
            courseTypeValue.textContent = profile.course_type || 'Not specified';
        }

        // Update Subjects - create colorful badges (Skills style)
        this.updateSubjectsBadges(profile.courses || profile.subjects || []);

        // Update Experience - update badge in badges-row
        const experience = profile.teaching_experience || profile.experience || 0;
        this.updateExperience(experience);
    }

    /**
     * Update subjects with comma-separated text (Contact Info style)
     */
    updateSubjectsBadges(subjects) {
        const subjectsContainer = document.getElementById('tutor-subjects');
        if (!subjectsContainer) {
            console.warn('⚠️ Subjects container (#tutor-subjects) not found');
            return;
        }

        // Handle both array and string formats
        let subjectsText = '';
        if (Array.isArray(subjects)) {
            subjectsText = subjects.join(', ');
        } else if (typeof subjects === 'string') {
            subjectsText = subjects;
        }

        if (!subjectsText || subjectsText.trim() === '') {
            subjectsContainer.textContent = 'Not specified';
        } else {
            subjectsContainer.textContent = subjectsText;
        }

        console.log(`✅ Updated subjects in view-tutor: ${subjectsText || 'Not specified'}`);
    }

    /**
     * Update experience in badge and inline displays
     */
    updateExperience(years) {
        // Update experience badge in badges-row (if exists)
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
    }

    /**
     * Populate subjects, languages, and grades in profile-subjects-methods-grid
     */
    populateSubjectsLanguagesGrades(profile) {
        // Populate Subjects
        const subjectsContainer = document.querySelector('.profile-subjects-container');
        if (subjectsContainer) {
            const courses = (profile && Array.isArray(profile.courses)) ? profile.courses : [];

            if (courses.length === 0) {
                subjectsContainer.innerHTML = `
                    <div style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-style: italic; font-size: 0.8125rem;">
                        No subjects listed
                    </div>
                `;
            } else {
                subjectsContainer.innerHTML = courses.slice(0, 6).map(course => `
                    <span class="subject-tag" style="padding: 0.4rem 0.875rem; background: var(--card-bg); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 16px; font-size: 0.8125rem; font-weight: 600; color: var(--heading); display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.3s ease; white-space: nowrap;">
                        ${course}
                    </span>
                `).join('');
            }
        }

        // Populate Languages
        const languagesContainer = document.querySelector('.profile-languages-container');
        if (languagesContainer) {
            const languages = profile.languages || profile.language || [];
            const languageArray = Array.isArray(languages) ? languages : (languages ? [languages] : []);

            if (languageArray.length === 0) {
                languagesContainer.innerHTML = `
                    <div style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-style: italic; font-size: 0.8125rem;">
                        No languages listed
                    </div>
                `;
            } else {
                languagesContainer.innerHTML = languageArray.map(lang => `
                    <span class="language-tag" style="padding: 0.4rem 0.875rem; background: var(--card-bg); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 16px; font-size: 0.8125rem; font-weight: 600; color: var(--heading); display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.3s ease; white-space: nowrap;">
                        ${lang}
                    </span>
                `).join('');
            }
        }

        // Populate Grade Levels
        const gradesContainer = document.querySelector('.profile-grades-container');
        if (gradesContainer) {
            const grades = profile.grades || profile.grade_level || [];
            const gradeArray = Array.isArray(grades) ? grades : (grades ? [grades] : []);

            if (gradeArray.length === 0) {
                gradesContainer.innerHTML = `
                    <div style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-style: italic; font-size: 0.8125rem;">
                        No grade levels listed
                    </div>
                `;
            } else {
                gradesContainer.innerHTML = gradeArray.map(grade => `
                    <span class="grade-tag" style="padding: 0.4rem 0.875rem; background: var(--card-bg); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 16px; font-size: 0.8125rem; font-weight: 600; color: var(--heading); display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.3s ease; white-space: nowrap;">
                        ${grade}
                    </span>
                `).join('');
            }
        }
    }

    /**
     * Populate teaching methods in profile header
     */
    populateTeachingMethods(profile) {
        const methodsContainer = document.querySelector('.profile-methods-container');
        if (!methodsContainer) return;

        const methods = [];
        const sessionFormat = (profile.session_format || '').toLowerCase();

        // Only add methods if session_format is explicitly set
        if (sessionFormat === 'both') {
            methods.push({ name: '🌐 Online', color: '#3b82f6' });
            methods.push({ name: '🏫 In-person', color: '#10b981' });
        } else if (sessionFormat === 'online') {
            methods.push({ name: '🌐 Online', color: '#3b82f6' });
        } else if (sessionFormat === 'in-person' || sessionFormat === 'in person') {
            methods.push({ name: '🏫 In-person', color: '#10b981' });
        }

        // Add self-paced if available
        if (profile.self_paced) {
            methods.push({ name: '📖 Self-paced', color: '#8b5cf6' });
        }

        if (methods.length === 0) {
            methodsContainer.innerHTML = `
                <div style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-style: italic; font-size: 0.8125rem;">
                    No teaching methods listed
                </div>
            `;
            return;
        }

        methodsContainer.innerHTML = methods.map(method => `
            <span class="method-tag" style="padding: 0.4rem 0.875rem; background: linear-gradient(135deg, ${method.color} 0%, ${method.color}dd 100%); color: white; border-radius: 16px; font-size: 0.8125rem; font-weight: 600; box-shadow: 0 2px 6px ${method.color}33; transition: all 0.3s ease; display: inline-flex; align-items: center; white-space: nowrap;">
                ${method.name}
            </span>
        `).join('');
    }

    /**
     * Update social links with beautiful theme-matching styling
     */
    updateSocialLinks(socialLinks) {
        if (!socialLinks || Object.keys(socialLinks).length === 0) return;

        const socialContainer = document.querySelector('.profile-social-links');
        if (!socialContainer) return;

        let socialHTML = '';
        const platforms = {
            facebook: { icon: 'fab fa-facebook-f' },
            linkedin: { icon: 'fab fa-linkedin-in' },
            instagram: { icon: 'fab fa-instagram' },
            twitter: { icon: 'fab fa-twitter' }
        };

        Object.keys(platforms).forEach(platform => {
            if (socialLinks[platform]) {
                const config = platforms[platform];

                socialHTML += `
                    <a href="${socialLinks[platform]}" target="_blank" rel="noopener noreferrer"
                       class="social-link social-${platform}"
                       style="display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; background: linear-gradient(135deg, var(--button-bg), var(--button-hover)); color: white; border-radius: 50%; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(var(--button-bg-rgb), 0.3);"
                       onmouseover="this.style.transform='translateY(-3px) scale(1.1)'; this.style.boxShadow='0 6px 16px rgba(var(--button-bg-rgb), 0.5)';"
                       onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 4px 12px rgba(var(--button-bg-rgb), 0.3)';">
                        <i class="${config.icon}" style="font-size: 1.125rem;"></i>
                    </a>
                `;
            }
        });

        if (socialHTML) {
            socialContainer.innerHTML = socialHTML;
        }
    }

    /**
     * Populate Quick Stats Section
     */
    populateQuickStats() {
        const stats = this.data.stats;
        const profile = this.data.profile;
        if (!stats || !profile) return;

        const statsContainer = document.querySelector('.quick-stats-grid');
        if (!statsContainer) return;

        // Beautiful stat cards with gradient accents and proper styling
        // Format session format for display
        const sessionFormat = (profile.session_format || '').toLowerCase();
        let sessionFormatDisplay = 'Not set';
        if (sessionFormat === 'both') {
            sessionFormatDisplay = 'Online & In-person';
        } else if (sessionFormat === 'online') {
            sessionFormatDisplay = 'Online';
        } else if (sessionFormat === 'in-person' || sessionFormat === 'in person') {
            sessionFormatDisplay = 'In-person';
        }

        const statCards = [
            {
                icon: '🎓',
                label: 'Students Taught',
                value: profile.students_taught || 0,
                gradient: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                bgColor: 'rgba(6, 182, 212, 0.05)'
            },
            {
                icon: '👥',
                label: 'Active Students',
                value: stats.active_students || 0,
                gradient: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                bgColor: 'rgba(245, 158, 11, 0.05)'
            },
            {
                icon: '⭐',
                label: 'Success Rate',
                value: `${profile.success_rate || 0}%`,
                gradient: 'linear-gradient(90deg, #f59e0b, #d97706)',
                bgColor: 'rgba(245, 158, 11, 0.05)'
            },
            {
                icon: '⏱️',
                label: 'Response Time',
                value: stats.response_time || 'N/A',
                gradient: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                bgColor: 'rgba(59, 130, 246, 0.05)'
            },
        ];

        statsContainer.innerHTML = statCards.map((stat, index) => `
            <div class="stat-card" style="
                position: relative;
                padding: 1.5rem;
                background: var(--card-bg);
                border-radius: 16px;
                overflow: hidden;
                transition: all 0.3s ease;
                animation: fadeInUp 0.6s ease-out backwards;
                animation-delay: ${index * 0.1}s;
                box-shadow: var(--shadow-md);
                cursor: pointer;
                border: 1px solid var(--border-color);
            " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='var(--shadow-xl)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-md)';">
                <div style="text-align: center;">
                    <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">${stat.icon}</div>
                    <div style="font-size: 1.875rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">${stat.value}</div>
                    <div style="font-size: 0.875rem; color: var(--text-muted); font-weight: 500;">${stat.label}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Populate Success Stories Section (from reviews)
     * Uses fallback logic: Try featured reviews first, then high-rated reviews
     * Shows 2 cards in a row with fade carousel animation
     */
    populateSuccessStoriesSection() {
        // Try to get featured reviews first
        let reviews = this.data.reviews.filter(r => r.is_featured);

        // Fallback: If no featured reviews, use high-rated reviews (>= 4 stars)
        if (reviews.length === 0) {
            reviews = this.data.reviews.filter(r => r.rating >= 4);
        }

        const storiesContainer = document.querySelector('.success-stories-grid');
        if (!storiesContainer) return;

        if (reviews.length === 0) {
            storiesContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); font-style: italic;">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📝</div>
                    <p style="font-size: 1.125rem;">No reviews yet</p>
                    <p style="font-size: 0.875rem; margin-top: 0.5rem;">Be the first to leave a review!</p>
                </div>
            `;
            return;
        }

        const colors = ['blue', 'green', 'purple', 'orange'];

        // Create all review cards (hidden initially)
        const allCards = reviews.map((review, index) => {
            // Default profile picture if none provided - use avatar generator
            const reviewerName = review.reviewer_name || 'Anonymous';
            const profilePic = review.reviewer_picture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(reviewerName) + '&background=4F46E5&color=fff&size=128';

            // Build student name with grade
            const studentName = `${reviewerName}${review.reviewer_grade ? ` - ${review.reviewer_grade}` : ''}`;

            return `
                <div class="success-story" data-review-index="${index}" style="border-left-color: var(--${colors[index % 4]}); display: none;">
                    <div class="story-header">
                        <img src="${profilePic}"
                             alt="${review.reviewer_name}"
                             class="story-avatar"
                             onerror="this.style.display='none'; this.onerror=null;">
                        <div class="story-header-info">
                            <div class="story-student" data-full-name="${studentName}">
                                <span class="story-student-inner">${studentName}</span>
                            </div>
                            <div class="story-rating">${'⭐'.repeat(Math.round(review.rating))}</div>
                        </div>
                    </div>
                    <div class="story-quote">"${review.review_text}"</div>
                    <div class="story-time">${this.getTimeAgo(review.created_at)}</div>
                </div>
            `;
        }).join('');

        storiesContainer.innerHTML = allCards;

        // Show first 2 cards
        const storyCards = storiesContainer.querySelectorAll('.success-story');
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
            this.startSuccessStoriesCarousel(reviews.length);
        }
    }

    /**
     * Start carousel animation for success stories
     * Fades between pairs of reviews every 5 seconds
     */
    startSuccessStoriesCarousel(totalReviews) {
        let currentPairIndex = 0;
        const totalPairs = Math.ceil(totalReviews / 2);

        setInterval(() => {
            const storiesContainer = document.querySelector('.success-stories-grid');
            if (!storiesContainer) return;

            const storyCards = storiesContainer.querySelectorAll('.success-story');
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
    }

    /**
     * Detect long student names and add marquee class
     */
    detectLongNames() {
        const studentNames = document.querySelectorAll('.story-student');
        studentNames.forEach(nameElement => {
            const inner = nameElement.querySelector('.story-student-inner');
            if (inner && inner.scrollWidth > nameElement.clientWidth) {
                nameElement.classList.add('long-name');
            }
        });
    }

    /**
     * Populate Reviews Panel
     */
    populateReviewsPanel() {
        const reviews = this.data.reviews.slice(0, 10);
        const reviewsPanel = document.getElementById('reviews-panel');
        if (!reviewsPanel) return;

        const reviewsContainer = reviewsPanel.querySelector('.reviews-list') ||
                                reviewsPanel.querySelector('.panel-content');
        if (!reviewsContainer) return;

        if (reviews.length === 0) {
            reviewsContainer.innerHTML = '<p class="no-data">No reviews yet.</p>';
            return;
        }

        reviewsContainer.innerHTML = reviews.map(review => {
            const reviewerName = review.reviewer_name || 'Anonymous';
            const defaultPic = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(reviewerName) + '&background=4F46E5&color=fff&size=128';
            return `
            <div class="review-card">
                <div class="review-header">
                    <img src="${review.reviewer_picture || defaultPic}"
                         alt="${reviewerName}" class="reviewer-avatar">
                    <div class="reviewer-info">
                        <div class="reviewer-name">${review.reviewer_name}</div>
                        <div class="review-date">${this.formatDate(review.created_at)}</div>
                    </div>
                    <div class="review-rating">${this.getStarsHTML(review.rating)}</div>
                </div>
                ${review.title ? `<div class="review-title">${review.title}</div>` : ''}
                <div class="review-text">${review.review_text}</div>
                ${review.is_verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
            </div>
        `}).join('');
    }

    /**
     * Populate Certifications Panel
     */
    populateCertificationsPanel() {
        const certificates = this.data.certificates; // Backend already filters by is_active=TRUE
        const grid = document.getElementById('certifications-grid');
        if (!grid) return;

        if (certificates.length === 0) {
            grid.innerHTML = `
                <div class="text-center text-gray-500 py-12 col-span-full">
                    <p class="text-lg">No certifications to display.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = certificates.map(cert => `
            <div class="card p-6 cursor-pointer hover:shadow-lg transition-shadow" onclick="viewCertificationDetails(${cert.id})">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <h3 class="text-xl font-bold mb-2">${cert.name}</h3>
                        <p class="text-gray-600 mb-1">${cert.issuing_organization}</p>
                        ${cert.field_of_study ? `<p class="text-sm text-gray-500">${cert.field_of_study}</p>` : ''}
                    </div>
                    ${cert.is_verified ? '<span class="text-green-500 text-2xl">✓</span>' : ''}
                </div>

                ${cert.certificate_image_url ? `
                    <div class="mb-4">
                        <img src="${cert.certificate_image_url}" alt="${cert.name}"
                            class="w-full rounded-lg border-2">
                    </div>
                ` : ''}

                <div class="text-sm text-gray-600 space-y-1">
                    ${cert.issue_date ? `
                        <p>📅 Issued: ${new Date(cert.issue_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short'
                        })}</p>
                    ` : ''}
                    ${cert.expiry_date ? `
                        <p>⏰ Expires: ${new Date(cert.expiry_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short'
                        })}</p>
                    ` : ''}
                    ${cert.credential_id ? `<p>🔑 ID: ${cert.credential_id}</p>` : ''}
                </div>

                ${cert.description ? `
                    <p class="text-gray-700 mt-3 line-clamp-3">${cert.description}</p>
                ` : ''}

                <button onclick="event.stopPropagation(); viewCertificationDetails(${cert.id})" class="btn-secondary text-sm mt-4 w-full">View Details</button>
            </div>
        `).join('');
    }

    /**
     * Populate Experience Panel
     */
    populateExperiencePanel() {
        const experiences = this.data.experience; // Show all experience (no is_verified field)
        const grid = document.getElementById('experience-timeline');
        if (!grid) return;

        if (experiences.length === 0) {
            grid.innerHTML = `
                <div class="text-center text-gray-500 py-12 col-span-full">
                    <p class="text-lg">No experience to display.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = experiences.map(exp => {
            const startDate = exp.start_date ? new Date(exp.start_date) : null;
            const endDate = exp.end_date ? new Date(exp.end_date) : null;

            return `
                <div class="card p-6 border-l-4 border-blue-500 cursor-pointer hover:shadow-lg transition-shadow" onclick="viewExperienceDetails(${exp.id})">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex-1">
                            <h3 class="text-xl font-bold">${exp.job_title}</h3>
                            <p class="text-lg text-gray-700">${exp.institution}</p>
                            ${exp.location ? `<p class="text-sm text-gray-600">${exp.location}</p>` : ''}
                        </div>
                        ${exp.is_current ? `
                            <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                                Current
                            </span>
                        ` : ''}
                    </div>

                    <div class="text-sm text-gray-600 mb-3">
                        <p>📅 ${startDate ? startDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short'
                        }) : 'N/A'} - ${exp.is_current ? 'Present' : (endDate ? endDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short'
                        }) : 'N/A')}</p>
                        ${exp.employment_type ? `<p>💼 ${exp.employment_type}</p>` : ''}
                    </div>

                    ${exp.description ? `
                        <p class="text-gray-700 mb-3 line-clamp-3">${exp.description}</p>
                    ` : ''}

                    <button onclick="event.stopPropagation(); viewExperienceDetails(${exp.id})" class="btn-secondary text-sm mt-4 w-full">View Details</button>
                </div>
            `;
        }).join('');
    }

    /**
     * Populate Achievements Panel
     */
    populateAchievementsPanel() {
        const achievements = this.data.achievements; // Show all achievements (no is_verified field)
        const grid = document.getElementById('achievements-grid');
        if (!grid) return;

        if (achievements.length === 0) {
            grid.innerHTML = `
                <div class="text-center text-gray-500 py-12 col-span-full">
                    <p class="text-lg">No achievements to display.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = achievements.map(ach => `
            <div class="card p-6 text-center cursor-pointer hover:shadow-lg transition-shadow" style="border-color: ${ach.color || 'gold'}; border-width: 2px;" onclick="viewAchievementDetails(${ach.id})">
                <div class="text-6xl mb-3">${ach.icon || '🏆'}</div>
                ${ach.is_featured ? '<div class="text-yellow-500 text-sm font-bold mb-2">⭐ FEATURED</div>' : ''}
                <h3 class="text-lg font-bold mb-2">${ach.title}</h3>
                <p class="text-sm text-gray-600 mb-2">${ach.category || 'achievement'}</p>
                ${ach.year ? `<p class="text-sm font-semibold">${ach.year}</p>` : ''}
                ${ach.issuer ? `<p class="text-sm text-gray-600 mt-2">${ach.issuer}</p>` : ''}
                ${ach.description ? `<p class="text-sm text-gray-700 mt-3 line-clamp-3">${ach.description}</p>` : ''}
                <button onclick="event.stopPropagation(); viewAchievementDetails(${ach.id})" class="btn-secondary text-sm mt-4 w-full">View Details</button>
            </div>
        `).join('');
    }

    /**
     * Populate Videos Panel
     */
    populateVideosPanel() {
        const videos = this.data.videos;
        const videosPanel = document.getElementById('videos-panel');
        if (!videosPanel) return;

        const videosContainer = videosPanel.querySelector('.videos-grid') ||
                               videosPanel.querySelector('.panel-content');
        if (!videosContainer) return;

        if (videos.length === 0) {
            videosContainer.innerHTML = '<p class="no-data">No videos available.</p>';
            return;
        }

        videosContainer.innerHTML = videos.map(video => `
            <div class="video-card">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail_url || '../uploads/system_images/video-placeholder.jpg'}"
                         alt="${video.title}">
                    <div class="video-duration">${video.duration_display || '0:00'}</div>
                    <div class="video-play-btn" onclick="playVideo('${video.video_url}')">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
                <div class="video-info">
                    <h4>${video.title}</h4>
                    ${video.description ? `<p>${video.description.substring(0, 100)}...</p>` : ''}
                    <div class="video-stats">
                        <span><i class="fas fa-eye"></i> ${video.view_count || 0}</span>
                        <span><i class="fas fa-thumbs-up"></i> ${video.like_count || 0}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Populate Packages Panel
     * Loads packages from tutor_packages table dynamically
     * Beautiful card design matching tutor-profile.html
     */
    populatePackagesPanel() {
        const packages = this.data.packages;
        const packagesPanel = document.getElementById('packages-panel');
        if (!packagesPanel) return;

        const packagesContainer = packagesPanel.querySelector('.packages-grid');
        if (!packagesContainer) return;

        if (packages.length === 0) {
            packagesContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted); font-style: italic; grid-column: 1 / -1;">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📦</div>
                    <p style="font-size: 1.125rem;">No packages available</p>
                    <p style="font-size: 0.875rem; margin-top: 0.5rem;">This tutor hasn't created any packages yet.</p>
                </div>
            `;
            return;
        }

        packagesContainer.innerHTML = packages.map((pkg, index) => {
            // Get courses array
            const courses = pkg.courses
                ? (typeof pkg.courses === 'string' ? pkg.courses.split(',').map(c => c.trim()) : pkg.courses)
                : [];

            // Get session format - normalize to display properly
            let sessionFormats = [];
            if (pkg.session_format) {
                // Capitalize first letter of session format
                const format = pkg.session_format.charAt(0).toUpperCase() + pkg.session_format.slice(1).toLowerCase();
                sessionFormats = [format];
            }

            // Build schedule info
            let scheduleInfo = 'Not specified';
            if (pkg.schedule_type === 'recurring') {
                const days = pkg.recurring_days && pkg.recurring_days.length > 0
                    ? pkg.recurring_days.join(', ')
                    : `${pkg.days_per_week || 0} days/week`;
                scheduleInfo = days;
                if (pkg.start_time && pkg.end_time) {
                    const startTime = pkg.start_time.substring(0, 5);
                    const endTime = pkg.end_time.substring(0, 5);
                    scheduleInfo += ` • ${startTime} - ${endTime}`;
                }
            } else if (pkg.schedule_type === 'flexible') {
                scheduleInfo = 'Flexible Schedule';
            } else if (pkg.days_per_week) {
                scheduleInfo = `${pkg.days_per_week} days/week`;
            }

            // Payment frequency
            const paymentFrequency = pkg.payment_frequency === '2-weeks' ? 'Bi-weekly' : 'Monthly';

            // Price
            const price = pkg.session_price || pkg.package_price || 0;
            const priceText = Math.round(price);

            // Count active discounts - always show all 3 discount cards
            const discounts = [
                { period: '3 Months', discount: pkg.discount_3_month || 0 },
                { period: '6 Months', discount: pkg.discount_6_month || 0 },
                { period: 'Yearly', discount: pkg.yearly_discount || 0 }
            ];

            // Grade level badge
            const gradeLevel = pkg.grade_level || 'All Levels';

            return `
            <div class="card" style="padding: 0; overflow: hidden; border-radius: 12px; transition: all 0.3s; border: 2px solid var(--border-color);">
                <!-- Package Header - Amber/Yellow Theme -->
                <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 1.5rem; color: white;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 700; margin: 0; color: white;">${pkg.name || 'Package ' + (index + 1)}</h3>
                        <span style="background: rgba(255,255,255,0.25); backdrop-filter: blur(10px); color: white; font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.75rem; border-radius: 20px;">
                            ${gradeLevel}
                        </span>
                    </div>
                    <p style="font-size: 0.875rem; opacity: 0.95; margin: 0; color: white;">
                        <i class="fas fa-calendar-alt"></i> ${paymentFrequency} Package
                    </p>
                </div>

                <!-- Package Body -->
                <div style="padding: 1.5rem; background: var(--card-bg); color: var(--text-primary);">
                    <!-- Courses -->
                    <div style="margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                            <i class="fas fa-book" style="color: #f59e0b; margin-right: 0.5rem;"></i>
                            <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">Courses</span>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                            ${courses.length > 0
                                ? courses.map(course =>
                                    `<span style="background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 500;">${typeof course === 'object' ? course.course_name : course}</span>`
                                  ).join('')
                                : `<span style="color: var(--text-secondary); font-size: 0.875rem;">No courses specified</span>`
                            }
                        </div>
                    </div>

                    <!-- Session Format -->
                    <div style="margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                            <i class="fas fa-video" style="color: #f59e0b; margin-right: 0.5rem;"></i>
                            <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">Format</span>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                            ${sessionFormats.length > 0
                                ? sessionFormats.map(format =>
                                    `<span style="background: rgba(245, 158, 11, 0.1); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.3); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 500; text-transform: capitalize;">${format}</span>`
                                  ).join('')
                                : `<span style="color: var(--text-secondary); font-size: 0.875rem;">Not specified</span>`
                            }
                        </div>
                    </div>

                    <!-- Schedule -->
                    <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--hover-bg, rgba(245, 158, 11, 0.05)); border-radius: 8px; border-left: 3px solid #f59e0b;">
                        <div style="display: flex; align-items: center; margin-bottom: 0.25rem;">
                            <i class="fas fa-clock" style="color: #f59e0b; margin-right: 0.5rem; font-size: 0.875rem;"></i>
                            <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-primary); text-transform: uppercase;">Schedule</span>
                        </div>
                        <p style="margin: 0; font-size: 0.875rem; color: var(--text-primary);">${scheduleInfo}</p>
                    </div>

                    <!-- Pricing Box - Amber Theme -->
                    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; position: relative; overflow: hidden;">
                        <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.15), transparent); animation: shimmer 3s infinite; pointer-events: none;"></div>
                        <div style="display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 1;">
                            <div>
                                <p style="margin: 0; font-size: 0.75rem; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 0.5px;">Per Session</p>
                                <p style="margin: 0; font-size: 2rem; font-weight: 700; color: white;">${priceText} <span style="font-size: 1rem; font-weight: 500;">${CurrencyManager.getCurrencySymbol((window.currentTutorData && window.currentTutorData.currency) || 'ETB')}</span></p>
                            </div>
                            <div style="text-align: right;">
                                <i class="fas fa-money-bill-wave" style="font-size: 2.5rem; color: rgba(255,255,255,0.3);"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Discounts - Always show all 3 in one row -->
                    <div style="margin-bottom: 1rem;">
                        <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                            <i class="fas fa-percent" style="color: #10b981; margin-right: 0.5rem;"></i>
                            <span style="font-size: 0.875rem; font-weight: 600; color: var(--text-primary);">Discounts</span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                            ${discounts.map(d => `
                                <div style="background: var(--hover-bg, rgba(16, 185, 129, 0.05)); border: 1px solid var(--border-color); padding: 0.5rem 0.75rem; border-radius: 6px; text-align: center;">
                                    <p style="margin: 0; font-size: 0.75rem; color: var(--text-secondary);">${d.period}</p>
                                    <p style="margin: 0; font-size: 1.25rem; font-weight: 700; color: ${d.discount > 0 ? '#10b981' : 'var(--text-secondary)'};">${d.discount > 0 ? '-' + d.discount + '%' : '0%'}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- View Details Button - Amber Theme -->
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                        <button onclick="openPackageDetailsModal(${pkg.id}, '${(pkg.name || 'Package ' + (index + 1)).replace(/'/g, "\\'")}'); return false;"
                            style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; width: 100%; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 0.875rem;">
                            <i class="fas fa-info-circle"></i> View Details
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    /**
     * Populate Success Stories Widget (right sidebar)
     */
    populateSuccessWidget() {
        const reviews = this.data.reviews.filter(r => r.rating >= 4).slice(0, 6);
        const widget = document.querySelector('.success-ticker');
        const tickerContainer = document.querySelector('.success-ticker-container');

        if (!widget) return;

        if (reviews.length === 0) {
            // Remove ticker animation class if it exists
            if (tickerContainer) {
                tickerContainer.style.height = 'auto';
                tickerContainer.style.overflow = 'visible';
            }

            widget.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-style: italic;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;">⭐</div>
                    <p>No reviews yet</p>
                </div>
            `;

            // Remove animation if applied
            widget.style.animation = 'none';
            return;
        }

        // Emoji colors for variety (matching HTML design)
        const emojiColors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];
        const emojis = ['✨', '🎯', '🏆', '📈', '💡', '⭐'];

        // Duplicate first item at the end for seamless loop
        const reviewsWithDuplicate = [...reviews];
        if (reviews.length > 1) {
            reviewsWithDuplicate.push(reviews[0]);
        }

        widget.innerHTML = reviewsWithDuplicate.map((review, index) => {
            const emoji = emojis[index % emojis.length];
            const emojiColor = emojiColors[index % emojiColors.length];
            const reviewText = review.review_text.length > 100 ?
                review.review_text.substring(0, 100) + '...' :
                review.review_text;

            return `
                <div class="success-story-item" style="display: flex; gap: 0.75rem; padding: 1rem 0; border-bottom: 1px solid var(--border-color, #e5e7eb);">
                    <span style="color: ${emojiColor}; font-size: 1.25rem; flex-shrink: 0;">${emoji}</span>
                    <div style="flex: 1;">
                        <p style="color: var(--heading); font-weight: 600; font-size: 0.875rem; margin-bottom: 0.25rem;">
                            ${review.title || review.reviewer_name || 'Student Review'}
                        </p>
                        <p style="font-size: 0.75rem; color: var(--text-muted, #6b7280); line-height: 1.5;">
                            "${reviewText}" ${review.reviewer_name ? `- ${review.reviewer_name}` : ''}
                        </p>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Populate Subjects Widget
     * Now reads courses from tutor_packages table
     */
    populateSubjectsWidget() {
        const packages = this.data.packages;
        const widget = document.querySelector('.subjects-ticker');
        const tickerContainer = widget?.closest('.success-ticker-container');

        if (!widget) return;

        // Extract unique courses from all packages
        const allCourses = [];
        if (packages && Array.isArray(packages)) {
            packages.forEach(pkg => {
                if (pkg.courses && Array.isArray(pkg.courses)) {
                    pkg.courses.forEach(course => {
                        if (course && !allCourses.includes(course)) {
                            allCourses.push(course);
                        }
                    });
                }
            });
        }

        const courses = allCourses;

        if (courses.length === 0) {
            // Remove ticker animation when no subjects
            if (tickerContainer) {
                tickerContainer.style.height = 'auto';
                tickerContainer.style.overflow = 'visible';
            }

            widget.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: var(--text-secondary); font-style: italic;">
                    No subjects listed
                </div>
            `;

            // Remove animation
            widget.style.animation = 'none';
            return;
        }

        // If only 1 subject, disable animation
        if (courses.length === 1) {
            if (tickerContainer) {
                tickerContainer.style.height = 'auto';
                tickerContainer.style.overflow = 'visible';
            }
            widget.style.animation = 'none';
        } else {
            // Re-enable animation for multiple subjects
            if (tickerContainer) {
                tickerContainer.style.height = '120px';
                tickerContainer.style.overflow = 'hidden';
            }
            widget.style.animation = '';
        }

        // Subject emojis and colors (matching beautiful design)
        const subjectEmojis = ['📐', '🧪', '📚', '🌍', '💻', '🎨', '🎭', '⚽', '🎵', '🔬'];
        const gradientColors = [
            { from: '#3b82f6', to: '#2563eb' },
            { from: '#10b981', to: '#059669' },
            { from: '#8b5cf6', to: '#7c3aed' },
            { from: '#f59e0b', to: '#d97706' },
            { from: '#ef4444', to: '#dc2626' },
            { from: '#06b6d4', to: '#0891b2' }
        ];

        // Duplicate first item at the end for seamless loop
        const coursesLimited = courses.slice(0, 6);
        const coursesWithDuplicate = [...coursesLimited];
        if (coursesLimited.length > 1) {
            coursesWithDuplicate.push(coursesLimited[0]);
        }

        widget.innerHTML = coursesWithDuplicate.map((course, index) => {
            const emoji = subjectEmojis[index % subjectEmojis.length];
            const gradient = gradientColors[index % gradientColors.length];

            return `
                <div class="success-story-item" style="display: flex; gap: 0.75rem; align-items: center; padding: 1rem 0; border-bottom: 1px solid var(--border-color, #e5e7eb);">
                    <div style="width: 50px; height: 50px; background: linear-gradient(135deg, ${gradient.from} 0%, ${gradient.to} 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                        <span style="font-size: 1.5rem;">${emoji}</span>
                    </div>
                    <div style="flex: 1;">
                        <p style="color: var(--heading); font-weight: 600; font-size: 0.95rem; margin: 0;">${course}</p>
                    </div>
                </div>
            `;
        }).join('');

        console.log(`✅ Subjects widget populated with ${courses.length} unique courses from ${packages.length} packages`);
    }

    /**
     * Populate Pricing Widget
     */
    populatePricingWidget() {
        const packages = this.data.packages;
        const profile = this.data.profile;
        const widget = document.querySelector('.pricing-widget');
        if (!widget) return;

        // Check if we have any pricing data
        let priceDisplay = 'Not set';

        if (packages.length > 0) {
            const prices = packages.map(p => p.package_price || p.session_price || 0).filter(p => p > 0);
            if (prices.length > 0) {
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const tutorSymbol = CurrencyManager.getCurrencySymbol((window.currentTutorData && window.currentTutorData.currency) || 'ETB');
                priceDisplay = minPrice === maxPrice ?
                    `${tutorSymbol}${minPrice}` :
                    `${tutorSymbol}${minPrice}-${maxPrice}`;
            }
        } else if (profile && profile.price && profile.price > 0) {
            const tutorSymbol = CurrencyManager.getCurrencySymbol((window.currentTutorData && window.currentTutorData.currency) || 'ETB');
            priceDisplay = `${tutorSymbol}${profile.price}`;
        }

        // Generate styled HTML matching the beautiful design from HTML
        widget.innerHTML = `
            <div class="widget-header" style="margin-bottom: 1rem;">
                <h3 style="font-size: 1.25rem; font-weight: 600; margin: 0;">💰 Pricing</h3>
            </div>
            <div class="pricing-content" style="text-align: center;">
                <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem;">${priceDisplay}</div>
                <div style="font-size: 0.875rem; opacity: 0.9; margin-bottom: 1.5rem;">per session</div>
                <button onclick="switchPanel('packages')"
                    style="width: 100%; padding: 0.875rem; background: white; color: #059669; border: none; border-radius: 12px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    View Packages
                </button>
            </div>
        `;
    }

    /**
     * Populate Availability Widget
     * Now displays featured schedules and sessions from database
     */
    populateAvailabilityWidget() {
        const schedules = this.data.featuredSchedules || [];
        const sessions = this.data.featuredSessions || [];
        const widget = document.querySelector('.availability-schedule');

        if (!widget) return;

        // Combine schedules and sessions
        const allItems = [...schedules, ...sessions];

        if (allItems.length === 0) {
            widget.innerHTML = `
                <div style="text-align: center; padding: 1.5rem; color: var(--text-secondary); font-style: italic; font-size: 0.875rem;">
                    No featured schedule or sessions
                </div>
            `;
            return;
        }

        // Helper function to format date/time
        const formatDateTime = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            return date.toLocaleDateString('en-US', options);
        };

        // Helper function to format time only
        const formatTime = (timeStr) => {
            if (!timeStr) return '';
            return timeStr.substring(0, 5); // Format HH:MM
        };

        // Display items as a list
        widget.innerHTML = allItems.map((item) => {
            // Determine if it's a schedule or session
            const isSchedule = item.days || item.scheduler_role;
            const isSession = item.session_title || item.student_id;

            if (isSchedule) {
                // Display schedule
                const days = Array.isArray(item.days) ? item.days.join(', ') : item.days || 'Not specified';
                const startTime = formatTime(item.start_time);
                const endTime = formatTime(item.end_time);
                const status = item.status || 'active';

                return `
                    <div style="padding: 0.875rem; margin-bottom: 0.5rem; background: var(--card-bg); border-left: 3px solid #3b82f6; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                            <span style="font-weight: 600; color: var(--heading); font-size: 0.875rem;">📅 Schedule</span>
                            <span style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-radius: 4px;">${status}</span>
                        </div>
                        <div style="font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.6;">
                            <div><strong>Days:</strong> ${days}</div>
                            ${startTime && endTime ? `<div><strong>Time:</strong> ${startTime} - ${endTime}</div>` : ''}
                        </div>
                    </div>
                `;
            } else if (isSession) {
                // Display session
                const title = item.session_title || item.title || 'Tutoring Session';
                const date = formatDateTime(item.scheduled_date || item.date);
                const status = item.status || 'scheduled';

                const statusColors = {
                    'scheduled': { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
                    'completed': { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' },
                    'cancelled': { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' },
                    'ongoing': { bg: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }
                };
                const statusColor = statusColors[status] || statusColors['scheduled'];

                return `
                    <div style="padding: 0.875rem; margin-bottom: 0.5rem; background: var(--card-bg); border-left: 3px solid #10b981; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                            <span style="font-weight: 600; color: var(--heading); font-size: 0.875rem;">🎯 ${title}</span>
                            <span style="font-size: 0.75rem; padding: 0.25rem 0.5rem; background: ${statusColor.bg}; color: ${statusColor.color}; border-radius: 4px;">${status}</span>
                        </div>
                        <div style="font-size: 0.8125rem; color: var(--text-secondary);">
                            ${date ? `<div>📆 ${date}</div>` : ''}
                        </div>
                    </div>
                `;
            }

            return '';
        }).filter(html => html).join('');

        console.log(`✅ Availability widget populated with ${schedules.length} schedules and ${sessions.length} sessions`);
    }

    /**
     * Populate Achievements Widget (right sidebar)
     * Now displays ALL credentials: achievements, academic, and experience
     * Rotates through them with a carousel effect like the ad widget
     */
    populateAchievementsWidget() {
        const widgetContainer = document.querySelector('.achievements-sidebar-widget');
        const achievementsList = document.querySelector('.achievements-list');

        if (!widgetContainer || !achievementsList) return;

        // Combine all credentials from different sources
        const allCredentials = [
            ...(this.data.achievements || []).map(a => ({ ...a, credentialType: 'achievement' })),
            ...(this.data.certificates || []).map(c => ({ ...c, credentialType: 'academic' })),
            ...(this.data.experience || []).map(e => ({ ...e, credentialType: 'experience' }))
        ];

        // If no credentials, show empty state
        if (allCredentials.length === 0) {
            achievementsList.innerHTML = `
                <div style="text-align: center; padding: 1rem;">
                    <p style="color: rgba(255,255,255,0.85); font-size: 0.875rem; font-style: italic;">
                        No credentials yet
                    </p>
                </div>
            `;
            // Hide the "View All" button
            const viewAllBtn = widgetContainer.querySelector('button');
            if (viewAllBtn) viewAllBtn.style.display = 'none';
            return;
        }

        // Icons and backgrounds based on credential type
        const credentialConfig = {
            achievement: {
                icons: ['🥇', '🏅', '⭐', '🎖️', '👑'],
                backgrounds: ['rgba(255,215,0,0.3)', 'rgba(236,72,153,0.3)', 'rgba(139,92,246,0.3)']
            },
            academic: {
                icons: ['🎓', '📜', '🏫', '📚', '🎯'],
                backgrounds: ['rgba(59,130,246,0.3)', 'rgba(6,182,212,0.3)', 'rgba(139,92,246,0.3)']
            },
            experience: {
                icons: ['💼', '🏢', '⚡', '🚀', '💡'],
                backgrounds: ['rgba(34,197,94,0.3)', 'rgba(16,185,129,0.3)', 'rgba(52,211,153,0.3)']
            }
        };

        // Build HTML for all credentials
        const credentialsHTML = allCredentials.map((cred, index) => {
            const config = credentialConfig[cred.credentialType] || credentialConfig.achievement;
            const icon = config.icons[index % config.icons.length];
            const bgColor = config.backgrounds[index % config.backgrounds.length];

            // Format description based on credential type
            let description = cred.description || '';
            if (!description) {
                if (cred.credentialType === 'academic') {
                    description = cred.issued_by || 'Academic credential';
                } else if (cred.credentialType === 'experience') {
                    description = cred.company || cred.issued_by || 'Professional experience';
                } else {
                    description = cred.year ? `Achieved in ${cred.year}` : 'Achievement unlocked';
                }
            }

            return `
                <div class="credential-item" style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); padding: 1rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.2); transition: all 0.3s ease; cursor: pointer; display: none;"
                    data-credential-index="${index}"
                    onmouseover="this.style.background='rgba(255,255,255,0.25)'; this.style.transform='translateX(5px)';"
                    onmouseout="this.style.background='rgba(255,255,255,0.15)'; this.style.transform='translateX(0)';">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 50px; height: 50px; background: ${bgColor}; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <span style="font-size: 1.75rem;">${icon}</span>
                        </div>
                        <div style="flex: 1;">
                            <h4 style="color: white; font-size: 0.95rem; font-weight: 600; margin: 0 0 0.25rem 0;">
                                ${cred.title}
                            </h4>
                            <p style="color: rgba(255,255,255,0.8); font-size: 0.75rem; margin: 0; line-height: 1.4;">
                                ${description.length > 80 ? description.substring(0, 80) + '...' : description}
                            </p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        achievementsList.innerHTML = credentialsHTML;

        // Show "View All" button
        const viewAllBtn = widgetContainer.querySelector('button');
        if (viewAllBtn) {
            viewAllBtn.style.display = 'block';
        }

        // Initialize rotating carousel if more than 1 credential
        if (allCredentials.length > 1) {
            let currentIndex = 0;
            const credentialItems = achievementsList.querySelectorAll('.credential-item');

            // Show first credential
            if (credentialItems[0]) {
                credentialItems[0].style.display = 'block';
            }

            // Rotate credentials every 5 seconds
            setInterval(() => {
                // Hide current
                if (credentialItems[currentIndex]) {
                    credentialItems[currentIndex].style.display = 'none';
                }

                // Move to next
                currentIndex = (currentIndex + 1) % allCredentials.length;

                // Show next
                if (credentialItems[currentIndex]) {
                    credentialItems[currentIndex].style.display = 'block';
                }
            }, 5000);
        } else if (allCredentials.length === 1) {
            // Just show the single credential
            const credentialItems = achievementsList.querySelectorAll('.credential-item');
            if (credentialItems[0]) {
                credentialItems[0].style.display = 'block';
            }
        }

        console.log(`✅ Credentials widget populated with ${allCredentials.length} credentials (${this.data.achievements.length} achievements, ${this.data.certificates.length} academic, ${this.data.experience.length} experience)`);
    }

    /**
     * Populate Similar Tutors Panel (in the main content area)
     * Shows tutors with similar courses, location, or languages
     * Uses same card style as related-tutors-section (tutor-card-minimal)
     */
    populateSimilarTutorsPanel() {
        const similarTutors = this.data.similarTutors;
        const panel = document.getElementById('similar-panel');

        if (!panel) return;

        const gridContainer = panel.querySelector('.related-tutors-grid') || panel.querySelector('.grid');
        if (!gridContainer) return;

        // If no similar tutors, show a message
        if (!similarTutors || similarTutors.length === 0) {
            gridContainer.innerHTML = `
                <div class="col-span-2 text-center py-8">
                    <div style="color: var(--text-muted); font-size: 3rem; margin-bottom: 1rem;">👨‍🏫</div>
                    <p style="color: var(--text-secondary);">No similar tutors found at this time.</p>
                    <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">
                        Check back later for tutor recommendations.
                    </p>
                </div>
            `;
            return;
        }

        // Take first 4 tutors for the panel
        const displayTutors = similarTutors.slice(0, 4);

        // Use same card style as related-tutors-section (tutor-card-minimal)
        const tutorsHTML = displayTutors.map((tutor, index) => {
            // Generate initials-based avatar as fallback (first letter of first name + father name)
            const nameParts = (tutor.full_name || 'Tutor').split(' ');
            const initials = nameParts.length >= 2
                ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
                : (nameParts[0][0] || 'T').toUpperCase();
            const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=4F46E5&color=fff&size=128&bold=true`;
            const profilePic = tutor.profile_picture || defaultAvatar;
            const ratingStars = this.generateStars(tutor.rating);

            return `
                <div class="tutor-card-minimal"
                     onclick="window.location.href='view-tutor.html?id=${tutor.id}'"
                     style="animation-delay: ${0.1 + (index * 0.1)}s;">
                    <img src="${profilePic}" alt="${tutor.full_name}" class="tutor-avatar"
                         onerror="this.src='${defaultAvatar}'">
                    <h4 class="tutor-name">
                        ${tutor.full_name}
                        ${tutor.is_verified ? '<span style="color: #22c55e; font-size: 0.875rem;" title="Verified">✓</span>' : ''}
                    </h4>
                    <p class="tutor-subjects">${tutor.subjects_display}</p>
                    <div class="tutor-rating">
                        <span>${ratingStars}</span>
                        <span>${tutor.rating.toFixed(1)}</span>
                    </div>
                    <button class="view-profile-btn">View Profile</button>
                </div>
            `;
        }).join('');

        gridContainer.innerHTML = tutorsHTML;

        // Update the description text
        const descEl = panel.querySelector('p.text-gray-600');
        if (descEl && this.data.profile) {
            const subjects = this.data.similarTutors.length > 0
                ? this.data.similarTutors[0].subjects?.join(', ') || 'various subjects'
                : 'similar subjects';
            descEl.textContent = `Discover other expert tutors in ${subjects} and related areas`;
            descEl.style.color = 'var(--text-secondary)';
        }
    }

    /**
     * Populate Related Tutors Section (bottom of the page)
     * Shows tutors in a horizontal card grid
     */
    populateRelatedTutorsSection() {
        const similarTutors = this.data.similarTutors;
        const section = document.querySelector('.related-tutors-section');

        if (!section) return;

        const grid = section.querySelector('.related-tutors-grid');
        if (!grid) return;

        // If no similar tutors, hide the section
        if (!similarTutors || similarTutors.length === 0) {
            section.style.display = 'none';
            return;
        }

        // Show section if we have tutors
        section.style.display = 'block';

        // Take first 4 for the related section (or 8 if more space)
        const displayTutors = similarTutors.slice(0, 4);

        const tutorsHTML = displayTutors.map((tutor, index) => {
            // Generate initials-based avatar as fallback (first letter of first name + father name)
            const nameParts = (tutor.full_name || 'Tutor').split(' ');
            const initials = nameParts.length >= 2
                ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
                : (nameParts[0][0] || 'T').toUpperCase();
            const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=4F46E5&color=fff&size=128&bold=true`;
            const profilePic = tutor.profile_picture || defaultAvatar;
            const ratingStars = this.generateStars(tutor.rating);

            return `
                <div class="tutor-card-minimal"
                     onclick="window.location.href='view-tutor.html?id=${tutor.id}'"
                     style="animation-delay: ${0.5 + (index * 0.1)}s;">
                    <img src="${profilePic}" alt="${tutor.full_name}" class="tutor-avatar"
                         onerror="this.src='${defaultAvatar}'">
                    <h4 class="tutor-name">
                        ${tutor.full_name}
                        ${tutor.is_verified ? '<span style="color: #22c55e; font-size: 0.875rem;" title="Verified">✓</span>' : ''}
                    </h4>
                    <p class="tutor-subjects">${tutor.subjects_display}</p>
                    <div class="tutor-rating">
                        <span>${ratingStars}</span>
                        <span>${tutor.rating.toFixed(1)}</span>
                    </div>
                    <button class="view-profile-btn">View Profile</button>
                </div>
            `;
        }).join('');

        grid.innerHTML = tutorsHTML;

        // Update the description text based on current tutor's subjects
        const descEl = section.querySelector('p.text-gray-600');
        if (descEl && this.data.profile) {
            descEl.textContent = 'Discover more expert educators in similar subjects';
            descEl.style.color = 'var(--text-secondary)';
        }
    }

    /**
     * Generate star rating HTML
     */
    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';
        for (let i = 0; i < fullStars; i++) stars += '⭐';
        if (hasHalfStar) stars += '⭐'; // Using full star for half (can be changed to half star emoji if available)
        for (let i = 0; i < emptyStars; i++) stars += '☆';

        return stars;
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    getTimeAgo(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
        return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
    }

    getStarsHTML(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        let html = '';
        for (let i = 0; i < 5; i++) {
            if (i < fullStars) html += '<i class="fas fa-star"></i>';
            else if (i === fullStars && hasHalfStar) html += '<i class="fas fa-star-half-alt"></i>';
            else html += '<i class="far fa-star"></i>';
        }
        return html;
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: #f44336;
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
        `;
        document.body.appendChild(errorDiv);

        setTimeout(() => errorDiv.remove(), 5000);
    }
}

// ============================================
// GLOBAL FUNCTIONS FOR PACKAGE MODAL
// ============================================

/**
 * Open package details modal - Global function accessible from HTML onclick
 * Guards feature access - requires 2FA verification (if enabled)
 * @param {number} packageId - Package ID
 * @param {string} packageName - Package name
 */
window.openPackageDetailsModal = async function(packageId, packageName) {
    // Guard: user must be KYC verified before requesting a package
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || 'null');

    // Check localStorage fields first (fast path for up-to-date sessions)
    let isVerified = currentUser && (currentUser.is_verified || currentUser.kyc_verified || currentUser.verified);

    // If not verified per localStorage, fetch fresh status from backend
    // (handles stale sessions stored before verification fields were added)
    if (!isVerified && currentUser) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (token) {
                const res = await fetch(`${API_BASE_URL}/api/kyc/status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const kycData = await res.json();
                    isVerified = kycData.is_verified === true || kycData.kyc_verified === true;
                    // Update localStorage so subsequent checks are fast
                    if (isVerified) {
                        currentUser.is_verified = true;
                        currentUser.kyc_verified = true;
                        currentUser.verified = true;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }
                }
            }
        } catch (e) {
            console.warn('[PackageGuard] Could not fetch KYC status from backend:', e);
        }
    }

    if (!currentUser || !isVerified) {
        if (typeof openAccessRestrictedModal === 'function') {
            openAccessRestrictedModal({ reason: 'kyc_not_verified', featureName: 'Request Package' });
        }
        return;
    }

    // Guard: Check 2FA verification first (if user has 2FA enabled)
    if (window.ProtectedAPI && typeof ProtectedAPI.requireVerification === 'function') {
        const verified = await ProtectedAPI.requireVerification('request_session');
        if (!verified) {
            console.log('[2FA] Package details modal blocked - verification failed or cancelled');
            return; // User cancelled or failed 2FA verification
        }
    }

    const modal = document.getElementById('packageDetailsModal');
    if (!modal) {
        console.error('Package details modal not found');
        return;
    }

    // Check if user is logged in - try multiple token storage keys
    let token = localStorage.getItem('token') || localStorage.getItem('access_token');

    // Also try getting from AuthManager if available
    if (!token && window.AuthManager && window.AuthManager.token) {
        token = window.AuthManager.token;
    }

    console.log('Package Modal - Token check:', {
        token: !!localStorage.getItem('token'),
        access_token: !!localStorage.getItem('access_token'),
        AuthManager: !!(window.AuthManager && window.AuthManager.token)
    });

    if (!token) {
        alert('⚠️ Please log in to request a session.\n\nYou need to be logged in as a student or parent to request tutoring sessions.');
        return;
    }

    // Check if user is a student or parent - check multiple sources
    const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');
    const userRolesFromStorage = JSON.parse(localStorage.getItem('userRoles') || '[]');
    const userRolesFromUser = user.roles || [];
    const activeRole = localStorage.getItem('currentRole') || localStorage.getItem('activeRole') || localStorage.getItem('userRole') || user.active_role || '';

    // Combine all role sources
    const allRoles = [...new Set([...userRolesFromStorage, ...userRolesFromUser])];

    const isStudent = allRoles.includes('student') || activeRole === 'student';
    const isParent = allRoles.includes('parent') || activeRole === 'parent';

    console.log('Package Modal - User roles from storage:', userRolesFromStorage);
    console.log('Package Modal - User roles from user object:', userRolesFromUser);
    console.log('Package Modal - Active role:', activeRole);
    console.log('Package Modal - Is student:', isStudent, 'Is parent:', isParent);

    if (!isStudent && !isParent) {
        alert('⚠️ Only students and parents can request tutoring sessions.');
        return;
    }

    try {
        // Get tutor ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const tutorId = urlParams.get('id');

        // Fetch package details from API
        const response = await fetch(`${API_BASE_URL}/api/view-tutor/${tutorId}/packages`);
        if (!response.ok) throw new Error('Failed to fetch package details');

        const data = await response.json();
        const packageData = data.packages.find(pkg => pkg.id === packageId);

        if (!packageData) {
            throw new Error('Package not found');
        }

        // Store current package data globally
        window.currentPackageData = packageData;
        window.currentTutorId = tutorId;

        // Populate package details
        populatePackageDetails(packageData);

        // Update the listed price display for counter-offer reference
        const price = packageData.session_price || packageData.package_price || 0;
        const tutorCurrencySymbol = CurrencyManager.getCurrencySymbol((window.currentTutorData && window.currentTutorData.currency) || 'ETB');
        const listedPriceDisplay = document.getElementById('listedPriceDisplay');
        if (listedPriceDisplay) {
            listedPriceDisplay.textContent = `${tutorCurrencySymbol}${Math.round(price)}`;
        }
        const counterOfferCurrencySymbol = document.getElementById('counterOfferCurrencySymbol');
        if (counterOfferCurrencySymbol) {
            counterOfferCurrencySymbol.textContent = tutorCurrencySymbol;
        }

        // Clear any previous counter-offer
        const counterOfferInput = document.getElementById('counterOfferPrice');
        if (counterOfferInput) {
            counterOfferInput.value = '';
        }

        // Pre-fill user info
        prefillPackageModalUserInfo();

        // Show modal
        modal.style.display = 'flex';
        modal.classList.remove('hidden');

    } catch (error) {
        console.error('Error loading package details:', error);
        alert('❌ Failed to load package details. Please try again.');
    }
};

/**
 * Populate package details in the modal
 */
function populatePackageDetails(pkg) {
    const detailsContent = document.getElementById('packageDetailsContent');
    if (!detailsContent) return;

    // Build features array - mark ones with long content for full-width display
    const features = [];

    // Courses (likely long - full width)
    if (pkg.courses) {
        const coursesText = typeof pkg.courses === 'string'
            ? pkg.courses
            : (Array.isArray(pkg.courses)
                ? pkg.courses.map(c => typeof c === 'object' ? (c.course_name || '') : c).filter(Boolean).join(', ')
                : '');
        if (coursesText) {
            features.push({ icon: 'fa-book', label: 'Courses', value: coursesText, fullWidth: true });
        }
    }

    // Schedule (likely long - full width)
    if (pkg.schedule_type || pkg.recurring_days || pkg.start_time) {
        let scheduleText = '';
        if (pkg.schedule_type === 'recurring') {
            const days = pkg.recurring_days && pkg.recurring_days.length > 0
                ? pkg.recurring_days.join(', ')
                : `${pkg.days_per_week || 0} days/week`;
            scheduleText = days;
            if (pkg.start_time && pkg.end_time) {
                scheduleText += ` (${pkg.start_time.substring(0, 5)} - ${pkg.end_time.substring(0, 5)})`;
            }
        } else if (pkg.schedule_type === 'flexible') {
            scheduleText = 'Flexible';
        } else if (pkg.days_per_week) {
            scheduleText = `${pkg.days_per_week} days/week`;
        }
        if (scheduleText) {
            features.push({ icon: 'fa-calendar-alt', label: 'Schedule', value: scheduleText, fullWidth: true });
        }
    }

    // Duration (short)
    if (pkg.duration_minutes || pkg.hours_per_day) {
        const hours = pkg.hours_per_day || Math.floor(pkg.duration_minutes / 60);
        const mins = pkg.duration_minutes ? pkg.duration_minutes % 60 : 0;
        const durationText = hours > 0
            ? `${hours} hour${hours > 1 ? 's' : ''}${mins > 0 ? ` ${mins} min` : ''}`
            : `${mins} minutes`;
        features.push({ icon: 'fa-clock', label: 'Duration', value: `${durationText} per session`, fullWidth: false });
    }

    // Total sessions (short)
    if (pkg.total_sessions) {
        features.push({ icon: 'fa-list-check', label: 'Total Sessions', value: `${pkg.total_sessions} sessions/month`, fullWidth: false });
    }

    // Session format (short)
    if (pkg.session_format) {
        const formatText = pkg.session_format.toLowerCase() === 'both'
            ? 'Online & In-person'
            : pkg.session_format.charAt(0).toUpperCase() + pkg.session_format.slice(1);
        const formatIcon = pkg.session_format.toLowerCase() === 'online' ? 'fa-video' :
                          pkg.session_format.toLowerCase() === 'in-person' ? 'fa-users' : 'fa-globe';
        features.push({ icon: formatIcon, label: 'Format', value: formatText, fullWidth: false });
    }

    // Grade level (short)
    if (pkg.grade_level) {
        features.push({ icon: 'fa-graduation-cap', label: 'Grade Level', value: pkg.grade_level, fullWidth: false });
    }

    // Payment frequency (short)
    if (pkg.payment_frequency) {
        const paymentText = pkg.payment_frequency === '2-weeks'
            ? 'Bi-weekly'
            : pkg.payment_frequency.charAt(0).toUpperCase() + pkg.payment_frequency.slice(1);
        features.push({ icon: 'fa-credit-card', label: 'Payment', value: paymentText, fullWidth: false });
    }

    const price = pkg.session_price || pkg.package_price || 0;
    const hasDiscounts = pkg.discount_1_month || pkg.discount_6_month || pkg.discount_12_month;

    // Separate full-width and half-width features
    const fullWidthFeatures = features.filter(f => f.fullWidth);
    const halfWidthFeatures = features.filter(f => !f.fullWidth);

    detailsContent.innerHTML = `
        <!-- Package Header Card with Price and Discounts -->
        <div style="background: rgba(var(--primary-rgb, 59, 130, 246), 0.06); border: 1px solid var(--border-color, #e5e7eb); border-radius: 16px; padding: 24px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
                <div style="flex: 1; min-width: 200px;">
                    <h3 style="font-size: 1.35rem; font-weight: 700; color: var(--text-color, #1f2937); margin: 0 0 8px 0;">${pkg.name}</h3>
                    ${pkg.description ? `<p style="font-size: 0.9rem; color: var(--text-secondary, #6b7280); margin: 0 0 12px 0; line-height: 1.5;">${pkg.description}</p>` : ''}

                    <!-- Discounts inline with package info -->
                    ${hasDiscounts ? `
                        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px;">
                            ${pkg.discount_1_month ? `
                                <span style="display: inline-flex; align-items: center; gap: 4px; background: #10b981; color: white; padding: 5px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">
                                    <i class="fas fa-tag" style="font-size: 0.65rem;"></i>
                                    ${pkg.discount_1_month}% OFF - 1 Month
                                </span>
                            ` : ''}
                            ${pkg.discount_6_month ? `
                                <span style="display: inline-flex; align-items: center; gap: 4px; background: var(--primary-color, #3b82f6); color: white; padding: 5px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">
                                    <i class="fas fa-tag" style="font-size: 0.65rem;"></i>
                                    ${pkg.discount_6_month}% OFF - 6 Months
                                </span>
                            ` : ''}
                            ${pkg.discount_12_month ? `
                                <span style="display: inline-flex; align-items: center; gap: 4px; background: #7c3aed; color: white; padding: 5px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">
                                    <i class="fas fa-tag" style="font-size: 0.65rem;"></i>
                                    ${pkg.discount_12_month}% OFF - 1 Year
                                </span>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
                <div style="text-align: right;">
                    <div style="background: var(--primary-color, #3b82f6); color: white; padding: 12px 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(var(--primary-rgb, 59, 130, 246), 0.3);">
                        <div style="font-size: 1.75rem; font-weight: 800; line-height: 1;">${CurrencyManager.getCurrencySymbol((window.currentTutorData && window.currentTutorData.currency) || 'ETB')}${Math.round(price)}</div>
                        <div style="font-size: 0.75rem; opacity: 0.9; margin-top: 2px;">per session</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Full-width Features (Subjects, Schedule) -->
        ${fullWidthFeatures.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;">
                ${fullWidthFeatures.map(f => `
                    <div style="display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; background: var(--card-bg, #ffffff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 12px;">
                        <div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: rgba(var(--primary-rgb, 59, 130, 246), 0.1); border-radius: 10px; flex-shrink: 0;">
                            <i class="fas ${f.icon}" style="color: var(--primary-color, #3b82f6); font-size: 1rem;"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 0.7rem; font-weight: 600; color: var(--text-secondary, #6b7280); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${f.label}</div>
                            <div style="font-size: 0.9rem; font-weight: 600; color: var(--text-color, #1f2937); line-height: 1.4;">${f.value}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <!-- Half-width Features Grid -->
        ${halfWidthFeatures.length > 0 ? `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
                ${halfWidthFeatures.map(f => `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--card-bg, #ffffff); border: 1px solid var(--border-color, #e5e7eb); border-radius: 12px;">
                        <div style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: rgba(var(--primary-rgb, 59, 130, 246), 0.1); border-radius: 8px; flex-shrink: 0;">
                            <i class="fas ${f.icon}" style="color: var(--primary-color, #3b82f6); font-size: 0.9rem;"></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 0.65rem; font-weight: 600; color: var(--text-secondary, #6b7280); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">${f.label}</div>
                            <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-color, #1f2937);">${f.value}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;
}

/**
 * Pre-fill user information in package modal
 * Handles different UI for parents (child search) vs students (auto-fill)
 */
async function prefillPackageModalUserInfo() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');
        const userRolesFromStorage = JSON.parse(localStorage.getItem('userRoles') || '[]');
        const userRolesFromUser = user.roles || [];
        const activeRole = localStorage.getItem('currentRole') || localStorage.getItem('activeRole') || localStorage.getItem('userRole') || user.active_role || '';

        // Combine all role sources
        const allRoles = [...new Set([...userRolesFromStorage, ...userRolesFromUser])];

        const parentChildSection = document.getElementById('parentChildSelectionSection');
        const studentNameInput = document.getElementById('detailsStudentName');
        const gradeLevelInput = document.getElementById('detailsGradeLevel');

        // Debug logging
        console.log('prefillPackageModal - All roles:', allRoles);
        console.log('prefillPackageModal - Active role:', activeRole);

        // Check if user is currently acting as a parent (active role is 'parent')
        const isParent = activeRole === 'parent';

        console.log('prefillPackageModal - Is Parent:', isParent);

        if (isParent) {
            // Show parent child selection section
            if (parentChildSection) {
                parentChildSection.style.display = 'block';
            }

            // Initialize child search for parents
            await initializeChildSearch();
        } else {
            // Hide parent child selection section for students
            if (parentChildSection) {
                parentChildSection.style.display = 'none';
            }

            // Auto-fill student info for students
            if (allRoles.includes('student') || activeRole === 'student') {
                // Get student profile data
                const studentProfile = await fetchStudentProfile();
                if (studentProfile) {
                    if (studentNameInput) {
                        const fullName = [
                            studentProfile.first_name || user.first_name,
                            studentProfile.father_name || user.father_name,
                            studentProfile.grandfather_name || user.grandfather_name
                        ].filter(Boolean).join(' ') || studentProfile.username || user.username;
                        studentNameInput.value = fullName;
                    }
                    if (gradeLevelInput && studentProfile.grade_level) {
                        gradeLevelInput.value = studentProfile.grade_level;
                    }
                    // Store student profile ID
                    const selectedChildIdInput = document.getElementById('selectedChildId');
                    if (selectedChildIdInput) {
                        selectedChildIdInput.value = studentProfile.id || '';
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error pre-filling user info:', error);
    }
}

/**
 * Fetch current student's profile
 */
async function fetchStudentProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;

        const response = await fetch(`${API_BASE_URL}/api/student/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error fetching student profile:', error);
        return null;
    }
}

/**
 * Initialize child search functionality for parents
 */
async function initializeChildSearch() {
    const searchInput = document.getElementById('childSearchInput');
    const searchResults = document.getElementById('childSearchResults');
    const spinner = document.getElementById('childSearchSpinner');
    const noChildrenMessage = document.getElementById('noChildrenMessage');

    if (!searchInput || !searchResults) return;

    // Fetch children if not cached
    if (!window.parentChildrenCache) {
        try {
            if (spinner) spinner.style.display = 'block';

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/parent/children`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                window.parentChildrenCache = data.children || [];
                console.log(`✓ Loaded ${window.parentChildrenCache.length} children for parent`);
            } else {
                window.parentChildrenCache = [];
            }
        } catch (error) {
            console.error('Error fetching children:', error);
            window.parentChildrenCache = [];
        } finally {
            if (spinner) spinner.style.display = 'none';
        }
    }

    // Show no children message if empty
    if (window.parentChildrenCache.length === 0) {
        if (noChildrenMessage) noChildrenMessage.style.display = 'block';
        searchInput.style.display = 'none';
        return;
    }

    // Hide no children message and show search
    if (noChildrenMessage) noChildrenMessage.style.display = 'none';
    searchInput.style.display = 'block';

    // Setup search input event listener
    searchInput.removeEventListener('input', handleChildSearch);
    searchInput.addEventListener('input', handleChildSearch);

    // Setup focus to show all children
    searchInput.removeEventListener('focus', handleChildSearchFocus);
    searchInput.addEventListener('focus', handleChildSearchFocus);

    // Setup click outside to close dropdown
    document.removeEventListener('click', handleClickOutsideChildSearch);
    document.addEventListener('click', handleClickOutsideChildSearch);
}

/**
 * Handle child search input
 */
function handleChildSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    const searchResults = document.getElementById('childSearchResults');

    if (!window.parentChildrenCache || window.parentChildrenCache.length === 0) {
        searchResults.style.display = 'none';
        return;
    }

    // Filter children based on search query
    const filtered = query === ''
        ? window.parentChildrenCache
        : window.parentChildrenCache.filter(child =>
            (child.name && child.name.toLowerCase().includes(query)) ||
            (child.first_name && child.first_name.toLowerCase().includes(query)) ||
            (child.username && child.username.toLowerCase().includes(query)) ||
            (child.grade_level && child.grade_level.toLowerCase().includes(query))
        );

    renderChildSearchResults(filtered);
}

/**
 * Handle focus on search input - show all children
 */
function handleChildSearchFocus() {
    if (window.parentChildrenCache && window.parentChildrenCache.length > 0) {
        renderChildSearchResults(window.parentChildrenCache);
    }
}

/**
 * Handle click outside child search dropdown
 */
function handleClickOutsideChildSearch(e) {
    const searchInput = document.getElementById('childSearchInput');
    const searchResults = document.getElementById('childSearchResults');

    if (searchInput && searchResults &&
        !searchInput.contains(e.target) &&
        !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
    }
}

/**
 * Render child search results
 */
function renderChildSearchResults(children) {
    const searchResults = document.getElementById('childSearchResults');
    if (!searchResults) return;

    if (children.length === 0) {
        searchResults.innerHTML = `
            <div style="padding: 16px; text-align: center; color: #6b7280;">
                <i class="fas fa-search" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
                <p style="margin: 0;">No children found matching your search</p>
            </div>
        `;
        searchResults.style.display = 'block';
        return;
    }

    searchResults.innerHTML = children.map(child => {
        const avatar = child.profile_picture || '/system_images/default-avatar.png';
        const name = child.name || child.first_name || child.username || 'Unknown';
        const grade = child.grade_level || 'Grade not set';

        return `
            <div class="child-search-result" onclick="selectChild(${child.id})"
                style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #f3f4f6; transition: background 0.2s;"
                onmouseover="this.style.background='#f0f9ff'"
                onmouseout="this.style.background='white'">
                <img src="${avatar}" alt="${name}"
                    style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #e5e7eb;"
                    onerror="this.src='/system_images/default-avatar.png'">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #1f2937;">${name}</div>
                    <div style="font-size: 0.8rem; color: #6b7280;">${grade}</div>
                </div>
                <i class="fas fa-chevron-right" style="color: #9ca3af;"></i>
            </div>
        `;
    }).join('');

    searchResults.style.display = 'block';
}

/**
 * Select a child from search results
 */
window.selectChild = function(childId) {
    const child = window.parentChildrenCache.find(c => c.id === childId);
    if (!child) return;

    // Store selected child data
    window.selectedChildData = child;

    // Update hidden inputs
    const selectedChildIdInput = document.getElementById('selectedChildId');
    const studentNameInput = document.getElementById('detailsStudentName');
    const gradeLevelInput = document.getElementById('detailsGradeLevel');

    if (selectedChildIdInput) selectedChildIdInput.value = child.id;
    if (studentNameInput) studentNameInput.value = child.name || child.first_name || child.username || '';
    if (gradeLevelInput) gradeLevelInput.value = child.grade_level || '';

    // Update selected child display
    const selectedDisplay = document.getElementById('selectedChildDisplay');
    const searchInput = document.getElementById('childSearchInput');
    const searchResults = document.getElementById('childSearchResults');

    if (selectedDisplay) {
        const avatar = document.getElementById('selectedChildAvatar');
        const name = document.getElementById('selectedChildName');
        const grade = document.getElementById('selectedChildGrade');

        if (avatar) {
            avatar.src = child.profile_picture || '/system_images/default-avatar.png';
            avatar.onerror = function() { this.src = '/system_images/default-avatar.png'; };
        }
        if (name) name.textContent = child.name || child.first_name || child.username || 'Unknown';
        if (grade) grade.textContent = child.grade_level || 'Grade not set';

        selectedDisplay.style.display = 'block';
    }

    // Hide search input and results
    if (searchInput) searchInput.parentElement.style.display = 'none';
    if (searchResults) searchResults.style.display = 'none';

    console.log(`✓ Selected child: ${child.name} (ID: ${child.id})`);
};

/**
 * Clear selected child and show search again
 */
window.clearSelectedChild = function() {
    window.selectedChildData = null;

    // Clear hidden inputs
    const selectedChildIdInput = document.getElementById('selectedChildId');
    const studentNameInput = document.getElementById('detailsStudentName');
    const gradeLevelInput = document.getElementById('detailsGradeLevel');

    if (selectedChildIdInput) selectedChildIdInput.value = '';
    if (studentNameInput) studentNameInput.value = '';
    if (gradeLevelInput) gradeLevelInput.value = '';

    // Hide selected display
    const selectedDisplay = document.getElementById('selectedChildDisplay');
    if (selectedDisplay) selectedDisplay.style.display = 'none';

    // Show search input again
    const searchInput = document.getElementById('childSearchInput');
    if (searchInput) {
        searchInput.parentElement.style.display = 'block';
        searchInput.value = '';
        searchInput.focus();
    }

    console.log('✓ Cleared selected child');
};

/**
 * Close package details modal
 */
window.closePackageDetailsModal = function() {
    const modal = document.getElementById('packageDetailsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }

    // Reset text/hidden fields
    const textFields = ['detailsStudentName', 'detailsGradeLevel', 'selectedChildId', 'childSearchInput', 'specificDates'];
    textFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });

    // Reset schedule type dropdown
    const scheduleType = document.getElementById('scheduleType');
    if (scheduleType) scheduleType.value = '';

    // Reset time inputs to defaults
    const startTime = document.getElementById('startTime');
    const endTime = document.getElementById('endTime');
    if (startTime) startTime.value = '09:00';
    if (endTime) endTime.value = '17:00';

    // Reset all checkboxes (years, months, days)
    document.querySelectorAll('#packageDetailsModal input[type="checkbox"]').forEach(cb => {
        cb.checked = cb.value === '2025'; // Keep 2025 checked by default
    });

    // Hide recurring and specific date fields
    const recurringFields = document.getElementById('recurringScheduleFields');
    const specificDatesField = document.getElementById('specificDatesField');
    if (recurringFields) recurringFields.style.display = 'none';
    if (specificDatesField) specificDatesField.style.display = 'none';

    // Reset specific dates
    window.selectedSpecificDates = [];
    const selectedDatesList = document.getElementById('selectedDatesList');
    if (selectedDatesList) selectedDatesList.innerHTML = '';
    const specificDateFrom = document.getElementById('specificDateFrom');
    const specificDateTo = document.getElementById('specificDateTo');
    if (specificDateFrom) specificDateFrom.value = '';
    if (specificDateTo) specificDateTo.value = '';
    const specificDatesHidden = document.getElementById('specificDates');
    if (specificDatesHidden) specificDatesHidden.value = '';

    // Reset child search state for parents
    window.selectedChildData = null;
    const selectedChildDisplay = document.getElementById('selectedChildDisplay');
    if (selectedChildDisplay) selectedChildDisplay.style.display = 'none';

    const searchInputContainer = document.getElementById('childSearchInput');
    if (searchInputContainer && searchInputContainer.parentElement) {
        searchInputContainer.parentElement.style.display = 'block';
    }

    const searchResults = document.getElementById('childSearchResults');
    if (searchResults) searchResults.style.display = 'none';

    window.currentPackageData = null;
};

// Initialize selected specific dates array
window.selectedSpecificDates = [];

/**
 * Handle From Date selection for specific dates
 */
window.handleSpecificDateFromChange = function() {
    const fromDate = document.getElementById('specificDateFrom').value;
    const toDateInput = document.getElementById('specificDateTo');

    if (!fromDate) return;

    // Set minimum date for "To Date" to be the same or after "From Date"
    if (toDateInput) {
        toDateInput.min = fromDate;
    }

    // If no "To Date" selected, add the single date immediately
    if (!toDateInput.value) {
        addSpecificDateToList(fromDate, null);
    }
};

/**
 * Handle To Date selection for specific dates
 */
window.handleSpecificDateToChange = function() {
    const fromDate = document.getElementById('specificDateFrom').value;
    const toDate = document.getElementById('specificDateTo').value;

    if (!fromDate) {
        alert('Please select a "From Date" first.');
        document.getElementById('specificDateTo').value = '';
        return;
    }

    if (toDate && toDate < fromDate) {
        alert('"To Date" cannot be before "From Date".');
        document.getElementById('specificDateTo').value = '';
        return;
    }

    // Add the date range
    addSpecificDateToList(fromDate, toDate);
};

/**
 * Add a specific date or date range to the selected list
 */
function addSpecificDateToList(fromDate, toDate) {
    if (!fromDate) return;

    // Check for duplicates
    const dateKey = toDate ? `${fromDate}_${toDate}` : fromDate;
    if (window.selectedSpecificDates.some(d => d.key === dateKey)) {
        return; // Already added
    }

    // Create date entry object
    const dateEntry = {
        key: dateKey,
        from: fromDate,
        to: toDate,
        display: toDate ? `${formatDateDisplay(fromDate)} - ${formatDateDisplay(toDate)}` : formatDateDisplay(fromDate)
    };

    window.selectedSpecificDates.push(dateEntry);
    renderSelectedDatesList();
    updateSpecificDatesHiddenInput();

    // Clear inputs for next entry
    document.getElementById('specificDateFrom').value = '';
    document.getElementById('specificDateTo').value = '';
}

/**
 * Add another date/range (button click handler)
 */
window.addAnotherSpecificDate = function() {
    const fromDate = document.getElementById('specificDateFrom').value;
    const toDate = document.getElementById('specificDateTo').value;

    if (!fromDate) {
        alert('Please select a "From Date" first.');
        document.getElementById('specificDateFrom').focus();
        return;
    }

    addSpecificDateToList(fromDate, toDate || null);
};

/**
 * Remove a specific date from the list
 */
window.removeSpecificDate = function(key) {
    window.selectedSpecificDates = window.selectedSpecificDates.filter(d => d.key !== key);
    renderSelectedDatesList();
    updateSpecificDatesHiddenInput();
};

/**
 * Render the selected dates list
 */
function renderSelectedDatesList() {
    const container = document.getElementById('selectedDatesList');
    if (!container) return;

    if (window.selectedSpecificDates.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div style="background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 10px; padding: 12px;">
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                <i class="fas fa-calendar-check" style="color: var(--primary-color);"></i> Selected Dates (${window.selectedSpecificDates.length})
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${window.selectedSpecificDates.map(date => `
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(var(--primary-rgb), 0.1); border: 1px solid var(--primary-color); padding: 8px 12px; border-radius: 8px;">
                        <i class="fas fa-calendar-day" style="color: var(--primary-color); font-size: 0.85rem;"></i>
                        <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-color);">${date.display}</span>
                        <button type="button" onclick="removeSpecificDate('${date.key}')"
                            style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center;"
                            title="Remove this date">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

/**
 * Update the hidden input with all selected dates
 */
function updateSpecificDatesHiddenInput() {
    const hiddenInput = document.getElementById('specificDates');
    if (!hiddenInput) return;

    // Format as comma-separated dates/ranges
    const datesArray = [];
    window.selectedSpecificDates.forEach(d => {
        if (d.to) {
            // For ranges, add all dates in the range
            const dates = getDatesBetween(d.from, d.to);
            datesArray.push(...dates);
        } else {
            datesArray.push(d.from);
        }
    });

    hiddenInput.value = datesArray.join(', ');
}

/**
 * Get all dates between two dates (inclusive)
 */
function getDatesBetween(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    while (start <= end) {
        dates.push(start.toISOString().split('T')[0]);
        start.setDate(start.getDate() + 1);
    }

    return dates;
}

/**
 * Format date for display (e.g., "Jan 15, 2025")
 */
function formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Submit package request with customizations
 */
window.submitPackageRequest = async function() {
    if (!window.currentTutorId || !window.currentPackageData) {
        alert('❌ Error: Missing package or tutor information.');
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        alert('❌ You must be logged in to request a session.');
        window.closePackageDetailsModal();
        return;
    }

    // Get student info from hidden inputs (populated by selectChild or auto-fill for students)
    let studentName = document.getElementById('detailsStudentName')?.value.trim() || '';
    let studentProfileId = document.getElementById('selectedChildId')?.value || null;

    // Also check window.selectedChildData as backup (populated by selectChild)
    if (!studentName && window.selectedChildData) {
        studentName = window.selectedChildData.name || window.selectedChildData.first_name || window.selectedChildData.username || '';
        studentProfileId = window.selectedChildData.id;
    }

    // Validation: Must have a student selected (either self for students, or child for parents)
    if (!studentProfileId && !studentName) {
        alert('⚠️ Please select a student for this tutoring request.');
        const searchInput = document.getElementById('childSearchInput');
        if (searchInput) searchInput.focus();
        return;
    }

    // Build schedule data from UI elements
    const scheduleType = document.getElementById('scheduleType')?.value || '';
    const startTime = document.getElementById('startTime')?.value || '';
    const endTime = document.getElementById('endTime')?.value || '';

    // Structured schedule fields
    let yearRange = [];
    let months = [];
    let days = [];
    let specificDates = [];
    let preferredSchedule = '';

    if (scheduleType === 'recurring') {
        // Get selected years
        yearRange = Array.from(document.querySelectorAll('input[name="yearRange"]:checked')).map(cb => parseInt(cb.value));
        // Get selected months
        months = Array.from(document.querySelectorAll('input[name="months"]:checked')).map(cb => cb.value);
        // Get selected days
        days = Array.from(document.querySelectorAll('input[name="days"]:checked')).map(cb => cb.value);

        // Build legacy preferred_schedule string as backup
        const scheduleParts = [];
        if (yearRange.length > 0) scheduleParts.push(`Years: ${yearRange.join(', ')}`);
        if (months.length > 0) scheduleParts.push(`Months: ${months.join(', ')}`);
        if (days.length > 0) scheduleParts.push(`Days: ${days.join(', ')}`);
        if (startTime && endTime) scheduleParts.push(`Time: ${startTime} - ${endTime}`);
        preferredSchedule = scheduleParts.join(' | ');

    } else if (scheduleType === 'specific_dates') {
        const specificDatesStr = document.getElementById('specificDates')?.value.trim() || '';
        if (specificDatesStr) {
            specificDates = specificDatesStr.split(',').map(d => d.trim()).filter(d => d);
            preferredSchedule = `Specific Dates: ${specificDatesStr}`;
            if (startTime && endTime) preferredSchedule += ` | Time: ${startTime} - ${endTime}`;
        }
    }

    // Get counter-offer price if provided
    const counterOfferInput = document.getElementById('counterOfferPrice');
    const counterOfferPrice = counterOfferInput?.value ? parseFloat(counterOfferInput.value) : null;

    // Prepare request data with structured schedule fields
    const requestData = {
        tutor_id: parseInt(window.currentTutorId),
        package_id: window.currentPackageData.id,
        preferred_schedule: preferredSchedule || null,
        // Student the session is for (self for students, selected child for parents)
        requested_to_id: studentProfileId ? parseInt(studentProfileId) : null,
        // Structured schedule fields
        schedule_type: scheduleType || null,
        year_range: yearRange.length > 0 ? yearRange : null,
        months: months.length > 0 ? months : null,
        days: days.length > 0 ? days : null,
        specific_dates: specificDates.length > 0 ? specificDates : null,
        start_time: startTime || null,
        end_time: endTime || null,
        // Counter-offer price
        counter_offer_price: counterOfferPrice
    };

    // Show loading state
    const submitButton = document.getElementById('submitPackageBtn');
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    // Hide any existing alerts
    const existingAlert = document.getElementById('packageRequestAlert');
    if (existingAlert) {
        existingAlert.remove();
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/session-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const error = await response.json();

            // Restore button first
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;

            // Handle duplicate request error (409 Conflict)
            if (response.status === 409) {
                // Check if this is an accepted request (green) or pending request (yellow)
                const isAccepted = error.detail.includes('✅ACCEPTED✅');
                const isPending = error.detail.includes('⚠️PENDING⚠️');

                // Remove the prefix markers from the message
                let cleanMessage = error.detail.replace('✅ACCEPTED✅', '').replace('⚠️PENDING⚠️', '');

                if (isAccepted) {
                    // Show green success alert for accepted requests
                    showPackageRequestAlert('success', cleanMessage, 'Already Enrolled!');
                } else if (isPending) {
                    // Show yellow warning alert for pending requests
                    showPackageRequestAlert('warning', cleanMessage, 'Request Already Sent');
                } else {
                    // Fallback to warning for any other 409
                    showPackageRequestAlert('warning', cleanMessage, 'Request Already Sent');
                }
                return;
            }

            throw new Error(error.detail || 'Failed to send session request');
        }

        const result = await response.json();

        // Restore button to original state
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;

        // Show success message in modal
        showPackageRequestAlert('success', 'The tutor will review your request and respond soon. You can check the status in your profile.', 'Request Sent Successfully!');

    } catch (error) {
        console.error('Error submitting session request:', error);

        // Restore button
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;

        // Show error message in modal
        showPackageRequestAlert('error', error.message, 'Failed to Send Request');
    }
};

/**
 * Show alert message inside package details modal
 */
function showPackageRequestAlert(type, message, title) {
    // Remove existing alert if any
    const existingAlert = document.getElementById('packageRequestAlert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Get modal content container
    const modalContent = document.querySelector('#packageDetailsModal .modal-content');
    if (!modalContent) return;

    // Determine emoji and colors based on type
    let emoji, bgColor, textColor, borderColor;
    switch (type) {
        case 'success':
            emoji = '✅';
            bgColor = '#d4edda';
            textColor = '#155724';
            borderColor = '#c3e6cb';
            break;
        case 'warning':
            emoji = '⚠️';
            bgColor = '#fff3cd';
            textColor = '#856404';
            borderColor = '#ffeaa7';
            break;
        case 'error':
            emoji = '❌';
            bgColor = '#f8d7da';
            textColor = '#721c24';
            borderColor = '#f5c6cb';
            break;
        default:
            emoji = 'ℹ️';
            bgColor = '#d1ecf1';
            textColor = '#0c5460';
            borderColor = '#bee5eb';
    }

    // Create alert element
    const alert = document.createElement('div');
    alert.id = 'packageRequestAlert';
    alert.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${bgColor};
        color: ${textColor};
        border: 2px solid ${borderColor};
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        z-index: 10001;
        text-align: center;
        animation: slideIn 0.3s ease-out;
    `;

    // Create onclick handler - for success, close modal after removing alert
    const onclickHandler = type === 'success'
        ? "document.getElementById('packageRequestAlert').remove(); if (typeof window.closePackageDetailsModal === 'function') window.closePackageDetailsModal();"
        : "document.getElementById('packageRequestAlert').remove()";

    alert.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 12px;">${emoji}</div>
        <div style="font-size: 20px; font-weight: 600; margin-bottom: 12px;">${title}</div>
        <div style="font-size: 14px; line-height: 1.6; margin-bottom: 20px; white-space: pre-line;">${message}</div>
        <button onclick="${onclickHandler}" style="
            background: ${textColor};
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
        " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
            Alright
        </button>
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translate(-50%, -60%);
            }
            to {
                opacity: 1;
                transform: translate(-50%, -50%);
            }
        }
    `;
    document.head.appendChild(style);

    // Add to document
    document.body.appendChild(alert);
}

// ============================================
// VIEW-ONLY MODAL FUNCTIONS (No Edit/Delete buttons)
// ============================================

/**
 * View Achievement Details (View-Only Modal)
 */
window.viewAchievementDetails = async function(achId) {
    try {
        // Find achievement from loaded data
        const loader = window.viewTutorLoaderInstance;
        if (!loader || !loader.data.achievements) {
            console.error('Achievements data not loaded');
            return;
        }

        const ach = loader.data.achievements.find(a => a.id === achId);
        if (!ach) {
            console.error('Achievement not found:', achId);
            return;
        }

        openViewAchievementModal(ach);
    } catch (error) {
        console.error('Error viewing achievement:', error);
        alert('Failed to load achievement details. Please try again.');
    }
};

/**
 * View Certification Details (View-Only Modal)
 */
window.viewCertificationDetails = async function(certId) {
    try {
        // Find certification from loaded data
        const loader = window.viewTutorLoaderInstance;
        if (!loader || !loader.data.certificates) {
            console.error('Certifications data not loaded');
            return;
        }

        const cert = loader.data.certificates.find(c => c.id === certId);
        if (!cert) {
            console.error('Certification not found:', certId);
            return;
        }

        openViewCertificationModal(cert);
    } catch (error) {
        console.error('Error viewing certification:', error);
        alert('Failed to load certification details. Please try again.');
    }
};

/**
 * View Experience Details (View-Only Modal)
 */
window.viewExperienceDetails = async function(expId) {
    try {
        // Find experience from loaded data
        const loader = window.viewTutorLoaderInstance;
        if (!loader || !loader.data.experience) {
            console.error('Experience data not loaded');
            return;
        }

        const exp = loader.data.experience.find(e => e.id === expId);
        if (!exp) {
            console.error('Experience not found:', expId);
            return;
        }

        openViewExperienceModal(exp);
    } catch (error) {
        console.error('Error viewing experience:', error);
        alert('Failed to load experience details. Please try again.');
    }
};

/**
 * Open View Achievement Modal (View-Only - No Edit/Delete)
 */
function openViewAchievementModal(ach) {
    const modal = document.getElementById('viewAchievementModal');
    if (!modal) {
        console.error('viewAchievementModal not found');
        return;
    }

    // Populate view-only fields
    const iconEl = document.getElementById('view-ach-icon');
    const titleEl = document.getElementById('view-ach-title');
    const categoryEl = document.getElementById('view-ach-category');
    const yearEl = document.getElementById('view-ach-year');
    const issuerEl = document.getElementById('view-ach-issuer');
    const descriptionEl = document.getElementById('view-ach-description');
    const statusEl = document.getElementById('view-ach-status');

    if (iconEl) iconEl.textContent = ach.icon || '🏆';
    if (titleEl) titleEl.textContent = ach.title || '';
    if (categoryEl) categoryEl.textContent = ach.category || 'Achievement';
    if (yearEl) yearEl.textContent = ach.year || 'N/A';
    if (issuerEl) issuerEl.textContent = ach.issuer || 'N/A';
    if (descriptionEl) descriptionEl.textContent = ach.description || 'No description provided';

    // Show verification status
    if (statusEl) {
        const statusBadge = getStatusBadge(ach.verification_status || 'verified');
        statusEl.innerHTML = statusBadge;
    }

    // Show certificate preview if exists
    const certificatePreview = document.getElementById('view-ach-certificate-preview');
    if (certificatePreview && ach.certificate_url) {
        certificatePreview.classList.remove('hidden');
        const fileExt = ach.certificate_url.split('.').pop().toLowerCase();
        if (fileExt === 'pdf') {
            certificatePreview.innerHTML = `
                <div class="text-center p-8 bg-gray-100 rounded-lg">
                    <p class="text-6xl mb-2">📄</p>
                    <p class="text-sm text-gray-600">PDF Document</p>
                </div>
                <button onclick="viewFullFile('${ach.certificate_url}')"
                    class="btn-secondary w-full mt-2">View Full File</button>
            `;
        } else {
            certificatePreview.innerHTML = `
                <img src="${ach.certificate_url}" alt="Certificate" class="w-full rounded-lg border-2">
                <button onclick="viewFullFile('${ach.certificate_url}')"
                    class="btn-secondary w-full mt-2">View Full File</button>
            `;
        }
    } else if (certificatePreview) {
        certificatePreview.classList.add('hidden');
    }

    // Hide edit/delete buttons (view-only mode)
    const editBtn = modal.querySelector('.edit-btn');
    const deleteBtn = modal.querySelector('.delete-btn');
    if (editBtn) editBtn.classList.add('hidden');
    if (deleteBtn) deleteBtn.classList.add('hidden');

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Open View Certification Modal (View-Only - No Edit/Delete)
 */
function openViewCertificationModal(cert) {
    const modal = document.getElementById('viewCertificationModal');
    if (!modal) {
        console.error('viewCertificationModal not found');
        return;
    }

    // Populate view-only fields
    const nameEl = document.getElementById('view-cert-name');
    const organizationEl = document.getElementById('view-cert-organization');
    const fieldEl = document.getElementById('view-cert-field');
    const issueDateEl = document.getElementById('view-cert-issue-date');
    const expiryDateEl = document.getElementById('view-cert-expiry-date');
    const credentialIdEl = document.getElementById('view-cert-credential-id');
    const descriptionEl = document.getElementById('view-cert-description');
    const statusEl = document.getElementById('view-cert-status');

    if (nameEl) nameEl.textContent = cert.name || '';
    if (organizationEl) organizationEl.textContent = cert.issuing_organization || '';
    if (fieldEl) fieldEl.textContent = cert.field_of_study || 'N/A';
    if (issueDateEl) {
        issueDateEl.textContent = cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'N/A';
    }
    if (expiryDateEl) {
        expiryDateEl.textContent = cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'No expiry';
    }
    if (credentialIdEl) credentialIdEl.textContent = cert.credential_id || 'N/A';
    if (descriptionEl) descriptionEl.textContent = cert.description || 'No description provided';

    // Show verification status
    if (statusEl) {
        const statusBadge = getStatusBadge(cert.verification_status || 'verified');
        statusEl.innerHTML = statusBadge;
    }

    // Show certificate preview if exists
    const certificatePreview = document.getElementById('view-cert-certificate-preview');
    if (certificatePreview && cert.certificate_image_url) {
        certificatePreview.classList.remove('hidden');
        const fileExt = cert.certificate_image_url.split('.').pop().toLowerCase();
        if (fileExt === 'pdf') {
            certificatePreview.innerHTML = `
                <div class="text-center p-8 bg-gray-100 rounded-lg">
                    <p class="text-6xl mb-2">📄</p>
                    <p class="text-sm text-gray-600">PDF Document</p>
                </div>
                <button onclick="viewFullFile('${cert.certificate_image_url}')"
                    class="btn-secondary w-full mt-2">View Full File</button>
            `;
        } else {
            certificatePreview.innerHTML = `
                <img src="${cert.certificate_image_url}" alt="Certificate" class="w-full rounded-lg border-2">
                <button onclick="viewFullFile('${cert.certificate_image_url}')"
                    class="btn-secondary w-full mt-2">View Full File</button>
            `;
        }
    } else if (certificatePreview) {
        certificatePreview.classList.add('hidden');
    }

    // Hide edit/delete buttons (view-only mode)
    const editBtn = modal.querySelector('.edit-btn');
    const deleteBtn = modal.querySelector('.delete-btn');
    if (editBtn) editBtn.classList.add('hidden');
    if (deleteBtn) deleteBtn.classList.add('hidden');

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Open View Experience Modal (View-Only - No Edit/Delete)
 */
function openViewExperienceModal(exp) {
    const modal = document.getElementById('viewExperienceModal');
    if (!modal) {
        console.error('viewExperienceModal not found');
        return;
    }

    // Populate view-only fields
    const jobTitleEl = document.getElementById('view-exp-job-title');
    const institutionEl = document.getElementById('view-exp-institution');
    const locationEl = document.getElementById('view-exp-location');
    const employmentTypeEl = document.getElementById('view-exp-employment-type');
    const startDateEl = document.getElementById('view-exp-start-date');
    const endDateEl = document.getElementById('view-exp-end-date');
    const descriptionEl = document.getElementById('view-exp-description');
    const responsibilitiesEl = document.getElementById('view-exp-responsibilities');
    const achievementsEl = document.getElementById('view-exp-achievements');
    const statusEl = document.getElementById('view-exp-status');

    if (jobTitleEl) jobTitleEl.textContent = exp.job_title || '';
    if (institutionEl) institutionEl.textContent = exp.institution || '';
    if (locationEl) locationEl.textContent = exp.location || 'N/A';
    if (employmentTypeEl) employmentTypeEl.textContent = exp.employment_type || 'N/A';
    if (startDateEl) {
        startDateEl.textContent = exp.start_date ? new Date(exp.start_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        }) : 'N/A';
    }
    if (endDateEl) {
        endDateEl.textContent = exp.is_current ? 'Present' : (exp.end_date ? new Date(exp.end_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        }) : 'N/A');
    }
    if (descriptionEl) descriptionEl.textContent = exp.description || 'No description provided';
    if (responsibilitiesEl) responsibilitiesEl.textContent = exp.responsibilities || 'None provided';
    if (achievementsEl) achievementsEl.textContent = exp.achievements || 'None provided';

    // Show verification status
    if (statusEl) {
        const statusBadge = getStatusBadge(exp.verification_status || 'verified');
        statusEl.innerHTML = statusBadge;
    }

    // Show certificate preview if exists
    const certificatePreview = document.getElementById('view-exp-certificate-preview');
    if (certificatePreview && exp.certificate_url) {
        certificatePreview.classList.remove('hidden');
        const fileExt = exp.certificate_url.split('.').pop().toLowerCase();
        if (fileExt === 'pdf') {
            certificatePreview.innerHTML = `
                <div class="text-center p-8 bg-gray-100 rounded-lg">
                    <p class="text-6xl mb-2">📄</p>
                    <p class="text-sm text-gray-600">PDF Document</p>
                </div>
                <button onclick="viewFullFile('${exp.certificate_url}')"
                    class="btn-secondary w-full mt-2">View Full File</button>
            `;
        } else {
            certificatePreview.innerHTML = `
                <img src="${exp.certificate_url}" alt="Certificate" class="w-full rounded-lg border-2">
                <button onclick="viewFullFile('${exp.certificate_url}')"
                    class="btn-secondary w-full mt-2">View Full File</button>
            `;
        }
    } else if (certificatePreview) {
        certificatePreview.classList.add('hidden');
    }

    // Hide edit/delete buttons (view-only mode)
    const editBtn = modal.querySelector('.edit-btn');
    const deleteBtn = modal.querySelector('.delete-btn');
    if (editBtn) editBtn.classList.add('hidden');
    if (deleteBtn) deleteBtn.classList.add('hidden');

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Close View Modal
 */
window.closeViewModal = function(type) {
    const modalId = `view${type.charAt(0).toUpperCase() + type.slice(1)}Modal`;
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
};

/**
 * View Full File in fullscreen
 */
window.viewFullFile = function(fileUrl) {
    let modal = document.getElementById('fullscreenFileModal');

    // Create fullscreen modal if it doesn't exist
    if (!modal) {
        const modalHtml = `
            <div id="fullscreenFileModal" class="fixed inset-0 z-[9999] hidden bg-black">
                <div class="relative w-full h-full">
                    <button onclick="closeFullscreenFile()"
                        class="absolute top-4 right-4 z-10 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-3 text-2xl">
                        ✕
                    </button>
                    <div id="fullscreenFileContent" class="w-full h-full flex items-center justify-center">
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = document.getElementById('fullscreenFileModal');
    }

    const fileContent = document.getElementById('fullscreenFileContent');
    const fileExt = fileUrl.split('.').pop().toLowerCase();

    if (fileExt === 'pdf') {
        fileContent.innerHTML = `<iframe src="${fileUrl}" class="w-full h-full"></iframe>`;
    } else {
        fileContent.innerHTML = `<img src="${fileUrl}" alt="File" class="max-w-full max-h-full object-contain">`;
    }

    modal.classList.remove('hidden');
};

/**
 * Close fullscreen file viewer
 */
window.closeFullscreenFile = function() {
    const modal = document.getElementById('fullscreenFileModal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

/**
 * Get status badge HTML
 */
function getStatusBadge(verificationStatus) {
    const statusColors = {
        'pending': 'bg-yellow-100 text-yellow-700',
        'verified': 'bg-green-100 text-green-700',
        'rejected': 'bg-red-100 text-red-700'
    };
    const statusText = {
        'pending': '⏳ Pending',
        'verified': '✓ Verified',
        'rejected': '✗ Rejected'
    };
    const colorClass = statusColors[verificationStatus] || statusColors['verified'];
    const text = statusText[verificationStatus] || statusText['verified'];
    return `<span class="${colorClass} px-3 py-1 rounded-full text-xs font-semibold">${text}</span>`;
}

// ============================================
// INITIALIZE ON PAGE LOAD
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Get tutor ID from URL parameter or use default
    const urlParams = new URLSearchParams(window.location.search);
    const tutorId = urlParams.get('id') || 1;  // Default to tutor ID 1 for testing
    const byUserId = urlParams.get('by_user_id') === 'true';  // Check if ID is user.id

    console.log(`🚀 Initializing View Tutor DB Loader for tutor ID: ${tutorId}, by_user_id: ${byUserId}`);

    const loader = new ViewTutorDBLoader(tutorId, byUserId);

    // Expose loader instance globally for modal functions
    window.viewTutorLoaderInstance = loader;

    loader.init();
});
