/**
 * View Tutor Profile Loader
 * Dynamically loads ALL tutor profile data from database based on URL parameter
 * Displays "None" for fields that haven't been filled yet
 */

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

class ViewTutorLoader {
    constructor() {
        this.tutorId = null;
        this.tutorData = null;
    }

    /**
     * Initialize the loader and fetch tutor data
     */
    async init() {
        // Get tutor ID from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.tutorId = urlParams.get('id');

        if (!this.tutorId) {
            this.showError('No tutor ID provided in URL');
            return;
        }

        // Show loading state
        this.showLoading();

        try {
            // Fetch tutor data from API
            await this.fetchTutorData();

            // Populate the profile header with data
            this.populateProfileHeader();

            // Hide loading state
            this.hideLoading();
        } catch (error) {
            console.error('Error loading tutor profile:', error);
            this.showError('Failed to load tutor profile. Please try again later.');
        }
    }

    /**
     * Fetch tutor data from the API
     */
    async fetchTutorData() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/tutor/${this.tutorId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Tutor not found');
                }
                throw new Error(`Failed to fetch tutor data: ${response.status}`);
            }

            this.tutorData = await response.json();
            console.log('✅ Loaded tutor data:', this.tutorData);

            // Store tutor data globally for message button
            window.currentTutorData = this.tutorData;
        } catch (error) {
            console.error('❌ Error fetching tutor data:', error);
            throw error;
        }
    }

    /**
     * Populate the profile header section with tutor data
     * ALL fields read from database, shows "None" if not filled
     */
    populateProfileHeader() {
        if (!this.tutorData) return;

        const data = this.tutorData;

        // Update profile avatar
        this.updateProfileAvatar(data);

        // Update cover image
        this.updateCoverImage(data);

        // Update tutor name
        this.updateTutorName(data);

        // Update hero title and subtitle
        this.updateHeroSection(data);

        // Update rating
        this.updateRating(data.rating, data.rating_count);

        // Update location and teaches at
        this.updateLocation(data.location, data.teaches_at);

        // Update profile info grid (teaches at, course type, languages, grade level)
        this.updateProfileInfoGrid(data);

        // Load courses and categories from courses table
        this.loadTutorCoursesAndCategories();

        // Update stats grid (followers, following, students, sessions)
        this.updateStatsGrid(data);

        // Update contact information (email, phone, experience)
        this.updateContactInfo(data);

        // Update badges based on verification and experience
        this.updateBadges(data);
    }

    /**
     * Update profile avatar
     */
    updateProfileAvatar(data) {
        const avatarImg = document.getElementById('profile-avatar');
        if (avatarImg) {
            if (data.profile_picture) {
                avatarImg.src = data.profile_picture;
            } else {
                // Set default avatar based on gender
                const defaultAvatar = data.gender === 'Female'
                    ? '../pictures/tutor-woman.jpg'
                    : '../pictures/tutor-male-young.jpg';
                avatarImg.src = defaultAvatar;
            }
            avatarImg.alt = `${data.first_name || 'Tutor'} ${data.father_name || ''}`;
        }
    }

    /**
     * Update cover image
     */
    updateCoverImage(data) {
        const coverImg = document.getElementById('cover-img');
        if (coverImg) {
            if (data.cover_image) {
                coverImg.src = data.cover_image;
            } else {
                // Keep default cover
                coverImg.src = '../pictures/tutor cover.jpg';
            }
        }
    }

    /**
     * Update tutor name
     */
    updateTutorName(data) {
        const nameElement = document.getElementById('tutorName');
        if (nameElement) {
            const firstName = data.first_name || 'Unknown';
            const fatherName = data.father_name || '';
            const tutorName = `${firstName} ${fatherName}`.trim();
            nameElement.textContent = tutorName || 'Tutor Profile';
        }
    }

    /**
     * Update hero section (title and subtitle)
     */
    updateHeroSection(data) {
        const heroTitle = document.getElementById('typedText');
        const heroSubtitle = document.getElementById('hero-subtitle');

        if (heroTitle) {
            // hero_titles is a JSONB array from tutor_profiles - use first title
            if (data.hero_titles && Array.isArray(data.hero_titles) && data.hero_titles.length > 0) {
                heroTitle.textContent = data.hero_titles[0];
            } else {
                heroTitle.textContent = 'Excellence in Education, Delivered with Passion';
            }
        }

        if (heroSubtitle) {
            // Use hero_subtitle from tutor_profiles
            if (data.hero_subtitle) {
                heroSubtitle.textContent = data.hero_subtitle;
            } else {
                heroSubtitle.textContent = 'Dedicated to helping students achieve their full potential';
            }
        }
    }

    /**
     * Update rating display with breakdown from database
     */
    updateRating(rating, ratingCount) {
        const ratingValue = document.querySelector('.rating-value');
        const ratingCountEl = document.querySelector('.rating-count');
        const ratingStars = document.querySelector('.rating-stars');

        if (ratingValue) {
            ratingValue.textContent = rating ? rating.toFixed(1) : '0.0';
        }

        if (ratingCountEl) {
            if (ratingCount && ratingCount > 0) {
                ratingCountEl.textContent = `(${ratingCount} reviews)`;
            } else {
                ratingCountEl.textContent = '(No reviews yet)';
            }
        }

        // Generate star display
        if (ratingStars) {
            if (rating && rating > 0) {
                const fullStars = Math.floor(rating);
                const hasHalfStar = rating % 1 >= 0.5;
                let starsHTML = '★'.repeat(fullStars);

                if (hasHalfStar && fullStars < 5) {
                    starsHTML += '☆';
                }

                const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
                starsHTML += '☆'.repeat(emptyStars);

                ratingStars.textContent = starsHTML;
            } else {
                ratingStars.textContent = '☆☆☆☆☆';
            }
        }

        // Update rating breakdown tooltip from database
        this.updateRatingBreakdown();
    }

    /**
     * Update rating breakdown tooltip with data from tutor_profiles.rating_breakdown
     */
    updateRatingBreakdown() {
        if (!this.tutorData || !this.tutorData.rating_breakdown) {
            console.log('No rating breakdown data available');
            return;
        }

        const breakdown = this.tutorData.rating_breakdown;

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

        console.log('✅ Rating breakdown updated from database:', breakdown);
    }

    /**
     * Update location and teaches at
     */
    updateLocation(location, teachesAt) {
        const locationEl = document.querySelector('.profile-location span:last-child');
        if (locationEl) {
            const locationText = [];
            if (location) locationText.push(location);
            if (teachesAt) locationText.push(teachesAt);

            if (locationText.length > 0) {
                locationEl.textContent = locationText.join(' | ');
            } else {
                locationEl.textContent = 'None';
            }
        }
    }

    /**
     * Update profile info grid (teaches at, course type, teaching methods, experience)
     * Shows "None" for fields not filled
     */
    updateProfileInfoGrid(data) {
        const infoGrid = document.querySelector('.profile-info-grid');
        if (!infoGrid) return;

        // Update "Teaches at"
        const teachesAtDiv = infoGrid.querySelector('div:nth-child(1) div:last-child div:last-child');
        if (teachesAtDiv) {
            teachesAtDiv.textContent = data.teaches_at || 'None';
        }

        // Update "Course Type" - read from course_type field or map from sessionFormat
        const courseTypeDiv = infoGrid.querySelector('div:nth-child(2) div:last-child div:last-child');
        if (courseTypeDiv) {
            if (data.course_type) {
                courseTypeDiv.textContent = data.course_type;
            } else if (data.sessionFormat) {
                // Map sessionFormat to course type display
                const courseTypeMap = {
                    'Online': 'Professional',
                    'In-person': 'Academic',
                    'Hybrid': 'Academic & Professional',
                    'Self-paced': 'Professional'
                };
                courseTypeDiv.textContent = courseTypeMap[data.sessionFormat] || data.sessionFormat;
            } else {
                courseTypeDiv.textContent = 'None';
            }
        }

        // Update "Experience" - read from teaching_experience or experience field
        const experienceDiv = infoGrid.querySelector('div:nth-child(4) div:last-child div:last-child');
        if (experienceDiv) {
            const experience = data.teaching_experience || data.experience;
            experienceDiv.textContent = experience || 'None';
        }

        // Update Languages in profile-subjects-methods-grid
        this.updateSubjectsLanguagesGrades(data);

        // Load Teaching Methods and Grade Levels from packages/courses
        this.loadTeachingMethodsAndGradeLevels();
    }

    /**
     * Load teaching methods from packages and grade levels from courses table
     * Teaching Methods: Read from tutor_packages.session_format
     * Grade Levels: Read from courses table via packages' course_ids
     */
    async loadTeachingMethodsAndGradeLevels() {
        const teachingMethodValue = document.getElementById('teaching-methods-inline');
        const gradeLevelValue = document.getElementById('tutor-grade-level');

        // Show loading state
        if (teachingMethodValue) teachingMethodValue.textContent = 'Loading...';
        if (gradeLevelValue) gradeLevelValue.textContent = 'Loading...';

        try {
            if (!this.tutorId) {
                console.warn('⚠️ No tutor ID available for fetching teaching methods');
                if (teachingMethodValue) teachingMethodValue.textContent = 'Not specified';
                if (gradeLevelValue) gradeLevelValue.textContent = 'Not specified';
                return;
            }

            // Fetch profile summary from the API endpoint
            const response = await fetch(`${API_BASE_URL}/api/tutor/profile-summary/${this.tutorId}`);

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
    }

    /**
     * Load tutor courses and categories from the courses table via API
     * Updates #tutor-courses and #tutor-course-category elements
     */
    async loadTutorCoursesAndCategories() {
        const coursesContainer = document.getElementById('tutor-courses');
        const categoryContainer = document.getElementById('tutor-course-category');

        // Show loading state
        if (coursesContainer) coursesContainer.textContent = 'Loading...';
        if (categoryContainer) categoryContainer.textContent = 'Loading...';

        try {
            if (!this.tutorId) {
                console.warn('⚠️ No tutor ID available for fetching courses');
                if (coursesContainer) coursesContainer.textContent = 'Not specified';
                if (categoryContainer) categoryContainer.textContent = 'Not specified';
                return;
            }

            // Fetch courses from the courses table via API
            const response = await fetch(`${API_BASE_URL}/api/course-management/tutor/${this.tutorId}/courses`);

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
    }

    /**
     * Update subjects, languages, and grade levels in profile-subjects-methods-grid
     */
    updateSubjectsLanguagesGrades(data) {
        // Update Languages
        const languagesContainer = document.querySelector('.profile-languages-container');
        if (languagesContainer) {
            const languages = data.languages || [];
            const languageArray = Array.isArray(languages) ? languages : (languages ? [languages] : []);

            if (languageArray.length === 0) {
                languagesContainer.innerHTML = `
                    <div style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-style: italic; font-size: 0.8125rem;">
                        No languages listed
                    </div>
                `;
            } else {
                languagesContainer.innerHTML = languageArray.map(lang => `
                    <span class="language-tag" style="padding: 0.4rem 0.875rem; background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15)); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 16px; font-size: 0.8125rem; font-weight: 600; color: var(--heading); display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.3s ease; white-space: nowrap;">
                        ${lang}
                    </span>
                `).join('');
            }
        }

        // Update Grade Levels
        const gradesContainer = document.querySelector('.profile-grades-container');
        if (gradesContainer) {
            const grades = data.grades || [];
            const gradeArray = Array.isArray(grades) ? grades : (grades ? [grades] : []);

            if (gradeArray.length === 0) {
                gradesContainer.innerHTML = `
                    <div style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-style: italic; font-size: 0.8125rem;">
                        No grade levels listed
                    </div>
                `;
            } else {
                gradesContainer.innerHTML = gradeArray.map(grade => `
                    <span class="grade-tag" style="padding: 0.4rem 0.875rem; background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 146, 60, 0.15)); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 16px; font-size: 0.8125rem; font-weight: 600; color: var(--heading); display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.3s ease; white-space: nowrap;">
                        ${grade}
                    </span>
                `).join('');
            }
        }
    }

    /**
     * Update stats grid (followers, following, students, sessions)
     * Shows "0" for fields not filled
     */
    updateStatsGrid(data) {
        const statsGrid = document.querySelector('.stats-grid');
        if (!statsGrid) return;

        // Update Followers count
        const followersDiv = statsGrid.querySelector('div:nth-child(1) div:first-child');
        if (followersDiv) {
            const followers = data.total_followers || 0;
            followersDiv.textContent = this.formatNumber(followers);
        }

        // Update Following count
        const followingDiv = statsGrid.querySelector('div:nth-child(2) div:first-child');
        if (followingDiv) {
            const following = data.total_following || 0;
            followingDiv.textContent = this.formatNumber(following);
        }

        // Update Students count
        const studentsDiv = statsGrid.querySelector('div:nth-child(3) div:first-child');
        if (studentsDiv) {
            const students = data.total_students || 0;
            studentsDiv.textContent = this.formatNumber(students);
        }

        // Update Sessions count
        const sessionsDiv = statsGrid.querySelector('div:nth-child(4) div:first-child');
        if (sessionsDiv) {
            const sessions = data.total_sessions || 0;
            sessionsDiv.textContent = this.formatNumber(sessions);
        }
    }

    /**
     * Update contact information (email, phone, experience)
     * Shows "None" for fields not filled, hides if all empty
     */
    updateContactInfo(data) {
        const contactInfo = document.querySelector('.profile-contact-info');
        if (!contactInfo) return;

        // Clear existing contact info
        contactInfo.innerHTML = '';

        // Add email if available
        if (data.email) {
            const emailDiv = this.createContactItem('📧', data.email, 'rgba(59,130,246,0.1)');
            contactInfo.appendChild(emailDiv);
        }

        // Add phone if available
        if (data.phone) {
            const phoneDiv = this.createContactItem('📱', data.phone, 'rgba(34,197,94,0.1)');
            contactInfo.appendChild(phoneDiv);
        }

        // Add experience if available
        if (data.experience) {
            const expDiv = this.createContactItem('🎓', data.experience, 'rgba(168,85,247,0.1)');
            contactInfo.appendChild(expDiv);
        }

        // If no contact info, show placeholder
        if (contactInfo.children.length === 0) {
            const noneDiv = document.createElement('div');
            noneDiv.style.cssText = `
                padding: 0.75rem 1rem;
                background: rgba(128,128,128,0.1);
                border-radius: 10px;
                color: var(--text-secondary);
                font-size: 0.875rem;
                font-style: italic;
            `;
            noneDiv.textContent = 'Contact information not provided';
            contactInfo.appendChild(noneDiv);
        }
    }

    /**
     * Create a contact info item
     */
    createContactItem(icon, text, bgColor) {
        const div = document.createElement('div');
        div.style.cssText = `
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 0.75rem;
            background: ${bgColor};
            border-radius: 10px;
        `;

        const iconSpan = document.createElement('span');
        iconSpan.style.fontSize = '1rem';
        iconSpan.textContent = icon;

        const textSpan = document.createElement('span');
        textSpan.style.cssText = 'color: var(--text); font-size: 0.875rem;';
        textSpan.textContent = text;

        div.appendChild(iconSpan);
        div.appendChild(textSpan);

        return div;
    }

    /**
     * Update badges based on tutor data
     */
    updateBadges(data) {
        const badgesRow = document.querySelector('.badges-row');
        if (!badgesRow) return;

        // Clear existing badges
        badgesRow.innerHTML = '';

        // Add Verified badge if verified
        if (data.is_verified) {
            const verifiedBadge = this.createBadge('✔ Verified Tutor', '#22c55e', '#16a34a');
            badgesRow.appendChild(verifiedBadge);
        }

        // Add Elite badge if rating is high
        if (data.rating && data.rating >= 4.8) {
            const eliteBadge = this.createBadge('🏆 Elite Tutor', '#8b5cf6', '#7c3aed');
            badgesRow.appendChild(eliteBadge);
        }

        // Add Experience badge if experience data exists
        if (data.experience) {
            const expBadge = this.createBadge(`📚 ${data.experience}`, '#3b82f6', '#2563eb');
            badgesRow.appendChild(expBadge);
        }

        // If no badges, add a default one
        if (badgesRow.children.length === 0) {
            const defaultBadge = this.createBadge('👤 Tutor', '#6b7280', '#4b5563');
            badgesRow.appendChild(defaultBadge);
        }
    }

    /**
     * Create a badge element
     */
    createBadge(text, color1, color2) {
        const badge = document.createElement('span');
        badge.className = 'profile-badge';
        badge.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 600;
            background: linear-gradient(135deg, ${color1} 0%, ${color2} 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(${this.hexToRgb(color1)}, 0.3);
        `;
        badge.textContent = text;
        return badge;
    }

    /**
     * Convert hex color to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
            : '0, 0, 0';
    }

    /**
     * Format number with K/M suffix
     */
    formatNumber(num) {
        if (!num || num === 0) return '0';

        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    /**
     * Show loading state
     */
    showLoading() {
        const profileHeader = document.querySelector('.profile-header-section');
        if (profileHeader) {
            profileHeader.style.opacity = '0.5';
            profileHeader.style.pointerEvents = 'none';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const profileHeader = document.querySelector('.profile-header-section');
        if (profileHeader) {
            profileHeader.style.opacity = '1';
            profileHeader.style.pointerEvents = 'auto';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const profileHeader = document.querySelector('.profile-header-section');
        if (profileHeader) {
            profileHeader.innerHTML = `
                <div style="padding: 3rem; text-align: center; background: var(--card-bg); border-radius: 20px; margin: 2rem 0;">
                    <svg style="width: 80px; height: 80px; margin: 0 auto 1rem; color: var(--error, #ef4444);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--heading);">Error Loading Profile</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">${message}</p>
                    <button onclick="window.history.back()" style="padding: 0.75rem 1.5rem; background: var(--button-bg); color: var(--button-text); border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        Go Back
                    </button>
                </div>
            `;
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const loader = new ViewTutorLoader();
    loader.init();
});
