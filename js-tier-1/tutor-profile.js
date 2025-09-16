// =============================================
// TUTOR PROFILE MAIN CONTROLLER
// =============================================

class TutorProfileManager {
    constructor() {
        this.profileData = {};
        this.certifications = [];
        this.experiences = [];
        this.achievements = [];
        this.schedule = [];
        this.students = [];
        this.stats = {};
        this.isOwnProfile = false;
        this.tutorId = null;
        this.init();
    }

    async init() {
        try {
            // Check authentication
            const auth = window.AuthManager;
            if (!auth.isAuthenticated()) {
                const restored = await auth.restoreSession();
                if (!restored) {
                    this.showAuthModal();
                    return;
                }
            }

            // Determine if viewing own profile or another tutor's
            this.tutorId = this.getTutorIdFromUrl() || localStorage.getItem('user_id');
            this.isOwnProfile = this.tutorId === localStorage.getItem('user_id');

            // Load all data
            await this.loadAllData();
            
            // Initialize UI components
            this.setupEventListeners();
            this.initializeModalHandlers();
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Failed to load profile', 'error');
        }
    }

    getTutorIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    async loadAllData() {
        this.showLoadingState();
        
        try {
            const [profile, stats, certifications, experiences, achievements, schedule, students] = 
                await Promise.all([
                    this.fetchTutorProfile(),
                    this.fetchTutorStats(),
                    this.fetchCertifications(),
                    this.fetchExperiences(),
                    this.fetchAchievements(),
                    this.fetchSchedule(),
                    this.isOwnProfile ? this.fetchMyStudents() : Promise.resolve([])
                ]);

            this.profileData = profile;
            this.stats = stats;
            this.certifications = certifications.certifications || [];
            this.experiences = experiences.experiences || [];
            this.achievements = achievements.achievements || [];
            this.schedule = schedule.schedule || [];
            this.students = students.students || [];

            this.populateProfile();
            this.hideLoadingState();
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.hideLoadingState();
            this.showToast('Some data could not be loaded', 'warning');
        }
    }

    // =============================================
    // API CALLS
    // =============================================

