// ============================================
// TUTOR PROFILE CONTROLLER
// Main controller coordinating all modules
// ============================================

const TutorProfileController = {
    // Initialize the controller
    async init() {
        console.log('🚀 Initializing Tutor Profile Controller...');

        try {
            // Load state from storage
            TutorProfileState.loadFromStorage();

            // Initialize UI
            TutorProfileUI.init();

            // Initialize modal manager
            TutorModalManager.init();

            // Initialize upload handler
            TutorUploadHandler.init();

            // Check authentication
            const isAuthenticated = await this.checkAuthentication();

            if (!isAuthenticated) {
                console.log('User not authenticated');
                this.handleUnauthenticated();
                return;
            }

            // Load profile data
            await this.loadProfileData();

            // Setup event listeners
            this.setupEventListeners();

            console.log('✅ Tutor Profile initialized successfully');
        } catch (error) {
            console.error('Error initializing tutor profile:', error);
            TutorProfileUI.showNotification('Failed to initialize profile', 'error');
        }
    },

    // Check if user is authenticated
    async checkAuthentication() {
        const token = TutorProfileState.getToken();

        if (!token) {
            return false;
        }

        try {
            const user = await TutorProfileAPI.getCurrentUser();

            if (!user) {
                // Clear invalid token
                TutorProfileState.setToken(null);
                return false;
            }

            // Check if user has tutor role
            if (!user.roles || !user.roles.includes('tutor')) {
                TutorProfileUI.showNotification('You need tutor role to access this page', 'error');
                return false;
            }

            TutorProfileState.setCurrentUser(user);
            return true;
        } catch (error) {
            console.error('Authentication check failed:', error);
            return false;
        }
    },

    // Handle unauthenticated state
    handleUnauthenticated() {
        // Show auth modal or redirect to login
        const authModal = document.getElementById('authModal');
        if (authModal && typeof TutorModalManager !== 'undefined') {
            TutorModalManager.open('authModal');
        } else {
            // Redirect to home page
            window.location.href = '../index.html';
        }
    },

    // Load all profile data
    async loadProfileData() {
        try {
            // Load tutor profile
            const profile = await TutorProfileAPI.getTutorProfile();

            if (!profile) {
                // Create empty profile for new tutors
                this.createEmptyProfile();
            } else {
                TutorProfileState.setTutorProfile(profile);
                TutorProfileUI.displayProfile(profile);
            }

            // Load additional data in parallel
            await Promise.all([
                this.loadVideos(),
                this.loadBlogPosts(),
                this.loadSessionRequests(),
                this.loadConfirmedStudents(),
                this.loadConnections()
            ]);
        } catch (error) {
            console.error('Error loading profile data:', error);
            TutorProfileUI.showNotification('Failed to load profile data', 'error');
        }
    },

    // Create empty profile for new tutors
    createEmptyProfile() {
        const user = TutorProfileState.getCurrentUser();

        const emptyProfile = {
            id: user?.id || null,
            name: user?.name || 'Your Name',
            email: user?.email || '',
            bio: '',
            specialization: '',
            experienceYears: 0,
            hourlyRate: 0,
            rating: 0,
            totalStudents: 0,
            totalSessions: 0,
            totalHours: 0,
            subjects: [],
            locations: [],
            teachingMethods: [],
            certifications: [],
            experiences: [],
            achievements: [],
            profilePicture: '../uploads/system_images/system_profile_pictures/tutor-.jpg',
            coverPhoto: '../uploads/system_images/system_cover_pictures/tutor cover.png'
        };

        TutorProfileState.setTutorProfile(emptyProfile);
        TutorProfileUI.displayProfile(emptyProfile);
    },

    // Load videos
    async loadVideos() {
        try {
            const videos = await TutorProfileAPI.getTutorVideos();
            TutorProfileState.setVideos(videos);
            TutorProfileUI.displayVideos(videos);
        } catch (error) {
            console.error('Error loading videos:', error);
        }
    },

    // Load blog posts
    async loadBlogPosts(filter = 'all') {
        try {
            const posts = await TutorProfileAPI.getBlogPosts(filter);
            TutorProfileState.setBlogPosts(posts);
            TutorProfileUI.displayBlogPosts(posts, filter);
        } catch (error) {
            console.error('Error loading blog posts:', error);
        }
    },

    // Load session requests
    async loadSessionRequests() {
        try {
            const requests = await TutorProfileAPI.getSessionRequests();
            TutorProfileState.setRequestedSessions(requests);
            TutorProfileUI.displayRequestedSessions(requests);
        } catch (error) {
            console.error('Error loading session requests:', error);
        }
    },

    // Load confirmed students
    async loadConfirmedStudents() {
        try {
            const students = await TutorProfileAPI.getConfirmedStudents();
            TutorProfileState.setConfirmedStudents(students);
            TutorProfileUI.displayConfirmedStudents(students);
        } catch (error) {
            console.error('Error loading confirmed students:', error);
        }
    },

    // Load connections
    async loadConnections(filter = 'all') {
        try {
            const connections = await TutorProfileAPI.getConnections(filter);
            TutorProfileState.setConnections(connections);
            TutorProfileUI.displayConnections(connections, filter);
        } catch (error) {
            console.error('Error loading connections:', error);
        }
    },

    // Save profile
    async saveProfile(profileData) {
        try {
            // Save to backend
            const result = await TutorProfileAPI.updateTutorProfile(profileData);
            console.log('Save result:', result);

            // Reload complete profile from backend to get updated values
            const updatedProfile = await TutorProfileAPI.getTutorProfile();
            if (updatedProfile) {
                TutorProfileState.setTutorProfile(updatedProfile);
                TutorProfileUI.displayProfile(updatedProfile);

                // Immediately update all profile sections with new data
                this.updateProfileHeaderImmediate(updatedProfile);
            }

            // Close modal and show success message
            closeEditProfileModal(); // Use the global function to ensure modal closes
            TutorProfileUI.showNotification('Profile updated successfully!', 'success');

            // Reload the entire profile to show updated name and all fields without page reload
            // Call the inline loadProfileHeaderData() function instead of dead TutorProfileDataLoader
            if (typeof loadProfileHeaderData === 'function') {
                await loadProfileHeaderData();
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            TutorProfileUI.showNotification('Failed to update profile', 'error');
        }
    },

    // Immediately update profile header sections after save (no page reload needed)
    updateProfileHeaderImmediate(profile) {
        // Update hero section
        if (profile.hero_title) {
            const typedText = document.getElementById('typedText');
            if (typedText) typedText.textContent = profile.hero_title;
        }
        if (profile.hero_subtitle) {
            const heroSubtitle = document.getElementById('hero-subtitle');
            if (heroSubtitle) heroSubtitle.textContent = profile.hero_subtitle;
        }

        // Update profile name in header - SHOW USERNAME, not full name
        if (profile.username) {
            const tutorName = document.getElementById('tutorName');
            if (tutorName) tutorName.textContent = profile.username;

            const profileName = document.querySelector('.profile-name');
            if (profileName) profileName.textContent = profile.username;
        }

        // Update bio
        if (profile.bio) {
            const tutorBio = document.getElementById('tutor-bio');
            if (tutorBio) tutorBio.textContent = profile.bio;
        }

        // Update quote
        if (profile.quote) {
            const tutorQuote = document.getElementById('tutor-quote');
            if (tutorQuote) tutorQuote.textContent = profile.quote;
        }

        // Update location
        if (profile.location) {
            const tutorLocation = document.getElementById('tutor-location');
            if (tutorLocation) tutorLocation.textContent = profile.location;
        }

        // Update teaches at
        const teachesAtContainer = document.getElementById('teaches-at-container');
        if (profile.teaches_at) {
            const tutorTeachesAt = document.getElementById('tutor-teaches-at');
            if (tutorTeachesAt) tutorTeachesAt.textContent = profile.teaches_at;
            if (teachesAtContainer) teachesAtContainer.style.display = 'flex';
        } else {
            if (teachesAtContainer) teachesAtContainer.style.display = 'none';
        }

        // Update session format / teaching method
        const teachingMethodContainer = document.getElementById('teaching-method-container');
        if (profile.sessionFormat) {
            const tutorTeachingMethod = document.getElementById('tutor-teaching-method');
            if (tutorTeachingMethod) tutorTeachingMethod.textContent = profile.sessionFormat;
            if (teachingMethodContainer) teachingMethodContainer.style.display = 'flex';
        } else {
            if (teachingMethodContainer) teachingMethodContainer.style.display = 'none';
        }

        // Update gender
        const genderContainer = document.getElementById('gender-container');
        if (profile.gender) {
            const tutorGender = document.getElementById('tutor-gender');
            if (tutorGender) tutorGender.textContent = profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1);
            if (genderContainer) genderContainer.style.display = 'flex';
        } else {
            if (genderContainer) genderContainer.style.display = 'none';
        }

        // Update email
        const emailContainer = document.getElementById('email-container');
        if (profile.email) {
            const tutorEmail = document.getElementById('tutor-email');
            if (tutorEmail) tutorEmail.textContent = profile.email;
            if (emailContainer) emailContainer.style.display = 'flex';
        } else {
            if (emailContainer) emailContainer.style.display = 'none';
        }

        // Update phone
        const phoneContainer = document.getElementById('phone-container');
        if (profile.phone) {
            const tutorPhone = document.getElementById('tutor-phone');
            if (tutorPhone) tutorPhone.textContent = profile.phone;
            if (phoneContainer) phoneContainer.style.display = 'flex';
        } else {
            if (phoneContainer) phoneContainer.style.display = 'none';
        }

        // Update subjects/courses
        if (profile.courses) {
            const tutorSubjects = document.getElementById('tutor-subjects');
            if (tutorSubjects) {
                tutorSubjects.textContent = Array.isArray(profile.courses)
                    ? profile.courses.join(', ')
                    : profile.courses;
            }
        }

        // Update grade level - HTML uses camelCase ID: tutorGradeLevel
        const gradeLevelContainer = document.getElementById('grade-level-container');
        if (profile.grade_level) {
            const tutorGradeLevel = document.getElementById('tutorGradeLevel'); // Changed from 'tutor-grade-level' to 'tutorGradeLevel'
            if (tutorGradeLevel) tutorGradeLevel.textContent = profile.grade_level;
            if (gradeLevelContainer) gradeLevelContainer.style.display = 'flex';
        } else {
            if (gradeLevelContainer) gradeLevelContainer.style.display = 'none';
        }

        // Update course type
        const courseTypeContainer = document.getElementById('course-type-container');
        if (profile.course_type) {
            const tutorCourseType = document.getElementById('tutor-course-type');
            if (tutorCourseType) tutorCourseType.textContent = profile.course_type;
            if (courseTypeContainer) courseTypeContainer.style.display = 'flex';
        } else {
            if (courseTypeContainer) courseTypeContainer.style.display = 'none';
        }

        // Update languages - HTML uses camelCase ID: tutorLanguages
        const languagesContainer = document.getElementById('languages-container');
        if (profile.languages) {
            const tutorLanguages = document.getElementById('tutorLanguages'); // Changed from 'tutor-languages' to 'tutorLanguages'
            if (tutorLanguages) {
                tutorLanguages.textContent = Array.isArray(profile.languages)
                    ? profile.languages.join(', ')
                    : profile.languages;
            }
            if (languagesContainer) languagesContainer.style.display = 'flex';
        } else {
            if (languagesContainer) languagesContainer.style.display = 'none';
        }

        // Update social media links - display only added icons
        this.updateSocialMediaLinks(profile.social_links || {});

        console.log('✅ Profile header updated immediately without page reload');
    },

    // Update social media links (show only added platforms)
    updateSocialMediaLinks(socialLinks) {
        const container = document.getElementById('social-links-container');
        if (!container) {
            console.error('❌ Social links container not found in updateSocialMediaLinks');
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

        console.log('📱 [Controller] Updating social links:', socialLinks);

        // Handle both object and array formats
        let entries = [];
        if (socialLinks && typeof socialLinks === 'object') {
            if (Array.isArray(socialLinks)) {
                entries = socialLinks.map(item => [item.platform, item.url]);
            } else {
                entries = Object.entries(socialLinks);
            }
        }

        // Only show platforms that have URLs
        const html = entries
            .filter(([platform, url]) => url && url.trim() !== '')
            .map(([platform, url]) => `
                <a href="${url}" class="social-link" title="${titleMap[platform] || platform}"
                   onclick="event.preventDefault(); window.open('${url}', '_blank');" target="_blank" rel="noopener noreferrer">
                    <i class="${iconMap[platform] || 'fas fa-link'}"></i>
                </a>
            `).join('');

        if (html) {
            container.innerHTML = html;
            console.log(`✅ [Controller] ${entries.filter(([_, url]) => url && url.trim()).length} social link(s) updated`);
        } else {
            container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.875rem; margin: 0;">No social links added</p>';
            console.log('ℹ️ [Controller] No social links to display');
        }
    },

    // Add certification
    async addCertification(certData) {
        try {
            // Add to state
            const newCert = {
                id: Date.now().toString(),
                ...certData,
                createdAt: new Date().toISOString()
            };

            TutorProfileState.addCertification(newCert);

            // Save to backend
            const profile = TutorProfileState.getTutorProfile();
            await this.saveProfile(profile);

            // Update UI
            TutorProfileUI.displayCertifications(profile.certifications);
            TutorProfileUI.showNotification('Certification added successfully!', 'success');

            TutorModalManager.closeCertification();
        } catch (error) {
            console.error('Error adding certification:', error);
            TutorProfileUI.showNotification('Failed to add certification', 'error');
        }
    },

    // Add experience
    async addExperience(expData) {
        try {
            const newExp = {
                id: Date.now().toString(),
                ...expData,
                createdAt: new Date().toISOString()
            };

            TutorProfileState.addExperience(newExp);

            const profile = TutorProfileState.getTutorProfile();
            await this.saveProfile(profile);

            TutorProfileUI.displayExperiences(profile.experiences);
            TutorProfileUI.showNotification('Experience added successfully!', 'success');

            TutorModalManager.closeExperience();
        } catch (error) {
            console.error('Error adding experience:', error);
            TutorProfileUI.showNotification('Failed to add experience', 'error');
        }
    },

    // Add achievement
    async addAchievement(achievementData) {
        try {
            const newAchievement = {
                id: Date.now().toString(),
                ...achievementData,
                createdAt: new Date().toISOString()
            };

            TutorProfileState.addAchievement(newAchievement);

            const profile = TutorProfileState.getTutorProfile();
            await this.saveProfile(profile);

            TutorProfileUI.displayAchievements(profile.achievements);
            TutorProfileUI.showNotification('Achievement added successfully!', 'success');

            TutorModalManager.closeAchievement();
        } catch (error) {
            console.error('Error adding achievement:', error);
            TutorProfileUI.showNotification('Failed to add achievement', 'error');
        }
    },

    // Delete certification
    async deleteCertification(id) {
        if (!confirm('Are you sure you want to delete this certification?')) {
            return;
        }

        try {
            TutorProfileState.deleteCertification(id);

            const profile = TutorProfileState.getTutorProfile();
            await this.saveProfile(profile);

            TutorProfileUI.displayCertifications(profile.certifications);
            TutorProfileUI.showNotification('Certification deleted', 'success');
        } catch (error) {
            console.error('Error deleting certification:', error);
            TutorProfileUI.showNotification('Failed to delete certification', 'error');
        }
    },

    // Delete experience
    async deleteExperience(id) {
        if (!confirm('Are you sure you want to delete this experience?')) {
            return;
        }

        try {
            TutorProfileState.deleteExperience(id);

            const profile = TutorProfileState.getTutorProfile();
            await this.saveProfile(profile);

            TutorProfileUI.displayExperiences(profile.experiences);
            TutorProfileUI.showNotification('Experience deleted', 'success');
        } catch (error) {
            console.error('Error deleting experience:', error);
            TutorProfileUI.showNotification('Failed to delete experience', 'error');
        }
    },

    // Delete achievement
    async deleteAchievement(id) {
        if (!confirm('Are you sure you want to delete this achievement?')) {
            return;
        }

        try {
            TutorProfileState.deleteAchievement(id);

            const profile = TutorProfileState.getTutorProfile();
            await this.saveProfile(profile);

            TutorProfileUI.displayAchievements(profile.achievements);
            TutorProfileUI.showNotification('Achievement deleted', 'success');
        } catch (error) {
            console.error('Error deleting achievement:', error);
            TutorProfileUI.showNotification('Failed to delete achievement', 'error');
        }
    },

    // Filter videos
    filterVideos(filter) {
        const videos = TutorProfileState.allVideos;
        TutorProfileUI.displayVideos(videos, filter);
    },

    // Filter blog posts
    filterBlogPosts(filter) {
        const posts = TutorProfileState.blogPosts;
        TutorProfileUI.displayBlogPosts(posts, filter);
    },

    // Filter connections
    filterConnections(filter) {
        const connections = TutorProfileState.connections;
        TutorProfileUI.displayConnections(connections, filter);
    },

    // Create blog post
    async createBlogPost(blogData) {
        try {
            const newPost = await TutorProfileAPI.createBlogPost(blogData);

            TutorProfileUI.showNotification('Blog post created successfully!', 'success');
            TutorModalManager.closeBlog();

            // Reload blog posts
            await this.loadBlogPosts();
        } catch (error) {
            console.error('Error creating blog post:', error);
            TutorProfileUI.showNotification('Failed to create blog post', 'error');
        }
    },

    // Setup event listeners
    setupEventListeners() {
        console.log('📝 Setting up form event listeners...');

        // Profile edit form
        const editProfileForm = document.getElementById('editProfileForm');
        if (editProfileForm) {
            console.log('✅ Found editProfileForm');
            editProfileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(editProfileForm);
                const profileData = Object.fromEntries(formData.entries());
                this.saveProfile(profileData);
            });
        }

        // Achievement, Certification, and Experience forms
        // REMOVED: Event listeners now handled in global-functions.js when modals open
        // This prevents duplicate listeners that were causing the modal to not open
        console.log('ℹ️ Verification workflow listeners handled by openModal functions in global-functions.js');

        // Blog form
        const blogForm = document.getElementById('blogForm');
        if (blogForm) {
            blogForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(blogForm);
                const blogData = Object.fromEntries(formData.entries());
                this.createBlogPost(blogData);
            });
        }

        console.log('📝 Form event listeners setup complete');
    }
};
