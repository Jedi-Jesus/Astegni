// ============================================
// TUTOR PROFILE GLOBAL FUNCTIONS
// Functions accessible from HTML onclick handlers
// ============================================

// Universal Modal Handler - Routes to correct modal manager
// NOTE: Must be synchronous for HTML onclick compatibility, uses .then() for async operations
function openModal(modalId) {
    console.log(`openModal called with: ${modalId}`);

    // Route to appropriate modal manager based on modal ID
    if (modalId === 'adAnalyticsModal') {
        openAdAnalyticsModal();
    } else if (['coverUploadModal', 'profileUploadModal'].includes(modalId)) {
        // These are special upload modals with different structure
        let modal = document.getElementById(modalId);

        // If modal not found, try to load it first
        if (!modal && typeof ModalLoader !== 'undefined') {
            console.log(`⏳ Modal not in DOM yet, loading: ${modalId}`);
            ModalLoader.load(modalId)
                .then(() => {
                    modal = document.getElementById(modalId);
                    if (modal) {
                        // Use the EXACT same approach as openUploadStoryModal
                        modal.style.display = 'flex';
                        modal.classList.remove('hidden');
                        modal.classList.add('show');
                        document.body.style.overflow = 'hidden';
                        console.log(`✅ Opened upload modal (after loading): ${modalId}`);
                    } else {
                        console.error(`❌ Modal still not found after loading: ${modalId}`);
                    }
                })
                .catch(error => {
                    console.error(`❌ Failed to load modal: ${modalId}`, error);
                });
        } else if (modal) {
            // Use the EXACT same approach as openUploadStoryModal
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            console.log(`✅ Opened upload modal: ${modalId}`);
        } else {
            console.error(`❌ Modal not found: ${modalId}`);
        }
    } else if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.open(modalId);
    } else if (typeof window.modalManager !== 'undefined') {
        window.modalManager.openModal(modalId);
    } else {
        // Fallback: try to open any modal directly
        let modal = document.getElementById(modalId);

        // If modal not found, try to load it first
        if (!modal && typeof ModalLoader !== 'undefined') {
            console.log(`⏳ Modal not in DOM yet, loading: ${modalId}`);
            ModalLoader.load(modalId)
                .then(() => {
                    modal = document.getElementById(modalId);
                    if (modal) {
                        modal.style.display = 'flex';
                        modal.classList.remove('hidden');
                        console.log(`✅ Opened modal using fallback (after loading): ${modalId}`);
                    } else {
                        console.error(`❌ Modal still not found after loading: ${modalId}`);
                    }
                })
                .catch(error => {
                    console.error(`❌ Failed to load modal: ${modalId}`, error);
                });
        } else if (modal) {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
            console.log(`✅ Opened modal using fallback: ${modalId}`);
        } else {
            console.error(`❌ Modal not found and no modal manager available: ${modalId}`);
        }
    }
}

// Make it available globally
window.openModal = openModal;

// Sidebar toggle - DEPRECATED
// Sidebar is now controlled entirely by sidebar-fix.js (loaded at end of HTML)
// This function is kept for backward compatibility only
function toggleSidebar() {
    console.warn('toggleSidebar() is deprecated. Sidebar controlled by sidebar-fix.js');
    // No-op: sidebar-fix.js handles all sidebar behavior
}

// Store original profile data for comparison
let originalProfileData = {};

// Modal operations
function openEditProfileModal() {
    console.log('🚀 openEditProfileModal called');

    // Use Promise to handle async operation from onclick
    (async () => {
        try {
            console.log('📍 Async function started');
            console.log('📍 TutorProfileAPI available?', typeof TutorProfileAPI !== 'undefined');

            // First, fetch fresh data from the database
            console.log('🔄 Fetching fresh profile data from database...');
            const freshProfile = await TutorProfileAPI.getTutorProfile();

            if (!freshProfile) {
                console.error('❌ Could not fetch profile from database');
                if (typeof TutorProfileUI !== 'undefined') {
                    TutorProfileUI.showNotification('Failed to load profile data. Please refresh the page.', 'error');
                }
                return;
            }

            // Update the state with fresh data
            if (typeof TutorProfileState !== 'undefined') {
                TutorProfileState.setTutorProfile(freshProfile);
            }

            // Use the fresh profile data
            const profile = freshProfile;
            console.log('✅ Fresh profile data loaded:', profile);

            // Store original data for comparison
            originalProfileData = {
                first_name: profile.first_name || '',
                father_name: profile.father_name || '',
                grandfather_name: profile.grandfather_name || '',
                teaches_at: profile.teaches_at || '',
                email: profile.email || '',
                phone: profile.phone || ''
            };

            // Populate hero section fields
            const heroTitle = document.getElementById('heroTitle');
            const heroSubtitle = document.getElementById('heroSubtitle');
            if (heroTitle) heroTitle.value = profile.hero_title || document.getElementById('typedText')?.textContent || '';
            if (heroSubtitle) heroSubtitle.value = profile.hero_subtitle || document.getElementById('hero-subtitle')?.textContent || '';

            // Populate name fields
            const editTutorName = document.getElementById('editTutorName');
            const editFatherName = document.getElementById('editFatherName');
            const grandFatherName = document.getElementById('grandFatherName');

            if (editTutorName) editTutorName.value = profile.first_name || '';
            if (editFatherName) editFatherName.value = profile.father_name || '';
            if (grandFatherName) grandFatherName.value = profile.grandfather_name || '';

            // Populate username and gender
            const username = document.getElementById('username');
            const gender = document.getElementById('gender');
            if (username) username.value = profile.username || '';
            if (gender) gender.value = profile.gender || '';

            // Populate grade level - ensure the value matches one of the option values
            const gradeLevel = document.getElementById('editGradeLevel');
            if (gradeLevel) {
                const gradeLevelValue = profile.grade_level || profile.gradeLevel || '';
                console.log('Setting grade level to:', gradeLevelValue);
                gradeLevel.value = gradeLevelValue;
                // If value didn't set (invalid option), try to find a match
                if (gradeLevel.value !== gradeLevelValue && gradeLevelValue) {
                    console.warn('Grade level value not found in dropdown options:', gradeLevelValue);
                }
            }

            // Populate languages - similar to courses
            const languagesContainer = document.getElementById('languagesContainer');
            if (languagesContainer) {
                languagesContainer.innerHTML = '';
                const languages = profile.languages ?
                    (Array.isArray(profile.languages) ? profile.languages : profile.languages.split(',').map(l => l.trim()).filter(l => l)) : [];
                if (languages.length > 0) {
                    languages.forEach(language => {
                        const languageDiv = document.createElement('div');
                        languageDiv.className = 'language-item input-group';
                        languageDiv.innerHTML = `
                            <input type="text" class="form-input" placeholder="Enter language (e.g., English, Amharic)" name="language[]" value="${language}">
                            <button type="button" class="btn-remove" onclick="removeLanguage(this)">×</button>
                        `;
                        languagesContainer.appendChild(languageDiv);
                    });
                } else {
                    addLanguage(); // Add one empty field
                }
            }

            // Populate course type - ensure the value matches one of the option values
            const courseType = document.getElementById('editCourseType');
            if (courseType) {
                const courseTypeValue = profile.course_type || profile.courseType || '';
                console.log('Setting course type to:', courseTypeValue);
                courseType.value = courseTypeValue;
                // If value didn't set (invalid option), try to find a match
                if (courseType.value !== courseTypeValue && courseTypeValue) {
                    console.warn('Course type value not found in dropdown options:', courseTypeValue);
                }
            }

            // Populate email and phone
            const editEmail = document.getElementById('editEmail');
            const editPhone = document.getElementById('editPhone');
            if (editEmail) editEmail.value = profile.email || '';
            if (editPhone) editPhone.value = profile.phone || '';

            // Populate other fields
            const aboutUs = document.getElementById('aboutUs');
            const profileQuote = document.getElementById('profileQuote');

            if (aboutUs) aboutUs.value = profile.bio || profile.about || '';
            if (profileQuote) profileQuote.value = profile.quote || '';

            // Populate locations - split comma-separated string into multiple inputs
            const locationsContainer = document.getElementById('locationsContainer');
            if (locationsContainer) {
                locationsContainer.innerHTML = ''; // Clear existing
                const locations = profile.location ? profile.location.split(',').map(loc => loc.trim()).filter(loc => loc) : [];
                if (locations.length > 0) {
                    locations.forEach(location => {
                        const locationDiv = document.createElement('div');
                        locationDiv.className = 'location-item input-group';
                        locationDiv.innerHTML = `
                            <input type="text" class="form-input" placeholder="Enter location" name="location[]" value="${location}">
                            <button type="button" class="btn-remove" onclick="removeLocation(this)">×</button>
                        `;
                        locationsContainer.appendChild(locationDiv);
                    });
                } else {
                    addLocation(); // Add one empty field
                }
            }

            // Populate teaches at schools
            const teachesAtContainer = document.getElementById('teachesAtContainer');
            if (teachesAtContainer) {
                teachesAtContainer.innerHTML = '';
                const schools = profile.teaches_at ? profile.teaches_at.split(',').map(s => s.trim()).filter(s => s) : [];
                if (schools.length > 0) {
                    schools.forEach(school => {
                        const schoolDiv = document.createElement('div');
                        schoolDiv.className = 'school-item input-group';
                        schoolDiv.innerHTML = `
                            <input type="text" class="form-input" placeholder="Enter school name" name="teaches_at[]" value="${school}">
                            <button type="button" class="btn-remove" onclick="removeTeachesAt(this)">×</button>
                        `;
                        teachesAtContainer.appendChild(schoolDiv);
                    });
                } else {
                    addTeachesAt(); // Add one empty field
                }
            }

            // Populate courses
            const coursesContainer = document.getElementById('coursesContainer');
            if (coursesContainer) {
                coursesContainer.innerHTML = '';
                const courses = Array.isArray(profile.courses) ? profile.courses : (profile.courses ? profile.courses.split(',').map(c => c.trim()).filter(c => c) : []);
                if (courses.length > 0) {
                    courses.forEach(course => {
                        const courseDiv = document.createElement('div');
                        courseDiv.className = 'course-item input-group';
                        courseDiv.innerHTML = `
                            <input type="text" class="form-input" placeholder="Enter course name" name="course[]" value="${course}">
                            <button type="button" class="btn-remove" onclick="removeCourse(this)">×</button>
                        `;
                        coursesContainer.appendChild(courseDiv);
                    });
                } else {
                    addCourse(); // Add one empty field
                }
            }

            // Populate teaching methods (checkboxes)
            const teachingMethods = profile.sessionFormat ? profile.sessionFormat.split(',').map(m => m.trim().toLowerCase()) : [];
            document.querySelectorAll('input[name="teachingMethod"]').forEach(checkbox => {
                checkbox.checked = teachingMethods.includes(checkbox.value.toLowerCase());
            });

            // Populate social media links
            const socialMediaContainer = document.getElementById('socialMediaContainer');
            if (socialMediaContainer) {
                socialMediaContainer.innerHTML = '';
                const socialLinks = profile.social_links || {};
                if (Object.keys(socialLinks).length > 0) {
                    Object.entries(socialLinks).forEach(([platform, url]) => {
                        const socialDiv = document.createElement('div');
                        socialDiv.className = 'social-link-item input-group';
                        socialDiv.innerHTML = `
                            <select class="form-select" name="social_platform[]" style="flex: 0 0 140px;">
                                <option value="facebook" ${platform === 'facebook' ? 'selected' : ''}>Facebook</option>
                                <option value="twitter" ${platform === 'twitter' ? 'selected' : ''}>Twitter</option>
                                <option value="linkedin" ${platform === 'linkedin' ? 'selected' : ''}>LinkedIn</option>
                                <option value="instagram" ${platform === 'instagram' ? 'selected' : ''}>Instagram</option>
                                <option value="youtube" ${platform === 'youtube' ? 'selected' : ''}>YouTube</option>
                                <option value="telegram" ${platform === 'telegram' ? 'selected' : ''}>Telegram</option>
                            </select>
                            <input type="url" class="form-input" placeholder="Enter URL" name="social_url[]" value="${url}" style="flex: 1;">
                            <button type="button" class="btn-remove" onclick="removeSocialLink(this)">×</button>
                        `;
                        socialMediaContainer.appendChild(socialDiv);
                    });
                } else {
                    addSocialLink(); // Add one empty field
                }
            }

            // IMPORTANT: Load the modal first, then open it
            if (typeof ModalLoader !== 'undefined') {
                console.log('🔄 Loading edit-profile-modal...');
                await ModalLoader.loadById('edit-profile-modal');
                console.log('✅ Modal loaded successfully');
            }

            // IMPORTANT: Open the modal after all fields are populated
            if (typeof TutorModalManager !== 'undefined') {
                console.log('✅ Opening edit-profile-modal...');
                TutorModalManager.open('edit-profile-modal');
            } else {
                console.error('❌ TutorModalManager not found!');
                // Fallback: try to open modal directly
                const modal = document.getElementById('edit-profile-modal');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.style.display = 'flex';
                    console.log('✅ Modal opened using fallback method');
                }
            }

        } catch (error) {
            console.error('❌ Error in openEditProfileModal:', error);
            if (typeof TutorProfileUI !== 'undefined') {
                TutorProfileUI.showNotification('Error loading profile data', 'error');
            }
        }
    })(); // Execute the async IIFE immediately
}

function openAdAnalyticsModal(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    const modal = document.getElementById('adAnalyticsModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
        modal.classList.add('active', 'show');
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        document.body.style.overflow = 'hidden';

        // Initialize content if AdPackageManager exists
        if (typeof AdPackageManager !== 'undefined' && AdPackageManager.renderPackages) {
            AdPackageManager.renderPackages();
        }

        setTimeout(() => {
            if (typeof animateAnalyticsNumbers !== 'undefined') animateAnalyticsNumbers();
            if (typeof startTestimonialCarousel !== 'undefined') startTestimonialCarousel();
        }, 100);
    }
}

function closeEditProfileModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.close('edit-profile-modal');
    }
}

function closeCoverUploadModal() {
    console.log('closeCoverUploadModal called');
    const modal = document.getElementById('coverUploadModal');
    if (modal) {
        // Use the EXACT same approach as closeStoryUploadModal
        modal.style.display = 'none';
        modal.classList.add('hidden');
        modal.classList.remove('show');
        document.body.style.overflow = '';
        console.log('Cover upload modal closed');
    } else {
        console.error('coverUploadModal not found');
    }
}

function closeProfileUploadModal() {
    console.log('closeProfileUploadModal called');
    const modal = document.getElementById('profileUploadModal');
    if (modal) {
        // Use the EXACT same approach as closeStoryUploadModal
        modal.style.display = 'none';
        modal.classList.add('hidden');
        modal.classList.remove('show');
        document.body.style.overflow = '';
        console.log('Profile upload modal closed');
    } else {
        console.error('profileUploadModal not found');
    }
}

function openCertificationModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.openCertification();
    }

    // Setup verification workflow event listener
    setTimeout(() => {
        const certificationForm = document.getElementById('certificationForm');
        if (certificationForm && !certificationForm.hasAttribute('data-verification-listener')) {
            console.log('✅ Attaching verification listener to certificationForm');
            certificationForm.setAttribute('data-verification-listener', 'true');
            certificationForm.addEventListener('submit', (e) => {
                console.log('📤 Certification form submitted!');
                e.preventDefault();
                const formData = new FormData(certificationForm);
                window.pendingVerificationData = {
                    type: 'certification',
                    formData: formData
                };
                console.log('💾 Stored pending certification data');
                closeCertificationModal();
                console.log('🚪 Opening verification fee modal...');
                openVerificationFeeModal();
            });
        }
    }, 100);
}

function closeCertificationModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.closeCertification();
    }
}

function openExperienceModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.openExperience();
    }

    // Setup verification workflow event listener
    setTimeout(() => {
        const experienceForm = document.getElementById('experienceForm');
        if (experienceForm && !experienceForm.hasAttribute('data-verification-listener')) {
            console.log('✅ Attaching verification listener to experienceForm');
            experienceForm.setAttribute('data-verification-listener', 'true');
            experienceForm.addEventListener('submit', (e) => {
                console.log('📤 Experience form submitted!');
                e.preventDefault();
                const formData = new FormData(experienceForm);
                window.pendingVerificationData = {
                    type: 'experience',
                    formData: formData
                };
                console.log('💾 Stored pending experience data');
                closeExperienceModal();
                console.log('🚪 Opening verification fee modal...');
                openVerificationFeeModal();
            });
        }
    }, 100);
}

function closeExperienceModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.closeExperience();
    }
}

function openAchievementModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.openAchievement();
    }

    // Setup verification workflow event listener
    setTimeout(() => {
        const achievementForm = document.getElementById('achievementForm');
        if (achievementForm && !achievementForm.hasAttribute('data-verification-listener')) {
            console.log('✅ Attaching verification listener to achievementForm');
            achievementForm.setAttribute('data-verification-listener', 'true');
            achievementForm.addEventListener('submit', (e) => {
                console.log('📤 Achievement form submitted!');
                e.preventDefault();
                const formData = new FormData(achievementForm);

                // Clean up empty numeric fields - remove them instead of sending empty strings
                const year = formData.get('year');
                if (!year || year.trim() === '') {
                    formData.delete('year');
                }

                window.pendingVerificationData = {
                    type: 'achievement',
                    formData: formData
                };
                console.log('💾 Stored pending achievement data');
                closeAchievementModal();
                console.log('🚪 Opening verification fee modal...');
                openVerificationFeeModal();
            });
        }
    }, 100);
}

function closeAchievementModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.closeAchievement();
    }
}

function openScheduleModal() {
    // Clear the form first
    const scheduleForm = document.getElementById('scheduleForm');
    if (scheduleForm) {
        scheduleForm.reset();
    }

    // Clear schedule ID to ensure we're creating, not editing
    const scheduleIdInput = document.getElementById('editing-schedule-id');
    if (scheduleIdInput) {
        scheduleIdInput.value = '';
    }

    // Reset modal title to "Create"
    const modalTitle = document.getElementById('schedule-modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-calendar-plus"></i> Create Teaching Schedule';
    }

    // Reset submit button text to "Create Schedule"
    const submitBtn = document.getElementById('schedule-submit-btn');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Create Schedule';
    }

    // Set default year to current year for recurring schedules
    const currentYear = new Date().getFullYear();
    const yearFromInput = document.getElementById('schedule-year-from');
    if (yearFromInput) {
        yearFromInput.value = currentYear;
    }

    const otherGradeGroup = document.getElementById('other-grade-group');
    if (otherGradeGroup) {
        otherGradeGroup.style.display = 'none';
    }

    // Hide alarm details if shown
    const alarmDetails = document.getElementById('alarm-settings-details');
    if (alarmDetails) {
        alarmDetails.style.display = 'none';
    }

    // Clear selected specific dates
    selectedSpecificDates = [];
    updateSelectedDatesList();

    // Clear additional date range inputs
    const additionalRangesContainer = document.getElementById('additional-date-ranges');
    if (additionalRangesContainer) {
        additionalRangesContainer.innerHTML = '';
    }
    additionalDateRangeCounter = 0;

    // Reset to recurring schedule type and show/hide sections
    const recurringRadio = document.querySelector('input[name="schedule-type"][value="recurring"]');
    if (recurringRadio) {
        recurringRadio.checked = true;
    }
    toggleScheduleType();

    // Open the modal
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.openSchedule();
    }
}

function closeScheduleModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.closeSchedule();
    }
    // Clear schedule ID when closing modal
    const scheduleIdInput = document.getElementById('editing-schedule-id');
    if (scheduleIdInput) {
        scheduleIdInput.value = '';
        // Reset modal title to "Create"
        const modalTitle = document.getElementById('schedule-modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-calendar-plus"></i> Create Teaching Schedule';
        }
        // Reset submit button text to "Create Schedule"
        const submitBtn = document.getElementById('schedule-submit-btn');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Create Schedule';
        }
        // Hide "Other" fields if they were shown
        const otherGradeGroup = document.getElementById('other-grade-group');
        if (otherGradeGroup) {
            otherGradeGroup.style.display = 'none';
        }
    }

    // Clear additional date range inputs
    const additionalRangesContainer = document.getElementById('additional-date-ranges');
    if (additionalRangesContainer) {
        additionalRangesContainer.innerHTML = '';
    }
    additionalDateRangeCounter = 0;
}

function openCommunityModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.openCommunity();
    }
}

function closeCommunityModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.closeCommunity();
    }
}

function openBlogModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.openBlog();
    }
}

function closeBlogModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.closeBlog();
    }
}

function openCoverUploadModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.open('coverUploadModal');
    }
}

function openProfileUploadModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.open('profileUploadModal');
    }
}

function openVideoUploadModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.openVideoUpload();
    }
}

function closeModal(modalId) {
    // Handle specific modal closing
    if (modalId === 'adAnalyticsModal' && typeof closeAdAnalyticsModal !== 'undefined') {
        closeAdAnalyticsModal();
    } else if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.close(modalId);
    }
}

function showComingSoonModal(feature) {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.showComingSoon(feature);
    }
}

function openStudentDetails(studentId) {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.openStudentDetails(studentId);
    }

    // Initialize student-specific managers
    if (typeof StudentWhiteboardManager !== 'undefined') {
        StudentWhiteboardManager.init(studentId);
    }
    if (typeof StudentQuizManager !== 'undefined') {
        StudentQuizManager.init(studentId);
    }
}

function closeStudentDetails() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.closeStudentDetails();
    }
}

function closeStudentDetailsModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.closeStudentDetails();
    }
}

// CRUD operations for certifications
function editCertification(id) {
    console.log('Edit certification:', id);
    // Implementation for editing certification
    if (typeof TutorModalManager !== 'undefined') {
        const profile = TutorProfileState.getTutorProfile();
        const cert = profile?.certifications?.find(c => c.id === id);
        if (cert) {
            // Populate form with certification data
            document.getElementById('cert-title').value = cert.title || '';
            document.getElementById('cert-issuer').value = cert.issuer || '';
            document.getElementById('cert-date').value = cert.date || '';
            document.getElementById('cert-url').value = cert.certificateUrl || '';
            TutorModalManager.openCertification();
        }
    }
}

function deleteCertification(id) {
    if (typeof TutorProfileController !== 'undefined') {
        TutorProfileController.deleteCertification(id);
    }
}

// CRUD operations for experiences
function editExperience(id) {
    console.log('Edit experience:', id);
    if (typeof TutorModalManager !== 'undefined') {
        const profile = TutorProfileState.getTutorProfile();
        const exp = profile?.experiences?.find(e => e.id === id);
        if (exp) {
            // Populate form with experience data
            document.getElementById('exp-position').value = exp.position || '';
            document.getElementById('exp-institution').value = exp.institution || '';
            document.getElementById('exp-start-date').value = exp.startDate || '';
            document.getElementById('exp-end-date').value = exp.endDate || '';
            document.getElementById('exp-description').value = exp.description || '';
            TutorModalManager.openExperience();
        }
    }
}

function deleteExperience(id) {
    if (typeof TutorProfileController !== 'undefined') {
        TutorProfileController.deleteExperience(id);
    }
}

// CRUD operations for achievements
function editAchievement(id) {
    console.log('Edit achievement:', id);
    if (typeof TutorModalManager !== 'undefined') {
        const profile = TutorProfileState.getTutorProfile();
        const achievement = profile?.achievements?.find(a => a.id === id);
        if (achievement) {
            // Populate form with achievement data
            document.getElementById('achievement-title').value = achievement.title || '';
            document.getElementById('achievement-description').value = achievement.description || '';
            document.getElementById('achievement-date').value = achievement.date || '';
            TutorModalManager.openAchievement();
        }
    }
}

function deleteAchievement(id) {
    if (typeof TutorProfileController !== 'undefined') {
        TutorProfileController.deleteAchievement(id);
    }
}

// Upload operations
function uploadVideo() {
    if (typeof TutorUploadHandler !== 'undefined') {
        TutorUploadHandler.uploadVideo();
    }
}

function uploadProfilePicture() {
    if (typeof TutorUploadHandler !== 'undefined') {
        TutorUploadHandler.uploadProfilePicture();
    }
}

function uploadCoverPhoto() {
    if (typeof TutorUploadHandler !== 'undefined') {
        TutorUploadHandler.uploadCoverPhoto();
    }
}

function removeVideoFile() {
    if (typeof TutorUploadHandler !== 'undefined') {
        TutorUploadHandler.removeVideoFile();
    }
}

function removeThumbnail() {
    if (typeof TutorUploadHandler !== 'undefined') {
        TutorUploadHandler.removeThumbnail();
    }
}

// Filter operations
function filterVideos(filter) {
    if (typeof TutorProfileController !== 'undefined') {
        TutorProfileController.filterVideos(filter);
    }
}

function filterBlogPosts(filter) {
    if (typeof TutorProfileController !== 'undefined') {
        TutorProfileController.filterBlogPosts(filter);
    }
}

function filterConnections(filter) {
    if (typeof TutorProfileController !== 'undefined') {
        TutorProfileController.filterConnections(filter);
    }
}

// Student operations
function contactStudent(studentId) {
    console.log('Contact student:', studentId);
    // Open chat with student
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.showComingSoon('Messaging System');
    }
}

function viewStudentProfile(studentId) {
    console.log('View student profile:', studentId);
    window.location.href = `../view-profiles/view-student.html?id=${studentId}`;
}

// Session operations
function acceptSession(sessionId) {
    console.log('Accept session:', sessionId);
    // Implementation for accepting session
    if (typeof TutorProfileUI !== 'undefined') {
        TutorProfileUI.showNotification('Session accepted!', 'success');
    }
}

function rejectSession(sessionId) {
    console.log('Reject session:', sessionId);
    // Implementation for rejecting session
    if (typeof TutorProfileUI !== 'undefined') {
        TutorProfileUI.showNotification('Session rejected', 'info');
    }
}

// Connection operations
function viewConnection(id) {
    console.log('View connection:', id);
    // View connection profile
    window.location.href = `../view-profiles/view-student.html?id=${id}`;
}

function messageConnection(id) {
    console.log('Message connection:', id);
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.showComingSoon('Messaging System');
    }
}

// Video operations
function playVideo(videoId) {
    console.log('Play video:', videoId);
    // Open video player
    window.location.href = `../branch/reels.html?video=${videoId}`;
}

// Blog operations
function editBlog(blogId) {
    console.log('Edit blog:', blogId);
    // Implementation for editing blog
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.openBlog();
    }
}

function viewBlog(blogId) {
    console.log('View blog:', blogId);
    // View blog post
    window.location.href = `../branch/blog.html?id=${blogId}`;
}

// Digital tools
function openDigitalLab() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.showComingSoon('Digital Lab');
    }
}

function openWhiteboardTool() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.showComingSoon('Whiteboard Tool');
    }
}

function openQuizMaker() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.showComingSoon('Quiz Maker');
    }
}

function openResourceLibrary() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.showComingSoon('Resource Library');
    }
}

// Live streaming
function goLive() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.showComingSoon('Live Streaming');
    }
}

// Playlist operations
function createPlaylist() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.showComingSoon('Playlist Creation');
    }
}

// Profile actions
function shareProfile() {
    const profileUrl = window.location.href;

    if (navigator.share) {
        navigator.share({
            title: 'Check out my Astegni Tutor Profile',
            text: 'I\'m a tutor on Astegni. Check out my profile!',
            url: profileUrl
        }).then(() => {
            console.log('Profile shared successfully');
        }).catch((error) => {
            console.error('Error sharing profile:', error);
            fallbackShare(profileUrl);
        });
    } else {
        fallbackShare(profileUrl);
    }
}

function fallbackShare(url) {
    // Fallback to copying URL to clipboard
    navigator.clipboard.writeText(url).then(() => {
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Profile link copied to clipboard!', 'success');
        }
    }).catch((error) => {
        console.error('Error copying to clipboard:', error);
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Failed to copy link', 'error');
        }
    });
}

// Social media links
function openSocialLink(event, platform) {
    event.preventDefault();
    const profile = TutorProfileState.getTutorProfile();

    if (!profile || !profile.socialLinks) {
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Social link not available', 'info');
        }
        return;
    }

    const link = profile.socialLinks[platform];
    if (link) {
        window.open(link, '_blank');
    } else {
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Social link not set', 'info');
        }
    }
}

