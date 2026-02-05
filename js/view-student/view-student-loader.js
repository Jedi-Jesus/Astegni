/**
 * View Student Profile Loader
 * Dynamically loads ALL student profile data from database based on URL parameter
 * Displays "None" for fields that haven't been filled yet
 */

// API_BASE_URL is already defined in view-student-reviews.js

class ViewStudentLoader {
    constructor() {
        this.studentId = null;
        this.studentData = null;
    }

    /**
     * Initialize the loader and fetch student data
     */
    async init() {
        // Get student ID from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        this.studentId = urlParams.get('id');
        this.byUserId = urlParams.get('by_user_id') === 'true';  // Check if ID is user.id

        if (!this.studentId) {
            this.showError('No student ID provided in URL');
            return;
        }

        // Show loading state
        this.showLoading();

        try {
            // Fetch student data from API
            await this.fetchStudentData();

            // Populate the profile header with data
            this.populateProfileHeader();

            // Initialize student documents with profile_id (student_profiles.id)
            if (typeof window.initializeStudentDocuments === 'function' && this.studentData.id) {
                await window.initializeStudentDocuments(this.studentData.id);
                console.log('✅ Initialized student documents for profile_id:', this.studentData.id);
            }

            // Initialize student credentials with profile_id (for achievements, certifications, extracurricular)
            // The API endpoint /api/view-student/{profile_id}/credentials expects student_profiles.id
            // credentials.uploader_id = student_profiles.id (NOT user_id)
            if (typeof window.initializeStudentCredentials === 'function' && this.studentData.id) {
                await window.initializeStudentCredentials(this.studentData.id);
                console.log('✅ Initialized student credentials for profile_id:', this.studentData.id);
            }

            // Initialize student parents with profile_id (reads from student_profiles.parent_id[])
            // The API endpoint /api/view-student/{profile_id}/parents expects student_profiles.id
            if (typeof window.initializeStudentParents === 'function' && this.studentData.id) {
                await window.initializeStudentParents(this.studentData.id);
                console.log('✅ Initialized student parents for profile_id:', this.studentData.id);
            }

            // Initialize student blogs with profile_id (student_id)
            if (typeof window.loadStudentBlogs === 'function' && this.studentData.id) {
                await window.loadStudentBlogs(this.studentData.id);
                console.log('✅ Initialized student blogs for student profile_id:', this.studentData.id);
            }

            // Initialize student clubs with student_id
            if (typeof window.loadStudentClubs === 'function' && this.studentData.id) {
                await window.loadStudentClubs(this.studentData.id);
                console.log('✅ Initialized student clubs for student_id:', this.studentData.id);
            }

            // Initialize student events with student_id
            if (typeof window.loadStudentEvents === 'function' && this.studentData.id) {
                await window.loadStudentEvents(this.studentData.id);
                console.log('✅ Initialized student events for student_id:', this.studentData.id);
            }

            // Initialize student reviews with student_id (behavioral notes panel)
            if (typeof window.loadStudentReviews === 'function' && this.studentData.id) {
                await window.loadStudentReviews(this.studentData.id);
                console.log('✅ Initialized student reviews for student_id:', this.studentData.id);
            }

            // Initialize recent feedback with student_id (dashboard panel)
            if (typeof window.loadRecentFeedback === 'function' && this.studentData.id) {
                await window.loadRecentFeedback(this.studentData.id);
                console.log('✅ Initialized recent feedback for student_id:', this.studentData.id);
            }

            // Store student data globally for connect and message buttons
            window.currentStudentUserId = this.studentData.user_id;
            window.currentStudentData = this.studentData;

            // Initialize interested ticker widget
            if (typeof window.interestedTickerManager !== 'undefined' && window.interestedTickerManager) {
                window.interestedTickerManager.init(this.studentData);
                console.log('✅ Initialized interested ticker widget');
            }

            // Hide loading state
            this.hideLoading();
        } catch (error) {
            console.error('Error loading student profile:', error);
            this.showError('Failed to load student profile. Please try again later.');
        }
    }