    async fetchTutorProfile() {
        const token = localStorage.getItem('access_token');
        const endpoint = this.isOwnProfile 
            ? '/api/tutor/profile' 
            : `/api/tutor/${this.tutorId}`;
            
        const response = await fetch(`http://localhost:8000${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch profile');
        return await response.json();
    }

    async fetchTutorStats() {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/tutor/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) return {};
        const data = await response.json();
        return data.stats || {};
    }

    async fetchCertifications() {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/tutor/certifications', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) return { certifications: [] };
        return await response.json();
    }

    async fetchExperiences() {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/tutor/experiences', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) return { experiences: [] };
        return await response.json();
    }

    async fetchAchievements() {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/tutor/achievements', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) return { achievements: [] };
        return await response.json();
    }

    async fetchSchedule() {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/tutor/sessions', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) return { schedule: [] };
        const data = await response.json();
        return { schedule: data.sessions || [] };
    }

    async fetchMyStudents() {
        if (!this.isOwnProfile) return { students: [] };
        
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/my-favorite-tutors', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) return { students: [] };
        const data = await response.json();
        return { students: data.favorites || [] };
    }

    // =============================================
    // POPULATE UI
    // =============================================

    populateProfile() {
        // Profile Header
        this.updateProfileHeader();
        
        // Sections
        this.updateAboutSection();
        this.updateStatsSection();
        this.updateCertificationsDisplay();
        this.updateExperiencesDisplay();
        this.updateAchievementsDisplay();
        this.updateScheduleDisplay();
        this.updateStudentsDisplay();
        
        // Show/hide edit buttons based on ownership
        this.toggleEditButtons();
    }

    updateProfileHeader() {
        const { user, ...profile } = this.profileData;
        
        // Name and basic info
        this.setElementText('centerName', `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Tutor Profile');
        this.setElementText('tutor-rating', profile.rating?.toFixed(1) || 'N/A');
        this.setElementText('tutor-gender', profile.gender || 'Not specified');
        this.setElementText('tutor-address', `Address: ${profile.location || 'Not set'}`);
        this.setElementText('tutor-school', `Teaches at: ${profile.teaches_at || 'Not specified'}`);
        this.setElementText('quote', profile.quote || '"Education is the key to success"');
        this.setElementText('tutor-bio', profile.bio || 'No bio provided yet');
        
        // Profile picture
        if (user?.profile_picture) {
            const profileImg = document.querySelector('.profile-avatar');
            if (profileImg) {
                profileImg.src = this.getImageUrl(user.profile_picture);
            }
        }
        
        // Cover image
        if (profile.cover_image) {
            const coverImg = document.querySelector('.cover-img');
            if (coverImg) {
                coverImg.src = this.getImageUrl(profile.cover_image);
            }
        }
        
        // Verification badge
        this.updateVerificationBadge(profile.is_verified);
        
        // Rating stars
        this.updateRatingStars(profile.rating);
        
        // Subject tags
        this.updateSubjectTags(profile.courses || []);
        
        // Teaching methods
        this.updateTeachingMethods(profile.teaching_methods || []);
        
        // Next session alert
        this.updateNextSession();
    }

    updateAboutSection() {
        const bioElement = document.getElementById('tutor-bio');
        if (bioElement) {
            bioElement.textContent = this.profileData.bio || 'Experienced tutor passionate about education.';
        }
    }

    updateStatsSection() {
        // Update all stat cards with real data
        const statMappings = {
            'Total Students': this.stats.total_students || 0,
            'Current Students': this.stats.active_students || 0,
            'Sessions Completed': this.stats.completed_sessions || 0,
            'Success Rate': `${this.stats.success_rate || 0}%`,
            'Monthly Earnings': `ETB ${(this.stats.total_earnings || 0).toLocaleString()}`,
            'Years Experience': `${this.profileData.experience || 0}+`,
            'Average Rating': (this.profileData.rating || 0).toFixed(1),
            'Courses Taught': this.profileData.courses?.length || 0,
            'Upcoming Sessions': this.stats.upcoming_sessions || 0
        };

        document.querySelectorAll('.stat-card, .follow-card').forEach(card => {
            const labelElement = card.querySelector('.stat-label, .stat-desc');
            const valueElement = card.querySelector('.stat-value, .stat-number');
            
            if (labelElement && valueElement) {
                const label = labelElement.textContent;
                Object.entries(statMappings).forEach(([key, value]) => {
                    if (label.includes(key)) {
                        valueElement.textContent = value;
                    }
                });
            }
        });
    }

    updateCertificationsDisplay() {
        const container = document.querySelector('.dashboard-card .card-grid');
        if (!container) return;
        
        if (this.certifications.length === 0) {
            container.innerHTML = '<p>No certifications added yet.</p>';
            return;
        }
        
        container.innerHTML = this.certifications.map(cert => `
            <div class="info-card">
                <h4>🎓 ${cert.title}</h4>
                <p>${cert.issuing_organization || 'Unknown'}</p>
                <p>${cert.issue_date ? new Date(cert.issue_date).getFullYear() : 'N/A'}</p>
                <button class="btn-view" onclick="tutorProfile.viewCertificate('${cert.id}')">View Certificate</button>
            </div>
        `).join('');
    }

    updateExperiencesDisplay() {
        const containers = document.querySelectorAll('.dashboard-card');
        const expContainer = Array.from(containers).find(c => 
            c.querySelector('h3')?.textContent === 'Professional Experience'
        );
        
        if (!expContainer) return;
        const grid = expContainer.querySelector('.card-grid');
        if (!grid) return;
        
        if (this.experiences.length === 0) {
            grid.innerHTML = '<p>No experiences added yet.</p>';
            return;
        }
        
        grid.innerHTML = this.experiences.map(exp => `
            <div class="info-card">
                <h4>🏫 ${exp.position}</h4>
                <p>${exp.organization}</p>
                <p>${this.formatDateRange(exp.start_date, exp.end_date, exp.is_current)}</p>
                <p>${exp.description || ''}</p>
                <button class="btn-view" onclick="tutorProfile.viewExperience('${exp.id}')">View Details</button>
            </div>
        `).join('');
    }

    updateAchievementsDisplay() {
        const containers = document.querySelectorAll('.dashboard-card');
        const achContainer = Array.from(containers).find(c => 
            c.querySelector('h3')?.textContent === 'Achievements & Awards'
        );
        
        if (!achContainer) return;
        const grid = achContainer.querySelector('.card-grid');
        if (!grid) return;
        
        if (this.achievements.length === 0) {
            grid.innerHTML = '<p>No achievements added yet.</p>';
            return;
        }
        
        grid.innerHTML = this.achievements.map(ach => `
            <div class="info-card">
                <h4>${this.getAchievementIcon(ach.category)} ${ach.title}</h4>
                <p>${ach.category || 'Achievement'}</p>
                <p>${ach.description || ''}</p>
                <button class="btn-view" onclick="tutorProfile.viewAchievement('${ach.id}')">View Details</button>
            </div>
        `).join('');
    }

    updateScheduleDisplay() {
        // Header schedule
        const nextSessionElement = document.getElementById('nextSessionText');
        if (nextSessionElement && this.schedule.length > 0) {
            const nextSession = this.schedule.find(s => 
                new Date(s.session_date) >= new Date() && s.status === 'scheduled'
            );
            
            if (nextSession) {
                const sessionDate = new Date(nextSession.session_date);
                const timeStr = nextSession.start_time || '2:00 PM';
                nextSessionElement.innerHTML = `
                    <strong class="gradient-text">Next Session:</strong> 
                    ${this.isToday(sessionDate) ? 'Today' : this.formatDate(sessionDate)} at ${timeStr} - 
                    ${nextSession.subject} with ${nextSession.student_name || 'Student'}
                `;
            }
        }
        
        // Schedule section
        const sessionList = document.querySelector('.upcoming-sessions .session-list');
        if (sessionList) {
            const upcomingSessions = this.schedule
                .filter(s => new Date(s.session_date) >= new Date())
                .sort((a, b) => new Date(a.session_date) - new Date(b.session_date))
                .slice(0, 5);
            
            if (upcomingSessions.length === 0) {
                sessionList.innerHTML = '<p>No upcoming sessions scheduled.</p>';
            } else {
                sessionList.innerHTML = upcomingSessions.map(session => `
                    <div class="session-item">
                        <span class="session-time">${this.formatSessionDate(session.session_date)}, ${session.start_time || 'TBD'}</span>
                        <span class="session-student">${session.student_name || 'Student'}</span>
                        <span class="session-subject">${session.subject}</span>
                    </div>
                `).join('');
            }
        }
        
        // Bottom widget events
        this.updateEventsWidget();
    }

    updateEventsWidget() {
        const eventsWidget = document.querySelector('.events-widget .events-list');
        if (!eventsWidget) return;
        
        const upcomingEvents = this.schedule
            .filter(s => new Date(s.session_date) >= new Date())
            .sort((a, b) => new Date(a.session_date) - new Date(b.session_date))
            .slice(0, 3);
        
        if (upcomingEvents.length === 0) {
            eventsWidget.innerHTML = '<p class="text-center">No upcoming events</p>';
            return;
        }
        
        eventsWidget.innerHTML = upcomingEvents.map(session => `
            <div class="event-item">
                <div class="event-time">
                    <span class="time">${session.start_time || 'TBD'}</span>
                    <span class="date">${this.formatShortDate(session.session_date)}</span>
                </div>
                <div class="event-info">
                    <h4>${session.subject} Session</h4>
                    <p>${session.student_name || 'Student'} - ${session.mode || 'Online'}</p>
                </div>
            </div>
        `).join('');
    }

    updateStudentsDisplay() {
        if (!this.isOwnProfile) return;
        
        const container = document.querySelector('.students-grid');
        if (!container) return;
        
        if (this.students.length === 0) {
            container.innerHTML = `
                <div class="no-data-message">
                    <p>No students enrolled yet.</p>
                </div>
            `;
            return;
        }
        
        // This would be populated with actual student data from the API
        container.innerHTML = '<p>Student data loading...</p>';
    }

    updateVerificationBadge(isVerified) {
        const badge = document.getElementById('verification-status');
        if (badge) {
            badge.innerHTML = isVerified ? '✓ Verified' : '✗ Unverified';
            badge.className = `verified-badge ${isVerified ? 'verified' : ''}`;
        }
    }

    updateRatingStars(rating) {
        const starsElement = document.getElementById('tutor-rating-stars');
        if (!starsElement || !rating) return;
        
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        
        let stars = '⭐'.repeat(fullStars);
        if (hasHalfStar) stars += '✨';
        
        starsElement.innerHTML = stars || '<span class="text-gray-400">No rating yet</span>';
    }

    updateSubjectTags(subjects) {
        const container = document.querySelector('.subject-tags');
        if (!container) return;
        
        if (subjects.length === 0) {
            container.innerHTML = '<span class="subject-tag">No subjects added</span>';
            return;
        }
        
        container.innerHTML = subjects.map(subject => 
            `<span class="subject-tag">${subject}</span>`
        ).join('');
    }

    updateTeachingMethods(methods) {
        const container = document.querySelector('.teaching-methods-tags');
        if (!container) return;
        
        if (methods.length === 0) {
            container.innerHTML = '<span class="teaching-method-tag">No methods specified</span>';
            return;
        }
        
        container.innerHTML = methods.map(method => 
            `<span class="teaching-method-tag">${method}</span>`
        ).join('');
    }

    updateNextSession() {
        const upcomingSession = this.schedule
            .filter(s => new Date(s.session_date) >= new Date())
            .sort((a, b) => new Date(a.session_date) - new Date(b.session_date))[0];
        
        if (upcomingSession) {
            const sessionDate = new Date(upcomingSession.session_date);
            const sessionText = document.getElementById('nextSessionText');
            if (sessionText) {
                sessionText.innerHTML = `
                    <strong class="gradient-text">Next Session:</strong> 
                    ${this.isToday(sessionDate) ? 'Today' : this.formatDate(sessionDate)} at 
                    ${upcomingSession.start_time || 'TBD'} - 
                    ${upcomingSession.subject} with ${upcomingSession.student_name || 'Student'}
                `;
            }
        }
    }

    toggleEditButtons() {
        const editButtons = document.querySelectorAll('.edit-profile, .edit-icon');
        editButtons.forEach(button => {
            button.style.display = this.isOwnProfile ? 'inline-block' : 'none';
        });
    }

    // =============================================
    // UTILITY FUNCTIONS
    // =============================================

    setElementText(id, text) {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    }

    getImageUrl(url) {
        if (!url) return '../pictures/default-avatar.jpg';
        if (url.startsWith('http')) return url;
        return `http://localhost:8000${url}`;
    }

    formatDate(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    formatShortDate(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        const today = new Date();
        
        if (this.isToday(d)) return 'Today';
        if (this.isTomorrow(d)) return 'Tomorrow';
        
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    formatSessionDate(date) {
        const d = new Date(date);
        if (this.isToday(d)) return 'Today';
        if (this.isTomorrow(d)) return 'Tomorrow';
        return this.formatDate(date);
    }

    formatDateRange(startDate, endDate, isCurrent) {
        const start = new Date(startDate).getFullYear();
        if (isCurrent) return `${start} - Present`;
        const end = endDate ? new Date(endDate).getFullYear() : 'Present';
        return `${start} - ${end}`;
    }

    isToday(date) {
        const today = new Date();
        const d = new Date(date);
        return d.getDate() === today.getDate() &&
               d.getMonth() === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
    }

    isTomorrow(date) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const d = new Date(date);
        return d.getDate() === tomorrow.getDate() &&
               d.getMonth() === tomorrow.getMonth() &&
               d.getFullYear() === tomorrow.getFullYear();
    }

    getAchievementIcon(category) {
        const icons = {
            'Award': '🏆',
            'Publication': '📚',
            'Project': '🚀',
            'Certification': '📜',
            'Recognition': '⭐'
        };
        return icons[category] || '🎯';
    }

    showLoadingState() {
        document.body.classList.add('loading');
        // Add loading placeholders as needed
    }

    hideLoadingState() {
        document.body.classList.remove('loading');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showAuthModal() {
        const modal = document.getElementById('authRequiredModal');
        if (modal) {
            modal.classList.add('active');
        } else {
            alert('Please login to access this page');
            window.location.href = '../index.html';
        }
    }

    // =============================================
    // EVENT LISTENERS
    // =============================================

    setupEventListeners() {
        // View functions
        window.tutorProfile = this;
        
        // Sidebar content switching
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleSidebarClick(e));
        });
    }

    handleSidebarClick(event) {
        const button = event.currentTarget;
        const content = button.dataset.content;
        
        // Remove active from all buttons and panels
        document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.sidebar-content-panel').forEach(panel => panel.classList.remove('active'));
        
        // Add active to clicked button and corresponding panel
        button.classList.add('active');
        const panel = document.getElementById(`${content}-content`);
        if (panel) panel.classList.add('active');
    }

    initializeModalHandlers() {
        // Initialize modal manager
        this.modalManager = new ModalManager(this);
    }

    // Public methods for inline onclick handlers
    viewCertificate(id) {
        const cert = this.certifications.find(c => c.id == id);
        if (cert?.document_url) {
            window.open(this.getImageUrl(cert.document_url), '_blank');
        }
    }

    viewExperience(id) {
        const exp = this.experiences.find(e => e.id == id);
        this.modalManager.showExperienceDetails(exp);
    }

    viewAchievement(id) {
        const ach = this.achievements.find(a => a.id == id);
        this.modalManager.showAchievementDetails(ach);
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.tutorProfile = new TutorProfileManager();
});