// Section switching
function switchCommunitySection(section) {
    // Hide ALL community sections first
    const allSections = document.querySelectorAll('.community-section');
    allSections.forEach(sec => {
        sec.classList.add('hidden');
        sec.classList.remove('active');
        sec.style.display = 'none';
    });

    // Show the selected section
    const sectionId = `${section}-section`;
    const element = document.getElementById(sectionId);
    if (element) {
        element.classList.remove('hidden');
        element.classList.add('active');
        element.style.display = 'block';
    }

    // Update active menu item
    const menuItems = document.querySelectorAll('.community-menu .menu-item');
    menuItems.forEach(item => {
        const itemSection = item.getAttribute('onclick')?.match(/switchCommunitySection\('(.+?)'\)/)?.[1];
        if (itemSection === section) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Load section data from database using communityManager
    if (window.communityManager) {
        window.communityManager.loadSectionGrid(section, 'all');
    } else {
        // Fallback to old method if communityManager not available
        if (section === 'all') {
            filterCommunity('all', 'all');
        } else if (section === 'requests') {
            loadRequests();
        } else if (section === 'connections') {
            loadConnectionsOnly();
        } else if (section === 'events') {
            loadEventsSection();
        } else if (section === 'clubs') {
            loadClubsSection();
        }
    }
}

function switchStudentSection(section) {
    const sections = ['overview', 'sessions', 'progress', 'notes'];
    sections.forEach(s => {
        const element = document.getElementById(`student-${s}`);
        if (element) {
            element.style.display = s === section ? 'block' : 'none';
        }
    });

    // Update active tab
    const tabs = document.querySelectorAll('.student-tab');
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.section === section);
    });
}

// Switch sections in student details modal
function switchSection(section) {
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });

    // Show selected section
    const selectedSection = document.getElementById(section);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }

    // Update sidebar menu active state
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.classList.remove('active');
    });

    const activeItem = document.querySelector(`.sidebar-menu-item[onclick*="${section}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }

    // Load section data when switching to specific sections
    if (section === 'digital-whiteboard') {
        if (typeof StudentWhiteboardManager !== 'undefined') {
            StudentWhiteboardManager.loadSessions();
        }
    } else if (section === 'quiz-tests') {
        if (typeof StudentQuizManager !== 'undefined') {
            StudentQuizManager.loadQuizzes('active');
        }
    }
}

// Toggle student modal sidebar (collapse/expand)
function toggleStudentModalSidebar() {
    const sidebar = document.getElementById('studentModalSidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

// Open review student modal
function openReviewStudentModal() {
    // TODO: Implement review student modal
    // This will open a modal where tutors can rate students on:
    // - Class Activity
    // - Subject Understanding
    // - Discipline
    // - Punctuality
    console.log('Opening review student modal...');
    alert('Review Student functionality coming soon!\n\nRate student on:\n• Class Activity\n• Subject Understanding\n• Discipline\n• Punctuality');
}

// Send payment reminder
function sendPaymentReminder() {
    console.log('Sending payment reminder...');
    alert('Payment reminder sent successfully!');
}

// Download receipt
function downloadReceipt(receiptId) {
    console.log(`Downloading receipt ${receiptId}...`);
    alert(`Downloading receipt #${receiptId}...`);
}

// Filter assignments by status
function filterAssignments(status) {
    // Update tab active state
    const tabs = document.querySelectorAll('.assignment-tab');
    tabs.forEach(tab => {
        const isActive = tab.dataset.filter === status;
        tab.classList.toggle('active', isActive);

        // Update tab styling
        if (isActive) {
            tab.style.color = 'var(--text)';
            tab.style.borderBottomColor = 'var(--button-bg)';
        } else {
            tab.style.color = 'var(--text-muted)';
            tab.style.borderBottomColor = 'transparent';
        }
    });

    // Filter assignment cards
    const cards = document.querySelectorAll('.assignment-card');
    cards.forEach(card => {
        if (status === 'all' || card.dataset.status === status) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Change attendance month
function changeAttendanceMonth(monthValue) {
    console.log('Changing attendance month to:', monthValue);

    const [year, month] = monthValue.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[parseInt(month) - 1];
    const monthIndex = parseInt(month);

    // Generate sample attendance data for the selected month
    const container = document.getElementById('attendance-sessions-container');
    if (!container) return;

    // Different attendance patterns for different months
    const attendanceData = generateMonthAttendance(monthIndex, year);

    // Update the container with new attendance data
    container.querySelector('div').innerHTML = attendanceData.map(session => `
        <div style="background: ${session.color}; color: white; padding: 0.75rem; border-radius: 8px; text-align: center;">
            <div style="font-weight: 600; font-size: 1.125rem;">${monthName} ${session.day}</div>
            <div style="font-size: 0.75rem; opacity: 0.9;">${session.status} ${session.icon}</div>
        </div>
    `).join('');
}

// Generate sample attendance data for a month
function generateMonthAttendance(month, year) {
    const sessions = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    // Generate 10-15 random session days for the month
    const numSessions = 10 + Math.floor(Math.random() * 6);
    const sessionDays = new Set();

    while (sessionDays.size < numSessions) {
        sessionDays.add(1 + Math.floor(Math.random() * daysInMonth));
    }

    // Sort session days
    const sortedDays = Array.from(sessionDays).sort((a, b) => a - b);

    // Assign status to each session (mostly present, some late, few absent)
    sortedDays.forEach(day => {
        const rand = Math.random();
        let status, color, icon;

        if (rand < 0.85) { // 85% present
            status = 'Present';
            color = '#10B981';
            icon = '✓';
        } else if (rand < 0.95) { // 10% late
            status = 'Late';
            color = '#F59E0B';
            icon = '⏰';
        } else { // 5% absent
            status = 'Absent';
            color = '#EF4444';
            icon = '✗';
        }

        sessions.push({ day, status, color, icon });
    });

    return sessions;
}

// Filter resources by clicking stat cards (NEW - replaces filter buttons)
function filterResourcesByStats(filterType) {
    console.log('Filtering resources by stat card:', filterType);

    // Update stat card active states
    const statCards = document.querySelectorAll('.resource-stat-card');
    statCards.forEach(card => {
        const cardFilter = card.dataset.filter;
        if (cardFilter === filterType) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });

    // Filter resource cards
    const resourceCards = document.querySelectorAll('.resource-card-hover');
    resourceCards.forEach(card => {
        const title = card.querySelector('h4').textContent.toLowerCase();

        if (filterType === 'all') {
            card.style.display = 'block';
        } else if (filterType === 'documents' && (title.includes('note') || title.includes('problem') || title.includes('guide') || title.includes('mathematics'))) {
            card.style.display = 'block';
        } else if (filterType === 'videos' && (title.includes('video') || title.includes('physics'))) {
            card.style.display = 'block';
        } else if (filterType === 'downloads') {
            // Downloads filter shows all resources (sorted by downloads in production)
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Filter resources by type (OLD - deprecated but kept for backwards compatibility)
function filterResources(type) {
    console.log('Filtering resources by type:', type);
    // Get all filter buttons
    const buttons = document.querySelectorAll('[onclick^="filterResources"]');

    // Update button styles
    buttons.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(type) || (type === 'all' && btn.textContent.includes('All'))) {
            btn.style.background = '#3b82f6';
            btn.style.color = 'white';
        } else {
            btn.style.background = '#e5e7eb';
            btn.style.color = '#1f2937';
        }
    });

    // Filter resource cards
    const resourceCards = document.querySelectorAll('.resource-card-hover');
    resourceCards.forEach(card => {
        const title = card.querySelector('h4').textContent.toLowerCase();

        if (type === 'all') {
            card.style.display = 'block';
        } else if (type === 'documents' && (title.includes('note') || title.includes('problem') || title.includes('guide'))) {
            card.style.display = 'block';
        } else if (type === 'presentations' && title.includes('presentation')) {
            card.style.display = 'block';
        } else if (type === 'worksheets' && title.includes('worksheet')) {
            card.style.display = 'block';
        } else if (type === 'exams' && (title.includes('exam') || title.includes('test'))) {
            card.style.display = 'block';
        } else if (type === 'videos' && title.includes('video')) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Switch student schedule tabs (Schedules/Sessions)
function switchStudentScheduleTab(tabName) {
    // Update tab active state
    const tabs = document.querySelectorAll('.student-schedule-tab');
    tabs.forEach(tab => {
        const isActive = tab.dataset.tab === tabName;
        tab.classList.toggle('active', isActive);

        // Update tab styling
        if (isActive) {
            tab.style.color = 'var(--text)';
            tab.style.borderBottomColor = 'var(--button-bg)';
        } else {
            tab.style.color = 'var(--text-muted)';
            tab.style.borderBottomColor = 'transparent';
        }
    });

    // Show/hide tab content
    const schedulesTab = document.getElementById('student-schedules-tab');
    const sessionsTab = document.getElementById('student-sessions-tab');

    if (tabName === 'schedules') {
        schedulesTab.style.display = 'block';
        sessionsTab.style.display = 'none';
    } else {
        schedulesTab.style.display = 'none';
        sessionsTab.style.display = 'block';
    }
}

// Filter student sessions by status
function filterStudentSessions(status) {
    console.log('Filtering student sessions by status:', status);

    // Update filter button styles
    const buttons = document.querySelectorAll('[onclick^="filterStudentSessions"]');
    buttons.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(status) || (status === 'all' && btn.textContent.includes('All'))) {
            btn.style.background = '#3b82f6';
            btn.style.color = 'white';
        } else {
            btn.style.background = '#e5e7eb';
            btn.style.color = '#1f2937';
        }
    });

    // Filter session cards
    const sessionCards = document.querySelectorAll('.session-card');
    sessionCards.forEach(card => {
        if (status === 'all' || card.dataset.status === status) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// School search (for autocomplete)
function setupSchoolSearch(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query.length < 2) return;

        const results = TutorProfileState.searchSchools(query);
        displaySchoolResults(results, inputId);
    });
}

function displaySchoolResults(results, inputId) {
    const resultsContainer = document.getElementById(`${inputId}-results`);
    if (!resultsContainer) return;

    if (results.length === 0) {
        resultsContainer.innerHTML = '<p class="text-muted">No schools found</p>';
        return;
    }

    resultsContainer.innerHTML = results.map(school => `
        <div class="school-result" onclick="selectSchool('${inputId}', '${school.name}')">
            <strong>${school.name}</strong>
            <p class="text-muted">${school.location}</p>
        </div>
    `).join('');
}

function selectSchool(inputId, schoolName) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = schoolName;
    }

    const resultsContainer = document.getElementById(`${inputId}-results`);
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
    }
}

// Export functions for global access - Override any previous definitions
(function() {
    console.log('🔧 Setting up tutor-profile global functions (immediate)');

    // Define the close function for ad analytics
    const closeAdAnalyticsModalFn = function() {
        console.log('closeAdAnalyticsModal called (tutor-profile version)');
        const modal = document.getElementById('adAnalyticsModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('active', 'show');
            modal.style.display = 'none';
            modal.style.visibility = 'hidden';
            modal.style.opacity = '0';
            document.body.style.overflow = '';
            console.log('Ad analytics modal closed');
        } else {
            console.error('adAnalyticsModal not found');
        }
    };

    // Set immediately (but don't overwrite if already wrapped by modal-open-fix.js)
    window.toggleSidebar = toggleSidebar;
    if (!window.openAdAnalyticsModal?.__modalOpenFixWrapped) {
        window.openAdAnalyticsModal = openAdAnalyticsModal;
    }
    window.closeAdAnalyticsModal = closeAdAnalyticsModalFn;
    if (!window.openEditProfileModal?.__modalOpenFixWrapped) {
        window.openEditProfileModal = openEditProfileModal;
    }
    window.closeEditProfileModal = closeEditProfileModal;
    window.closeCoverUploadModal = closeCoverUploadModal;
    window.closeProfileUploadModal = closeProfileUploadModal;

    // Override again on window load (after ad-modal.js sets its version)
    window.addEventListener('load', function() {
        console.log('🔧 Re-registering tutor-profile functions on window.load');
        window.closeAdAnalyticsModal = closeAdAnalyticsModalFn;
        console.log('✅ closeAdAnalyticsModal re-registered on load:', typeof window.closeAdAnalyticsModal);
    });

    console.log('✅ Tutor-profile modal functions registered (immediate):');
    console.log('  - openAdAnalyticsModal:', typeof window.openAdAnalyticsModal);
    console.log('  - closeAdAnalyticsModal:', typeof window.closeAdAnalyticsModal);
    console.log('  - closeCoverUploadModal:', typeof window.closeCoverUploadModal);
    console.log('  - closeProfileUploadModal:', typeof window.closeProfileUploadModal);
})();
window.openCertificationModal = openCertificationModal;
window.closeCertificationModal = closeCertificationModal;
window.openExperienceModal = openExperienceModal;
window.closeExperienceModal = closeExperienceModal;
window.openAchievementModal = openAchievementModal;
window.closeAchievementModal = closeAchievementModal;
window.openScheduleModal = openScheduleModal;
window.closeScheduleModal = closeScheduleModal;
window.openCommunityModal = openCommunityModal;
window.closeCommunityModal = closeCommunityModal;
window.openBlogModal = openBlogModal;
window.closeBlogModal = closeBlogModal;
window.openCoverUploadModal = openCoverUploadModal;
window.openProfileUploadModal = openProfileUploadModal;
window.openVideoUploadModal = openVideoUploadModal;
window.closeModal = closeModal;
window.showComingSoonModal = showComingSoonModal;
window.openStudentDetails = openStudentDetails;
window.closeStudentDetails = closeStudentDetails;
window.closeStudentDetailsModal = closeStudentDetailsModal;
window.editCertification = editCertification;
window.deleteCertification = deleteCertification;
window.editExperience = editExperience;
window.deleteExperience = deleteExperience;
window.editAchievement = editAchievement;
window.deleteAchievement = deleteAchievement;
window.uploadVideo = uploadVideo;
window.uploadProfilePicture = uploadProfilePicture;
window.uploadCoverPhoto = uploadCoverPhoto;
window.removeVideoFile = removeVideoFile;
window.removeThumbnail = removeThumbnail;
window.filterVideos = filterVideos;
window.filterBlogPosts = filterBlogPosts;
window.filterConnections = filterConnections;
window.contactStudent = contactStudent;
window.viewStudentProfile = viewStudentProfile;
window.acceptSession = acceptSession;
window.rejectSession = rejectSession;
window.viewConnection = viewConnection;
window.messageConnection = messageConnection;
window.playVideo = playVideo;
window.editBlog = editBlog;
window.viewBlog = viewBlog;
window.openDigitalLab = openDigitalLab;
window.openWhiteboardTool = openWhiteboardTool;
window.openQuizMaker = openQuizMaker;
window.openResourceLibrary = openResourceLibrary;
window.goLive = goLive;
window.createPlaylist = createPlaylist;
window.shareProfile = shareProfile;
window.openSocialLink = openSocialLink;
window.switchCommunitySection = switchCommunitySection;
window.switchStudentSection = switchStudentSection;
window.switchSection = switchSection;
window.setupSchoolSearch = setupSchoolSearch;
window.selectSchool = selectSchool;

// Profile form helper functions
function addLocation() {
    const container = document.getElementById('locationsContainer');
    if (container) {
        const newLocation = document.createElement('div');
        newLocation.className = 'location-item input-group';
        newLocation.innerHTML = `
            <input type="text" class="form-input" placeholder="Enter location" name="location[]">
            <button type="button" class="btn-remove" onclick="removeLocation(this)">×</button>
        `;
        container.appendChild(newLocation);
    }
}

function removeLocation(button) {
    button.parentElement.remove();
}

function addTeachesAt() {
    const container = document.getElementById('teachesAtContainer');
    if (container) {
        const newSchool = document.createElement('div');
        newSchool.className = 'school-item input-group';
        newSchool.innerHTML = `
            <input type="text" class="form-input" placeholder="Enter school name" name="teaches_at[]">
            <button type="button" class="btn-remove" onclick="removeTeachesAt(this)">×</button>
        `;
        container.appendChild(newSchool);
    }
}

function removeTeachesAt(button) {
    button.parentElement.remove();
}

function addCourse() {
    const container = document.getElementById('coursesContainer');
    if (container) {
        const newCourse = document.createElement('div');
        newCourse.className = 'course-item input-group';
        newCourse.innerHTML = `
            <input type="text" class="form-input" placeholder="Enter course name" name="course[]">
            <button type="button" class="btn-remove" onclick="removeCourse(this)">×</button>
        `;
        container.appendChild(newCourse);
    }
}

function removeCourse(button) {
    button.parentElement.remove();
}

// Language functions
function addLanguage() {
    const container = document.getElementById('languagesContainer');
    if (container) {
        const newLanguage = document.createElement('div');
        newLanguage.className = 'language-item input-group';
        newLanguage.innerHTML = `
            <input type="text" class="form-input" placeholder="Enter language (e.g., English, Amharic)" name="language[]">
            <button type="button" class="btn-remove" onclick="removeLanguage(this)">×</button>
        `;
        container.appendChild(newLanguage);
    }
}

function removeLanguage(button) {
    button.parentElement.remove();
}

// Social media link functions
function addSocialLink() {
    const container = document.getElementById('socialMediaContainer');
    if (container) {
        const newSocialLink = document.createElement('div');
        newSocialLink.className = 'social-link-item input-group';
        newSocialLink.innerHTML = `
            <select class="form-select" name="social_platform[]" style="flex: 0 0 140px;">
                <option value="facebook">Facebook</option>
                <option value="twitter">Twitter</option>
                <option value="linkedin">LinkedIn</option>
                <option value="instagram">Instagram</option>
                <option value="youtube">YouTube</option>
                <option value="telegram">Telegram</option>
            </select>
            <input type="url" class="form-input" placeholder="Enter URL" name="social_url[]" style="flex: 1;">
            <button type="button" class="btn-remove" onclick="removeSocialLink(this)">×</button>
        `;
        container.appendChild(newSocialLink);
    }
}

function removeSocialLink(button) {
    button.parentElement.remove();
}

// Store pending profile changes
let pendingProfileChanges = null;
let pendingContactChanges = { email: null, phone: null };

// Save profile function
async function saveProfile() {
    try {
        const form = document.getElementById('editProfileForm');
        if (!form) return;

        // Gather all form data
        const profileData = {
            first_name: document.getElementById('editTutorName')?.value,
            father_name: document.getElementById('editFatherName')?.value,
            grandfather_name: document.getElementById('grandFatherName')?.value,
            username: document.getElementById('username')?.value,
            gender: document.getElementById('gender')?.value,
            email: document.getElementById('editEmail')?.value,
            phone: document.getElementById('editPhone')?.value,
            quote: document.getElementById('profileQuote')?.value,
            bio: document.getElementById('aboutUs')?.value,
        };

        // Get grade level
        profileData.grade_level = document.getElementById('editGradeLevel')?.value || '';
        console.log('📝 Collected grade_level:', profileData.grade_level);

        // Get languages - similar to courses
        const languageInputs = document.querySelectorAll('#languagesContainer .form-input');
        profileData.languages = Array.from(languageInputs).map(input => input.value).filter(v => v.trim());
        console.log('📝 Collected languages:', profileData.languages);

        // Get course type
        profileData.course_type = document.getElementById('editCourseType')?.value || '';
        console.log('📝 Collected course_type:', profileData.course_type);

        // Get locations - convert array to comma-separated string for backend
        const locationInputs = document.querySelectorAll('#locationsContainer .form-input');
        const locationsArray = Array.from(locationInputs).map(input => input.value).filter(v => v.trim());
        profileData.location = locationsArray.join(', '); // Backend expects singular 'location' as string

        // Get schools/teaches at
        const schoolInputs = document.querySelectorAll('#teachesAtContainer .form-input');
        profileData.teaches_at = Array.from(schoolInputs).map(input => input.value).filter(v => v.trim()).join(', ');

        // Get courses
        const courseInputs = document.querySelectorAll('#coursesContainer .form-input');
        profileData.courses = Array.from(courseInputs).map(input => input.value).filter(v => v.trim());

        // Get teaching methods
        const teachingMethods = Array.from(document.querySelectorAll('input[name="teachingMethod"]:checked'))
            .map(cb => cb.value);
        profileData.sessionFormat = teachingMethods.join(', ');

        // Get hero title and subtitle
        profileData.hero_title = document.getElementById('heroTitle')?.value || '';
        profileData.hero_subtitle = document.getElementById('heroSubtitle')?.value || '';

        // Get social media links (new structure)
        const socialPlatforms = document.querySelectorAll('#socialMediaContainer select[name="social_platform[]"]');
        const socialUrls = document.querySelectorAll('#socialMediaContainer input[name="social_url[]"]');
        const socialLinks = {};

        socialPlatforms.forEach((platformSelect, index) => {
            const platform = platformSelect.value;
            const url = socialUrls[index]?.value || '';
            if (url.trim() !== '') {
                socialLinks[platform] = url.trim();
            }
        });

        profileData.social_links = socialLinks;

        // Log complete profile data being sent
        console.log('📤 Complete profileData being sent to backend:', profileData);
        console.log('🔍 Critical fields check:', {
            grade_level: profileData.grade_level,
            languages: profileData.languages,
            gender: profileData.gender,
            course_type: profileData.course_type
        });

        // Check for email/phone changes (requires OTP verification)
        const emailChanged = profileData.email !== originalProfileData.email;
        const phoneChanged = profileData.phone !== originalProfileData.phone;

        if (emailChanged || phoneChanged) {
            // Store pending changes
            pendingProfileChanges = profileData;
            pendingContactChanges = {
                email: emailChanged ? profileData.email : null,
                phone: phoneChanged ? profileData.phone : null
            };

            // Show contact confirmation modal
            showContactConfirmationModal(profileData.email, profileData.phone);
            return; // Stop here, will continue after OTP verification
        }

        // Check for sensitive field changes (requires verification fee)
        const sensitiveFieldsChanged = [];
        if (profileData.first_name !== originalProfileData.first_name) sensitiveFieldsChanged.push('First Name');
        if (profileData.father_name !== originalProfileData.father_name) sensitiveFieldsChanged.push('Father Name');
        if (profileData.grandfather_name !== originalProfileData.grandfather_name) sensitiveFieldsChanged.push('Grandfather Name');
        if (profileData.teaches_at !== originalProfileData.teaches_at) sensitiveFieldsChanged.push('Teaches At');

        if (sensitiveFieldsChanged.length > 0) {
            // Store pending changes
            pendingProfileChanges = profileData;

            // Show verification fee confirmation modal
            showVerificationFeeModal(sensitiveFieldsChanged);
            return; // Stop here, will continue after confirmation
        }

        // No sensitive changes, save directly
        await saveProfileToDatabase(profileData);

    } catch (error) {
        console.error('Error in saveProfile:', error);
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Failed to save profile', 'error');
        }
    }
}

// Actually save the profile to database
async function saveProfileToDatabase(profileData) {
    try {
        console.log('💾 Saving profile data to database...');
        console.log('📦 Data being saved:', profileData);

        // Call the API directly to save the profile
        const result = await TutorProfileAPI.updateTutorProfile(profileData);
        console.log('✅ Save result:', result);

        // Fetch fresh data from database after save
        const updatedProfile = await TutorProfileAPI.getTutorProfile();
        console.log('🔄 Fresh profile after save:', updatedProfile);

        if (updatedProfile) {
            // Update the state
            if (typeof TutorProfileState !== 'undefined') {
                TutorProfileState.setTutorProfile(updatedProfile);
            }

            // Update localStorage instead of TutorProfileDataLoader (which is removed)
            const localUser = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');
            Object.assign(localUser, updatedProfile);
            localStorage.setItem('user', JSON.stringify(localUser));

            // Immediately update the profile header with new data
            updateProfileHeaderImmediate(updatedProfile);
        }

        // Close the modal
        closeEditProfileModal();

        // Show success message
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Profile updated successfully!', 'success');
        }

    } catch (error) {
        console.error('❌ Error saving profile to database:', error);
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Failed to save profile', 'error');
        }
    }
}

// Function to immediately update the profile header without page reload
function updateProfileHeaderImmediate(profile) {
    console.log('🔄 Updating profile header with new data:', profile);

    // Update hero section
    const typedText = document.getElementById('typedText');
    if (typedText && profile.hero_title) {
        typedText.textContent = profile.hero_title;
    }

    const heroSubtitle = document.getElementById('hero-subtitle');
    if (heroSubtitle && profile.hero_subtitle) {
        heroSubtitle.textContent = profile.hero_subtitle;
    }

    // Update profile name - Use username if available
    const tutorName = document.getElementById('tutorName');
    if (tutorName && profile.username) {
        tutorName.textContent = profile.username;
    }

    // Update bio
    const tutorBio = document.getElementById('tutor-bio');
    if (tutorBio && profile.bio) {
        tutorBio.textContent = profile.bio;
    }

    // Update quote
    const tutorQuote = document.getElementById('tutor-quote');
    if (tutorQuote && profile.quote) {
        tutorQuote.textContent = profile.quote;
    }

    // Update location
    const tutorLocation = document.getElementById('tutor-location');
    if (tutorLocation && profile.location) {
        tutorLocation.textContent = profile.location;
    }

    // Update teaches at
    const tutorTeachesAt = document.getElementById('tutor-teaches-at');
    if (tutorTeachesAt && profile.teaches_at) {
        tutorTeachesAt.textContent = profile.teaches_at;
    }

    // Update teaching method/session format
    const tutorTeachingMethod = document.getElementById('tutor-teaching-method');
    if (tutorTeachingMethod && profile.sessionFormat) {
        tutorTeachingMethod.textContent = profile.sessionFormat;
    }

    // Update gender
    const tutorGender = document.getElementById('tutor-gender');
    if (tutorGender && profile.gender) {
        tutorGender.textContent = profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1);
    }

    // Update grade level (using camelCase ID)
    const tutorGradeLevel = document.getElementById('tutorGradeLevel');
    if (tutorGradeLevel && profile.grade_level) {
        tutorGradeLevel.textContent = profile.grade_level;
    }

    // Update course type
    const tutorCourseType = document.getElementById('tutor-course-type');
    if (tutorCourseType && profile.course_type) {
        tutorCourseType.textContent = profile.course_type;
    }

    // Update languages (using camelCase ID)
    const tutorLanguages = document.getElementById('tutorLanguages');
    if (tutorLanguages && profile.languages) {
        tutorLanguages.textContent = Array.isArray(profile.languages)
            ? profile.languages.join(', ')
            : profile.languages;
    }

    // Update courses/subjects
    const tutorSubjects = document.getElementById('tutor-subjects');
    if (tutorSubjects && profile.courses) {
        tutorSubjects.textContent = Array.isArray(profile.courses)
            ? profile.courses.join(', ')
            : profile.courses;
    }

    // Update email
    const tutorEmail = document.getElementById('tutor-email');
    if (tutorEmail && profile.email) {
        tutorEmail.textContent = profile.email;
    }

    // Update phone
    const tutorPhone = document.getElementById('tutor-phone');
    if (tutorPhone && profile.phone) {
        tutorPhone.textContent = profile.phone;
    }

    console.log('✅ Profile header updated successfully');
}

// Image upload functions
function handleImageSelect(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const previewId = type === 'cover' ? 'coverPreview' : 'profilePreview';
        const imageId = type === 'cover' ? 'coverPreviewImage' : 'profilePreviewImage';
        const fileNameId = type === 'cover' ? 'coverFileName' : 'profileFileName';
        const fileSizeId = type === 'cover' ? 'coverFileSize' : 'profileFileSize';
        const dimensionsId = type === 'cover' ? 'coverDimensions' : 'profileDimensions';

        // Show preview container
        const previewContainer = document.getElementById(previewId);
        if (previewContainer) {
            previewContainer.style.display = 'block';
        }

        // Set preview image
        const previewImage = document.getElementById(imageId);
        if (previewImage) {
            previewImage.src = e.target.result;
        }

        // Set file info
        const fileNameEl = document.getElementById(fileNameId);
        if (fileNameEl) {
            fileNameEl.textContent = file.name;
        }

        const fileSizeEl = document.getElementById(fileSizeId);
        if (fileSizeEl) {
            fileSizeEl.textContent = formatFileSize(file.size);
        }

        // Get image dimensions
        const img = new Image();
        img.onload = function() {
            const dimensionsEl = document.getElementById(dimensionsId);
            if (dimensionsEl) {
                dimensionsEl.textContent = `${img.width} x ${img.height}px`;
            }
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);

    // Store file for upload
    if (type === 'cover' && typeof TutorUploadHandler !== 'undefined') {
        TutorUploadHandler.currentUploads.coverPhoto = file;
    } else if (type === 'profile' && typeof TutorUploadHandler !== 'undefined') {
        TutorUploadHandler.currentUploads.profilePicture = file;
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function uploadImage(type) {
    if (typeof TutorUploadHandler === 'undefined') {
        console.error('TutorUploadHandler not available');
        return;
    }

    if (type === 'cover') {
        // Check if file is selected
        if (!TutorUploadHandler.currentUploads.coverPhoto) {
            alert('Please select a cover photo first');
            return;
        }

        // Show progress
        const progressEl = document.getElementById('coverProgress');
        if (progressEl) progressEl.style.display = 'block';

        // Simulate progress animation
        animateUploadProgress(type, async () => {
            await TutorUploadHandler.uploadCoverPhoto();
        });
    } else if (type === 'profile') {
        // Check if file is selected
        if (!TutorUploadHandler.currentUploads.profilePicture) {
            alert('Please select a profile picture first');
            return;
        }

        // Show progress
        const progressEl = document.getElementById('profileProgress');
        if (progressEl) progressEl.style.display = 'block';

        // Simulate progress animation
        animateUploadProgress(type, async () => {
            await TutorUploadHandler.uploadProfilePicture();
        });
    }
}

function animateUploadProgress(type, uploadCallback) {
    const progressFillId = type === 'cover' ? 'coverProgressFill' : 'profileProgressFill';
    const progressTextId = type === 'cover' ? 'coverProgressText' : 'profileProgressText';

    const progressFill = document.getElementById(progressFillId);
    const progressText = document.getElementById(progressTextId);

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;

        if (progressFill) progressFill.style.width = progress + '%';
        if (progressText) progressText.textContent = `Uploading... ${Math.round(progress)}%`;

        if (progress >= 90) {
            clearInterval(interval);
            // Complete the upload
            uploadCallback().then(() => {
                if (progressFill) progressFill.style.width = '100%';
                if (progressText) progressText.textContent = 'Upload complete!';

                setTimeout(() => {
                    const progressContainer = document.getElementById(type + 'Progress');
                    if (progressContainer) progressContainer.style.display = 'none';
                }, 1000);
            });
        }
    }, 200);
}