    /**
     * Fetch student data from the API
     */
    async fetchStudentData() {
        try {
            // Build URL with by_user_id parameter if needed
            const url = this.byUserId
                ? `${API_BASE_URL}/api/student/${this.studentId}?by_user_id=true`
                : `${API_BASE_URL}/api/student/${this.studentId}`;

            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Student not found');
                }
                throw new Error(`Failed to fetch student data: ${response.status}`);
            }

            this.studentData = await response.json();
            console.log('✅ Loaded student data:', this.studentData);
        } catch (error) {
            console.error('❌ Error fetching student data:', error);
            throw error;
        }
    }

    /**
     * Populate the profile header section with student data
     * ALL fields read from database, shows "None" if not filled
     */
    populateProfileHeader() {
        if (!this.studentData) return;

        const data = this.studentData;

        // Update profile avatar
        this.updateProfileAvatar(data);

        // Update cover image
        this.updateCoverImage(data);

        // Update hero section
        this.updateHeroSection(data);

        // Update student name
        this.updateStudentName(data);

        // Update rating
        this.updateRating(data.rating, data.rating_count);

        // Update gender
        this.updateGender(data.gender);

        // Update location
        this.updateLocation(data.location);

        // Update badges
        this.updateBadges(data);

        // Update profile info grid (grade level, school, subjects, languages)
        this.updateProfileInfoGrid(data);

        // Update compact info row (gender, location, languages, hobbies)
        this.updateCompactInfoRow(data);

        // Update social links
        this.populateSocialLinks(data.social_links || {});

        // Update bio/quote
        this.updateBioQuote(data);
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
                    ? '../uploads/system_images/system_profile_pictures/student-college-girl.jpg'
                    : '../uploads/system_images/system_profile_pictures/student-college-boy.jpg';
                avatarImg.src = defaultAvatar;
            }
            avatarImg.alt = `${data.first_name || 'Student'} ${data.father_name || ''}`;
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
                coverImg.src = '../uploads/system_images/system_cover_pictures/students cover.jpeg';
            }
        }
    }

    /**
     * Update hero section - Read from student_profiles table
     * Uses hero_title and hero_subtitle arrays from database
     */
    updateHeroSection(data) {
        // Update hero title (with typing effect)
        const heroTitleElement = document.getElementById('typedText');
        if (heroTitleElement) {
            let heroTitle = 'Student Academic Profile'; // Default

            // Check if hero_title exists and is an array with data
            if (data.hero_title && Array.isArray(data.hero_title) && data.hero_title.length > 0) {
                // Use first title from array (can be enhanced for cycling through multiple titles)
                heroTitle = data.hero_title[0];
            }

            heroTitleElement.textContent = heroTitle;
        }

        // Update hero subtitle
        const heroSubtitleElement = document.getElementById('hero-subtitle');
        if (heroSubtitleElement) {
            let heroSubtitle = "Comprehensive view of student's academic journey and achievements"; // Default

            // Check if hero_subtitle exists and is an array with data
            if (data.hero_subtitle && Array.isArray(data.hero_subtitle) && data.hero_subtitle.length > 0) {
                // Use first subtitle from array (can be enhanced for cycling through multiple subtitles)
                heroSubtitle = data.hero_subtitle[0];
            }

            heroSubtitleElement.textContent = heroSubtitle;
        }
    }

    /**
     * Update student name
     * Uses the 'name' field which intelligently handles both Ethiopian and International naming conventions
     * Falls back to username if name is not available
     */
    updateStudentName(data) {
        const nameElement = document.getElementById('studentName');
        if (nameElement) {
            // Prefer 'name' field built by backend based on naming convention
            // International: first_name + last_name
            // Ethiopian: first_name + father_name + grandfather_name
            // Fallback: username from student_profiles table
            let displayName = data.name || 'Student Profile';
            if (!data.name && data.username) {
                displayName = String(data.username).replace(/[\n\r]/g, ' ').trim();
            }
            nameElement.textContent = displayName;
        }
    }

    /**
     * Update rating display
     */
    updateRating(rating, ratingCount) {
        const ratingValue = document.getElementById('student-rating');
        const ratingCountEl = document.getElementById('rating-count');
        const ratingStars = document.getElementById('rating-stars');

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
    }

    /**
     * Update gender
     */
    updateGender(gender) {
        const genderEl = document.getElementById('student-gender');
        if (genderEl) {
            genderEl.textContent = gender || 'Not specified';
        }
    }

    /**
     * Update location
     */
    updateLocation(location) {
        const locationEl = document.getElementById('student-location');
        if (locationEl) {
            locationEl.textContent = location || 'Not specified';
        }
    }

    /**
     * Update badges based on student data
     */
    updateBadges(data) {
        const badgesRow = document.querySelector('.badges-row');
        if (!badgesRow) return;

        // Clear existing badges
        badgesRow.innerHTML = '';

        // Verified Student badge
        const verifiedBadge = this.createBadge('✔ Verified Student', '#22c55e', '#16a34a');
        badgesRow.appendChild(verifiedBadge);

        // Grade level badge
        if (data.grade_level) {
            const gradeBadge = this.createBadge(`📚 ${data.grade_level}`, '#3b82f6', '#2563eb');
            badgesRow.appendChild(gradeBadge);
        } else {
            const gradeBadge = this.createBadge('📚 Grade: None', '#6b7280', '#4b5563');
            badgesRow.appendChild(gradeBadge);
        }

        // Honor Roll badge if rating is high
        if (data.rating && data.rating >= 4.5) {
            const honorBadge = this.createBadge('⭐ Honor Roll Student', '#f59e0b', '#d97706');
            badgesRow.appendChild(honorBadge);
        }
    }

    /**
     * Update profile info grid (grade level, school, subjects, languages)
     * Shows "None" for fields not filled
     */
    updateProfileInfoGrid(data) {
        // Try to find the profile info grid - it might be in different sections
        const profileContent = document.querySelector('.profile-header-section');
        if (!profileContent) return;

        // Update grade level if element exists
        const gradeElements = profileContent.querySelectorAll('[id*="grade"], [class*="grade"]');
        gradeElements.forEach(el => {
            if (el.id === 'subject-badge' || el.classList.contains('profile-badge')) {
                // Update grade badge
                if (data.grade_level) {
                    el.innerHTML = `📚 ${data.grade_level}`;
                } else {
                    el.innerHTML = '📚 Grade: None';
                }
            }
        });

        // Update grade level value (reads from student_profiles.grade_level)
        const gradeValue = document.getElementById('student-grade');
        if (gradeValue) {
            gradeValue.textContent = data.grade_level || 'None';
        }

        // Update school name value (reads from student_profiles.studying_at)
        const schoolValue = document.getElementById('student-school');
        if (schoolValue) {
            schoolValue.textContent = data.studying_at || 'None';
        }

        // Update interested in subjects (reads from student_profiles.interested_in array)
        const subjectsValue = document.getElementById('interested-in');
        if (subjectsValue) {
            if (data.interested_in && Array.isArray(data.interested_in) && data.interested_in.length > 0) {
                subjectsValue.textContent = data.interested_in.join(', ');
            } else {
                subjectsValue.textContent = 'None';
            }
        }

        // Update learning methods (reads from student_profiles.learning_method array)
        const learningMethodsValue = document.getElementById('student-learning-methods');
        if (learningMethodsValue) {
            if (data.learning_method && Array.isArray(data.learning_method) && data.learning_method.length > 0) {
                learningMethodsValue.textContent = data.learning_method.join(', ');
            } else {
                learningMethodsValue.textContent = 'None';
            }
        }

        // Update languages section (reads from student_profiles.languages array)
        const languagesContainer = document.getElementById('student-languages');
        if (languagesContainer) {
            if (data.languages && Array.isArray(data.languages) && data.languages.length > 0) {
                // Create language badges
                languagesContainer.innerHTML = data.languages.map((lang, index) => {
                    const colors = [
                        'rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05)',  // Blue
                        'rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05)',  // Green
                        'rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05)',  // Orange
                        'rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.05)', // Purple
                        'rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)'    // Red
                    ];
                    const colorIndex = index % colors.length;
                    return `<span style="padding: 0.5rem 1rem; background: linear-gradient(135deg, ${colors[colorIndex]}); border-radius: 20px; font-size: 0.875rem; font-weight: 500; color: var(--text);">${lang}</span>`;
                }).join('');
            } else {
                // Default languages if none provided
                languagesContainer.innerHTML = `
                    <span style="padding: 0.5rem 1rem; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05)); border-radius: 20px; font-size: 0.875rem; font-weight: 500; color: var(--text);">English</span>
                    <span style="padding: 0.5rem 1rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05)); border-radius: 20px; font-size: 0.875rem; font-weight: 500; color: var(--text);">Amharic</span>
                `;
            }
        }

        // Update location if displayed
        const locationElements = profileContent.querySelectorAll('[id*="location"]');
        locationElements.forEach(el => {
            if (!el.classList.contains('profile-location')) {
                el.textContent = data.location || 'None';
            }
        });
    }

    /**
     * Update compact info row (Languages and Hobbies only)
     * Shows data in a 2-column row
     * Note: Gender and Location are updated separately in their own row
     */
    updateCompactInfoRow(data) {
        // Update languages in compact row (comma-separated)
        const languagesCompact = document.getElementById('student-languages-compact');
        if (languagesCompact) {
            if (data.languages && Array.isArray(data.languages) && data.languages.length > 0) {
                languagesCompact.textContent = data.languages.join(', ');
            } else {
                languagesCompact.textContent = 'None';
            }
        }

        // Update hobbies in compact row (comma-separated, max 2-3 items)
        const hobbiesCompact = document.getElementById('student-hobbies-compact');
        if (hobbiesCompact) {
            if (data.hobbies && Array.isArray(data.hobbies) && data.hobbies.length > 0) {
                // Show first 2 hobbies in compact view
                const compactHobbies = data.hobbies.slice(0, 2).join(', ');
                const moreCount = data.hobbies.length > 2 ? ` +${data.hobbies.length - 2}` : '';
                hobbiesCompact.textContent = compactHobbies + moreCount;
            } else {
                hobbiesCompact.textContent = 'None';
            }
        }

        // Update hobbies full list with badges
        const hobbiesFull = document.getElementById('student-hobbies-full');
        if (hobbiesFull) {
            if (data.hobbies && Array.isArray(data.hobbies) && data.hobbies.length > 0) {
                // Create hobby badges with different colors
                hobbiesFull.innerHTML = data.hobbies.map((hobby, index) => {
                    const colors = [
                        'rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.05)',  // Purple
                        'rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05)',    // Green
                        'rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05)',    // Orange
                        'rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.05)',   // Violet
                        'rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05)',     // Red
                        'rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.05)'      // Emerald
                    ];
                    const colorIndex = index % colors.length;
                    return `<span style="padding: 0.5rem 1rem; background: linear-gradient(135deg, ${colors[colorIndex]}); border-radius: 20px; font-size: 0.875rem; font-weight: 500; color: var(--text);">${hobby}</span>`;
                }).join('');
            } else {
                // Default hobbies if none provided
                hobbiesFull.innerHTML = `
                    <span style="padding: 0.5rem 1rem; background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.05)); border-radius: 20px; font-size: 0.875rem; font-weight: 500; color: var(--text);">Reading</span>
                    <span style="padding: 0.5rem 1rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.05)); border-radius: 20px; font-size: 0.875rem; font-weight: 500; color: var(--text);">Sports</span>
                `;
            }
        }
    }

    /**
     * Update bio/quote section
     */
    updateBioQuote(data) {
        // Update bio if element exists
        const bioElement = document.getElementById('student-bio');
        if (bioElement) {
            bioElement.textContent = data.about || data.bio || 'No bio provided yet.';
        }

        // Update quote if element exists
        const quoteElement = document.getElementById('student-quote');
        if (quoteElement) {
            // Handle quote as array or string
            let quoteText = 'No quote provided yet.';
            if (data.quote) {
                if (Array.isArray(data.quote) && data.quote.length > 0) {
                    quoteText = `"${data.quote[0]}"`;
                } else if (typeof data.quote === 'string') {
                    quoteText = `"${data.quote}"`;
                }
            }
            quoteElement.textContent = quoteText;
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
     * Populate social links
     */
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
    const loader = new ViewStudentLoader();
    loader.init();
});
