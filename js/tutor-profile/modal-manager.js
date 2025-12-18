// ============================================
// TUTOR PROFILE MODAL MANAGER
// Handles all modal operations
// ============================================

const TutorModalManager = {
    // Initialize modal manager
    init() {
        this.setupModalEventListeners();
        this.injectModalStyles();
    },

    // Open modal
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            // Handle different modal display styles
            modal.classList.remove('hidden');
            modal.classList.add('show');

            // All modals should use flex for proper centering
            modal.style.display = 'flex';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            document.body.style.overflow = 'hidden';

            console.log(`Modal opened: ${modalId}`);
        } else {
            console.warn(`Modal not found: ${modalId}`);
        }
    },

    // Close modal
    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('show');
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    },

    // Close all modals
    closeAll() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.add('hidden');
            modal.classList.remove('show');
            modal.style.display = 'none';
        });
        document.body.style.overflow = '';
    },

    // Profile edit modal
    openEditProfile() {
        const profile = TutorProfileState.getTutorProfile();
        if (!profile) return;

        // Populate form fields
        this.setInputValue('edit-bio', profile.bio || '');
        this.setInputValue('edit-hourly-rate', profile.hourlyRate || '');
        this.setInputValue('edit-experience-years', profile.experienceYears || '');
        this.setInputValue('edit-specialization', profile.specialization || '');

        this.open('editProfileModal');
    },

    closeEditProfile() {
        this.close('edit-profile-modal');
        this.close('editProfileModal'); // Support both modal IDs for backward compatibility
    },

    // Certification modal
    openCertification() {
        // Reset form
        document.getElementById('certificationForm')?.reset();
        this.open('certificationModal');
    },

    closeCertification() {
        this.close('certificationModal');
    },

    // Experience modal
    openExperience() {
        // Reset form
        document.getElementById('experienceForm')?.reset();
        this.open('experienceModal');
    },

    closeExperience() {
        this.close('experienceModal');
    },

    // Achievement modal
    openAchievement() {
        // Reset form
        document.getElementById('achievementForm')?.reset();
        this.open('achievementModal');
    },

    closeAchievement() {
        this.close('achievementModal');
    },

    // Schedule modal
    openSchedule() {
        this.open('scheduleModal');
    },

    closeSchedule() {
        this.close('scheduleModal');
    },

    // School request modal
    openSchoolRequest(context) {
        TutorProfileState.setModalContext(context);
        this.open('schoolRequestModal');
    },

    closeSchoolRequest() {
        TutorProfileState.setModalContext(null);
        this.close('schoolRequestModal');
    },

    // Student details modal
    async openStudentDetails(studentId) {
        console.log('Opening student details for ID:', studentId);

        // Ensure modal is loaded first
        if (!document.getElementById('studentDetailsModal')) {
            console.log('Student details modal not found, loading...');
            if (typeof ModalLoader !== 'undefined') {
                await ModalLoader.load('student-details-modal.html');
            } else {
                console.error('ModalLoader not available');
                return;
            }
        }

        // Open modal
        this.open('studentDetailsModal');

        // Get the modal header div to update student info
        const studentNameEl = document.getElementById('studentName');

        if (studentNameEl) {
            studentNameEl.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i> Loading student details...
            `;
        }

        try {
            // Wait for auth to be ready before checking token
            if (window.TutorAuthReady) {
                await window.TutorAuthReady.waitForAuth();
            }

            // Fetch student details from new student_details table
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            if (!token) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(`http://localhost:8000/api/tutor/student-details/${studentId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Handle 404 - student details not found
            if (response.status === 404) {
                if (studentNameEl) {
                    studentNameEl.textContent = 'No student details yet';
                }

                // Show empty state message
                const modalHeaderDiv = studentNameEl?.parentElement;
                if (modalHeaderDiv) {
                    const subtitleP = modalHeaderDiv.querySelector('p');
                    if (subtitleP) {
                        subtitleP.textContent = 'This student has not been added to the database yet';
                    }
                }

                // Reset stats to show N/A
                document.getElementById('stat-overall-progress').textContent = 'N/A';
                document.getElementById('stat-attendance').textContent = 'N/A';
                document.getElementById('stat-improvement').textContent = 'N/A';
                document.getElementById('stat-grade').textContent = 'N/A';

                // Show empty package message
                const packagesListEl = document.getElementById('student-packages-list');
                if (packagesListEl) {
                    packagesListEl.innerHTML = `
                        <div style="text-align: center; padding: 3rem; background: var(--bg-secondary); border-radius: 12px; border: 2px dashed var(--border-color);">
                            <i class="fas fa-box-open" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                            <h4 style="color: var(--text-primary); margin-bottom: 0.5rem;">No package yet</h4>
                            <p style="color: var(--text-secondary); font-size: 0.875rem;">This student hasn't enrolled in any package</p>
                        </div>
                    `;
                }

                console.log('Student details not found (404), showing empty state');
                return;
            }

            if (!response.ok) {
                throw new Error(`Failed to load student details (${response.status})`);
            }

            const student = await response.json();

            // Update the modal header with student info
            if (studentNameEl) {
                studentNameEl.textContent = student.student_name || 'Unknown Student';
            }

            // Update the subtitle in modal header
            const modalHeaderDiv = studentNameEl?.parentElement;
            if (modalHeaderDiv) {
                const subtitleP = modalHeaderDiv.querySelector('p');
                if (subtitleP) {
                    const packageInfo = student.package_name || 'No package';
                    subtitleP.textContent = `${student.student_grade || 'N/A'} • ${packageInfo}`;
                }
            }

            // Update quick stats
            document.getElementById('stat-overall-progress').textContent = `${student.overall_progress || 0}%`;
            document.getElementById('stat-attendance').textContent = `${student.attendance_rate || 0}%`;
            document.getElementById('stat-improvement').textContent = `+${student.improvement_rate || 0}%`;
            document.getElementById('stat-grade').textContent = student.grade_letter || 'N/A';

            // Store student data globally for sections to use
            window.currentStudentDetails = student;
            window.currentStudentForReview = {
                student_profile_id: student.id,
                student_name: student.student_name || 'Student'
            };

            // Load package information
            this.loadStudentPackages(student);

            // Load student reviews
            if (typeof window.loadStudentReviews === 'function') {
                window.loadStudentReviews(student.id);
            }

            console.log('Student details loaded successfully:', student);

        } catch (error) {
            console.error('Error loading student details:', error);
            if (studentNameEl) {
                studentNameEl.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i> Failed to load student
                `;
            }
            alert(`Failed to load student details: ${error.message}`);
        }
    },

    loadStudentPackages(student) {
        const packagesListEl = document.getElementById('student-packages-list');
        if (!packagesListEl) return;

        // Create package card
        packagesListEl.innerHTML = `
            <div style="background: var(--bg-secondary); padding: 1.5rem; border-radius: 12px; border: 2px solid var(--primary-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <div>
                        <h4 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0 0 0.5rem 0;">
                            ${student.package_name || 'No Package'}
                        </h4>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0;">
                            Enrolled: ${new Date(student.enrolled_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                    <span style="background: var(--primary-color); color: white; padding: 0.5rem 1rem; border-radius: 999px; font-weight: 600; font-size: 0.875rem;">
                        Active
                    </span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <div>
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.25rem 0;">Sessions</p>
                        <p style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0;">
                            ${student.attended_sessions || 0}/${student.total_sessions || 0}
                        </p>
                    </div>
                    <div>
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.25rem 0;">Assignments</p>
                        <p style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0;">
                            ${student.completed_assignments || 0}/${student.total_assignments || 0}
                        </p>
                    </div>
                    <div>
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.25rem 0;">Progress</p>
                        <p style="font-size: 1.25rem; font-weight: 700; color: var(--primary-color); margin: 0;">
                            ${student.overall_progress || 0}%
                        </p>
                    </div>
                </div>

                ${student.monthly_tuition ? `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0;">Monthly Tuition</p>
                                <p style="font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0;">
                                    ${student.monthly_tuition.toLocaleString()} ETB
                                </p>
                            </div>
                            ${student.outstanding_balance > 0 ? `
                                <span style="background: #FEE2E2; color: #DC2626; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem; font-weight: 600;">
                                    Due: ${student.outstanding_balance.toLocaleString()} ETB
                                </span>
                            ` : `
                                <span style="background: #D1FAE5; color: #059669; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.875rem; font-weight: 600;">
                                    Paid
                                </span>
                            `}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    closeStudentDetails() {
        this.close('studentDetailsModal');
    },

    // Community/Connections modal
    openCommunity() {
        this.open('communityModal');

        // Force proper width for community modal
        const modal = document.getElementById('communityModal');
        if (modal) {
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.maxWidth = '1600px';
                modalContent.style.width = '98%';
            }
        }

        // Initialize search functionality
        if (typeof initializeCommunitySearch === 'function') {
            initializeCommunitySearch();
        }

        // Load initial section (all) with database integration
        if (window.communityManager) {
            // IMPORTANT: Re-initialize badges since modal just opened and elements are now in DOM
            console.log('🔄 Re-initializing badges after modal open...');
            window.communityManager.initializeBadges();
            // Reload badge counts to ensure they are fresh
            window.communityManager.loadBadgeCounts();
            // Load the "all" section by default
            if (typeof switchCommunitySection === 'function') {
                switchCommunitySection('all');
            }
        } else if (typeof loadConnections === 'function') {
            // Fallback to old method
            loadConnections();
        }
    },

    closeCommunity() {
        this.close('communityModal');
    },

    // Blog modal
    openBlog() {
        // Reset form
        document.getElementById('blogForm')?.reset();
        this.open('blogModal');
    },

    closeBlog() {
        this.close('blogModal');
    },

    // Upload modals
    openCoverUpload() {
        this.open('coverUploadModal');
    },

    closeCoverUpload() {
        this.close('coverUploadModal');
    },

    openProfileUpload() {
        this.open('profileUploadModal');
    },

    closeProfileUpload() {
        this.close('profileUploadModal');
    },

    openVideoUpload() {
        this.open('uploadVideoModal');
    },

    closeVideoUpload() {
        this.close('uploadVideoModal');
    },

    // Coming soon modal
    showComingSoon(feature) {
        const modal = document.getElementById('comingSoonModal');
        if (modal) {
            const featureText = modal.querySelector('.feature-name');
            if (featureText) {
                featureText.textContent = feature;
            }
            this.open('comingSoonModal');
        }
    },

    closeComingSoon() {
        this.close('comingSoonModal');
    },

    // Verification modal
    showVerification() {
        this.open('verificationModal');
    },

    closeVerification() {
        this.close('verificationModal');
    },

    // Helper methods
    setInputValue(id, value) {
        const input = document.getElementById(id);
        if (input) {
            input.value = value || '';
        }
    },

    createStudentDetailsHTML(student) {
        // Format the student name
        const studentName = [student.first_name, student.father_name, student.grandfather_name]
            .filter(Boolean)
            .join(' ') || student.username || 'Unknown Student';

        // Format subjects
        const subjects = Array.isArray(student.subjects) && student.subjects.length > 0
            ? student.subjects.join(', ')
            : 'N/A';

        // Format languages
        const languages = Array.isArray(student.preferred_languages) && student.preferred_languages.length > 0
            ? student.preferred_languages.join(', ')
            : 'N/A';

        return `
            <div class="student-details-header" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color, #e5e7eb);">
                <img src="${student.profile_picture || '../uploads/system_images/system_profile_pictures/student-college-girl.jpg'}"
                     alt="${studentName}"
                     class="student-avatar-large"
                     style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">
                <div>
                    <h3 style="margin: 0; font-size: 1.5rem; font-weight: 600; color: var(--text-primary);">${studentName}</h3>
                    <p style="margin: 0.25rem 0 0 0; color: var(--text-secondary); font-size: 0.95rem;">${student.grade_level || 'N/A'}</p>
                    ${student.bio ? `<p style="margin: 0.5rem 0 0 0; color: var(--text-secondary); font-size: 0.875rem; font-style: italic;">"${student.bio}"</p>` : ''}
                </div>
            </div>

            <div class="student-info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="info-item" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--bg-secondary, #f9fafb); border-radius: 8px;">
                    <i class="fas fa-envelope" style="color: var(--primary-color);"></i>
                    <span style="color: var(--text-primary); font-size: 0.875rem;">${student.email || 'N/A'}</span>
                </div>
                <div class="info-item" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--bg-secondary, #f9fafb); border-radius: 8px;">
                    <i class="fas fa-phone" style="color: var(--primary-color);"></i>
                    <span style="color: var(--text-primary); font-size: 0.875rem;">${student.phone || 'N/A'}</span>
                </div>
                <div class="info-item" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--bg-secondary, #f9fafb); border-radius: 8px;">
                    <i class="fas fa-map-marker-alt" style="color: var(--primary-color);"></i>
                    <span style="color: var(--text-primary); font-size: 0.875rem;">${student.location || 'N/A'}</span>
                </div>
                <div class="info-item" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--bg-secondary, #f9fafb); border-radius: 8px;">
                    <i class="fas fa-venus-mars" style="color: var(--primary-color);"></i>
                    <span style="color: var(--text-primary); font-size: 0.875rem;">${student.gender || 'N/A'}</span>
                </div>
                <div class="info-item" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--bg-secondary, #f9fafb); border-radius: 8px;">
                    <i class="fas fa-book" style="color: var(--primary-color);"></i>
                    <span style="color: var(--text-primary); font-size: 0.875rem;">${subjects}</span>
                </div>
                <div class="info-item" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; background: var(--bg-secondary, #f9fafb); border-radius: 8px;">
                    <i class="fas fa-language" style="color: var(--primary-color);"></i>
                    <span style="color: var(--text-primary); font-size: 0.875rem;">${languages}</span>
                </div>
            </div>

            <div class="student-stats" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color, #e5e7eb);">
                <div class="stat-item" style="text-align: center; padding: 1rem; background: var(--bg-secondary, #f9fafb); border-radius: 8px;">
                    <span class="stat-value" style="display: block; font-size: 2rem; font-weight: 700; color: var(--primary-color); margin-bottom: 0.25rem;">${student.rating ? student.rating.toFixed(1) : '0.0'}</span>
                    <span class="stat-label" style="display: block; font-size: 0.875rem; color: var(--text-secondary);">Rating</span>
                </div>
                <div class="stat-item" style="text-align: center; padding: 1rem; background: var(--bg-secondary, #f9fafb); border-radius: 8px;">
                    <span class="stat-value" style="display: block; font-size: 2rem; font-weight: 700; color: var(--primary-color); margin-bottom: 0.25rem;">${student.rating_count || 0}</span>
                    <span class="stat-label" style="display: block; font-size: 0.875rem; color: var(--text-secondary);">Reviews</span>
                </div>
                <div class="stat-item" style="text-align: center; padding: 1rem; background: var(--bg-secondary, #f9fafb); border-radius: 8px;">
                    <span class="stat-value" style="display: block; font-size: 2rem; font-weight: 700; color: var(--primary-color); margin-bottom: 0.25rem;">${student.grade_level || 'N/A'}</span>
                    <span class="stat-label" style="display: block; font-size: 0.875rem; color: var(--text-secondary);">Grade</span>
                </div>
            </div>

            ${student.quote ? `
                <div style="margin-top: 1.5rem; padding: 1rem; background: linear-gradient(135deg, var(--primary-color, #3b82f6) 0%, var(--secondary-color, #8b5cf6) 100%); border-radius: 8px; color: white;">
                    <i class="fas fa-quote-left" style="opacity: 0.5; margin-bottom: 0.5rem;"></i>
                    <p style="margin: 0.5rem 0; font-size: 1rem; font-style: italic;">${student.quote}</p>
                    <i class="fas fa-quote-right" style="opacity: 0.5; float: right;"></i>
                </div>
            ` : ''}
        `;
    },

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    },

    // Setup event listeners
    setupModalEventListeners() {
        // Close modals on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAll();
            }
        });

        // Close modal when clicking overlay (the modal background itself, not content)
        document.addEventListener('click', (e) => {
            // Check if clicked on modal backdrop (not the modal-content)
            if ((e.target.classList.contains('modal') ||
                 e.target.classList.contains('upload-cover-modal') ||
                 e.target.classList.contains('upload-profile-modal')) &&
                (e.target.classList.contains('show') || e.target.style.display === 'flex')) {
                this.close(e.target.id);
            }
        });
    },

    // Inject necessary modal styles
    injectModalStyles() {
        if (document.getElementById('tutorModalStyles')) return;

        const styles = document.createElement('style');
        styles.id = 'tutorModalStyles';
        styles.textContent = `
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9999;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(4px);
            }

            .modal.show {
                display: flex;
                animation: fadeIn 0.2s ease-in-out;
            }

            .modal.hidden {
                display: none;
            }

            .modal-content {
                background: var(--bg-primary, #fff);
                border-radius: 12px;
                padding: 24px;
                max-width: 600px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                animation: slideUp 0.3s ease-out;
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }

            .modal-title {
                font-size: 1.5rem;
                font-weight: 600;
                color: var(--text-primary, #000);
            }

            .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--text-muted, #666);
                transition: color 0.2s;
            }

            .modal-close:hover {
                color: var(--text-primary, #000);
            }

            @keyframes fadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            @keyframes slideUp {
                from {
                    transform: translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }
};

// Initialize and export to window immediately
window.TutorModalManager = TutorModalManager;

// Auto-initialize when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        TutorModalManager.init();
        console.log('✅ TutorModalManager initialized');
    });
} else {
    // DOM already loaded
    TutorModalManager.init();
    console.log('✅ TutorModalManager initialized (late load)');
}