function resetUpload(type) {
    if (type === 'story') {
        const input = document.getElementById('storyInput');
        if (input) input.value = '';

        const preview = document.getElementById('storyPreview');
        if (preview) preview.style.display = 'none';

        const imagePreview = document.getElementById('storyPreviewImage');
        const videoPreview = document.getElementById('storyPreviewVideo');
        if (imagePreview) {
            imagePreview.src = '';
            imagePreview.style.display = 'none';
        }
        if (videoPreview) {
            videoPreview.src = '';
            videoPreview.style.display = 'none';
        }

        const caption = document.getElementById('storyCaption');
        if (caption) caption.value = '';

        const captionCount = document.getElementById('storyCaptionCount');
        if (captionCount) captionCount.textContent = '0';

        // Clear stored file
        window.storyUploadFile = null;
    } else {
        const inputId = type === 'cover' ? 'coverInput' : 'profileInput';
        const previewId = type === 'cover' ? 'coverPreview' : 'profilePreview';
        const imageId = type === 'cover' ? 'coverPreviewImage' : 'profilePreviewImage';

        const input = document.getElementById(inputId);
        if (input) input.value = '';

        const preview = document.getElementById(previewId);
        if (preview) preview.style.display = 'none';

        const image = document.getElementById(imageId);
        if (image) image.src = '';

        // Clear stored file
        if (type === 'cover' && typeof TutorUploadHandler !== 'undefined') {
            TutorUploadHandler.currentUploads.coverPhoto = null;
        } else if (type === 'profile' && typeof TutorUploadHandler !== 'undefined') {
            TutorUploadHandler.currentUploads.profilePicture = null;
        }
    }
}

// ============================================
// COMMUNITY CONNECTIONS DATA AND LOADING
// ============================================

// ============================================
// PROFILE-BASED ROLE BADGE HELPER
// ============================================

/**
 * Get profile-based role badge from connection data
 * Uses profile_type_1 or profile_type_2 from the connections table (NOT generic user roles)
 *
 * Connection data from API contains:
 * - profile_id_1, profile_type_1: First profile in connection (from tutor_profiles/student_profiles/etc.)
 * - profile_id_2, profile_type_2: Second profile in connection
 * - user_id_1, user_id_2: Legacy user IDs (for backwards compatibility)
 *
 * This function determines which profile belongs to the "other" person in the connection
 * and returns a formatted badge based on their profile type.
 */
function getProfileBadge(connection) {
    // Get current user ID (from auth system)
    const currentUserId = window.user?.id;
    if (!currentUserId) {
        return 'User'; // Fallback if not logged in
    }

    // Determine which profile is the "other" person's profile
    let profileType;

    if (connection.user_id_1 === currentUserId) {
        // Current user is user_id_1, so show profile_type_2
        profileType = connection.profile_type_2;
    } else if (connection.user_id_2 === currentUserId) {
        // Current user is user_id_2, so show profile_type_1
        profileType = connection.profile_type_1;
    } else {
        // Fallback: If we can't determine, check which profile type exists
        profileType = connection.profile_type_1 || connection.profile_type_2 || 'user';
    }

    // Map profile types to display labels
    const profileTypeMap = {
        'tutor': 'Tutor',
        'student': 'Student',
        'parent': 'Parent',
        'advertiser': 'Advertiser'
    };

    return profileTypeMap[profileType] || profileType.charAt(0).toUpperCase() + profileType.slice(1);
}

// Get sample connections data (enhanced with stats and activity)
// NOTE: Sample data includes BOTH legacy 'role' field AND profile-based fields for testing
function getConnectionsData() {
    // Get current user ID for profile-based data (fallback to 115 for demo)
    const currentUserId = window.user?.id || 115;

    return [
        {
            id: 1,
            name: 'Abebe Bekele',
            role: 'Student', // Legacy field (fallback)
            type: 'students',
            avatar: '../uploads/system_images/system_profile_pictures/student-college-boy.jpg',
            isOnline: true,
            connectedDate: '2025-09-15',
            mutualConnections: 12,
            lastActivity: 'Posted 2 hours ago',
            bio: 'Grade 11 student focusing on Mathematics and Physics',
            location: 'Addis Ababa',
            // Profile-based fields (NEW - from connections table)
            user_id_1: currentUserId,
            user_id_2: 50,
            profile_id_1: 85, // Current user's tutor profile
            profile_type_1: 'tutor',
            profile_id_2: 12, // Abebe's student profile
            profile_type_2: 'student'
        },
        {
            id: 2,
            name: 'Tigist Haile',
            role: 'Parent', // Legacy field (fallback)
            type: 'parents',
            avatar: '../uploads/system_images/system_profile_pictures/Mom-profile.jpg',
            isOnline: false,
            connectedDate: '2025-08-20',
            mutualConnections: 8,
            lastSeen: 'Last seen 3 hours ago',
            bio: 'Mother of two students in Grade 9 and 10',
            location: 'Bahir Dar',
            // Profile-based fields (NEW)
            user_id_1: currentUserId,
            user_id_2: 75,
            profile_id_1: 85, // Current user's tutor profile
            profile_type_1: 'tutor',
            profile_id_2: 5, // Tigist's parent profile
            profile_type_2: 'parent'
        },
        {
            id: 3,
            name: 'Yonas Tesfaye',
            role: 'Colleague', // Legacy field (fallback)
            type: 'colleagues',
            avatar: '../uploads/system_images/system_profile_pictures/tutor-.jpg',
            isOnline: true,
            connectedDate: '2025-07-10',
            mutualConnections: 25,
            lastActivity: 'Posted 1 hour ago',
            bio: 'Physics tutor with 8 years experience',
            location: 'Hawassa',
            // Profile-based fields (NEW)
            user_id_1: currentUserId,
            user_id_2: 73,
            profile_id_1: 85, // Current user's tutor profile
            profile_type_1: 'tutor',
            profile_id_2: 51, // Yonas's tutor profile (professional connection)
            profile_type_2: 'tutor'
        },
        {
            id: 4,
            name: 'Marta Girma',
            role: 'Fan',
            type: 'fans',
            avatar: '../uploads/system_images/system_profile_pictures/student-teenage-girl.jpg',
            isOnline: false,
            connectedDate: '2025-10-01',
            mutualConnections: 5,
            lastSeen: 'Last seen yesterday',
            bio: 'Aspiring educator and content enthusiast',
            location: 'Dire Dawa'
        },
        {
            id: 5,
            name: 'Daniel Kebede',
            role: 'Student',
            type: 'students',
            avatar: '../uploads/system_images/system_profile_pictures/student-teenage-boy.jpg',
            isOnline: true,
            connectedDate: '2025-09-28',
            mutualConnections: 15,
            lastActivity: 'Active now',
            bio: 'Grade 12 student preparing for university entrance',
            location: 'Mekelle'
        },
        {
            id: 6,
            name: 'Rahel Tadesse',
            role: 'Parent',
            type: 'parents',
            avatar: '../uploads/system_images/system_profile_pictures/Mom-profile.jpg',
            isOnline: true,
            connectedDate: '2025-06-15',
            mutualConnections: 10,
            lastActivity: 'Posted 30 minutes ago',
            bio: 'Parent of Grade 8 student, Chemistry enthusiast',
            location: 'Addis Ababa'
        },
        {
            id: 7,
            name: 'Dawit Solomon',
            role: 'Colleague',
            type: 'colleagues',
            avatar: '../uploads/system_images/system_profile_pictures/tutor-.jpg',
            isOnline: false,
            connectedDate: '2025-05-20',
            mutualConnections: 30,
            lastSeen: 'Last seen 2 days ago',
            bio: 'Mathematics educator and curriculum developer',
            location: 'Jimma'
        },
        {
            id: 8,
            name: 'Sara Mekonnen',
            role: 'Fan',
            type: 'fans',
            avatar: '../uploads/system_images/system_profile_pictures/girl-user-image.jpg',
            isOnline: true,
            connectedDate: '2025-10-10',
            mutualConnections: 7,
            lastActivity: 'Posted 4 hours ago',
            bio: 'Education advocate and learning enthusiast',
            location: 'Adama'
        }
    ];
}

// Get sample requests data (enhanced with mutual connections)
function getRequestsData() {
    return [
        {
            id: 101,
            name: 'Lemlem Assefa',
            role: 'Student',
            type: 'students',
            avatar: '../uploads/system_images/system_profile_pictures/student-college-girl.jpg',
            requestDate: '2025-10-20',
            mutualConnections: 6,
            bio: 'Grade 10 student interested in Biology',
            location: 'Addis Ababa'
        },
        {
            id: 102,
            name: 'Mulugeta Alemu',
            role: 'Parent',
            type: 'parents',
            avatar: '../uploads/system_images/system_profile_pictures/Dad-profile.jpg',
            requestDate: '2025-10-19',
            mutualConnections: 4,
            bio: 'Father of Grade 7 student',
            location: 'Dessie'
        },
        {
            id: 103,
            name: 'Hanna Desta',
            role: 'Student',
            type: 'students',
            avatar: '../uploads/system_images/system_profile_pictures/student-teenage-girl-1.jpg',
            requestDate: '2025-10-18',
            mutualConnections: 9,
            bio: 'University freshman studying Computer Science',
            location: 'Bahir Dar'
        },
        {
            id: 104,
            name: 'Bereket Gebre',
            role: 'Colleague',
            type: 'colleagues',
            avatar: '../uploads/system_images/system_profile_pictures/tutor-.jpg',
            requestDate: '2025-10-17',
            mutualConnections: 18,
            bio: 'English language tutor',
            location: 'Gondar'
        },
        {
            id: 105,
            name: 'Selam Yohannes',
            role: 'Fan',
            type: 'fans',
            avatar: '../uploads/system_images/system_profile_pictures/girl-user-image.jpg',
            requestDate: '2025-10-16',
            mutualConnections: 3,
            bio: 'Education content creator',
            location: 'Harar'
        }
    ];
}

// Fetch real connections from API
async function fetchConnectionsFromAPI() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('No auth token found, using sample data');
            return getConnectionsData();
        }

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/connections/my', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!response.ok) {
            console.error('API error:', response.status);
            return getConnectionsData(); // Fallback to sample data
        }

        const connections = await response.json();
        const currentUserId = window.user?.id;

        // Transform API data to match expected format
        return connections.map(conn => {
            const isUser1 = conn.user_id_1 === currentUserId;
            const otherUserId = isUser1 ? conn.user_id_2 : conn.user_id_1;
            const otherUserName = isUser1 ? conn.user_2_name : conn.user_1_name;
            const otherProfilePic = isUser1 ? conn.user_2_profile_picture : conn.user_1_profile_picture;

            return {
                id: conn.id,
                name: otherUserName,
                avatar: otherProfilePic || '../uploads/system_images/system_profile_pictures/man-user.png',
                user_id_1: conn.user_id_1,
                user_id_2: conn.user_id_2,
                profile_id_1: conn.profile_id_1,
                profile_type_1: conn.profile_type_1,
                profile_id_2: conn.profile_id_2,
                profile_type_2: conn.profile_type_2,
                status: conn.status,
                isOnline: false, // TODO: Get from WebSocket
                connectedDate: conn.connected_at || conn.created_at,
                mutualConnections: 0, // TODO: Calculate
                lastActivity: 'Recently active',
                bio: `Connected as ${isUser1 ? conn.profile_type_2 : conn.profile_type_1}`,
                location: 'Addis Ababa',
                // NO 'role' field! Use profile_type_1/2 instead
            };
        });
    } catch (error) {
        console.error('Error fetching connections:', error);
        // Fallback to sample data on error
        return getConnectionsData();
    }
}

// Render connection card (enhanced with stats and hover preview)
function renderConnectionCard(connection) {
    const activityStatus = connection.isOnline
        ? (connection.lastActivity || 'Active now')
        : (connection.lastSeen || 'Offline');

    const connectedDays = Math.floor((new Date() - new Date(connection.connectedDate)) / (1000 * 60 * 60 * 24));
    const connectedText = connectedDays === 0 ? 'Connected today' :
                         connectedDays === 1 ? 'Connected yesterday' :
                         `Connected ${connectedDays} days ago`;

    // Get profile-based role badge (profile_type_1 or profile_type_2 from connections table)
    const roleBadge = getProfileBadge(connection);

    return `
        <div class="connection-card" data-connection-id="${connection.id}"
             onmouseenter="showProfilePreview(${connection.id}, event)"
             onmouseleave="hideProfilePreview()">
            <div class="connection-header">
                <img src="${connection.avatar}" alt="${connection.name}" class="connection-avatar">
                ${connection.isOnline ? '<span class="online-indicator"></span>' : ''}
            </div>
            <div class="connection-info">
                <h4>${connection.name}</h4>
                <p><span class="role-badge">${roleBadge}</span></p>
                <p class="connection-stats">
                    <span class="stat-item" title="Connected on ${new Date(connection.connectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}">
                        <i class="fas fa-calendar"></i> ${connectedText}
                    </span>
                </p>
                <p class="connection-stats">
                    <span class="stat-item" title="Mutual connections">
                        <i class="fas fa-users"></i> ${connection.mutualConnections} mutual
                    </span>
                    <span class="stat-separator">•</span>
                    <span class="activity-status ${connection.isOnline ? 'online' : 'offline'}">
                        ${activityStatus}
                    </span>
                </p>
            </div>
            <div class="connection-actions">
                <button class="btn-action" onclick="openChat(${connection.id})">Message</button>
                <button class="btn-action-secondary" onclick="viewConnection(${connection.id})">View</button>
            </div>
        </div>
    `;
}

// Render request card (enhanced with mutual connections)
function renderRequestCard(request) {
    const requestDays = Math.floor((new Date() - new Date(request.requestDate)) / (1000 * 60 * 60 * 24));
    const requestText = requestDays === 0 ? 'Requested today' :
                       requestDays === 1 ? 'Requested yesterday' :
                       `Requested ${requestDays} days ago`;

    // Get profile-based role badge (profile_type_1 or profile_type_2 from connections table)
    const roleBadge = getProfileBadge(request);

    return `
        <div class="connection-card request-card" data-request-id="${request.id}"
             onmouseenter="showProfilePreview(${request.id}, event, true)"
             onmouseleave="hideProfilePreview()">
            <div class="connection-header">
                <img src="${request.avatar}" alt="${request.name}" class="connection-avatar">
            </div>
            <div class="connection-info">
                <h4>${request.name}</h4>
                <p><span class="role-badge">${roleBadge}</span></p>
                <p class="connection-stats">
                    <span class="stat-item">
                        <i class="fas fa-clock"></i> ${requestText}
                    </span>
                </p>
                <p class="connection-stats">
                    <span class="stat-item" title="Mutual connections">
                        <i class="fas fa-users"></i> ${request.mutualConnections} mutual connections
                    </span>
                </p>
            </div>
            <div class="connection-actions">
                <button class="btn-action" onclick="acceptRequest(${request.id})">Accept</button>
                <button class="btn-action-secondary" onclick="rejectRequest(${request.id})">Decline</button>
            </div>
        </div>
    `;
}

// Load all connections when modal opens
function loadConnections() {
    filterCommunity('all', 'all');
}

// Load only connections section
async function loadConnectionsOnly() {
    const grid = document.getElementById('connectionsGrid');
    if (!grid) return;

    const connections = await fetchConnectionsFromAPI();
    grid.innerHTML = connections.map(c => renderConnectionCard(c)).join('');
}

// Load requests section
function loadRequests() {
    const grid = document.getElementById('requestsGrid');
    if (!grid) return;

    const requests = getRequestsData();
    grid.innerHTML = requests.map(r => renderRequestCard(r)).join('');
}

// Filter community connections
async function filterCommunity(section, filter) {
    // Use communityManager if available (database integration)
    if (window.communityManager) {
        // Load data from database with filter
        window.communityManager.loadSectionGrid(section, filter);

        // Update active filter button
        const parentSection = document.getElementById(`${section}-section`);
        if (parentSection) {
            const filterBtns = parentSection.querySelectorAll('.filter-btn');
            filterBtns.forEach(btn => {
                const btnFilter = btn.getAttribute('onclick')?.match(/filterCommunity\('(.+?)', '(.+?)'\)/)?.[2];
                if (btnFilter === filter) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        return;
    }

    // Fetch real data from API (with fallback to sample data)
    let grid;
    let data;

    // Determine which grid and data to use
    if (section === 'all') {
        grid = document.getElementById('allGrid');
        data = await fetchConnectionsFromAPI(); // Use API!
    } else if (section === 'requests') {
        grid = document.getElementById('requestsGrid');
        data = getRequestsData();
    } else if (section === 'connections') {
        grid = document.getElementById('connectionsGrid');
        data = await fetchConnectionsFromAPI(); // Use API!
    }

    if (!grid) return;

    // Filter data by type (map profile_type to type for filtering)
    let filteredData = data;
    if (filter !== 'all') {
        filteredData = data.filter(item => {
            // Get the other person's profile type
            const currentUserId = window.user?.id;
            let profileType;

            if (item.user_id_1 === currentUserId) {
                profileType = item.profile_type_2;
            } else if (item.user_id_2 === currentUserId) {
                profileType = item.profile_type_1;
            }

            // Map filter to profile types
            const filterMap = {
                'students': 'student',
                'parents': 'parent',
                'tutors': 'tutor',
                'advertisers': 'advertiser'
            };

            return profileType === filterMap[filter];
        });
    }

    // Render filtered data
    if (section === 'requests') {
        grid.innerHTML = filteredData.map(r => renderRequestCard(r)).join('');
    } else {
        grid.innerHTML = filteredData.map(c => renderConnectionCard(c)).join('');
    }

    // Update active filter button
    const parentSection = document.getElementById(`${section}-section`);
    if (parentSection) {
        const filterBtns = parentSection.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            const btnFilter = btn.getAttribute('onclick')?.match(/filterCommunity\('(.+?)', '(.+?)'\)/)?.[2];
            if (btnFilter === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}

// Connection action handlers
function openChat(connectionId) {
    console.log('Opening chat with connection:', connectionId);
    // TODO: Implement chat functionality
    alert('Chat feature coming soon!');
}

function viewConnection(connectionId) {
    console.log('Viewing connection:', connectionId);
    // TODO: Implement view profile functionality
    alert('View profile feature coming soon!');
}

function acceptRequest(requestId) {
    console.log('Accepting request:', requestId);
    // TODO: Implement accept request functionality
    alert('Request accepted!');
    loadRequests(); // Refresh the requests list
}

function rejectRequest(requestId) {
    console.log('Rejecting request:', requestId);
    // TODO: Implement reject request functionality
    if (confirm('Are you sure you want to decline this request?')) {
        alert('Request declined!');
        loadRequests(); // Refresh the requests list
    }
}

// ============================================
// SEARCH FUNCTIONALITY FOR ALL SECTIONS
// ============================================

// Initialize search listeners when modal opens
function initializeCommunitySearch() {
    // All section search
    const allSearch = document.getElementById('community-search');
    if (allSearch) {
        allSearch.addEventListener('input', debounce((e) => {
            searchConnections(e.target.value, 'all');
        }, 300));
    }

    // Requests section search
    const requestsSearch = document.getElementById('requests-search');
    if (requestsSearch) {
        requestsSearch.addEventListener('input', debounce((e) => {
            searchConnections(e.target.value, 'requests');
        }, 300));
    }

    // Connections section search
    const connectionsSearch = document.getElementById('connections-search');
    if (connectionsSearch) {
        connectionsSearch.addEventListener('input', debounce((e) => {
            searchConnections(e.target.value, 'connections');
        }, 300));
    }

    // Events section search
    const eventsSearch = document.getElementById('events-search');
    if (eventsSearch) {
        eventsSearch.addEventListener('input', debounce((e) => {
            searchEvents(e.target.value);
        }, 300));
    }

    // Clubs section search
    const clubsSearch = document.getElementById('clubs-search');
    if (clubsSearch) {
        clubsSearch.addEventListener('input', debounce((e) => {
            searchClubs(e.target.value);
        }, 300));
    }
}

// Debounce helper for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Search connections by name - now uses database via CommunityManager
function searchConnections(query, section) {
    // Use communityManager for database search if available
    if (window.communityManager && typeof window.communityManager.searchConnections === 'function') {
        console.log(`🔍 Searching connections from database: "${query}" in section: ${section}`);
        window.communityManager.searchConnections(query, section);
        return;
    }

    // Fallback to hardcoded data if communityManager not available
    console.warn('⚠ CommunityManager not available, using hardcoded search fallback');

    let grid, data, renderFunc;

    if (section === 'all') {
        grid = document.getElementById('allGrid');
        data = getConnectionsData();
        renderFunc = renderConnectionCard;
    } else if (section === 'requests') {
        grid = document.getElementById('requestsGrid');
        data = getRequestsData();
        renderFunc = renderRequestCard;
    } else if (section === 'connections') {
        grid = document.getElementById('connectionsGrid');
        data = getConnectionsData();
        renderFunc = renderConnectionCard;
    }

    if (!grid || !data) return;

    // Filter by search query
    const filtered = query.trim() === ''
        ? data
        : data.filter(item =>
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            item.role.toLowerCase().includes(query.toLowerCase()) ||
            (item.bio && item.bio.toLowerCase().includes(query.toLowerCase())) ||
            (item.location && item.location.toLowerCase().includes(query.toLowerCase()))
        );

    // Render filtered results
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <p>No results found for "${query}"</p>
                <p style="font-size: 0.9rem; opacity: 0.7;">Try different keywords</p>
            </div>
        `;
    } else {
        grid.innerHTML = filtered.map(item => renderFunc(item)).join('');
    }
}

// Search events by title/description
async function searchEvents(query) {
    // If empty query, just reload all events
    if (query.trim() === '') {
        loadEventsSection();
        return;
    }

    // Otherwise, fetch all events and filter client-side
    const eventsGrid = document.getElementById('eventsGrid');
    if (!eventsGrid) return;

    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/events?status_filter=upcoming', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch events');

        const data = await response.json();
        const eventsData = data.events || [];

        const filtered = eventsData.filter(event =>
            event.title.toLowerCase().includes(query.toLowerCase()) ||
            event.description.toLowerCase().includes(query.toLowerCase()) ||
            event.location.toLowerCase().includes(query.toLowerCase())
        );

        if (filtered.length === 0) {
            eventsGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p>No events found for "${query}"</p>
                    <p style="font-size: 0.9rem; opacity: 0.7;">Try different keywords</p>
                </div>
            `;
        } else {
            // Render filtered events (reuse the render logic from loadEventsSection)
            eventsGrid.innerHTML = filtered.map(event => {
                const startDate = new Date(event.start_datetime);
                const isOnline = event.is_online || event.location.toLowerCase() === 'online';

                // Determine creative badge text - compare profile IDs
                let creativeBadge = '';
                const currentProfileId = user.tutor_id || user.admin_id;
                const currentProfileType = user.tutor_id ? 'tutor' : (user.admin_id ? 'admin' : null);

                if (event.created_by === currentProfileId && event.creator_type === currentProfileType) {
                    creativeBadge = '<span class="creative-badge your-event">Your Event</span>';
                } else if (event.is_system || event.creator_type === 'admin') {
                    creativeBadge = '<span class="creative-badge system-event">System Event</span>';
                } else if (event.joined_status) {
                    creativeBadge = '<span class="creative-badge participating">Participating</span>';
                }

                return `
                    <div class="event-card">
                        ${event.event_picture ? `<img src="${event.event_picture}" alt="${event.title}" class="event-image">` : ''}
                        <div class="event-header">
                            <h3>${event.title}</h3>
                            <div class="event-badges">
                                ${creativeBadge}
                                <span class="event-badge ${isOnline ? 'online' : ''}">${event.location}</span>
                            </div>
                        </div>
                        <div class="event-details">
                            <div class="event-detail-item">
                                <span>📅</span>
                                <span>${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </div>
                            <div class="event-detail-item">
                                <span>🕐</span>
                                <span>${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div class="event-detail-item">
                                <span>👥</span>
                                <span>${event.registered_count}/${event.available_seats} registered</span>
                            </div>
                            ${event.price > 0 ? `
                            <div class="event-detail-item">
                                <span>💰</span>
                                <span>${event.price} ETB</span>
                            </div>
                            ` : '<div class="event-detail-item"><span>🎁</span><span>Free</span></div>'}
                        </div>
                        <p class="event-description">${event.description}</p>
                        <div class="event-actions">
                            <button class="action-btn" onclick="viewEvent(${event.id})">View Details</button>
                            <button class="action-btn primary" onclick="joinEvent(${event.id})">Join Event</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error searching events:', error);
        eventsGrid.innerHTML = `<div class="error-state"><p>Failed to search events</p></div>`;
    }
}

// Search clubs by name/description
async function searchClubs(query) {
    // If empty query, just reload all clubs
    if (query.trim() === '') {
        loadClubsSection();
        return;
    }

    // Otherwise, fetch all clubs and filter client-side
    const clubsGrid = document.getElementById('clubsGrid');
    if (!clubsGrid) return;

    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/clubs?status_filter=active', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch clubs');

        const data = await response.json();
        const clubsData = data.clubs || [];

        const filtered = clubsData.filter(club =>
            club.title.toLowerCase().includes(query.toLowerCase()) ||
            club.description.toLowerCase().includes(query.toLowerCase()) ||
            club.category.toLowerCase().includes(query.toLowerCase())
        );

        if (filtered.length === 0) {
            clubsGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search" style="font-size: 3rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p>No clubs found for "${query}"</p>
                    <p style="font-size: 0.9rem; opacity: 0.7;">Try different keywords</p>
                </div>
            `;
        } else {
            // Render filtered clubs (reuse the render logic from loadClubsSection)
            clubsGrid.innerHTML = filtered.map(club => {
                // Determine creative badge text - compare profile IDs
                let creativeBadge = '';
                const currentProfileId = user.tutor_id || user.admin_id;
                const currentProfileType = user.tutor_id ? 'tutor' : (user.admin_id ? 'admin' : null);

                if (club.created_by === currentProfileId && club.creator_type === currentProfileType) {
                    creativeBadge = '<span class="creative-badge your-club">Your Club</span>';
                } else if (club.is_system || club.creator_type === 'admin') {
                    creativeBadge = '<span class="creative-badge system-club">System Club</span>';
                } else if (club.joined_status) {
                    creativeBadge = '<span class="creative-badge member">Member</span>';
                }

                return `
                    <div class="club-card">
                        ${club.club_picture ? `<img src="${club.club_picture}" alt="${club.title}" class="event-image">` : ''}
                        <div class="event-header">
                            <h3>${club.title}</h3>
                            <div class="event-badges">
                                ${creativeBadge}
                                <span class="club-category">${club.category}</span>
                            </div>
                        </div>
                        <div class="event-details">
                            <div class="event-detail-item">
                                <span>👥</span>
                                <span>${club.member_count}/${club.member_limit} members</span>
                            </div>
                            ${club.is_paid ? `
                            <div class="event-detail-item">
                                <span>💰</span>
                                <span>${club.membership_fee} ETB</span>
                            </div>
                            ` : '<div class="event-detail-item"><span>🎁</span><span>Free</span></div>'}
                            <div class="event-detail-item">
                                <span>📚</span>
                                <span>${club.category}</span>
                            </div>
                        </div>
                        <p class="event-description">${club.description}</p>
                        <div class="event-actions">
                            <button class="action-btn" onclick="viewClub(${club.id})">View Details</button>
                            <button class="action-btn primary" onclick="joinClub(${club.id})">Join Club</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error searching clubs:', error);
        clubsGrid.innerHTML = `<div class="error-state"><p>Failed to search clubs</p></div>`;
    }
}

// Get events data (for search)
function getEventsData() {
    return [
        {
            id: 1,
            title: 'Mathematics Workshop',
            date: '2025-10-15',
            time: '14:00',
            location: 'Online',
            attendees: 45,
            description: 'Advanced calculus problem-solving workshop'
        },
        {
            id: 2,
            title: 'Science Fair',
            date: '2025-10-20',
            time: '10:00',
            location: 'Addis Ababa University',
            attendees: 120,
            description: 'Annual science fair showcasing student projects'
        },
        {
            id: 3,
            title: 'English Literature Seminar',
            date: '2025-10-25',
            time: '15:30',
            location: 'Online',
            attendees: 35,
            description: 'Discussion on contemporary Ethiopian literature'
        }
    ];
}

// Get clubs data (for search)
function getClubsData() {
    return [
        {
            id: 1,
            name: 'Mathematics Excellence Club',
            members: 156,
            category: 'Academic',
            description: 'For passionate mathematics enthusiasts and tutors',
            image: '../uploads/system_images/system_images/Math wallpaper 1.jpeg'
        },
        {
            id: 2,
            name: 'Science Educators Network',
            members: 203,
            category: 'Academic',
            description: 'Connecting science teachers and tutors across Ethiopia',
            image: '../uploads/system_images/system_images/Physics wall paper 1.jpeg'
        },
        {
            id: 3,
            name: 'English Language Club',
            members: 178,
            category: 'Language',
            description: 'Practice and improve English language skills',
            image: '../uploads/system_images/system_images/Chemistry wallpaper 3.jpg'
        }
    ];
}

// ============================================
// PROFILE PREVIEW ON HOVER
// ============================================

let previewTimeout;
let currentPreview = null;

function showProfilePreview(id, event, isRequest = false) {
    // Clear existing timeout
    clearTimeout(previewTimeout);

    // Delay showing preview by 500ms
    previewTimeout = setTimeout(() => {
        const data = isRequest ? getRequestsData() : getConnectionsData();
        const profile = data.find(item => item.id === id);

        if (!profile) return;

        // Remove any existing preview
        hideProfilePreview();

        // Create preview element
        const preview = document.createElement('div');
        preview.className = 'profile-preview-card';
        preview.innerHTML = `
            <div class="preview-header">
                <img src="${profile.avatar}" alt="${profile.name}" class="preview-avatar">
                ${profile.isOnline ? '<span class="preview-online-badge"></span>' : ''}
            </div>
            <div class="preview-body">
                <h4>${profile.name}</h4>
                <p class="preview-role">${profile.role}</p>
                ${profile.location ? `<p class="preview-location"><i class="fas fa-map-marker-alt"></i> ${profile.location}</p>` : ''}
                ${profile.bio ? `<p class="preview-bio">${profile.bio}</p>` : ''}
                ${profile.mutualConnections ? `<p class="preview-mutual"><i class="fas fa-users"></i> ${profile.mutualConnections} mutual connections</p>` : ''}
                ${!isRequest && profile.connectedDate ? `<p class="preview-connected"><i class="fas fa-calendar"></i> Connected ${new Date(profile.connectedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>` : ''}
            </div>
            <div class="preview-footer">
                <button class="btn-preview" onclick="viewConnection(${id})">View Full Profile</button>
            </div>
        `;

        // Position the preview
        const card = event.currentTarget;
        const rect = card.getBoundingClientRect();
        const modalContent = document.querySelector('.community-modal-content');

        preview.style.position = 'fixed';
        preview.style.left = `${rect.right + 10}px`;
        preview.style.top = `${rect.top}px`;
        preview.style.zIndex = '10000';

        // Adjust if preview goes off screen
        if (modalContent) {
            const modalRect = modalContent.getBoundingClientRect();
            if (rect.right + 310 > modalRect.right) {
                preview.style.left = `${rect.left - 310}px`;
            }
        }

        document.body.appendChild(preview);
        currentPreview = preview;

        // Fade in animation
        setTimeout(() => {
            preview.classList.add('show');
        }, 10);
    }, 500);
}

function hideProfilePreview() {
    clearTimeout(previewTimeout);
    if (currentPreview) {
        currentPreview.classList.remove('show');
        setTimeout(() => {
            if (currentPreview && currentPreview.parentNode) {
                currentPreview.parentNode.removeChild(currentPreview);
            }
            currentPreview = null;
        }, 200);
    }
}

// Load events section
async function loadEventsSection() {
    const eventsGrid = document.getElementById('eventsGrid');
    if (!eventsGrid) return;

    eventsGrid.innerHTML = '<div class="loading-spinner">Loading events...</div>';

    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/events?status_filter=upcoming', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch events');

        const data = await response.json();
        const events = data.events || [];

        if (events.length === 0) {
            eventsGrid.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <h3>No Events Yet</h3>
                    <p>Be the first to create an educational event!</p>
                    <button class="btn-primary" onclick="openModal('create-event-modal')">Create Event</button>
                </div>
            `;
            return;
        }

        eventsGrid.innerHTML = events.map(event => {
            const startDate = new Date(event.start_datetime);
            const isOnline = event.is_online || event.location.toLowerCase() === 'online';

            // Determine creative badge text - compare profile IDs
            let creativeBadge = '';
            const currentProfileId = user.tutor_id || user.admin_id;
            const currentProfileType = user.tutor_id ? 'tutor' : (user.admin_id ? 'admin' : null);

            if (event.created_by === currentProfileId && event.creator_type === currentProfileType) {
                creativeBadge = '<span class="creative-badge your-event">Your Event</span>';
            } else if (event.is_system || event.creator_type === 'admin') {
                creativeBadge = '<span class="creative-badge system-event">System Event</span>';
            } else if (event.joined_status) {
                creativeBadge = '<span class="creative-badge participating">Participating</span>';
            }

            return `
                <div class="event-card">
                    ${event.event_picture ? `<img src="${event.event_picture}" alt="${event.title}" class="event-image">` : ''}
                    <div class="event-header">
                        <h3>${event.title}</h3>
                        <div class="event-badges">
                            ${creativeBadge}
                            <span class="event-badge ${isOnline ? 'online' : ''}">${event.location}</span>
                        </div>
                    </div>
                    <div class="event-details">
                        <div class="event-detail-item">
                            <span>📅</span>
                            <span>${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div class="event-detail-item">
                            <span>🕐</span>
                            <span>${startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div class="event-detail-item">
                            <span>👥</span>
                            <span>${event.registered_count}/${event.available_seats} registered</span>
                        </div>
                        ${event.price > 0 ? `
                        <div class="event-detail-item">
                            <span>💰</span>
                            <span>${event.price} ETB</span>
                        </div>
                        ` : '<div class="event-detail-item"><span>🎁</span><span>Free</span></div>'}
                    </div>
                    <p class="event-description">${event.description}</p>
                    <div class="event-actions">
                        <button class="action-btn" onclick="viewEvent(${event.id})">View Details</button>
                        <button class="action-btn primary" onclick="joinEvent(${event.id})">Join Event</button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading events:', error);
        eventsGrid.innerHTML = `
            <div class="error-state">
                <p>Failed to load events. Please try again.</p>
                <button class="btn-secondary" onclick="loadEventsSection()">Retry</button>
            </div>
        `;
    }
}

// Load clubs section
async function loadClubsSection() {
    const clubsGrid = document.getElementById('clubsGrid');
    if (!clubsGrid) return;

    clubsGrid.innerHTML = '<div class="loading-spinner">Loading clubs...</div>';

    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/clubs?status_filter=active', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch clubs');

        const data = await response.json();
        const clubs = data.clubs || [];

        if (clubs.length === 0) {
            clubsGrid.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    <h3>No Clubs Yet</h3>
                    <p>Start your own educational community!</p>
                    <button class="btn-primary" onclick="openModal('create-club-modal')">Create Club</button>
                </div>
            `;
            return;
        }

        clubsGrid.innerHTML = clubs.map(club => {
            // Determine creative badge text - compare profile IDs
            let creativeBadge = '';
            const currentProfileId = user.tutor_id || user.admin_id;
            const currentProfileType = user.tutor_id ? 'tutor' : (user.admin_id ? 'admin' : null);

            if (club.created_by === currentProfileId && club.creator_type === currentProfileType) {
                creativeBadge = '<span class="creative-badge your-club">Your Club</span>';
            } else if (club.is_system || club.creator_type === 'admin') {
                creativeBadge = '<span class="creative-badge system-club">System Club</span>';
            } else if (club.joined_status) {
                creativeBadge = '<span class="creative-badge member">Member</span>';
            }

            return `
                <div class="club-card">
                    ${club.club_picture ? `<img src="${club.club_picture}" alt="${club.title}" class="event-image">` : ''}
                    <div class="event-header">
                        <h3>${club.title}</h3>
                        <div class="event-badges">
                            ${creativeBadge}
                            <span class="club-category">${club.category}</span>
                        </div>
                    </div>
                    <div class="event-details">
                        <div class="event-detail-item">
                            <span>👥</span>
                            <span>${club.member_count}/${club.member_limit} members</span>
                        </div>
                        ${club.is_paid ? `
                        <div class="event-detail-item">
                            <span>💰</span>
                            <span>${club.membership_fee} ETB</span>
                        </div>
                        ` : '<div class="event-detail-item"><span>🎁</span><span>Free</span></div>'}
                        <div class="event-detail-item">
                            <span>📚</span>
                            <span>${club.category}</span>
                        </div>
                    </div>
                    <p class="event-description">${club.description}</p>
                    <div class="event-actions">
                        <button class="action-btn" onclick="viewClub(${club.id})">View Details</button>
                        <button class="action-btn primary" onclick="joinClub(${club.id})">Join Club</button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading clubs:', error);
        clubsGrid.innerHTML = `
            <div class="error-state">
                <p>Failed to load clubs. Please try again.</p>
                <button class="btn-secondary" onclick="loadClubsSection()">Retry</button>
            </div>
        `;
    }
}


// Placeholder functions for event/club actions
function createEvent() {
    if (typeof TutorProfileUI !== 'undefined') {
        TutorProfileUI.showNotification('Event creation coming soon!', 'info');
    }
}

function viewEvent(eventId) {
    console.log('View event:', eventId);
    if (typeof TutorProfileUI !== 'undefined') {
        TutorProfileUI.showNotification('Event details coming soon!', 'info');
    }
}

function joinEvent(eventId) {
    console.log('Join event:', eventId);
    if (typeof TutorProfileUI !== 'undefined') {
        TutorProfileUI.showNotification('Joined event successfully!', 'success');
    }
}

function createClub() {
    if (typeof TutorProfileUI !== 'undefined') {
        TutorProfileUI.showNotification('Club creation coming soon!', 'info');
    }
}

function viewClub(clubId) {
    console.log('View club:', clubId);
    if (typeof TutorProfileUI !== 'undefined') {
        TutorProfileUI.showNotification('Club details coming soon!', 'info');
    }
}

function joinClub(clubId) {
    console.log('Join club:', clubId);
    if (typeof TutorProfileUI !== 'undefined') {
        TutorProfileUI.showNotification('Joined club successfully!', 'success');
    }
}

// ============================================
// VERIFICATION AND OTP MODAL FUNCTIONS
// ============================================

// Show Contact Confirmation Modal
function showContactConfirmationModal(email, phone) {
    const modal = document.getElementById('contact-confirmation-modal');
    if (modal) {
        document.getElementById('confirm-new-email').textContent = email || 'Not provided';
        document.getElementById('confirm-new-phone').textContent = phone || 'Not provided';
        modal.classList.remove('hidden');
        modal.classList.add('show');
    }
}

// Close Contact Confirmation Modal
function closeContactConfirmationModal() {
    const modal = document.getElementById('contact-confirmation-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('show');
    }
}

// Edit Contact Info (go back to edit profile modal)
function editContactInfo() {
    closeContactConfirmationModal();
    // Edit profile modal is still open in background
}

// Send OTP for Contact Change
async function sendOTPForContactChange() {
    try {
        // Close confirmation modal
        closeContactConfirmationModal();

        // In real implementation, call backend API to send OTP
        // For now, just show the OTP verification modal
        const contact = pendingContactChanges.phone || pendingContactChanges.email;
        showOTPVerificationModal(contact);

        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('OTP sent successfully!', 'success');
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Failed to send OTP', 'error');
        }
    }
}

// Show OTP Verification Modal
function showOTPVerificationModal(contact) {
    const modal = document.getElementById('otp-verification-modal');
    if (modal) {
        document.getElementById('otp-sent-to').textContent = contact;
        document.getElementById('otp-code-input').value = '';
        modal.classList.remove('hidden');
        modal.classList.add('show');
    }
}

// Close OTP Verification Modal
function closeOTPVerificationModal() {
    const modal = document.getElementById('otp-verification-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('show');
    }
}

// Verify OTP
async function verifyOTP() {
    try {
        const otpCode = document.getElementById('otp-code-input')?.value;

        if (!otpCode || otpCode.length !== 6) {
            if (typeof TutorProfileUI !== 'undefined') {
                TutorProfileUI.showNotification('Please enter a valid 6-digit code', 'error');
            }
            return;
        }

        // In real implementation, verify OTP with backend
        // For now, assume it's valid and proceed with saving
        closeOTPVerificationModal();

        // Check if there are also sensitive field changes
        const sensitiveFieldsChanged = [];
        if (pendingProfileChanges.first_name !== originalProfileData.first_name) sensitiveFieldsChanged.push('First Name');
        if (pendingProfileChanges.father_name !== originalProfileData.father_name) sensitiveFieldsChanged.push('Father Name');
        if (pendingProfileChanges.grandfather_name !== originalProfileData.grandfather_name) sensitiveFieldsChanged.push('Grandfather Name');
        if (pendingProfileChanges.teaches_at !== originalProfileData.teaches_at) sensitiveFieldsChanged.push('Teaches At');

        if (sensitiveFieldsChanged.length > 0) {
            // Show verification fee modal
            showVerificationFeeModal(sensitiveFieldsChanged);
        } else {
            // Save profile directly
            await saveProfileToDatabase(pendingProfileChanges);
            pendingProfileChanges = null;
            pendingContactChanges = { email: null, phone: null };
        }

        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('OTP verified successfully!', 'success');
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Invalid OTP code', 'error');
        }
    }
}

// Resend OTP
async function resendOTP(event) {
    if (event) event.preventDefault();

    try {
        // In real implementation, call backend API to resend OTP
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('OTP resent successfully!', 'success');
        }
    } catch (error) {
        console.error('Error resending OTP:', error);
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Failed to resend OTP', 'error');
        }
    }
}

// Show Verification Fee Modal (OLD - For profile changes - Updated to use unified modal)
function showVerificationFeeModal(changedFields) {
    const modal = document.getElementById('verificationFeeModal');
    if (modal) {
        // This is for profile changes, not achievements/certifications/experiences
        modal.classList.remove('hidden');
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

// Close Verification Fee Modal (OLD - Updated to use unified modal)
// Note: There's another closeVerificationFeeModal defined below that handles achievements/certs/experiences
function closeVerificationFeeModal() {
    const modal = document.getElementById('verificationFeeModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
    // Reset pending changes if user cancels
    if (typeof pendingProfileChanges !== 'undefined') {
        pendingProfileChanges = null;
    }
    // Also clear pending verification data for achievements/certs/experiences
    if (window.pendingVerificationData) {
        window.pendingVerificationData = null;
    }
}

// Proceed to OTP Verification (after paying fee)
async function proceedToOTPVerification() {
    try {
        closeVerificationFeeModal();

        // In real implementation, process payment first
        // For now, show verification modal
        const modal = document.getElementById('verificationModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('show');
        }

        // Save the profile data
        if (pendingProfileChanges) {
            await saveProfileToDatabase(pendingProfileChanges);
            pendingProfileChanges = null;
        }

        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Payment processed. Changes submitted for verification.', 'success');
        }

        // Close verification modal after 3 seconds
        setTimeout(() => {
            closeVerificationModal();
        }, 3000);
    } catch (error) {
        console.error('Error processing verification:', error);
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Failed to process verification', 'error');
        }
    }
}

// Close Verification Modal
function closeVerificationModal() {
    const modal = document.getElementById('verificationModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('show');
    }
}

// Export these functions
window.addLocation = addLocation;
window.removeLocation = removeLocation;
window.addTeachesAt = addTeachesAt;
window.removeTeachesAt = removeTeachesAt;
window.addCourse = addCourse;
window.removeCourse = removeCourse;
window.addLanguage = addLanguage;
window.removeLanguage = removeLanguage;
window.addSocialLink = addSocialLink;
window.removeSocialLink = removeSocialLink;
window.saveProfile = saveProfile;
window.handleImageSelect = handleImageSelect;
window.uploadImage = uploadImage;
window.resetUpload = resetUpload;
window.loadConnections = loadConnections;
window.loadConnectionsOnly = loadConnectionsOnly;
window.loadRequests = loadRequests;
window.filterCommunity = filterCommunity;
window.openChat = openChat;
window.viewConnection = viewConnection;
window.acceptRequest = acceptRequest;
window.rejectRequest = rejectRequest;
window.initializeCommunitySearch = initializeCommunitySearch;
window.searchConnections = searchConnections;
window.searchEvents = searchEvents;
window.searchClubs = searchClubs;
window.showProfilePreview = showProfilePreview;
window.hideProfilePreview = hideProfilePreview;
window.loadEventsSection = loadEventsSection;
window.loadClubsSection = loadClubsSection;
window.createEvent = createEvent;
window.viewEvent = viewEvent;
window.joinEvent = joinEvent;
window.createClub = createClub;
window.viewClub = viewClub;
window.joinClub = joinClub;
window.showContactConfirmationModal = showContactConfirmationModal;
window.closeContactConfirmationModal = closeContactConfirmationModal;
window.editContactInfo = editContactInfo;
window.sendOTPForContactChange = sendOTPForContactChange;
window.closeOTPVerificationModal = closeOTPVerificationModal;
window.verifyOTP = verifyOTP;
window.resendOTP = resendOTP;
window.showVerificationFeeModal = showVerificationFeeModal;
window.closeVerificationFeeModal = closeVerificationFeeModal;
window.proceedToOTPVerification = proceedToOTPVerification;
window.closeVerificationModal = closeVerificationModal;
window.updateProfileHeaderImmediate = updateProfileHeaderImmediate;

// ============================================
// STORY-RELATED FUNCTIONS
// ============================================

// Sample stories data (in production, this would come from an API)
let tutorStories = [
    {
        id: 'story1',
        type: 'image',
        mediaUrl: '../uploads/system_images/system_images/Math wallpaper 1.jpeg',
        caption: 'Today\'s lesson on quadratic equations was amazing! 📚',
        author: 'Professional Tutor',
        authorAvatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect width="150" height="150" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="16"%3E150x150%3C/text%3E%3C/svg%3E',
        time: '2 hours ago',
        likes: 32,
        comments: 5,
        views: 245
    },
    {
        id: 'story2',
        type: 'image',
        mediaUrl: '../uploads/system_images/system_images/Physics wallpaper 2.jpeg',
        caption: 'Newton\'s laws demonstration in the lab today! 🔬',
        author: 'Professional Tutor',
        authorAvatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect width="150" height="150" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="16"%3E150x150%3C/text%3E%3C/svg%3E',
        time: '5 hours ago',
        likes: 28,
        comments: 3,
        views: 189
    },
    {
        id: 'story3',
        type: 'video',
        mediaUrl: '../uploads/system_videos/sample-video.mp4',
        caption: 'Chemistry experiment - watch the reaction! ⚗️',
        author: 'Professional Tutor',
        authorAvatar: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect width="150" height="150" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="16"%3E150x150%3C/text%3E%3C/svg%3E',
        time: '8 hours ago',
        likes: 45,
        comments: 8,
        views: 312
    }
];

let currentStoryIndex = 0;
let currentStoryId = null;
let storyProgressInterval = null;

// View tutor stories (when clicking on story ring)
function viewTutorStories() {
    // Open story viewer with first story
    if (tutorStories.length > 0) {
        currentStoryIndex = 0;
        openStoryViewer(tutorStories[0]);
    } else {
        // If no stories, switch to stories panel
        switchPanel('stories');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Open upload story modal (now universal upload modal)
function openUploadStoryModal(uploadType = 'story') {
    const modal = document.getElementById('storyUploadModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Set the upload type
        const uploadTypeSelect = document.getElementById('uploadType');
        if (uploadTypeSelect) {
            uploadTypeSelect.value = uploadType;
            handleUploadTypeChange(); // Update UI based on type
        }

        // Reset form
        resetUpload('story');
    } else {
        console.error('storyUploadModal not found');
    }
}

// Close story upload modal
function closeStoryUploadModal() {
    const modal = document.getElementById('storyUploadModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = '';

        // Reset form
        resetUpload('story');
    }
}

// Handle upload type change
function handleUploadTypeChange() {
    const uploadType = document.getElementById('uploadType')?.value || 'story';
    const titleEl = document.getElementById('uploadModalTitle');
    const iconEl = document.getElementById('uploadIcon');
    const hintEl = document.getElementById('uploadHint');
    const fileInput = document.getElementById('storyInput');
    const uploadButton = document.getElementById('uploadButton');
    const captionGroup = document.querySelector('#storyPreview .form-group');

    // Update modal title, icon, and hints based on upload type
    switch(uploadType) {
        case 'cover':
            if (titleEl) titleEl.textContent = 'Upload Cover Image';
            if (iconEl) iconEl.textContent = '🖼️';
            if (hintEl) hintEl.textContent = 'Recommended: 1920x400px (JPG, PNG, GIF) - Max 5MB';
            if (fileInput) fileInput.accept = 'image/*';
            if (uploadButton) uploadButton.textContent = 'Upload Cover';
            if (captionGroup) captionGroup.style.display = 'none';
            break;
        case 'profile':
            if (titleEl) titleEl.textContent = 'Upload Profile Picture';
            if (iconEl) iconEl.textContent = '👤';
            if (hintEl) hintEl.textContent = 'Recommended: 500x500px (JPG, PNG, GIF) - Max 5MB';
            if (fileInput) fileInput.accept = 'image/*';
            if (uploadButton) uploadButton.textContent = 'Upload Profile';
            if (captionGroup) captionGroup.style.display = 'none';
            break;
        case 'image':
            if (titleEl) titleEl.textContent = 'Upload Image';
            if (iconEl) iconEl.textContent = '🎨';
            if (hintEl) hintEl.textContent = 'Images (JPG, PNG, GIF) - Max 10MB';
            if (fileInput) fileInput.accept = 'image/*';
            if (uploadButton) uploadButton.textContent = 'Upload Image';
            if (captionGroup) captionGroup.style.display = 'none';
            break;
        case 'story':
        default:
            if (titleEl) titleEl.textContent = 'Upload Story';
            if (iconEl) iconEl.textContent = '📱';
            if (hintEl) hintEl.textContent = 'Images (JPG, PNG, GIF) or Videos (MP4, WebM) - Max 50MB';
            if (fileInput) fileInput.accept = 'image/*,video/*';
            if (uploadButton) uploadButton.textContent = 'Upload Story';
            if (captionGroup) captionGroup.style.display = 'block';
            break;
    }
}

// Universal upload function
async function uploadFile() {
    const uploadType = document.getElementById('uploadType')?.value || 'story';

    switch(uploadType) {
        case 'cover':
            await uploadCoverImage();
            break;
        case 'profile':
            await uploadProfileImage();
            break;
        case 'image':
            await uploadGeneralImage();
            break;
        case 'story':
        default:
            await uploadStory();
            break;
    }
}

// Upload cover image
async function uploadCoverImage() {
    if (!window.storyUploadFile) {
        alert('Please select an image first');
        return;
    }

    try {
        const progressEl = document.getElementById('storyProgress');
        if (progressEl) progressEl.style.display = 'block';

        // TODO: Call actual API to upload cover
        await new Promise(resolve => setTimeout(resolve, 1500));

        alert('Cover image uploaded successfully!');
        closeStoryUploadModal();
    } catch (error) {
        console.error('Error uploading cover:', error);
        alert('Failed to upload cover image');
    } finally {
        const progressEl = document.getElementById('storyProgress');
        if (progressEl) progressEl.style.display = 'none';
    }
}

// Upload profile image
async function uploadProfileImage() {
    if (!window.storyUploadFile) {
        alert('Please select an image first');
        return;
    }

    try {
        const progressEl = document.getElementById('storyProgress');
        if (progressEl) progressEl.style.display = 'block';

        // TODO: Call actual API to upload profile
        await new Promise(resolve => setTimeout(resolve, 1500));

        alert('Profile picture uploaded successfully!');
        closeStoryUploadModal();
    } catch (error) {
        console.error('Error uploading profile:', error);
        alert('Failed to upload profile picture');
    } finally {
        const progressEl = document.getElementById('storyProgress');
        if (progressEl) progressEl.style.display = 'none';
    }
}

// Upload general image
async function uploadGeneralImage() {
    if (!window.storyUploadFile) {
        alert('Please select an image first');
        return;
    }

    try {
        const progressEl = document.getElementById('storyProgress');
        if (progressEl) progressEl.style.display = 'block';

        // TODO: Call actual API to upload image
        await new Promise(resolve => setTimeout(resolve, 1500));

        alert('Image uploaded successfully!');
        closeStoryUploadModal();
    } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image');
    } finally {
        const progressEl = document.getElementById('storyProgress');
        if (progressEl) progressEl.style.display = 'none';
    }
}

// Handle story file selection
function handleStorySelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('File size must be less than 50MB');
        return;
    }

    // Determine if it's image or video
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
        alert('Please select a valid image or video file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        // Show preview container
        const previewContainer = document.getElementById('storyPreview');
        if (previewContainer) {
            previewContainer.style.display = 'block';
        }

        // Show appropriate preview element
        const imagePreview = document.getElementById('storyPreviewImage');
        const videoPreview = document.getElementById('storyPreviewVideo');

        if (isVideo) {
            imagePreview.style.display = 'none';
            videoPreview.style.display = 'block';
            videoPreview.src = e.target.result;
        } else {
            videoPreview.style.display = 'none';
            imagePreview.style.display = 'block';
            imagePreview.src = e.target.result;
        }

        // Update file info
        const fileNameEl = document.getElementById('storyFileName');
        const fileSizeEl = document.getElementById('storyFileSize');
        const fileTypeEl = document.getElementById('storyFileType');

        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) fileSizeEl.textContent = formatFileSize(file.size);
        if (fileTypeEl) fileTypeEl.textContent = isVideo ? 'Video' : 'Image';
    };

    reader.readAsDataURL(file);

    // Store file for upload
    if (typeof window.storyUploadFile === 'undefined') {
        window.storyUploadFile = null;
    }
    window.storyUploadFile = file;

    // Setup caption character counter
    const captionInput = document.getElementById('storyCaption');
    const captionCount = document.getElementById('storyCaptionCount');
    if (captionInput && captionCount) {
        captionInput.addEventListener('input', () => {
            captionCount.textContent = captionInput.value.length;
        });
    }
}

// Upload story to backend
async function uploadStory() {
    if (!window.storyUploadFile) {
        alert('Please select a file first');
        return;
    }

    try {
        // Show progress
        const progressEl = document.getElementById('storyProgress');
        if (progressEl) progressEl.style.display = 'block';

        // Get caption
        const caption = document.getElementById('storyCaption')?.value || '';

        // Animate progress
        animateStoryUploadProgress(async () => {
            // Call API to upload story
            if (typeof TutorProfileAPI !== 'undefined' && TutorProfileAPI.uploadStory) {
                const response = await TutorProfileAPI.uploadStory(window.storyUploadFile, caption);

                if (response && response.url) {
                    // Success
                    if (typeof TutorProfileUI !== 'undefined') {
                        TutorProfileUI.showNotification('Story uploaded successfully!', 'success');
                    }

                    // Close modal
                    closeStoryUploadModal();

                    // Reload stories section if on stories panel
                    // You can add logic here to refresh the stories display
                } else {
                    throw new Error('Upload failed - no URL returned');
                }
            } else {
                throw new Error('Story upload API not available');
            }
        });
    } catch (error) {
        console.error('Error uploading story:', error);
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Failed to upload story. Please try again.', 'error');
        } else {
            alert('Failed to upload story. Please try again.');
        }

        // Hide progress
        const progressEl = document.getElementById('storyProgress');
        if (progressEl) progressEl.style.display = 'none';
    }
}

// Animate story upload progress
function animateStoryUploadProgress(uploadCallback) {
    const progressFill = document.getElementById('storyProgressFill');
    const progressText = document.getElementById('storyProgressText');

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;

        if (progressFill) progressFill.style.width = progress + '%';
        if (progressText) progressText.textContent = `Uploading... ${Math.round(progress)}%`;

        if (progress >= 90) {
            clearInterval(interval);
            // Complete the upload
            uploadCallback().then(() => {
                if (progressFill) progressFill.style.width = '100%';
                if (progressText) progressText.textContent = 'Upload complete!';

                setTimeout(() => {
                    const progressContainer = document.getElementById('storyProgress');
                    if (progressContainer) progressContainer.style.display = 'none';
                }, 1000);
            }).catch(() => {
                // Error handled in uploadStory function
                if (progressFill) progressFill.style.width = '0%';
                if (progressText) progressText.textContent = 'Upload failed';
            });
        }
    }, 200);
}

// Open story viewer modal
function openStoryViewer(story) {
    const modal = document.getElementById('storyViewerModal');
    if (!modal) return;

    currentStoryId = story.id;

    // Update story content
    document.getElementById('storyAuthorAvatar').src = story.authorAvatar || '';
    document.getElementById('storyAuthorName').textContent = story.author || 'Unknown';
    document.getElementById('storyTime').textContent = story.time || 'Just now';
    document.getElementById('storyCaption').textContent = story.caption || '';
    document.getElementById('storyLikes').textContent = story.likes || 0;
    document.getElementById('storyComments').textContent = story.comments || 0;

    // Show appropriate media type
    const imageEl = document.getElementById('storyImage');
    const videoEl = document.getElementById('storyVideo');

    if (story.type === 'video') {
        imageEl.style.display = 'none';
        videoEl.style.display = 'block';
        videoEl.src = story.mediaUrl;
        videoEl.play();
    } else {
        videoEl.style.display = 'none';
        imageEl.style.display = 'block';
        imageEl.src = story.mediaUrl;
    }

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Start progress bar animation
    startStoryProgress();

    // Increment view count
    story.views = (story.views || 0) + 1;
}

// Close story viewer
function closeStoryViewer() {
    const modal = document.getElementById('storyViewerModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';

        // Stop video if playing
        const videoEl = document.getElementById('storyVideo');
        if (videoEl) {
            videoEl.pause();
            videoEl.src = '';
        }

        // Clear progress
        clearStoryProgress();
    }
}

// Navigate to previous story
function previousStory() {
    if (currentStoryIndex > 0) {
        currentStoryIndex--;
        openStoryViewer(tutorStories[currentStoryIndex]);
    }
}

// Navigate to next story
function nextStory() {
    if (currentStoryIndex < tutorStories.length - 1) {
        currentStoryIndex++;
        openStoryViewer(tutorStories[currentStoryIndex]);
    } else {
        // Close viewer if no more stories
        closeStoryViewer();
    }
}

// Start story progress animation
function startStoryProgress() {
    clearStoryProgress();

    const progressFill = document.querySelector('.story-progress-fill');
    if (progressFill) {
        progressFill.style.width = '0%';
        progressFill.style.transition = 'none';

        // Force reflow
        void progressFill.offsetWidth;

        progressFill.style.transition = 'width 5s linear';
        progressFill.style.width = '100%';

        // Auto-advance to next story after 5 seconds
        storyProgressInterval = setTimeout(() => {
            nextStory();
        }, 5000);
    }
}

// Clear story progress
function clearStoryProgress() {
    if (storyProgressInterval) {
        clearTimeout(storyProgressInterval);
        storyProgressInterval = null;
    }

    const progressFill = document.querySelector('.story-progress-fill');
    if (progressFill) {
        progressFill.style.width = '0%';
    }
}

// View individual story (from story card)
function viewStory(storyId) {
    // Find story in the array
    const storyIndex = tutorStories.findIndex(s => s.id === storyId);
    if (storyIndex !== -1) {
        currentStoryIndex = storyIndex;
        openStoryViewer(tutorStories[storyIndex]);
    } else {
        console.log('Story not found:', storyId);
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Story not found', 'error');
        }
    }
}

// Load more stories
function loadMoreStories() {
    console.log('Loading more stories...');
    // In production, this would fetch more stories from the API
    if (typeof TutorProfileUI !== 'undefined') {
        TutorProfileUI.showNotification('Loading more stories...', 'info');
    }

    // Simulate loading more stories
    setTimeout(() => {
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('More stories loaded!', 'success');
        }
    }, 1000);
}

// Filter stories by category
function filterStories(category) {
    console.log('Filtering stories by:', category);
    // In production, this would filter the displayed stories
    const storyCards = document.querySelectorAll('.story-card');
    storyCards.forEach(card => {
        // Show/hide based on category
        card.style.display = 'block'; // For now, show all
    });
}

// Delete story
function deleteStory(storyId) {
    if (confirm('Are you sure you want to delete this story?')) {
        console.log('Delete story:', storyId);
        // In production, call API to delete story
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Story deleted successfully', 'success');
        }
    }
}

// Like current story
function likeCurrentStory() {
    if (currentStoryId) {
        const story = tutorStories.find(s => s.id === currentStoryId);
        if (story) {
            story.likes = (story.likes || 0) + 1;
            document.getElementById('storyLikes').textContent = story.likes;

            if (typeof TutorProfileUI !== 'undefined') {
                TutorProfileUI.showNotification('Story liked!', 'success');
            }
        }
    }
}

// Comment on current story
function commentCurrentStory() {
    if (currentStoryId) {
        console.log('Comment on story:', currentStoryId);
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Comment feature coming soon!', 'info');
        }
    }
}

// Share current story
function shareCurrentStory() {
    if (currentStoryId) {
        shareStory(currentStoryId);
    }
}

// Like story (general function)
function likeStory(storyId) {
    console.log('Like story:', storyId);
    const story = tutorStories.find(s => s.id === storyId);
    if (story) {
        story.likes = (story.likes || 0) + 1;
        // Update UI if in viewer
        if (currentStoryId === storyId) {
            document.getElementById('storyLikes').textContent = story.likes;
        }
    }
    if (typeof TutorProfileUI !== 'undefined') {
        TutorProfileUI.showNotification('Story liked!', 'success');
    }
}

// Share story
function shareStory(storyId) {
    const storyUrl = `${window.location.origin}/stories/${storyId}`;

    if (navigator.share) {
        navigator.share({
            title: 'Check out this story',
            text: 'Educational story from Astegni',
            url: storyUrl
        }).then(() => {
            console.log('Story shared successfully');
        }).catch((error) => {
            console.error('Error sharing story:', error);
            copyToClipboard(storyUrl);
        });
    } else {
        copyToClipboard(storyUrl);
    }
}

// Helper function to copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Link copied to clipboard!', 'success');
        }
    }).catch((error) => {
        console.error('Error copying to clipboard:', error);
    });
}

// Export story functions and universal upload functions
window.viewTutorStories = viewTutorStories;
window.openUploadStoryModal = openUploadStoryModal;
window.closeStoryUploadModal = closeStoryUploadModal;
window.handleStorySelect = handleStorySelect;
window.uploadStory = uploadStory;
window.handleUploadTypeChange = handleUploadTypeChange;
window.uploadFile = uploadFile;
window.uploadCoverImage = uploadCoverImage;
window.uploadProfileImage = uploadProfileImage;
window.uploadGeneralImage = uploadGeneralImage;
window.openStoryViewer = openStoryViewer;
window.closeStoryViewer = closeStoryViewer;
window.previousStory = previousStory;
window.nextStory = nextStory;
window.viewStory = viewStory;
window.loadMoreStories = loadMoreStories;
window.filterStories = filterStories;
window.deleteStory = deleteStory;
window.likeStory = likeStory;
window.shareStory = shareStory;
window.likeCurrentStory = likeCurrentStory;
window.commentCurrentStory = commentCurrentStory;
window.shareCurrentStory = shareCurrentStory;

// ============================================
// SCHEDULE MANAGEMENT FUNCTIONS
// ============================================

// Save schedule function
async function saveSchedule() {
    // Prevent double submission
    const submitBtn = document.getElementById('schedule-submit-btn');
    if (submitBtn && submitBtn.disabled) {
        console.log('⚠️ Save already in progress, ignoring duplicate call');
        return;
    }

    try {
        // Disable submit button to prevent double submission
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        // FIRST: Check if we're editing or creating BEFORE doing anything else
        const scheduleIdInput = document.getElementById('editing-schedule-id');
        console.log('🔍 === SAVE SCHEDULE DEBUG ===');
        console.log('Hidden input element:', scheduleIdInput);
        console.log('Hidden input value:', scheduleIdInput?.value);
        console.log('Hidden input value type:', typeof scheduleIdInput?.value);
        console.log('Hidden input value length:', scheduleIdInput?.value?.length);

        // Get form values
        const title = document.getElementById('schedule-title')?.value;
        const description = document.getElementById('schedule-description')?.value;
        const priority = document.getElementById('schedule-priority')?.value;
        const year = document.getElementById('schedule-year')?.value;
        const yearFrom = document.getElementById('schedule-year-from')?.value;
        const yearTo = document.getElementById('schedule-year-to')?.value;
        const scheduleType = document.querySelector('input[name="schedule-type"]:checked')?.value;
        const startTime = document.getElementById('schedule-start-time')?.value;
        const endTime = document.getElementById('schedule-end-time')?.value;
        const notes = document.getElementById('schedule-notes')?.value;
        const isFeatured = document.getElementById('schedule-is-featured')?.checked || false;

        // Get alarm settings
        const enableAlarm = document.getElementById('enable-alarm')?.checked || false;
        const alarmBefore = document.getElementById('alarm-before')?.value;
        const notificationBrowser = document.querySelector('input[name="notification-browser"]')?.checked || false;
        const notificationSound = document.querySelector('input[name="notification-sound"]')?.checked || false;

        // Get schedule dates based on type
        let selectedMonths = [];
        let selectedDays = [];
        let specificDates = [];

        if (scheduleType === 'recurring') {
            selectedMonths = Array.from(document.querySelectorAll('input[name="schedule-month"]:checked'))
                .map(checkbox => checkbox.value);
            selectedDays = Array.from(document.querySelectorAll('input[name="schedule-day"]:checked'))
                .map(checkbox => checkbox.value);
        } else if (scheduleType === 'specific') {
            specificDates = [...selectedSpecificDates];
        }

// DEBUG: Log all form values
console.log('=== FORM VALUES DEBUG ===');
console.log('title:', title);
console.log('priority:', priority);
console.log('year:', year);
console.log('scheduleType:', scheduleType);
console.log('startTime:', startTime);
console.log('endTime:', endTime);
console.log('selectedMonths:', selectedMonths);
console.log('selectedDays:', selectedDays);
console.log('specificDates:', specificDates);
console.log('specificDates.length:', specificDates.length);
console.log('selectedSpecificDates array:', selectedSpecificDates);
console.log('=== END DEBUG ===');

        // Helper function to show error and re-enable button
        const showValidationError = (message) => {
            if (submitBtn) {
                submitBtn.disabled = false;
                const isEdit = document.getElementById('editing-schedule-id')?.value;
                submitBtn.innerHTML = isEdit
                    ? '<i class="fas fa-save"></i> Update Schedule'
                    : '<i class="fas fa-save"></i> Create Schedule';
            }

            if (typeof TutorProfileUI !== 'undefined') {
                TutorProfileUI.showNotification(message, 'error');
            } else {
                alert(message);
            }
        };

        // Validation
        if (!title || !priority || !year || !startTime || !endTime) {
            showValidationError('Please fill in all required fields');
            return;
        }

        // Validate schedule type specific requirements
        if (scheduleType === 'recurring') {
            if (selectedMonths.length === 0) {
                showValidationError('Please select at least one month');
                return;
            }

            if (selectedDays.length === 0) {
                showValidationError('Please select at least one day');
                return;
            }

            if (!yearFrom) {
                showValidationError('Please specify the "From Year" for recurring schedule');
                return;
            }

            // Validate year range if both are provided
            if (yearTo && parseInt(yearFrom) > parseInt(yearTo)) {
                showValidationError('"From Year" must be less than or equal to "To Year"');
                return;
            }
        } else if (scheduleType === 'specific') {
            if (specificDates.length === 0) {
                showValidationError('Please add at least one specific date');
                return;
            }
        }

        // Validate time range
        if (startTime >= endTime) {
            showValidationError('End time must be after start time');
            return;
        }

        // Map priority number to priority name
        const priorityMap = {
            '1': 'Low Priority',
            '2': 'Normal',
            '3': 'Important',
            '4': 'Very Important',
            '5': 'Highly Critical'
        };

        // Build schedule data
        const scheduleData = {
            title,
            description: description || '',
            grade_level: priorityMap[priority] || 'Normal',
            year: parseInt(year),
            year_from: scheduleType === 'recurring' && yearFrom ? parseInt(yearFrom) : null,
            year_to: scheduleType === 'recurring' && yearTo ? parseInt(yearTo) : null,
            schedule_type: scheduleType,
            months: scheduleType === 'recurring' ? selectedMonths : [],
            days: scheduleType === 'recurring' ? selectedDays : [],
            specific_dates: scheduleType === 'specific' ? specificDates : [],
            start_time: startTime,
            end_time: endTime,
            notes,
            is_featured: isFeatured,
            alarm_enabled: enableAlarm,
            alarm_before_minutes: enableAlarm ? parseInt(alarmBefore) : null,
            notification_browser: enableAlarm ? notificationBrowser : false,
            notification_sound: enableAlarm ? notificationSound : false,
            created_at: new Date().toISOString()
        };

        // Check if this is an edit or create operation (scheduleIdInput already declared at top)
        const scheduleId = scheduleIdInput?.value;
        // Only consider it an edit if scheduleId is a valid number
        const isEdit = scheduleId && scheduleId !== '' && scheduleId !== 'undefined' && scheduleId !== 'null' && !isNaN(parseInt(scheduleId));

        console.log('📋 Schedule ID from hidden input:', scheduleId);
        console.log(isEdit ? '✏️ Updating schedule ID ' + scheduleId : '📅 Creating new schedule');
        console.log('Schedule data:', scheduleData);

        // Call API to save to database
        const token = localStorage.getItem('token');
        if (!token) {
            if (typeof TutorProfileUI !== 'undefined') {
                TutorProfileUI.showNotification('Please log in to create a schedule', 'error');
            } else {
                alert('Please log in to create a schedule');
            }
            return;
        }

        const url = isEdit
            ? `http://localhost:8000/api/tutor/schedules/${scheduleId}`
            : 'http://localhost:8000/api/tutor/schedules';

        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(scheduleData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to ${isEdit ? 'update' : 'create'} schedule`);
        }

        const result = await response.json();
        console.log(isEdit ? '✅ Schedule updated:' : '✅ Schedule created:', result);

        // Set up notifications if enabled
        if (enableAlarm && result.id) {
            scheduleNotifications(result);
        }

        // Show success notification
        const successMessage = isEdit ? 'Schedule updated successfully!' : 'Schedule created successfully!';
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification(successMessage, 'success');
        } else {
            alert(successMessage);
        }

        // Re-enable submit button after successful save
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Create Schedule';
        }

        // Close modal first
        closeScheduleModal();

        // Reset form
        const scheduleForm = document.getElementById('scheduleForm');
        if (scheduleForm) {
            scheduleForm.reset();
        }
        selectedSpecificDates = [];
        updateSelectedDatesList();

        // Hide alarm details if shown
        const otherGradeGroup = document.getElementById('other-grade-group');
        if (otherGradeGroup) {
            otherGradeGroup.style.display = 'none';
        }

        const alarmDetails = document.getElementById('alarm-settings-details');
        if (alarmDetails) {
            alarmDetails.style.display = 'none';
        }

        // Reset to recurring schedule type
        const recurringRadio = document.querySelector('input[name="schedule-type"][value="recurring"]');
        if (recurringRadio) {
            recurringRadio.checked = true;
        }
        toggleScheduleType();

        // Refresh schedule list with a small delay to ensure DB transaction completes
        setTimeout(() => {
            console.log('🔄 Reloading schedules after save...');

            // Always reload schedules since that's the default visible tab
            if (typeof loadSchedules === 'function') {
                loadSchedules().then(() => {
                    console.log('✅ Schedules reloaded successfully');
                }).catch(err => {
                    console.error('❌ Error reloading schedules:', err);
                });
            } else {
                console.warn('⚠️ loadSchedules function not available');
            }

            // Also reload all data if that tab exists and is loaded
            if (typeof currentScheduleTab !== 'undefined' && currentScheduleTab === 'all') {
                if (typeof loadAllData === 'function') {
                    loadAllData().then(() => {
                        console.log('✅ All data reloaded successfully');
                    }).catch(err => {
                        console.error('❌ Error reloading all data:', err);
                    });
                }
            }
        }, 300);

    } catch (error) {
        console.error('❌ Error saving schedule:', error);

        // Re-enable submit button on error
        if (submitBtn) {
            submitBtn.disabled = false;
            const isEdit = document.getElementById('editing-schedule-id')?.value;
            submitBtn.innerHTML = isEdit
                ? '<i class="fas fa-save"></i> Update Schedule'
                : '<i class="fas fa-save"></i> Create Schedule';
        }

        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification(error.message || 'Failed to save schedule. Please try again.', 'error');
        } else {
            alert(error.message || 'Failed to save schedule. Please try again.');
        }
    }
}

// Update priority level label based on slider value
function updatePriorityLabel(value) {
    const label = document.getElementById('priority-label');
    if (!label) return;

    const priorities = {
        '1': { text: 'Low Priority', color: '#10B981', shadow: 'rgba(16, 185, 129, 0.3)' },
        '2': { text: 'Normal', color: '#3B82F6', shadow: 'rgba(59, 130, 246, 0.3)' },
        '3': { text: 'Important', color: '#F59E0B', shadow: 'rgba(245, 158, 11, 0.3)' },
        '4': { text: 'Very Important', color: '#EF4444', shadow: 'rgba(239, 68, 68, 0.3)' },
        '5': { text: 'Highly Critical', color: '#DC2626', shadow: 'rgba(220, 38, 38, 0.3)' }
    };

    const priority = priorities[value];
    if (priority) {
        label.textContent = priority.text;
        label.style.background = priority.color;
        label.style.color = 'white';
        label.style.boxShadow = `0 4px 12px ${priority.shadow}`;
    }
}

// Toggle between recurring and specific dates schedule
function toggleScheduleType() {
    const scheduleType = document.querySelector('input[name="schedule-type"]:checked')?.value;
    const recurringSection = document.getElementById('recurring-schedule-section');
    const specificSection = document.getElementById('specific-dates-section');

    if (scheduleType === 'recurring') {
        if (recurringSection) recurringSection.style.display = 'block';
        if (specificSection) specificSection.style.display = 'none';
    } else if (scheduleType === 'specific') {
        if (recurringSection) recurringSection.style.display = 'none';
        if (specificSection) specificSection.style.display = 'block';
    }
}

// Store selected specific dates - GLOBAL VARIABLE
let selectedSpecificDates = [];
console.log('🔧 Initialized selectedSpecificDates array:', selectedSpecificDates);

// Add specific date to the list
function addSpecificDate() {
    console.log('🔍 addSpecificDate called');

    const datePicker = document.getElementById('schedule-date-picker');
    console.log('Date picker element:', datePicker);
    console.log('Date picker exists:', !!datePicker);
    console.log('Date picker type:', datePicker?.type);
    console.log('Date picker value (raw):', datePicker?.value);
    console.log('Date picker value type:', typeof datePicker?.value);
    console.log('Date picker value length:', datePicker?.value?.length);

    const selectedDate = datePicker?.value;
    console.log('Selected date (after assignment):', selectedDate);
    console.log('Current selectedSpecificDates:', selectedSpecificDates);

    if (!selectedDate || selectedDate.trim() === '') {
        console.warn('⚠️ No date selected - showing error message');
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Please select a date first', 'error');
        } else {
            alert('Please select a date first');
        }
        return;
    }

    // Check if date already added
    if (selectedSpecificDates.includes(selectedDate)) {
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('This date is already added', 'info');
        } else {
            alert('This date is already added');
        }
        return;
    }

    // Add to array
    selectedSpecificDates.push(selectedDate);
    console.log('✅ Date added. New selectedSpecificDates:', selectedSpecificDates);

    // Update UI
    updateSelectedDatesList();

    // Show success feedback
    if (typeof TutorProfileUI !== 'undefined') {
        TutorProfileUI.showNotification('Date added successfully!', 'success');
    }

    // Clear date picker
    datePicker.value = '';
}

// Add date range to the list
function addDateRange() {
    const fromDateInput = document.getElementById('schedule-date-from');
    const toDateInput = document.getElementById('schedule-date-to');
    const fromDate = fromDateInput?.value;
    const toDate = toDateInput?.value;

    if (!fromDate || !toDate) {
        alert('Please select both from and to dates');
        return;
    }

    // Validate date range (compare as strings to avoid timezone issues)
    if (fromDate > toDate) {
        alert('From date must be before or equal to To date');
        return;
    }

    // Add all dates in the range (work with date strings directly to avoid timezone issues)
    let currentDateStr = fromDate;
    let addedCount = 0;

    while (currentDateStr <= toDate) {
        // Only add if not already in the list
        if (!selectedSpecificDates.includes(currentDateStr)) {
            selectedSpecificDates.push(currentDateStr);
            addedCount++;
        }

        // Move to next day by creating a Date object temporarily
        // Use UTC to avoid timezone shifts
        const [year, month, day] = currentDateStr.split('-').map(Number);
        const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
        currentDateStr = nextDate.toISOString().split('T')[0];
    }

    // Update UI
    updateSelectedDatesList();

    // Show feedback
    if (addedCount > 0) {
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification(`Added ${addedCount} date(s) to schedule`, 'success');
        } else {
            alert(`Added ${addedCount} date(s) to schedule`);
        }
    } else {
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('All dates in this range were already added', 'info');
        } else {
            alert('All dates in this range were already added');
        }
    }

    // Clear date pickers
    fromDateInput.value = '';
    toDateInput.value = '';
}

// Track the last added "From Date" to handle range expansion
let lastFromDate = null;

// Handle From Date change - add single date immediately
function handleFromDateChange() {
    const fromDateInput = document.getElementById('schedule-date-from');
    const toDateInput = document.getElementById('schedule-date-to');
    const fromDate = fromDateInput?.value;

    if (!fromDate) {
        lastFromDate = null;
        return;
    }

    // Add the single "From Date" immediately
    if (!selectedSpecificDates.includes(fromDate)) {
        selectedSpecificDates.push(fromDate);
        lastFromDate = fromDate;

        // Update UI
        updateSelectedDatesList();

        // Show feedback
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Added 1 date to schedule', 'success');
        }
    } else {
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('This date is already added', 'info');
        }
        lastFromDate = fromDate;
    }

    // Clear "To Date" field for fresh input
    toDateInput.value = '';
}

// Handle To Date change - expand to date range
function handleToDateChange() {
    const fromDateInput = document.getElementById('schedule-date-from');
    const toDateInput = document.getElementById('schedule-date-to');
    const fromDate = fromDateInput?.value;
    const toDate = toDateInput?.value;

    if (!fromDate || !toDate) {
        return;
    }

    // Validate date range
    if (fromDate > toDate) {
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('To Date must be after or equal to From Date', 'error');
        } else {
            alert('To Date must be after or equal to From Date');
        }
        toDateInput.value = '';
        return;
    }

    // Add all dates between fromDate and toDate (excluding fromDate since it's already added)
    let currentDateStr = fromDate;
    const nextDay = new Date(fromDate + 'T00:00:00');
    nextDay.setDate(nextDay.getDate() + 1);
    currentDateStr = nextDay.toISOString().split('T')[0];

    let addedCount = 0;

    while (currentDateStr <= toDate) {
        // Only add if not already in the list
        if (!selectedSpecificDates.includes(currentDateStr)) {
            selectedSpecificDates.push(currentDateStr);
            addedCount++;
        }

        // Move to next day
        const [year, month, day] = currentDateStr.split('-').map(Number);
        const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
        currentDateStr = nextDate.toISOString().split('T')[0];
    }

    // Update UI
    updateSelectedDatesList();

    // Show feedback
    if (addedCount > 0) {
        const totalDates = addedCount + 1; // +1 for the fromDate already added
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification(`Expanded to ${totalDates} dates (${fromDate} to ${toDate})`, 'success');
        }
    } else {
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('All dates in this range were already added', 'info');
        }
    }

    // Clear both inputs for next entry
    fromDateInput.value = '';
    toDateInput.value = '';
    lastFromDate = null;
}

// Counter for additional date range inputs
let additionalDateRangeCounter = 0;

// Add another date range input pair
function addAnotherDateRange() {
    additionalDateRangeCounter++;
    const container = document.getElementById('additional-date-ranges');

    const dateRangeHtml = `
        <div class="additional-date-range mb-3" id="date-range-${additionalDateRangeCounter}" style="padding: 12px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label class="form-label" style="margin: 0; font-weight: 600;">
                    <i class="fas fa-calendar-week"></i> Additional Date/Range #${additionalDateRangeCounter}
                </label>
                <button type="button" class="btn-danger" onclick="removeAdditionalDateRange(${additionalDateRangeCounter})"
                    style="padding: 4px 12px; font-size: 0.875rem;">
                    <i class="fas fa-times"></i> Remove
                </button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div>
                    <label style="font-size: 0.875rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">
                        From Date <span style="color: var(--error-color); font-size: 0.875rem;">*</span>
                    </label>
                    <input type="date" id="additional-date-from-${additionalDateRangeCounter}" class="form-input" onchange="handleAdditionalFromDateChange(${additionalDateRangeCounter})">
                </div>
                <div>
                    <label style="font-size: 0.875rem; color: var(--text-secondary); display: block; margin-bottom: 4px;">
                        To Date <span style="font-size: 0.7rem; font-style: italic;">(Optional)</span>
                    </label>
                    <input type="date" id="additional-date-to-${additionalDateRangeCounter}" class="form-input" onchange="handleAdditionalToDateChange(${additionalDateRangeCounter})">
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', dateRangeHtml);

    if (typeof TutorProfileUI !== 'undefined') {
        TutorProfileUI.showNotification('Additional date range input added', 'success');
    }
}

// Remove additional date range input
function removeAdditionalDateRange(id) {
    const element = document.getElementById(`date-range-${id}`);
    if (element) {
        element.remove();
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Date range input removed', 'info');
        }
    }
}

// Handle additional From Date change - add single date immediately
function handleAdditionalFromDateChange(id) {
    const fromDateInput = document.getElementById(`additional-date-from-${id}`);
    const toDateInput = document.getElementById(`additional-date-to-${id}`);
    const fromDate = fromDateInput?.value;

    if (!fromDate) {
        return;
    }

    // Add the single "From Date" immediately
    if (!selectedSpecificDates.includes(fromDate)) {
        selectedSpecificDates.push(fromDate);

        // Update UI
        updateSelectedDatesList();

        // Show feedback
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Added 1 date to schedule', 'success');
        }
    } else {
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('This date is already added', 'info');
        }
    }

    // Clear "To Date" field for fresh input
    toDateInput.value = '';
}

// Handle additional To Date change - expand to date range
function handleAdditionalToDateChange(id) {
    const fromDateInput = document.getElementById(`additional-date-from-${id}`);
    const toDateInput = document.getElementById(`additional-date-to-${id}`);
    const fromDate = fromDateInput?.value;
    const toDate = toDateInput?.value;

    if (!fromDate || !toDate) {
        return;
    }

    // Validate date range
    if (fromDate > toDate) {
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('To Date must be after or equal to From Date', 'error');
        } else {
            alert('To Date must be after or equal to From Date');
        }
        toDateInput.value = '';
        return;
    }

    // Add all dates between fromDate and toDate (excluding fromDate since it's already added)
    let currentDateStr = fromDate;
    const nextDay = new Date(fromDate + 'T00:00:00');
    nextDay.setDate(nextDay.getDate() + 1);
    currentDateStr = nextDay.toISOString().split('T')[0];

    let addedCount = 0;

    while (currentDateStr <= toDate) {
        // Only add if not already in the list
        if (!selectedSpecificDates.includes(currentDateStr)) {
            selectedSpecificDates.push(currentDateStr);
            addedCount++;
        }

        // Move to next day
        const [year, month, day] = currentDateStr.split('-').map(Number);
        const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
        currentDateStr = nextDate.toISOString().split('T')[0];
    }

    // Update UI
    updateSelectedDatesList();

    // Show feedback
    if (addedCount > 0) {
        const totalDates = addedCount + 1; // +1 for the fromDate already added
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification(`Expanded to ${totalDates} dates (${fromDate} to ${toDate})`, 'success');
        }
    } else {
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('All dates in this range were already added', 'info');
        }
    }

    // Clear both inputs for next entry
    fromDateInput.value = '';
    toDateInput.value = '';
}

// Remove specific date from the list
function removeSpecificDate(date) {
    selectedSpecificDates = selectedSpecificDates.filter(d => d !== date);
    updateSelectedDatesList();
}

// Update the selected dates list UI
function updateSelectedDatesList() {
    console.log('🔄 updateSelectedDatesList called');
    console.log('Current selectedSpecificDates:', selectedSpecificDates);

    const container = document.getElementById('selected-dates-list');
    console.log('Container found:', !!container);

    if (!container) {
        console.error('❌ selected-dates-list container not found!');
        return;
    }

    if (selectedSpecificDates.length === 0) {
        console.log('📭 No dates selected - showing empty message');
        container.innerHTML = '<p class="text-muted" style="font-size: 0.9rem;">No dates selected yet</p>';
        return;
    }

    // Sort dates
    const sortedDates = [...selectedSpecificDates].sort();
    console.log('✅ Sorted dates:', sortedDates);

    container.innerHTML = sortedDates.map(date => {
        const dateObj = new Date(date + 'T00:00:00');
        const formattedDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        console.log(`- Rendering date: ${date} as ${formattedDate}`);

        return `
            <div class="selected-date-item">
                <span><i class="fas fa-calendar-day"></i> ${formattedDate}</span>
                <button type="button" class="remove-date-btn" onclick="removeSpecificDate('${date}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');

    console.log('✅ Selected dates list updated successfully');
}

// Toggle alarm settings visibility
function toggleAlarmSettings() {
    const enableAlarm = document.getElementById('enable-alarm');
    const alarmDetails = document.getElementById('alarm-settings-details');

    if (enableAlarm && alarmDetails) {
        if (enableAlarm.checked) {
            alarmDetails.style.display = 'block';
            requestNotificationPermission();
        } else {
            alarmDetails.style.display = 'none';
        }
    }
}

// Request notification permission
async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('✅ Notification permission granted');
            } else {
                console.log('❌ Notification permission denied');
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    }
}

// Initialize schedule modal event listeners
function initScheduleModal() {
    // Add Enter key handler for single date picker
    const datePicker = document.getElementById('schedule-date-picker');
    if (datePicker) {
        datePicker.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSpecificDate();
            }
        });
        console.log('✅ Enter key handler added to date picker');
    }
}

// Call initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScheduleModal);
} else {
    initScheduleModal();
}

// Schedule notifications for the schedule
function scheduleNotifications(schedule) {
    if (!schedule.alarm_enabled) return;

    // Store schedule in localStorage for persistent notifications
    const scheduledNotifications = JSON.parse(localStorage.getItem('scheduledNotifications') || '[]');
    scheduledNotifications.push(schedule);
    localStorage.setItem('scheduledNotifications', JSON.stringify(scheduledNotifications));

    console.log('🔔 Notifications scheduled for:', schedule.title);

    // Start checking for upcoming schedules
    if (!window.scheduleNotificationInterval) {
        startNotificationChecker();
    }
}

// Start checking for upcoming schedules
function startNotificationChecker() {
    // Check every minute
    window.scheduleNotificationInterval = setInterval(checkUpcomingSchedules, 60000);

    // Also check immediately
    checkUpcomingSchedules();

    console.log('✅ Notification checker started');
}

// Check for upcoming schedules and send notifications
function checkUpcomingSchedules() {
    const scheduledNotifications = JSON.parse(localStorage.getItem('scheduledNotifications') || '[]');
    const now = new Date();

    scheduledNotifications.forEach(schedule => {
        if (!schedule.alarm_enabled) return;

        // Calculate next occurrence time
        const nextOccurrence = getNextScheduleOccurrence(schedule, now);

        if (!nextOccurrence) return;

        // Calculate time difference in minutes
        const timeDiff = (nextOccurrence - now) / (1000 * 60);

        // Check if we should notify
        const alarmBefore = schedule.alarm_before_minutes || 15;

        if (timeDiff > 0 && timeDiff <= alarmBefore && timeDiff > (alarmBefore - 1)) {
            // Send notification
            sendScheduleNotification(schedule, nextOccurrence);
        }
    });
}

// Get next occurrence of a schedule
function getNextScheduleOccurrence(schedule, fromDate) {
    const now = fromDate || new Date();

    if (schedule.schedule_type === 'specific') {
        // Find the next specific date
        const upcomingDates = schedule.specific_dates
            .map(dateStr => new Date(dateStr + 'T' + schedule.start_time))
            .filter(date => date > now)
            .sort((a, b) => a - b);

        return upcomingDates[0] || null;
    } else if (schedule.schedule_type === 'recurring') {
        // Find next recurring date
        const currentYear = now.getFullYear();
        const scheduleYear = schedule.year || currentYear;

        // Only check current year and next year
        for (const year of [currentYear, currentYear + 1]) {
            if (year < scheduleYear) continue;

            for (const month of schedule.months) {
                const monthIndex = new Date(Date.parse(month + " 1, " + year)).getMonth();

                for (let day = 1; day <= 31; day++) {
                    const testDate = new Date(year, monthIndex, day);

                    // Check if day is valid and matches our requirements
                    if (testDate.getMonth() !== monthIndex) break; // Past end of month

                    const dayName = testDate.toLocaleDateString('en-US', { weekday: 'long' });

                    if (schedule.days.includes(dayName)) {
                        // Build full datetime
                        const [hours, minutes] = schedule.start_time.split(':');
                        const scheduleDateTime = new Date(year, monthIndex, day, parseInt(hours), parseInt(minutes));

                        if (scheduleDateTime > now) {
                            return scheduleDateTime;
                        }
                    }
                }
            }
        }
    }

    return null;
}

// Send schedule notification
function sendScheduleNotification(schedule, scheduleTime) {
    const alarmBefore = schedule.alarm_before_minutes || 15;
    const timeString = scheduleTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Browser notification
    if (schedule.notification_browser && Notification.permission === 'granted') {
        const notification = new Notification('Upcoming Schedule: ' + schedule.title, {
            body: `Your ${schedule.subject} class starts at ${timeString} (in ${alarmBefore} minutes)`,
            icon: '/uploads/system_images/system_images/Astegni_qrcode.png',
            tag: 'schedule-' + schedule.id,
            requireInteraction: true
        });

        notification.onclick = function() {
            window.focus();
            this.close();
        };
    }

    // Sound alert
    if (schedule.notification_sound) {
        playNotificationSound();
    }

    // Visual toast notification
    if (typeof TutorProfileUI !== 'undefined') {
        TutorProfileUI.showNotification(
            `Upcoming: ${schedule.title} at ${timeString}`,
            'info'
        );
    }

    console.log('🔔 Notification sent for:', schedule.title);
}

// Play notification sound
function playNotificationSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBza R0/LThi8FKH3J8OGVRwkSZrjp7a1aGQVDm9vyvmUcBziS2/LQfC0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBziS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBjiS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQcBjiS2/LQfS0FJ3vI8OCVRwkSZrjp7axaGQVDm9vyvmQc');
    audio.play().catch(e => console.log('Could not play notification sound:', e));
}

// Initialize notification checker on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const scheduledNotifications = JSON.parse(localStorage.getItem('scheduledNotifications') || '[]');
        if (scheduledNotifications.length > 0) {
            startNotificationChecker();
        }
    });
} else {
    const scheduledNotifications = JSON.parse(localStorage.getItem('scheduledNotifications') || '[]');
    if (scheduledNotifications.length > 0) {
        startNotificationChecker();
    }
}

// ============================================
// LOAD AND DISPLAY SCHEDULES
// ============================================

// Pagination state for schedules
let scheduleCurrentPage = 1;
const scheduleItemsPerPage = 10;

async function loadSchedules(page = 1) {
    const container = document.getElementById('schedules-table-container');
    if (!container) return;

    scheduleCurrentPage = page;

    try {
        // Show loading state
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
                <p>Loading schedules...</p>
            </div>
        `;

        // Wait for auth to be ready before checking token
        if (window.TutorAuthReady) {
            await window.TutorAuthReady.waitForAuth();
        }

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-lock text-3xl mb-3"></i>
                    <p>Please log in to view your schedules</p>
                </div>
            `;
            return;
        }

        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/tutor/schedules', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load schedules');
        }

        const allSchedulesData = await response.json();

        // Pagination logic
        const totalSchedules = allSchedulesData.length;
        const totalPages = Math.ceil(totalSchedules / scheduleItemsPerPage);
        const startIndex = (page - 1) * scheduleItemsPerPage;
        const endIndex = startIndex + scheduleItemsPerPage;
        const schedules = allSchedulesData.slice(startIndex, endIndex);

        if (totalSchedules === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-calendar-alt text-3xl mb-3"></i>
                    <p>No schedules created yet</p>
                    <p class="text-sm mt-2">Click "Create Schedule" to add your first schedule</p>
                </div>
            `;
            return;
        }

        // Create table
        const tableHTML = `
            <div class="overflow-x-auto">
                <table class="w-full" style="border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: var(--bg-secondary); border-bottom: 2px solid var(--border-color);">
                            <th style="padding: 12px; text-align: left; font-weight: 600; cursor: pointer;" onclick="sortSchedulesByColumn('title')" title="Click to sort">
                                Schedule Title <i class="fas fa-sort text-gray-400"></i>
                            </th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; cursor: pointer;" onclick="sortSchedulesByColumn('priority_level')" title="Click to sort">
                                Priority Level <i class="fas fa-sort text-gray-400"></i>
                            </th>
                            <th style="padding: 12px; text-align: left; font-weight: 600; cursor: pointer;" onclick="sortSchedulesByColumn('start_time')" title="Click to sort">
                                Date & Time <i class="fas fa-sort text-gray-400"></i>
                            </th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Notification</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Alarm</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Featured</th>
                            <th style="padding: 12px; text-align: center; font-weight: 600;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedules.map(schedule => {
                            const alarmStatus = schedule.alarm_enabled
                                ? `<i class="fas fa-bell text-green-500 cursor-pointer hover:text-green-600" title="Alarm enabled (${schedule.alarm_before_minutes} min before) - Click to disable" onclick="toggleScheduleAlarm(${schedule.id}, false)"></i>`
                                : `<i class="fas fa-bell-slash text-gray-400 cursor-pointer hover:text-gray-600" title="Click to enable alarm" onclick="toggleScheduleAlarm(${schedule.id}, true)"></i>`;

                            const notificationStatus = schedule.notification_browser
                                ? `<i class="fas fa-check-circle text-green-500 cursor-pointer hover:text-green-600" title="Browser notifications enabled - Click to disable" onclick="toggleScheduleNotification(${schedule.id}, false)"></i>`
                                : `<i class="fas fa-times-circle text-gray-400 cursor-pointer hover:text-gray-600" title="Click to enable notifications" onclick="toggleScheduleNotification(${schedule.id}, true)"></i>`;

                            const featuredStatus = schedule.is_featured
                                ? `<i class="fas fa-star text-yellow-500 cursor-pointer hover:text-yellow-600" title="Featured schedule - Click to unfeature" onclick="toggleScheduleFeatured(${schedule.id}, false)"></i>`
                                : `<i class="far fa-star text-gray-400 cursor-pointer hover:text-gray-600" title="Click to feature this schedule" onclick="toggleScheduleFeatured(${schedule.id}, true)"></i>`;

                            // Format date and time together like sessions table
                            let dateTimeDisplay = '';
                            if (schedule.schedule_type === 'recurring') {
                                if (schedule.months && schedule.months.length > 0) {
                                    dateTimeDisplay = schedule.months.join(', ');
                                }
                                if (schedule.days && schedule.days.length > 0) {
                                    dateTimeDisplay += (dateTimeDisplay ? ' | ' : '') + schedule.days.join(', ');
                                }
                                dateTimeDisplay += `<br><span style="color: var(--text-secondary);">${schedule.start_time} - ${schedule.end_time}</span>`;
                            } else if (schedule.specific_dates && schedule.specific_dates.length > 0) {
                                const firstDate = new Date(schedule.specific_dates[0]).toLocaleDateString();
                                dateTimeDisplay = firstDate;
                                if (schedule.specific_dates.length > 1) {
                                    dateTimeDisplay += ` (+${schedule.specific_dates.length - 1} more)`;
                                }
                                dateTimeDisplay += `<br><span style="color: var(--text-secondary);">${schedule.start_time} - ${schedule.end_time}</span>`;
                            }

                            return `
                                <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 12px;">
                                        <div style="font-weight: 500;">${schedule.title}</div>
                                        <div style="font-size: 0.875rem; color: var(--text-secondary);">
                                            <span class="role-badge" style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; text-transform: capitalize;">
                                                ${schedule.scheduler_role || 'tutor'}
                                            </span>
                                        </div>
                                    </td>
                                    <td style="padding: 12px;">
                                        <span class="badge" style="background: ${
                                            schedule.priority_level === 'urgent' ? '#DC2626' :
                                            schedule.priority_level === 'high' ? '#F59E0B' :
                                            schedule.priority_level === 'low' ? '#10B981' :
                                            '#3B82F6'
                                        }; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; text-transform: capitalize;">
                                            ${schedule.priority_level || 'medium'}
                                        </span>
                                    </td>
                                    <td style="padding: 12px; font-size: 0.875rem;">
                                        ${dateTimeDisplay || 'N/A'}
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        ${notificationStatus}
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        ${alarmStatus}
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        ${featuredStatus}
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        <button
                                            onclick="viewSchedule(${schedule.id})"
                                            class="btn-secondary"
                                            style="padding: 6px 12px; font-size: 0.875rem; border-radius: 6px;">
                                            <i class="fas fa-eye"></i> View
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Pagination Controls -->
            ${totalPages > 1 ? `
                <div class="flex justify-between items-center mt-6">
                    <div class="text-sm text-gray-600">
                        Showing ${startIndex + 1}-${Math.min(endIndex, totalSchedules)} of ${totalSchedules} schedules
                    </div>
                    <div class="flex gap-2">
                        <button
                            onclick="loadSchedules(${page - 1})"
                            ${page === 1 ? 'disabled' : ''}
                            class="px-4 py-2 rounded ${page === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}">
                            <i class="fas fa-chevron-left"></i> Previous
                        </button>
                        <div class="flex gap-1">
                            ${Array.from({length: totalPages}, (_, i) => i + 1).map(pageNum => `
                                <button
                                    onclick="loadSchedules(${pageNum})"
                                    class="px-3 py-2 rounded ${pageNum === page ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}">
                                    ${pageNum}
                                </button>
                            `).join('')}
                        </div>
                        <button
                            onclick="loadSchedules(${page + 1})"
                            ${page === totalPages ? 'disabled' : ''}
                            class="px-4 py-2 rounded ${page === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}">
                            Next <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            ` : ''}
        `;

        container.innerHTML = tableHTML;

    } catch (error) {
        console.error('Error loading schedules:', error);
        container.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load schedules</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

// ============================================
// SCHEDULE SEARCH FUNCTIONALITY
// ============================================
// NOTE: allSchedules, allSessions, loadSchedules, and loadSessions
// are now defined in schedule-tab-manager.js
// ============================================

// Legacy loadSchedules function - REMOVED (now in schedule-tab-manager.js)
/*
 * This function has been moved to schedule-tab-manager.js
 * Do not uncomment - it will cause duplicate declaration errors
 * These functions have been moved to schedule-tab-manager.js:
 * - renderSchedulesTable()
 * - searchSchedules()
 */

// ============================================
// VIEW SCHEDULE DETAILS
// ============================================

// Store current schedule ID for edit/delete operations
let currentViewingScheduleId = null;

async function viewSchedule(scheduleId) {
    console.log('🔍 viewSchedule called with ID:', scheduleId);

    const modal = document.getElementById('viewScheduleModal');
    const content = document.getElementById('viewScheduleContent');

    console.log('Modal element:', modal);
    console.log('Content element:', content);

    if (!modal || !content) {
        console.error('❌ Modal or content element not found!');
        return;
    }

    // Store schedule ID for edit/delete operations
    currentViewingScheduleId = scheduleId;

    // Open modal - remove hidden and add show class
    modal.classList.remove('hidden');
    modal.classList.add('show');
    console.log('✅ Modal classes after opening:', modal.className);

    // Show loading
    content.innerHTML = `
        <div class="text-center py-8 text-gray-500">
            <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
            <p>Loading schedule details...</p>
        </div>
    `;

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Please log in to view schedule details');
        }

        const response = await fetch(`http://localhost:8000/api/schedules/${scheduleId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load schedule details');
        }

        const schedule = await response.json();

        // Display schedule details
        const detailsHTML = `
            <div style="padding: 20px;">
                <!-- Title -->
                <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid var(--border-color);">
                    <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">${schedule.title}</h3>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <span class="badge" style="background: #6c757d; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.875rem; text-transform: capitalize;">
                            <i class="fas fa-user-tag"></i> ${schedule.scheduler_role || 'tutor'}
                        </span>
                        <span class="badge" style="background: ${
                            schedule.priority_level === 'urgent' ? '#DC2626' :
                            schedule.priority_level === 'high' ? '#F59E0B' :
                            schedule.priority_level === 'low' ? '#10B981' :
                            '#3B82F6'
                        }; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.875rem; text-transform: capitalize;">
                            <i class="fas fa-flag"></i> ${schedule.priority_level || 'medium'} Priority
                        </span>
                        <span class="badge" style="background: ${schedule.status === 'active' ? '#10B981' : '#F59E0B'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 0.875rem; text-transform: capitalize;">
                            <i class="fas fa-circle"></i> ${schedule.status || 'active'}
                        </span>
                    </div>
                </div>

                <!-- Description -->
                ${schedule.description ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-align-left"></i> Description
                    </div>
                    <p style="color: var(--text-secondary); line-height: 1.6;">${schedule.description}</p>
                </div>
                ` : ''}

                <!-- Schedule Type & Time -->
                <div style="margin-bottom: 20px;">
                    <div style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-calendar-alt"></i> Schedule Information
                    </div>
                    <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
                        <div style="margin-bottom: 12px;">
                            <strong>Type:</strong>
                            <span class="badge" style="background: var(--primary-color); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 8px;">
                                ${schedule.schedule_type === 'recurring' ? 'Recurring' : 'Specific Dates'}
                            </span>
                        </div>
                        ${schedule.schedule_type === 'recurring' ? `
                        <div style="margin-bottom: 12px;">
                            <strong>Months:</strong> ${schedule.months.join(', ')}
                        </div>
                        <div style="margin-bottom: 12px;">
                            <strong>Days:</strong> ${schedule.days.join(', ')}
                        </div>
                        ` : `
                        <div style="margin-bottom: 12px;">
                            <strong>Dates:</strong> ${schedule.specific_dates.join(', ')}
                        </div>
                        `}
                        <div style="margin-bottom: 12px;">
                            <strong>Time:</strong> ${schedule.start_time} - ${schedule.end_time}
                        </div>
                        <div>
                            <strong>Year:</strong> ${schedule.year}
                        </div>
                    </div>
                </div>

                <!-- Alarm & Notifications -->
                <div style="margin-bottom: 20px;">
                    <div style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-bell"></i> Alarm & Notifications
                    </div>
                    <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
                        ${schedule.alarm_enabled ? `
                        <div style="color: green; margin-bottom: 8px;">
                            <i class="fas fa-check-circle"></i> Alarm Enabled
                        </div>
                        <div style="margin-bottom: 8px;">
                            <strong>Reminder:</strong> ${schedule.alarm_before_minutes} minutes before
                        </div>
                        <div style="margin-bottom: 8px;">
                            <strong>Browser Notification:</strong> ${schedule.notification_browser ? 'Enabled' : 'Disabled'}
                        </div>
                        <div>
                            <strong>Sound Alert:</strong> ${schedule.notification_sound ? 'Enabled' : 'Disabled'}
                        </div>
                        ` : `
                        <div style="color: var(--text-secondary);">
                            <i class="fas fa-bell-slash"></i> No alarm set
                        </div>
                        `}
                    </div>
                </div>

                <!-- Notes -->
                ${schedule.notes ? `
                <div style="margin-bottom: 20px;">
                    <div style="font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-sticky-note"></i> Additional Notes
                    </div>
                    <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
                        <p style="color: var(--text-secondary); line-height: 1.6;">${schedule.notes}</p>
                    </div>
                </div>
                ` : ''}

                <!-- Timestamps -->
                <div style="padding-top: 16px; border-top: 1px solid var(--border-color); font-size: 0.875rem; color: var(--text-secondary);">
                    <div>Created: ${new Date(schedule.created_at).toLocaleString()}</div>
                    ${schedule.updated_at ? `<div>Updated: ${new Date(schedule.updated_at).toLocaleString()}</div>` : ''}
                </div>
            </div>
        `;

        content.innerHTML = detailsHTML;

    } catch (error) {
        console.error('Error loading schedule details:', error);
        content.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3"></i>
                <p>Failed to load schedule details</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

function closeViewScheduleModal() {
    const modal = document.getElementById('viewScheduleModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('show');
        currentViewingScheduleId = null;
    }
}

// ============================================
// VIEW SESSION MODAL
// ============================================

async function viewSession(sessionId) {
    console.log('🔍 viewSession called with ID:', sessionId);

    // For now, show an alert with session details
    // TODO: Create a proper view session modal similar to viewScheduleModal
    try {
        // Wait for auth to be ready before checking token
        if (window.TutorAuthReady) {
            await window.TutorAuthReady.waitForAuth();
        }

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            alert('Please log in to view session details');
            return;
        }

        const response = await fetch(`http://localhost:8000/api/tutor/sessions/${sessionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load session details');
        }

        const session = await response.json();

        // Show session details in a formatted alert (temporary solution)
        const sessionInfo = `
Session Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Student: ${session.student_name || 'Unknown Student'}
Student ID: ${session.student_id}

Subject: ${session.subject}
Topic: ${session.topic || 'No topic specified'}
Grade Level: ${session.grade_level || 'N/A'}

Date: ${new Date(session.session_date).toLocaleDateString()}
Time: ${session.start_time} - ${session.end_time}
Duration: ${session.duration ? session.duration + ' minutes' : 'N/A'}

Mode: ${session.mode || 'N/A'}
Status: ${session.status}
Location: ${session.location || 'N/A'}

${session.notes ? 'Notes: ' + session.notes : 'No additional notes'}
        `;

        alert(sessionInfo.trim());

        console.log('✅ Session details:', session);
    } catch (error) {
        console.error('Error viewing session:', error);
        alert('Failed to load session details: ' + error.message);
    }
}

// ============================================
// EDIT SCHEDULE FROM VIEW MODAL
// ============================================

async function editScheduleFromView() {
    console.log('✏️ editScheduleFromView called');
    console.log('Current schedule ID:', currentViewingScheduleId);

    if (!currentViewingScheduleId) {
        console.error('❌ No schedule ID available');
        alert('No schedule selected');
        return;
    }

    // IMPORTANT: Save the schedule ID to a local variable BEFORE closing the view modal
    // because closeViewScheduleModal() sets currentViewingScheduleId to null
    const scheduleIdToEdit = currentViewingScheduleId;
    console.log('💾 Saved schedule ID for editing:', scheduleIdToEdit);

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to edit schedules');
            return;
        }

        console.log('📡 Fetching schedule details...');

        // Fetch the schedule details again to ensure we have the latest data
        const response = await fetch(`http://localhost:8000/api/tutor/schedules/${scheduleIdToEdit}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load schedule details');
        }

        const schedule = await response.json();
        console.log('✅ Schedule data loaded:', schedule);

        // Close view modal (this will set currentViewingScheduleId to null, but we have scheduleIdToEdit saved)
        console.log('🚪 Closing view modal...');
        closeViewScheduleModal();

        // Open edit modal with schedule data
        console.log('🔍 Looking for scheduleModal...');
        const modal = document.getElementById('scheduleModal');
        console.log('Modal found:', modal);

        if (!modal) {
            console.error('❌ scheduleModal not found!');
            alert('Schedule edit modal not found. Please refresh the page.');
            return;
        }

        console.log('📝 Opening edit modal and populating fields...');
        modal.classList.remove('hidden');
        modal.classList.add('show');
        console.log('Modal classes:', modal.className);

        // Populate form fields (using hyphenated IDs)
        document.getElementById('schedule-title').value = schedule.title || '';
        document.getElementById('schedule-description').value = schedule.description || '';
        document.getElementById('schedule-year').value = schedule.year || new Date().getFullYear();

        // Set is_featured (checkbox)
        const isFeaturedCheckbox = document.getElementById('schedule-is-featured');
        if (isFeaturedCheckbox) {
            isFeaturedCheckbox.checked = schedule.is_featured || false;
        }

        // Set grade level
        const gradeLevelSelect = document.getElementById('schedule-grade');
        if (gradeLevelSelect) {
            gradeLevelSelect.value = schedule.grade_level || '';
        }

        // Set schedule type
        const scheduleTypeRadios = document.querySelectorAll('input[name="schedule-type"]');
        scheduleTypeRadios.forEach(radio => {
            if (radio.value === schedule.schedule_type) {
                radio.checked = true;
            }
        });

        // Toggle schedule type sections
        toggleScheduleType();

        if (schedule.schedule_type === 'recurring') {
            // Set months
            const monthCheckboxes = document.querySelectorAll('input[name="schedule-month"]');
            monthCheckboxes.forEach(checkbox => {
                checkbox.checked = schedule.months.includes(checkbox.value);
            });

            // Set days
            const dayCheckboxes = document.querySelectorAll('input[name="schedule-day"]');
            dayCheckboxes.forEach(checkbox => {
                checkbox.checked = schedule.days.includes(checkbox.value);
            });
        } else {
            // Set specific dates
            if (schedule.specific_dates && schedule.specific_dates.length > 0) {
                // Clear and rebuild the selectedSpecificDates array
                selectedSpecificDates.length = 0;
                schedule.specific_dates.forEach(date => {
                    selectedSpecificDates.push(date);
                });
                updateSelectedDatesList();
            }
        }

        // Set times
        document.getElementById('schedule-start-time').value = schedule.start_time || '';
        document.getElementById('schedule-end-time').value = schedule.end_time || '';

        // Set notes
        document.getElementById('schedule-notes').value = schedule.notes || '';

        // Set alarm settings
        document.getElementById('enable-alarm').checked = schedule.alarm_enabled || false;
        if (schedule.alarm_enabled) {
            document.getElementById('alarm-settings-details').style.display = 'block';
            document.getElementById('alarm-before').value = schedule.alarm_before_minutes || 15;
            document.querySelector('input[name="notification-browser"]').checked = schedule.notification_browser || false;
            document.querySelector('input[name="notification-sound"]').checked = schedule.notification_sound || false;
        } else {
            document.getElementById('alarm-settings-details').style.display = 'none';
        }

        // Store schedule ID for update in hidden input field
        const scheduleIdInput = document.getElementById('editing-schedule-id');
        console.log('🔍 === EDIT SCHEDULE DEBUG ===');
        console.log('Hidden input element found:', scheduleIdInput);
        console.log('scheduleIdToEdit:', scheduleIdToEdit);
        console.log('scheduleIdToEdit type:', typeof scheduleIdToEdit);

        if (scheduleIdInput) {
            scheduleIdInput.value = String(scheduleIdToEdit);
            console.log('✅ Stored scheduleId in hidden input:', scheduleIdInput.value);
            console.log('✅ Verify value was set - reading back:', scheduleIdInput.value);
            console.log('✅ Input element HTML:', scheduleIdInput.outerHTML);
        } else {
            console.error('❌ Could not find editing-schedule-id input field!');
        }

        // Change modal title to "Edit Schedule"
        const modalTitle = document.getElementById('schedule-modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Teaching Schedule';
        }

        // Change submit button text to "Update Schedule"
        const submitBtn = document.getElementById('schedule-submit-btn');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Schedule';
        }

        // Handle grade level "Other" option
        if (gradeLevelSelect) {
            const gradeOptions = Array.from(gradeLevelSelect.options);
            const matchingGradeOption = gradeOptions.find(opt => opt.value === schedule.grade_level);
            if (!matchingGradeOption && schedule.grade_level) {
                gradeLevelSelect.value = 'Other';
                document.getElementById('other-grade-details').value = schedule.grade_level;
                document.getElementById('other-grade-group').style.display = 'block';
            }
        }

    } catch (error) {
        console.error('Error loading schedule for editing:', error);
        alert('Failed to load schedule details. Please try again.');
    }
}

// ============================================
// DELETE SCHEDULE FROM VIEW MODAL
// ============================================

async function deleteScheduleFromView() {
    if (!currentViewingScheduleId) {
        alert('No schedule selected');
        return;
    }

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this schedule? This action cannot be undone.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to delete schedules');
            return;
        }

        const response = await fetch(`http://localhost:8000/api/tutor/schedules/${currentViewingScheduleId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete schedule');
        }

        // Close modal
        closeViewScheduleModal();

        // Show success message
        alert('Schedule deleted successfully!');

        // Reload schedules table
        loadSchedules();

    } catch (error) {
        console.error('Error deleting schedule:', error);
        alert('Failed to delete schedule. Please try again.');
    }
}

// ============================================
// INITIALIZE SCHEDULE LOADING ON PANEL SWITCH
// ============================================

// Listen for panel switch events and load schedules when schedule panel is opened
window.addEventListener('panelSwitch', (event) => {
    if (event.detail.panelName === 'schedule') {
        console.log('📅 Schedule panel opened, loading schedules...');
        loadSchedules();
    }
});

// Export schedule functions
window.saveSchedule = saveSchedule;
// window.toggleOtherSubject = toggleOtherSubject; // Function not defined, commented out
// window.toggleOtherGradeLevel = toggleOtherGradeLevel; // Function not defined, commented out
window.toggleScheduleType = toggleScheduleType;
window.addSpecificDate = addSpecificDate;
window.addDateRange = addDateRange;
window.removeSpecificDate = removeSpecificDate;
window.toggleAlarmSettings = toggleAlarmSettings;
window.initScheduleModal = initScheduleModal;
window.loadSchedules = loadSchedules;
// REMOVED: searchSchedules - Defined in schedule-tab-manager.js (line 522, exported at line 965)
window.viewSchedule = viewSchedule;
window.closeViewScheduleModal = closeViewScheduleModal;
window.viewSession = viewSession;
window.editScheduleFromView = editScheduleFromView;
window.deleteScheduleFromView = deleteScheduleFromView;

// ============================================
// VERIFICATION WORKFLOW FUNCTIONS
// Achievement, Certification, Experience verification flow
// ============================================

// Open Verification Fee Modal
function openVerificationFeeModal() {
    console.log('🔔 openVerificationFeeModal() called');
    const modal = document.getElementById('verificationFeeModal');
    console.log('🔍 Found modal:', modal ? 'YES ✅' : 'NO ❌');

    if (modal) {
        console.log('📊 Modal current state:', {
            display: modal.style.display,
            hasHidden: modal.classList.contains('hidden'),
            hasShow: modal.classList.contains('show')
        });

        modal.classList.remove('hidden');
        modal.classList.add('show');
        modal.style.display = 'flex';

        console.log('📊 Modal new state:', {
            display: modal.style.display,
            hasHidden: modal.classList.contains('hidden'),
            hasShow: modal.classList.contains('show')
        });

        console.log('✅ Verification fee modal should now be visible');
    } else {
        console.error('❌ verificationFeeModal element not found in DOM!');
    }
}

// Note: closeVerificationFeeModal is defined above at line ~2781 (unified version)

// Confirm and Pay Verification Fee
async function confirmAndPayVerificationFee() {
    if (!window.pendingVerificationData) {
        console.error('No pending verification data found');
        return;
    }

    const { type, formData } = window.pendingVerificationData;

    try {
        // Close fee modal
        closeVerificationFeeModal();

        // Show loading state
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification('Processing payment and submitting...', 'info');
        }

        // Submit the form data to backend (already saves as pending status)
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Authentication required');
        }

        let endpoint, successMessage;

        switch(type) {
            case 'achievement':
                endpoint = '/api/tutor/achievements';
                successMessage = 'achievement';
                break;
            case 'certification':
                endpoint = '/api/tutor/certifications';
                successMessage = 'certification';
                break;
            case 'experience':
                endpoint = '/api/tutor/experience';
                successMessage = 'experience';
                break;
            default:
                throw new Error('Invalid verification type');
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to submit');
        }

        const result = await response.json();

        // Clear pending data
        window.pendingVerificationData = null;

        // Show success modal with the type of item submitted
        openVerificationSuccessModal(successMessage);

        // Reload the section to show new item (with pending status)
        if (typeof loadCertifications === 'function' && type === 'certification') {
            loadCertifications();
        } else if (typeof loadAchievements === 'function' && type === 'achievement') {
            loadAchievements();
        } else if (typeof loadExperiences === 'function' && type === 'experience') {
            loadExperiences();
        }

    } catch (error) {
        console.error('Error submitting verification:', error);
        if (typeof TutorProfileUI !== 'undefined') {
            TutorProfileUI.showNotification(error.message || 'Failed to submit. Please try again.', 'error');
        } else {
            alert('Failed to submit: ' + error.message);
        }
        // Re-open the original modal so user can try again
        window.pendingVerificationData = null;
    }
}

// Open Verification Success Modal
function openVerificationSuccessModal(itemType) {
    const modal = document.getElementById('verificationModal');
    const itemTypeElement = document.getElementById('verificationItemType');

    if (modal) {
        // Set the item type in the modal
        if (itemTypeElement) {
            itemTypeElement.textContent = itemType;
        }

        modal.classList.remove('hidden');
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
}

// Export new functions
window.openVerificationFeeModal = openVerificationFeeModal;
window.closeVerificationFeeModal = closeVerificationFeeModal;
window.confirmAndPayVerificationFee = confirmAndPayVerificationFee;
window.openVerificationSuccessModal = openVerificationSuccessModal;

// ============================================
// SCHEDULE TOGGLE FUNCTIONS
// ============================================

// Toggle schedule notification
async function toggleScheduleNotification(scheduleId, enable) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to modify schedule settings');
            return;
        }

        const response = await fetch(`http://localhost:8000/api/tutor/schedules/${scheduleId}/toggle-notification`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notification_browser: enable })
        });

        if (!response.ok) {
            throw new Error('Failed to update notification setting');
        }

        // Reload schedules to reflect changes
        if (typeof loadSchedules === 'function') {
            loadSchedules(scheduleCurrentPage || 1);
        }

        console.log(`Schedule ${scheduleId} notification ${enable ? 'enabled' : 'disabled'}`);
    } catch (error) {
        console.error('Error toggling schedule notification:', error);
        alert('Failed to update notification setting');
    }
}

// Toggle schedule alarm
async function toggleScheduleAlarm(scheduleId, enable) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to modify schedule settings');
            return;
        }

        const response = await fetch(`http://localhost:8000/api/tutor/schedules/${scheduleId}/toggle-alarm`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ alarm_enabled: enable })
        });

        if (!response.ok) {
            throw new Error('Failed to update alarm setting');
        }

        // Reload schedules to reflect changes
        if (typeof loadSchedules === 'function') {
            loadSchedules(scheduleCurrentPage || 1);
        }

        console.log(`Schedule ${scheduleId} alarm ${enable ? 'enabled' : 'disabled'}`);
    } catch (error) {
        console.error('Error toggling schedule alarm:', error);
        alert('Failed to update alarm setting');
    }
}

// Toggle schedule featured status
async function toggleScheduleFeatured(scheduleId, feature) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to modify schedule settings');
            return;
        }

        const response = await fetch(`http://localhost:8000/api/tutor/schedules/${scheduleId}/toggle-featured`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_featured: feature })
        });

        if (!response.ok) {
            throw new Error('Failed to update featured status');
        }

        // Reload schedules to reflect changes
        if (typeof loadSchedules === 'function') {
            loadSchedules(scheduleCurrentPage || 1);
        }

        console.log(`Schedule ${scheduleId} ${feature ? 'featured' : 'unfeatured'}`);
    } catch (error) {
        console.error('Error toggling schedule featured status:', error);
        alert('Failed to update featured status');
    }
}

// Make toggle functions globally accessible
window.toggleScheduleNotification = toggleScheduleNotification;
window.toggleScheduleAlarm = toggleScheduleAlarm;
window.toggleScheduleFeatured = toggleScheduleFeatured;

// ============================================
// STUDENT REVIEWS FUNCTIONS
// ============================================

// Global variable to track current student for reviews
let currentStudentForReview = null;
let selectedReviewType = 'positive';

// Load student reviews from API
async function loadStudentReviews(studentProfileId) {
    console.log('Loading student reviews for student_profile_id:', studentProfileId);

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        // Fetch review stats
        const statsResponse = await fetch(`http://localhost:8000/api/student/reviews/${studentProfileId}/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log('Review stats:', stats);

            // Update overall rating
            document.getElementById('student-overall-rating').textContent = stats.avg_rating.toFixed(1);

            // Update stars
            const starsEl = document.getElementById('student-rating-stars');
            const fullStars = Math.floor(stats.avg_rating);
            const hasHalfStar = stats.avg_rating % 1 >= 0.5;
            let starsHTML = '';
            for (let i = 0; i < fullStars; i++) starsHTML += '★';
            if (hasHalfStar) starsHTML += '⯨';
            const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
            for (let i = 0; i < emptyStars; i++) starsHTML += '☆';
            starsEl.textContent = starsHTML;

            // Update review count
            document.getElementById('student-review-count').textContent =
                `Based on ${stats.total_reviews} ${stats.total_reviews === 1 ? 'review' : 'reviews'}`;

            // Update rating bars
            updateRatingBar('subject-understanding', stats.avg_subject_understanding);
            updateRatingBar('participation', stats.avg_participation);
            updateRatingBar('discipline', stats.avg_discipline);
            updateRatingBar('punctuality', stats.avg_punctuality);
        }

        // Fetch reviews
        const reviewsResponse = await fetch(`http://localhost:8000/api/student/reviews/${studentProfileId}?limit=20`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (reviewsResponse.ok) {
            const reviews = await reviewsResponse.json();
            console.log('Reviews:', reviews);
            renderStudentReviews(reviews);
        } else {
            throw new Error(`Failed to load reviews: ${reviewsResponse.status}`);
        }

    } catch (error) {
        console.error('Error loading student reviews:', error);
        document.getElementById('student-reviews-container').innerHTML = `
            <div style="text-align: center; padding: 3rem; background: var(--bg-secondary); border-radius: 12px;">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <p style="color: var(--text-secondary);">Failed to load reviews</p>
            </div>
        `;
    }
}

// Update rating bar
function updateRatingBar(type, value) {
    const bar = document.getElementById(`bar-${type}`);
    const val = document.getElementById(`val-${type}`);
    if (bar && val) {
        const percentage = (value / 5) * 100;
        bar.style.width = `${percentage}%`;
        val.textContent = value.toFixed(1);
    }
}

// Render student reviews
function renderStudentReviews(reviews) {
    const container = document.getElementById('student-reviews-container');

    if (!reviews || reviews.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; background: var(--bg-secondary); border-radius: 12px; border: 2px dashed var(--border-color);">
                <i class="fas fa-star" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <h4 style="color: var(--text-primary); margin-bottom: 0.5rem;">No Reviews Yet</h4>
                <p style="color: var(--text-secondary); font-size: 0.875rem;">This student hasn't received any reviews yet</p>
            </div>
        `;
        return;
    }

    const reviewsHTML = reviews.map(review => {
        const stars = '★'.repeat(Math.floor(review.rating || 0)) +
                     '☆'.repeat(5 - Math.floor(review.rating || 0));

        const reviewDate = new Date(review.created_at);
        const formattedDate = reviewDate.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });

        const avatarSrc = review.reviewer_profile_picture || '/system_images/default-avatar.png';

        return `
            <div class="card" style="padding: 1.5rem; transition: all 0.3s;" onmouseenter="this.style.transform='translateX(5px)'" onmouseleave="this.style.transform='none'">
                <div style="display: flex; align-items: start; gap: 1rem; margin-bottom: 1rem;">
                    <img src="${avatarSrc}" alt="${review.reviewer_name}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <h5 style="margin: 0; font-weight: 600; color: var(--heading);">${review.reviewer_name}</h5>
                                <p style="margin: 0.25rem 0; font-size: 0.875rem; color: var(--text-muted);">${formattedDate}</p>
                            </div>
                            <div style="color: #F59E0B; font-size: 1.25rem; letter-spacing: 2px;">${stars}</div>
                        </div>
                    </div>
                </div>
                <h6 style="font-weight: 600; font-size: 1rem; color: var(--heading); margin: 0 0 0.5rem 0;">${review.review_title || 'Review'}</h6>
                <p style="font-size: 0.9rem; color: var(--text); line-height: 1.6; margin: 0;">
                    ${review.review_text}
                </p>
                <div style="margin-top: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span style="display: inline-block; background: #22c55e; color: white; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; font-weight: 600;">
                        ${review.reviewer_role === 'tutor' ? 'Tutor Review' : 'Parent Review'}
                    </span>
                    ${review.review_type ? `<span style="display: inline-block; background: var(--bg-secondary); color: var(--text-secondary); font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; font-weight: 600;">${review.review_type}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = reviewsHTML;
}

// Open review student modal
function openReviewStudentModal() {
    const modal = document.getElementById('reviewStudentModal');
    if (!modal) {
        console.error('Review Student Modal not found');
        return;
    }

    // Get student info from the modal
    const studentName = document.getElementById('student-name')?.textContent || 'Student';
    const studentAvatar = document.querySelector('#studentDetailsModal img[alt="Student"]')?.src || '/system_images/default-avatar.png';

    // Update modal header
    document.getElementById('review-modal-student-name').textContent = studentName;
    document.getElementById('review-modal-student-avatar').src = studentAvatar;
    document.getElementById('review-modal-student-info').textContent = 'Student Performance Review';

    // Reset form
    resetReviewForm();

    // Show modal
    modal.style.display = 'flex';
    console.log('✅ Review Student Modal opened');
}

// Close review student modal
function closeReviewStudentModal() {
    const modal = document.getElementById('reviewStudentModal');
    if (modal) {
        modal.style.display = 'none';
        console.log('✅ Review Student Modal closed');
    }
}

// Reset review form
function resetReviewForm() {
    // Reset sliders
    document.getElementById('subject-understanding-slider').value = 3;
    document.getElementById('participation-slider').value = 3;
    document.getElementById('discipline-slider').value = 3;
    document.getElementById('punctuality-slider').value = 3;

    // Reset slider values display
    updateSliderValue('subject-understanding', 3);
    updateSliderValue('participation', 3);
    updateSliderValue('discipline', 3);
    updateSliderValue('punctuality', 3);

    // Reset text inputs
    document.getElementById('review-title-input').value = '';
    document.getElementById('review-text-input').value = '';

    // Reset review type
    selectedReviewType = 'positive';
    document.querySelectorAll('.review-type-btn').forEach(btn => {
        btn.style.borderColor = 'rgba(var(--border-rgb), 0.2)';
        btn.style.background = 'var(--card-bg)';
    });
    const positiveBtn = document.querySelector('.review-type-btn[data-type="positive"]');
    if (positiveBtn) {
        positiveBtn.style.borderColor = '#3b82f6';
        positiveBtn.style.background = 'rgba(59, 130, 246, 0.1)';
    }
}

// Update slider value display
function updateSliderValue(type, value) {
    const valueEl = document.getElementById(`${type}-value`);
    if (valueEl) {
        valueEl.textContent = parseFloat(value).toFixed(1);
    }
}

// Select review type
function selectReviewType(type) {
    selectedReviewType = type;

    // Update button styles
    document.querySelectorAll('.review-type-btn').forEach(btn => {
        const btnType = btn.getAttribute('data-type');
        if (btnType === type) {
            btn.style.borderColor = '#3b82f6';
            btn.style.background = 'rgba(59, 130, 246, 0.1)';
        } else {
            btn.style.borderColor = 'rgba(var(--border-rgb), 0.2)';
            btn.style.background = 'var(--card-bg)';
        }
    });

    console.log('Review type selected:', type);
}

// Submit student review
async function submitStudentReview() {
    if (!currentStudentForReview) {
        alert('No student selected for review');
        return;
    }

    // Get form values
    const subjectUnderstanding = parseFloat(document.getElementById('subject-understanding-slider').value);
    const participation = parseFloat(document.getElementById('participation-slider').value);
    const discipline = parseFloat(document.getElementById('discipline-slider').value);
    const punctuality = parseFloat(document.getElementById('punctuality-slider').value);
    const reviewTitle = document.getElementById('review-title-input').value.trim();
    const reviewText = document.getElementById('review-text-input').value.trim();

    // Validation
    if (!reviewTitle) {
        alert('Please enter a review title');
        return;
    }

    if (!reviewText) {
        alert('Please enter your review');
        return;
    }

    if (reviewText.length < 20) {
        alert('Review must be at least 20 characters long');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to submit a review');
            return;
        }

        const reviewData = {
            student_id: currentStudentForReview.student_profile_id,
            subject_understanding: subjectUnderstanding,
            participation: participation,
            discipline: discipline,
            punctuality: punctuality,
            review_title: reviewTitle,
            review_text: reviewText,
            review_type: selectedReviewType
        };

        console.log('Submitting review:', reviewData);

        const response = await fetch(`http://localhost:8000/api/student/reviews/${currentStudentForReview.student_profile_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reviewData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Review submitted successfully:', result);
            alert('Review submitted successfully!');
            closeReviewStudentModal();

            // Reload reviews
            await loadStudentReviews(currentStudentForReview.student_profile_id);
        } else {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to submit review');
        }

    } catch (error) {
        console.error('Error submitting review:', error);
        alert('Failed to submit review: ' + error.message);
    }
}

// View parent profile
function viewParentProfile(contactType) {
    console.log('Viewing parent profile:', contactType);

    // Get parent info from the current student data
    // For now, we'll just navigate to view-parent.html with a placeholder ID
    // In production, you would get the actual parent user_id from the student data

    // Placeholder: Navigate to view-parent.html
    const parentId = contactType === 'primary' ? 1 : 2; // Replace with actual parent user_id
    window.location.href = `/view-profiles/view-parent.html?id=${parentId}`;
}

// Make functions globally accessible
window.loadStudentReviews = loadStudentReviews;
window.openReviewStudentModal = openReviewStudentModal;
window.closeReviewStudentModal = closeReviewStudentModal;
window.updateSliderValue = updateSliderValue;
window.selectReviewType = selectReviewType;
window.submitStudentReview = submitStudentReview;
window.viewParentProfile = viewParentProfile;

// ============================================
//   TUTOR REQUESTS PANEL - FILTER FUNCTIONS
// ============================================

// Current filter state for tutor requests
let currentTutorRequestType = 'courses';
let currentTutorRequestStatus = 'all';

// Filter by request type (courses, schools, sessions, parenting)
function filterTutorRequestType(type) {
    currentTutorRequestType = type;

    // Update card active states - check both panels
    const cards = document.querySelectorAll('#requests-panel .request-type-card, #requested-sessions-panel .request-type-card');
    cards.forEach(card => {
        card.classList.remove('active');
        card.style.borderColor = 'var(--border-color)';
        card.style.background = 'var(--card-bg)';
        if (card.dataset.type === type) {
            card.classList.add('active');
            card.style.borderColor = 'var(--primary-color)';
            card.style.background = 'rgba(139, 92, 246, 0.05)';
        }
    });

    // Get tab elements
    const statusTabs = document.querySelector('.status-tabs');
    const parentingTabs = document.getElementById('parenting-direction-tabs');

    // Handle parenting invitations separately
    if (type === 'parenting') {
        // Hide status tabs and show parenting direction tabs
        if (statusTabs) statusTabs.style.display = 'none';
        if (parentingTabs) {
            parentingTabs.classList.remove('hidden');
            parentingTabs.style.display = 'flex';
        }

        // Use ParentingInvitationManager if available
        if (typeof ParentingInvitationManager !== 'undefined' && ParentingInvitationManager.loadParentingInvitations) {
            // Default to 'invited' tab
            currentParentingDirection = 'invited';
            ParentingInvitationManager.loadParentingInvitations();

            // Update both tab badge counts
            ParentingInvitationManager.updateInvitationCount();
        } else {
            const container = document.getElementById('tutor-requests-list');
            if (container) {
                container.innerHTML = `
                    <div class="card p-6 text-center text-gray-500">
                        <i class="fas fa-users text-3xl mb-3"></i>
                        <p>Parenting invitations will appear here</p>
                        <p class="text-sm mt-2">When students invite you as their parent, you'll see the requests here</p>
                    </div>
                `;
            }
        }
        return;
    }

    // Show status tabs and hide parenting tabs for other types
    if (statusTabs) statusTabs.style.display = 'flex';
    if (parentingTabs) {
        parentingTabs.classList.add('hidden');
        parentingTabs.style.display = 'none';
    }

    // Load requests based on type and status
    loadTutorRequests();
}

// Track current parenting direction (invited or invites)
let currentParentingDirection = 'invited';

// Filter parenting invitations by direction (invited = received, invites = sent)
function filterParentingDirection(direction) {
    currentParentingDirection = direction;

    // Update tab active states
    const tabs = document.querySelectorAll('.parenting-tab');
    tabs.forEach(tab => {
        if (tab.dataset.direction === direction) {
            tab.style.color = 'var(--primary-color)';
            tab.style.fontWeight = '500';
            tab.style.borderBottom = '2px solid var(--primary-color)';
        } else {
            tab.style.color = 'var(--text-secondary)';
            tab.style.fontWeight = '400';
            tab.style.borderBottom = '2px solid transparent';
        }
    });

    // Load appropriate invitations
    if (typeof ParentingInvitationManager !== 'undefined') {
        if (direction === 'invited') {
            ParentingInvitationManager.loadParentingInvitations();
        } else {
            ParentingInvitationManager.loadSentInvitations();
        }
    }
}

// Make function globally accessible
window.filterParentingDirection = filterParentingDirection;

// Filter by request status (all, pending, accepted, rejected)
function filterTutorRequestStatus(status) {
    currentTutorRequestStatus = status;

    // Update tab active states - check both panels
    const tabs = document.querySelectorAll('#requests-panel .status-tab, #requested-sessions-panel .status-tab');
    tabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.color = 'var(--text-secondary)';
        tab.style.fontWeight = '400';
        tab.style.borderBottom = 'none';
        if (tab.dataset.status === status) {
            tab.classList.add('active');
            tab.style.color = 'var(--primary-color)';
            tab.style.fontWeight = '600';
            tab.style.borderBottom = '2px solid var(--primary-color)';
        }
    });

    // For sessions, use SessionRequestManager if available
    if (currentTutorRequestType === 'sessions' && typeof SessionRequestManager !== 'undefined') {
        SessionRequestManager.loadRequests(status === 'all' ? null : status);
        return;
    }

    // Load requests based on type and status
    loadTutorRequests();
}

// Load tutor requests from API
async function loadTutorRequests() {
    const container = document.getElementById('tutor-requests-list');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-8 text-gray-500">
            <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
            <p>Loading your ${currentTutorRequestType} requests...</p>
        </div>
    `;

    try {
        // Wait for auth to be ready before checking token
        if (window.TutorAuthReady) {
            await window.TutorAuthReady.waitForAuth();
        }

        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            container.innerHTML = `
                <div class="card p-8 text-center">
                    <i class="fas fa-lock text-5xl text-gray-300 mb-4"></i>
                    <p class="text-gray-600">Please log in to view your requests</p>
                </div>
            `;
            return;
        }

        // For courses, fetch from API
        if (currentTutorRequestType === 'courses') {
            await loadTutorCourseRequests(token);
        } else if (currentTutorRequestType === 'schools') {
            // For schools, fetch from API
            await loadTutorSchoolRequests(token);
        } else if (currentTutorRequestType === 'sessions' && typeof SessionRequestManager !== 'undefined') {
            // For sessions, use SessionRequestManager
            SessionRequestManager.loadRequests(currentTutorRequestStatus === 'all' ? null : currentTutorRequestStatus);
        } else {
            // For other types, use sample data for now
            const sampleRequests = getSampleTutorRequests(currentTutorRequestType, currentTutorRequestStatus);
            renderTutorRequests(sampleRequests);
        }

    } catch (error) {
        console.error('Error loading tutor requests:', error);
        container.innerHTML = `
            <div class="card p-8 text-center">
                <i class="fas fa-exclamation-triangle text-5xl text-red-300 mb-4"></i>
                <p class="text-gray-600">Failed to load requests. Please try again.</p>
            </div>
        `;
    }
}

// Load course requests from API
async function loadTutorCourseRequests(token) {
    const container = document.getElementById('tutor-requests-list');
    const API_BASE = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:8000';

    try {
        const response = await fetch(`${API_BASE}/api/tutor/packages/course-requests`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        let courses = data.courses || [];

        // Filter by status if not 'all'
        if (currentTutorRequestStatus !== 'all') {
            // Map 'accepted' tab to 'verified' status in database
            const statusToFilter = currentTutorRequestStatus === 'accepted' ? 'verified' : currentTutorRequestStatus;
            courses = courses.filter(c => c.status === statusToFilter);
        }

        // Transform to display format
        const courseRequests = courses.map(course => ({
            id: course.id,
            name: course.course_name,
            type: `${course.course_category} • ${course.course_level || 'All Levels'}`,
            status: course.status === 'verified' ? 'accepted' : course.status,
            date: course.created_at ? new Date(course.created_at).toLocaleDateString() : 'N/A',
            icon: '📚',
            description: course.course_description,
            duration: course.duration,
            lessons: course.lessons,
            thumbnail: course.thumbnail,
            languages: course.language || ['English'],
            statusReason: course.status_reason,
            requestId: course.request_id
        }));

        renderTutorRequests(courseRequests);

    } catch (error) {
        console.error('Error loading course requests:', error);
        container.innerHTML = `
            <div class="card p-8 text-center">
                <i class="fas fa-exclamation-triangle text-5xl text-red-300 mb-4"></i>
                <p class="text-gray-600">Failed to load course requests. Please try again.</p>
                <p class="text-xs text-gray-400 mt-2">${error.message}</p>
            </div>
        `;
    }
}

// Load school requests from API
async function loadTutorSchoolRequests(token) {
    const container = document.getElementById('tutor-requests-list');
    const API_BASE = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:8000';

    try {
        // Map frontend status to database status
        let statusParam = '';
        if (currentTutorRequestStatus !== 'all') {
            // Map 'accepted' tab to 'verified' status in database
            statusParam = currentTutorRequestStatus === 'accepted' ? 'verified' : currentTutorRequestStatus;
        }

        const url = statusParam
            ? `${API_BASE}/api/tutor/schools?status=${statusParam}`
            : `${API_BASE}/api/tutor/schools`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        let schools = data.schools || [];

        // Transform to display format
        const schoolRequests = schools.map(school => ({
            id: school.id,
            name: school.name || school.school_name,
            type: `${school.type || school.school_type || 'School'} • ${school.level || school.school_level || 'All Levels'}`,
            status: school.status === 'verified' ? 'accepted' : school.status,
            date: school.created_at ? new Date(school.created_at).toLocaleDateString() : 'N/A',
            icon: '🏫',
            location: school.location || 'N/A',
            email: school.email || '',
            phone: school.phone || '',
            rating: school.rating || 0,
            student_count: school.student_count || 0,
            established_year: school.established_year,
            principal: school.principal || '',
            statusReason: school.status_reason
        }));

        renderTutorRequests(schoolRequests);

    } catch (error) {
        console.error('Error loading school requests:', error);
        container.innerHTML = `
            <div class="card p-8 text-center">
                <i class="fas fa-exclamation-triangle text-5xl text-red-300 mb-4"></i>
                <p class="text-gray-600">Failed to load school requests. Please try again.</p>
                <p class="text-xs text-gray-400 mt-2">${error.message}</p>
            </div>
        `;
    }
}

// Get sample requests data for tutor
function getSampleTutorRequests(type, status) {
    const allRequests = {
        schools: [
            { id: 1, name: 'Addis Ababa Science Academy', type: 'Teaching Position', status: 'pending', date: '2024-01-15', icon: '🏫' },
            { id: 2, name: 'Ethiopian International School', type: 'Part-time Teacher', status: 'accepted', date: '2024-01-10', icon: '🏫' },
            { id: 3, name: 'Nazret High School', type: 'Subject Expert', status: 'rejected', date: '2024-01-05', icon: '🏫' }
        ],
        sessions: [
            { id: 4, name: 'Abebe Kebede', subject: 'Mathematics - Grade 10', status: 'pending', date: '2024-01-14', icon: '📅', studentId: 101, packageName: 'Basic Math Package', studentGrade: 'Grade 10', requesterType: 'student' },
            { id: 5, name: 'Tigist Haile', subject: 'Physics - Grade 11', status: 'accepted', date: '2024-01-11', icon: '📅', studentId: 102, packageName: 'Advanced Physics', studentGrade: 'Grade 11', requesterType: 'parent' },
            { id: 6, name: 'Dawit Mengesha', subject: 'Chemistry - Grade 12', status: 'pending', date: '2024-01-09', icon: '📅', studentId: 103, packageName: 'Chemistry Intensive', studentGrade: 'Grade 12', requesterType: 'student' }
        ]
    };

    let requests = allRequests[type] || [];
    if (status !== 'all') {
        requests = requests.filter(r => r.status === status);
    }
    return requests;
}

// Render tutor requests
function renderTutorRequests(requests) {
    const container = document.getElementById('tutor-requests-list');
    if (!container) return;

    if (requests.length === 0) {
        const emptyMessage = currentTutorRequestType === 'courses'
            ? `<p class="text-gray-600 mb-4">No course requests found</p>
               <button onclick="openCourseRequestModal()" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                   <i class="fas fa-plus mr-2"></i>Request New Course
               </button>`
            : `<p class="text-gray-600">No ${currentTutorRequestType} requests found</p>`;

        container.innerHTML = `
            <div class="card p-8 text-center">
                <i class="fas fa-inbox text-5xl text-gray-300 mb-4"></i>
                ${emptyMessage}
            </div>
        `;
        return;
    }

    // For courses, use enhanced card layout
    if (currentTutorRequestType === 'courses') {
        renderCourseRequests(requests);
        return;
    }

    // For schools, use enhanced card layout with location and details
    if (currentTutorRequestType === 'schools') {
        renderSchoolRequests(requests);
        return;
    }

    const requestsHtml = requests.map(request => {
        // Add View button only for session requests
        const viewButton = currentTutorRequestType === 'sessions' ? `
            <button onclick="viewSessionRequestDetails(${request.id})"
                class="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition flex items-center gap-1">
                <i class="fas fa-eye"></i> View
            </button>
        ` : '';

        // Show requester type badge for sessions
        const requesterBadge = currentTutorRequestType === 'sessions' && request.requesterType ? `
            <span class="px-2 py-1 rounded text-xs font-medium ${request.requesterType === 'student' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">
                ${request.requesterType === 'student' ? '🎓 Student' : '👨‍👩‍👧 Parent'}
            </span>
        ` : '';

        return `
            <div class="card p-4 mb-4 hover:shadow-md transition">
                <div class="flex items-center gap-4">
                    <div class="text-3xl">${request.icon}</div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <h4 class="font-bold text-lg">${request.name}</h4>
                            ${requesterBadge}
                        </div>
                        <p class="text-sm text-gray-600">${request.type || request.subject || ''}</p>
                        ${request.packageName ? `<p class="text-sm text-blue-600"><i class="fas fa-box mr-1"></i>${request.packageName}</p>` : ''}
                        <p class="text-xs text-gray-500">Requested: ${request.date}</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="px-3 py-1 rounded-full text-sm font-medium ${getTutorStatusClass(request.status)}">
                            ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                        ${viewButton}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = requestsHtml;
}

// Render school requests with enhanced card layout
function renderSchoolRequests(schools) {
    const container = document.getElementById('tutor-requests-list');

    const schoolsHtml = schools.map(school => {
        // Status-specific styles and icons
        const statusConfig = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: '⏳' },
            accepted: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', icon: '✅' },
            verified: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', icon: '✅' },
            rejected: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: '❌' },
            suspended: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', icon: '⚠️' }
        };
        const status = statusConfig[school.status] || statusConfig.pending;

        // Rating display
        const ratingHtml = school.rating > 0
            ? `<div class="flex items-center gap-1 text-yellow-500">
                   <i class="fas fa-star"></i>
                   <span class="text-sm font-medium">${school.rating.toFixed(1)}</span>
               </div>`
            : '';

        // Student count
        const studentCountHtml = school.student_count > 0
            ? `<span class="text-xs text-gray-500"><i class="fas fa-users mr-1"></i>${school.student_count} students</span>`
            : '';

        // Status reason (for rejected schools)
        const statusReasonHtml = school.status === 'rejected' && school.statusReason
            ? `<p class="text-xs text-red-600 mt-2"><i class="fas fa-info-circle mr-1"></i>${school.statusReason}</p>`
            : '';

        return `
            <div class="card p-4 mb-4 hover:shadow-md transition border-l-4 ${status.border}" style="border-left-width: 4px;">
                <div class="flex items-start gap-4">
                    <div class="text-4xl">${school.icon}</div>
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 class="font-bold text-lg">${school.name}</h4>
                            ${ratingHtml}
                        </div>
                        <p class="text-sm text-gray-600 mb-1">${school.type}</p>
                        ${school.location && school.location !== 'N/A' ? `
                            <p class="text-sm text-gray-500 mb-1">
                                <i class="fas fa-map-marker-alt mr-1 text-red-400"></i>${school.location}
                            </p>
                        ` : ''}
                        <div class="flex items-center gap-3 flex-wrap text-xs text-gray-500 mt-2">
                            ${studentCountHtml}
                            ${school.established_year ? `<span><i class="fas fa-calendar mr-1"></i>Est. ${school.established_year}</span>` : ''}
                            ${school.principal ? `<span><i class="fas fa-user-tie mr-1"></i>${school.principal}</span>` : ''}
                        </div>
                        ${statusReasonHtml}
                        <p class="text-xs text-gray-400 mt-2">Added: ${school.date}</p>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        <span class="px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.text}">
                            ${status.icon} ${school.status.charAt(0).toUpperCase() + school.status.slice(1)}
                        </span>
                        <button onclick="viewSchoolDetails(${school.id})"
                            class="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition">
                            <i class="fas fa-eye mr-1"></i>View
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = schoolsHtml;
}

// View school details modal
function viewSchoolDetails(schoolId) {
    // TODO: Implement school details modal
    console.log('View school details:', schoolId);
    alert(`School details for ID: ${schoolId}\n\nThis feature will show detailed school information in a modal.`);
}

// Make school functions globally accessible
window.viewSchoolDetails = viewSchoolDetails;

// Render course requests with enhanced card layout
function renderCourseRequests(courses) {
    const container = document.getElementById('tutor-requests-list');

    const coursesHtml = courses.map(course => {
        // Status-specific styles and icons
        const statusConfig = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: '⏳' },
            accepted: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', icon: '✅' },
            verified: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', icon: '✅' },
            rejected: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', icon: '❌' }
        };
        const status = statusConfig[course.status] || statusConfig.pending;

        // Thumbnail or placeholder
        const thumbnailHtml = course.thumbnail
            ? `<img src="${course.thumbnail}" alt="${course.name}" class="w-full h-32 object-cover rounded-t-lg">`
            : `<div class="w-full h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-t-lg flex items-center justify-center">
                   <i class="fas fa-book-open text-white text-4xl opacity-50"></i>
               </div>`;

        // Languages display
        const languagesHtml = (course.languages || ['English']).map(lang =>
            `<span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">${lang}</span>`
        ).join('');

        // Status reason (for rejected courses)
        const statusReasonHtml = course.status === 'rejected' && course.statusReason
            ? `<p class="text-xs text-red-600 mt-2"><i class="fas fa-info-circle mr-1"></i>${course.statusReason}</p>`
            : '';

        // Delete button for pending courses
        const deleteButton = course.status === 'pending'
            ? `<button onclick="deleteCourseRequest(${course.id})"
                       class="text-red-500 hover:text-red-700 p-1" title="Delete request">
                   <i class="fas fa-trash-alt"></i>
               </button>`
            : '';

        return `
            <div class="card overflow-hidden hover:shadow-lg transition-shadow duration-300 border ${status.border}" style="border-width: 2px;">
                ${thumbnailHtml}
                <div class="p-4">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-bold text-lg text-gray-800 line-clamp-1">${course.name}</h4>
                        <div class="flex items-center gap-2">
                            <span class="px-2 py-1 rounded-full text-xs font-semibold ${status.bg} ${status.text}">
                                ${status.icon} ${course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                            </span>
                            ${deleteButton}
                        </div>
                    </div>
                    <p class="text-sm text-gray-600 mb-2">${course.type}</p>
                    ${course.description ? `<p class="text-xs text-gray-500 line-clamp-2 mb-2">${course.description}</p>` : ''}
                    <div class="flex flex-wrap gap-2 mb-3">
                        ${languagesHtml}
                    </div>
                    <div class="flex items-center justify-between text-xs text-gray-500">
                        <span><i class="fas fa-clock mr-1"></i>${course.duration || 0}h • ${course.lessons || 0} lessons</span>
                        <span><i class="fas fa-calendar mr-1"></i>${course.date}</span>
                    </div>
                    ${statusReasonHtml}
                    ${course.requestId ? `<p class="text-xs text-gray-400 mt-2">ID: ${course.requestId}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Wrap in a grid
    container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${coursesHtml}
        </div>
    `;
}

// Delete course request
async function deleteCourseRequest(courseId) {
    if (!confirm('Are you sure you want to delete this course request? This action cannot be undone.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const API_BASE = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:8000';

        const response = await fetch(`${API_BASE}/api/tutor/packages/course-request/${courseId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            alert('Course request deleted successfully');
            loadTutorRequests(); // Refresh the list
        } else {
            const error = await response.json();
            alert(`Failed to delete: ${error.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Error deleting course request:', error);
        alert('Failed to delete course request. Please try again.');
    }
}

// Make delete function globally accessible
window.deleteCourseRequest = deleteCourseRequest;

// View session request details - opens the modal with accept/reject options
function viewSessionRequestDetails(requestId) {
    // Check if SessionRequestManager exists
    if (typeof SessionRequestManager !== 'undefined' && SessionRequestManager.viewRequest) {
        // Use the existing SessionRequestManager to view request details
        SessionRequestManager.viewRequest(requestId);
    } else {
        // Fallback: Show a simple alert if SessionRequestManager is not available
        console.warn('SessionRequestManager not available, using fallback');
        showSessionRequestModal(requestId);
    }
}

// Fallback modal for viewing session request details
function showSessionRequestModal(requestId) {
    // Get the request data from sample data
    const requests = getSampleTutorRequests('sessions', 'all');
    const request = requests.find(r => r.id === requestId);

    if (!request) {
        alert('Request not found');
        return;
    }

    // Create or get the modal
    let modal = document.getElementById('sessionRequestDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sessionRequestDetailModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeSessionRequestModal()"></div>
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2><i class="fas fa-file-alt"></i> Session Request Details</h2>
                    <button class="modal-close" onclick="closeSessionRequestModal()">×</button>
                </div>
                <div class="modal-body" id="sessionRequestModalContent">
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Populate the modal content
    const content = document.getElementById('sessionRequestModalContent');
    const statusBadge = request.status === 'pending'
        ? '<span style="background: #FFA500; color: white; padding: 6px 16px; border-radius: 12px;">Pending</span>'
        : request.status === 'accepted'
        ? '<span style="background: #10B981; color: white; padding: 6px 16px; border-radius: 12px;">Accepted</span>'
        : '<span style="background: #EF4444; color: white; padding: 6px 16px; border-radius: 12px;">Rejected</span>';

    const showActionButtons = request.status === 'pending';

    content.innerHTML = `
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-start justify-between">
                <div class="flex items-center gap-4">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(request.name)}&background=4F46E5&color=fff&size=64"
                        alt="${request.name}"
                        class="w-16 h-16 rounded-full object-cover">
                    <div>
                        <h3 class="text-xl font-bold">${request.name}</h3>
                        <p class="text-gray-600">
                            ${request.requesterType === 'student' ? '🎓 Student' : '👨‍👩‍👧 Parent'}
                        </p>
                    </div>
                </div>
                ${statusBadge}
            </div>

            <hr style="border-color: var(--border-color);">

            <!-- Package Info -->
            <div>
                <h4 class="font-semibold mb-2">Requested Package</h4>
                <div class="card p-4" style="background: var(--bg-secondary);">
                    <p class="font-medium text-lg">${request.packageName || 'N/A'}</p>
                </div>
            </div>

            <!-- Student Information -->
            <div>
                <h4 class="font-semibold mb-2">Student Information</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-gray-600 text-sm">Name</p>
                        <p class="font-medium">${request.name}</p>
                    </div>
                    <div>
                        <p class="text-gray-600 text-sm">Grade Level</p>
                        <p class="font-medium">${request.studentGrade || 'N/A'}</p>
                    </div>
                </div>
            </div>

            <!-- Subject -->
            <div>
                <h4 class="font-semibold mb-2">Subject</h4>
                <div class="card p-4" style="background: #f0f9ff; border: 1px solid #bae6fd;">
                    <p class="font-medium">${request.subject}</p>
                </div>
            </div>

            <!-- Request Date -->
            <div>
                <p class="text-gray-600 text-sm">Requested on ${request.date}</p>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3 pt-4" style="border-top: 1px solid var(--border-color);">
                ${showActionButtons ? `
                    <button onclick="acceptSessionRequest(${request.id})"
                        class="flex-1 btn-primary"
                        style="padding: 12px; border-radius: 8px; background: #10B981; color: white; border: none;">
                        <i class="fas fa-check"></i> Accept Request
                    </button>
                    <button onclick="rejectSessionRequest(${request.id})"
                        class="flex-1"
                        style="padding: 12px; border-radius: 8px; background: #EF4444; color: white; border: none;">
                        <i class="fas fa-times"></i> Reject Request
                    </button>
                ` : `
                    <p class="text-gray-600 italic">This request has already been ${request.status}</p>
                `}
                <button onclick="closeSessionRequestModal()"
                    class="btn-secondary"
                    style="padding: 12px; border-radius: 8px;">
                    Close
                </button>
            </div>
        </div>
    `;

    // Show the modal
    modal.classList.remove('hidden');
}

// Close session request modal
function closeSessionRequestModal() {
    const modal = document.getElementById('sessionRequestDetailModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Accept session request
function acceptSessionRequest(requestId) {
    if (!confirm('Are you sure you want to accept this session request?')) {
        return;
    }

    // TODO: Call API to accept request
    alert('✅ Session request accepted! The student has been added to "My Students".');
    closeSessionRequestModal();
    loadTutorRequests(); // Refresh the list
}

// Reject session request
function rejectSessionRequest(requestId) {
    const reason = prompt('Please provide a reason for rejecting this request (optional):');

    if (reason === null) {
        return; // User cancelled
    }

    if (!confirm('Are you sure you want to reject this session request?')) {
        return;
    }

    // TODO: Call API to reject request
    alert('Request has been rejected.');
    closeSessionRequestModal();
    loadTutorRequests(); // Refresh the list
}

// Get status badge class for tutor requests
function getTutorStatusClass(status) {
    switch (status) {
        case 'pending':
            return 'bg-yellow-100 text-yellow-800';
        case 'accepted':
            return 'bg-green-100 text-green-800';
        case 'rejected':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Initialize tutor requests panel on load
document.addEventListener('DOMContentLoaded', function() {
    // Check for requests-panel (main requests panel in tutor-profile)
    const mainRequestsPanel = document.getElementById('requests-panel');
    if (mainRequestsPanel) {
        // Load initial requests when panel becomes visible
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (!mainRequestsPanel.classList.contains('hidden')) {
                    loadTutorRequests();
                }
            });
        });
        observer.observe(mainRequestsPanel, { attributes: true, attributeFilter: ['class'] });
    }

    // Also check for requested-sessions-panel (legacy support)
    const requestsPanel = document.getElementById('requested-sessions-panel');
    if (requestsPanel) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (!requestsPanel.classList.contains('hidden')) {
                    loadTutorRequests();
                }
            });
        });
        observer.observe(requestsPanel, { attributes: true, attributeFilter: ['class'] });
    }
});

// Make tutor request functions globally accessible
window.filterTutorRequestType = filterTutorRequestType;
window.filterTutorRequestStatus = filterTutorRequestStatus;
window.loadTutorRequests = loadTutorRequests;
window.viewSessionRequestDetails = viewSessionRequestDetails;
window.showSessionRequestModal = showSessionRequestModal;
window.closeSessionRequestModal = closeSessionRequestModal;
window.acceptSessionRequest = acceptSessionRequest;
window.rejectSessionRequest = rejectSessionRequest;

// ============================================
// TEACHING DOCS PANEL FUNCTIONS
// ============================================

// Store for teaching docs data
let teachingDocsData = [];
let teachingDocsFolders = [];
let currentDocMenuOpen = null;

/**
 * Toggle document menu dropdown
 */
function toggleDocMenu(docId) {
    const menuId = `doc-menu-${docId}`;
    const menu = document.getElementById(menuId);

    // Close any other open menu
    if (currentDocMenuOpen && currentDocMenuOpen !== menuId) {
        const prevMenu = document.getElementById(currentDocMenuOpen);
        if (prevMenu) prevMenu.classList.add('hidden');
    }

    if (menu) {
        menu.classList.toggle('hidden');
        currentDocMenuOpen = menu.classList.contains('hidden') ? null : menuId;
    }
}

// Close menu when clicking outside
document.addEventListener('click', function(e) {
    if (currentDocMenuOpen && !e.target.closest('.relative')) {
        const menu = document.getElementById(currentDocMenuOpen);
        if (menu) menu.classList.add('hidden');
        currentDocMenuOpen = null;
    }
});

/**
 * Open teaching doc file (when clicking on title)
 */
function openTeachingDoc(docId) {
    console.log('Opening teaching doc:', docId);
    // TODO: Implement actual file opening from API
    // For now, simulate opening
    const doc = teachingDocsData.find(d => d.id === docId);
    if (doc && doc.file_url) {
        window.open(doc.file_url, '_blank');
    } else {
        // Demo: show alert
        alert('Opening document... (Demo mode - connect to API for real files)');
    }
}

/**
 * Edit teaching doc
 */
function editTeachingDoc(docId) {
    console.log('Editing teaching doc:', docId);
    toggleDocMenu(docId); // Close menu
    // TODO: Open edit modal with doc data
    openUploadTeachingDocModal(docId);
}

/**
 * Delete teaching doc
 */
function deleteTeachingDoc(docId) {
    console.log('Deleting teaching doc:', docId);
    toggleDocMenu(docId); // Close menu

    if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
        // TODO: Implement actual delete via API
        alert('Document deleted (Demo mode - connect to API for real deletion)');
        // Remove from DOM for demo
        const card = document.querySelector(`[onclick="openTeachingDoc(${docId}); return false;"]`)?.closest('.card');
        if (card) card.remove();
    }
}

/**
 * Open upload teaching doc modal
 */
function openUploadTeachingDocModal(editDocId = null) {
    console.log('Opening upload teaching doc modal', editDocId ? `(Edit mode: ${editDocId})` : '(New doc)');
    // TODO: Implement modal
    alert('Upload Teaching Document modal (to be implemented)');
}

/**
 * Filter teaching docs by type
 */
function filterTeachingDocs(type) {
    console.log('Filtering teaching docs by:', type);

    // Update button styles
    const buttons = document.querySelectorAll('#teaching-docs-panel .flex.gap-2.mb-6 button');
    buttons.forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-200');
    });

    // Find and highlight active button
    const activeBtn = Array.from(buttons).find(btn =>
        btn.textContent.toLowerCase().includes(type === 'all' ? 'all' : type)
    );
    if (activeBtn) {
        activeBtn.classList.remove('bg-gray-200');
        activeBtn.classList.add('bg-blue-500', 'text-white');
    }

    // TODO: Filter documents via API
    console.log(`Would filter docs by type: ${type}`);
}

/**
 * Switch between Folders and Documents view tabs
 */
function switchDocsViewTab(tab) {
    const foldersTab = document.getElementById('folders-tab');
    const documentsTab = document.getElementById('documents-tab');
    const foldersView = document.getElementById('folders-view');
    const documentsView = document.getElementById('documents-view');

    if (tab === 'folders') {
        // Activate Folders tab
        foldersTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600', '-mb-px');
        foldersTab.classList.remove('text-gray-500');
        documentsTab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600', '-mb-px');
        documentsTab.classList.add('text-gray-500');

        // Show folders, hide documents
        foldersView.classList.remove('hidden');
        documentsView.classList.add('hidden');
    } else {
        // Activate Documents tab
        documentsTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600', '-mb-px');
        documentsTab.classList.remove('text-gray-500');
        foldersTab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600', '-mb-px');
        foldersTab.classList.add('text-gray-500');

        // Show documents, hide folders
        documentsView.classList.remove('hidden');
        foldersView.classList.add('hidden');
    }

    console.log(`Switched to ${tab} view`);
}

/**
 * Open a folder and show its contents
 */
function openFolder(folderName) {
    console.log('Opening folder:', folderName);
    // Switch to documents view and filter by folder
    switchDocsViewTab('documents');
    // TODO: Filter documents by folder via API
    alert(`Opening folder: ${folderName}\n\nShowing documents in this folder...`);
}

/**
 * Create a new folder
 */
function createNewFolder() {
    const folderName = prompt('Enter folder name:');
    if (folderName && folderName.trim()) {
        console.log('Creating folder:', folderName);
        // TODO: Create folder via API
        alert(`Folder "${folderName}" created successfully!`);
    }
}

/**
 * Rename a folder
 */
function renameFolder(folderName) {
    const newName = prompt(`Rename folder "${folderName}" to:`, folderName);
    if (newName && newName.trim() && newName !== folderName) {
        console.log(`Renaming folder ${folderName} to ${newName}`);
        // TODO: Rename folder via API
        alert(`Folder renamed to "${newName}"`);
    }
}

/**
 * Delete a folder
 */
function deleteFolder(folderName) {
    if (confirm(`Are you sure you want to delete the folder "${folderName}"?\n\nAll documents inside will be moved to the root.`)) {
        console.log('Deleting folder:', folderName);
        // TODO: Delete folder via API
        alert(`Folder "${folderName}" deleted`);
    }
}

/**
 * Search folders by name (live search with debounce)
 */
let folderSearchTimeout = null;
function searchFolders(query) {
    // Debounce the search
    clearTimeout(folderSearchTimeout);
    folderSearchTimeout = setTimeout(() => {
        const searchTerm = query.toLowerCase().trim();
        const folderCards = document.querySelectorAll('#teaching-docs-folders > div:not(:first-child)'); // Exclude "New Folder" card

        folderCards.forEach(card => {
            const folderName = card.querySelector('p.font-semibold')?.textContent?.toLowerCase() || '';
            if (searchTerm === '' || folderName.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });

        console.log(`Searching folders for: "${query}"`);
    }, 300);
}

/**
 * Search documents by title, subject, category (live search with debounce)
 */
let documentSearchTimeout = null;
function searchDocuments(query) {
    // Debounce the search
    clearTimeout(documentSearchTimeout);
    documentSearchTimeout = setTimeout(() => {
        const searchTerm = query.toLowerCase().trim();
        const docCards = document.querySelectorAll('#teaching-docs-grid > div');

        docCards.forEach(card => {
            const title = card.querySelector('h3')?.textContent?.toLowerCase() || '';
            const subject = card.querySelector('[data-subject]')?.dataset?.subject?.toLowerCase() || '';
            const category = card.querySelector('[data-category]')?.dataset?.category?.toLowerCase() || '';
            const description = card.querySelector('p.text-gray-500')?.textContent?.toLowerCase() || '';

            if (searchTerm === '' ||
                title.includes(searchTerm) ||
                subject.includes(searchTerm) ||
                category.includes(searchTerm) ||
                description.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });

        console.log(`Searching documents for: "${query}"`);
    }, 300);
}

/**
 * Sort documents by specified field with shuffling animation
 */
function sortDocuments(sortBy) {
    console.log(`Sorting documents by: ${sortBy}`);

    const grid = document.getElementById('teaching-docs-grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.card'));
    if (cards.length === 0) return;

    // Store original positions for animation
    const originalPositions = cards.map(card => {
        const rect = card.getBoundingClientRect();
        return { card, top: rect.top, left: rect.left };
    });

    // Add shuffling animation class to all cards
    cards.forEach((card, index) => {
        card.style.transition = 'none';
        card.style.transform = 'scale(0.95)';
        card.style.opacity = '0.7';

        // Staggered shuffle effect - cards move in different directions
        setTimeout(() => {
            card.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
            const randomX = (Math.random() - 0.5) * 30;
            const randomY = (Math.random() - 0.5) * 20;
            const randomRotate = (Math.random() - 0.5) * 8;
            card.style.transform = `translate(${randomX}px, ${randomY}px) rotate(${randomRotate}deg) scale(0.9)`;
        }, index * 30);
    });

    // Sort the cards after shuffle animation
    setTimeout(() => {
        cards.sort((a, b) => {
            let valueA, valueB;

            switch(sortBy) {
                case 'title':
                    valueA = a.querySelector('h3')?.textContent?.toLowerCase() || '';
                    valueB = b.querySelector('h3')?.textContent?.toLowerCase() || '';
                    return valueA.localeCompare(valueB);

                case 'subject':
                    valueA = a.dataset.subject?.toLowerCase() || a.querySelector('[data-subject]')?.dataset?.subject?.toLowerCase() || '';
                    valueB = b.dataset.subject?.toLowerCase() || b.querySelector('[data-subject]')?.dataset?.subject?.toLowerCase() || '';
                    return valueA.localeCompare(valueB);

                case 'category':
                    valueA = a.dataset.category?.toLowerCase() || a.querySelector('[data-category]')?.dataset?.category?.toLowerCase() || '';
                    valueB = b.dataset.category?.toLowerCase() || b.querySelector('[data-category]')?.dataset?.category?.toLowerCase() || '';
                    return valueA.localeCompare(valueB);

                case 'grade_level':
                    valueA = a.dataset.gradeLevel || a.querySelector('[data-grade-level]')?.dataset?.gradeLevel || '';
                    valueB = b.dataset.gradeLevel || b.querySelector('[data-grade-level]')?.dataset?.gradeLevel || '';
                    // Sort grade levels numerically if possible
                    const numA = parseInt(valueA.replace(/\D/g, '')) || 999;
                    const numB = parseInt(valueB.replace(/\D/g, '')) || 999;
                    return numA - numB;

                case 'views':
                    // Extract view count from the views span
                    valueA = parseInt(a.dataset.views) || 0;
                    valueB = parseInt(b.dataset.views) || 0;
                    return valueB - valueA; // Descending order for views

                case 'downloads':
                    // Extract download count from the card
                    const downloadsSpanA = Array.from(a.querySelectorAll('.text-gray-400 span, .border-t span')).find(span => span.textContent.includes('download'));
                    const downloadsSpanB = Array.from(b.querySelectorAll('.text-gray-400 span, .border-t span')).find(span => span.textContent.includes('download'));
                    valueA = parseInt(downloadsSpanA?.textContent?.replace(/\D/g, '') || a.dataset.downloads || '0');
                    valueB = parseInt(downloadsSpanB?.textContent?.replace(/\D/g, '') || b.dataset.downloads || '0');
                    return valueB - valueA; // Descending order for downloads

                case 'upload_date':
                default:
                    // Default: sort by data-upload-date attribute or keep original order
                    valueA = a.dataset.uploadDate || '0';
                    valueB = b.dataset.uploadDate || '0';
                    return valueB.localeCompare(valueA); // Newest first
            }
        });

        // Re-append sorted cards
        cards.forEach(card => grid.appendChild(card));

        // Animate cards to their new positions
        setTimeout(() => {
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';
                    card.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';
                    card.style.opacity = '1';
                }, index * 40);
            });
        }, 50);

        // Clean up styles after animation completes
        setTimeout(() => {
            cards.forEach(card => {
                card.style.transition = '';
                card.style.transform = '';
                card.style.opacity = '';
            });
        }, 600 + cards.length * 40);

    }, 250 + cards.length * 30);
}

// Make teaching docs functions globally accessible
window.toggleDocMenu = toggleDocMenu;
window.openTeachingDoc = openTeachingDoc;
window.editTeachingDoc = editTeachingDoc;
window.deleteTeachingDoc = deleteTeachingDoc;
window.openUploadTeachingDocModal = openUploadTeachingDocModal;
window.filterTeachingDocs = filterTeachingDocs;
window.switchDocsViewTab = switchDocsViewTab;
window.openFolder = openFolder;
window.createNewFolder = createNewFolder;
window.renameFolder = renameFolder;
window.deleteFolder = deleteFolder;
window.searchFolders = searchFolders;
window.searchDocuments = searchDocuments;
window.sortDocuments = sortDocuments;
