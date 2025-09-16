// =============================================
// TUTOR PROFILE DASHBOARD MANAGEMENT SYSTEM
// =============================================

// Global state management
const tutorState = {
    certifications: [],
    experiences: [],
    achievements: [],
    schedule: [],
    students: [],
    profileData: {},
    stats: {},
    currentModal: null,
    pendingSubmission: null
};

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const auth = window.AuthManager;
    if (!auth.isAuthenticated()) {
        const restored = await auth.restoreSession();
        if (!restored) {
            showAuthModal();
            return;
        }
    }

    // Verify tutor role
    const userRole = auth.getUserRole();
    if (userRole !== 'tutor') {
        alert('This page is for tutors only');
        window.location.href = '../index.html';
        return;
    }

    // Initialize dashboard
    await initializeDashboard();
    setupModalHandlers();
    setupEventListeners();
});

// =============================================
// DASHBOARD INITIALIZATION
// =============================================

async function initializeDashboard() {
    try {
        // Show loading indicators
        showLoadingIndicators();
        
        // Fetch all tutor data
        const [profile, certifications, experiences, achievements, schedule, stats, students, followers] = await Promise.all([
            fetchTutorProfile(),
            fetchCertifications(),
            fetchExperiences(),
            fetchAchievements(),
            fetchSchedule(),
            fetchTutorStats(),
            fetchTutorStudents(),
            fetchFollowerStats()
        ]);

        // Update state
        tutorState.profileData = profile;
        tutorState.certifications = certifications;
        tutorState.experiences = experiences;
        tutorState.achievements = achievements;
        tutorState.schedule = schedule;
        tutorState.stats = stats;
        tutorState.students = students;

        // Populate all sections
        populateProfileSection(profile);
        populateSubjectTags(profile.subjects || []);
        populateTeachingMethods(profile.teaching_methods || []);
        populateCertificationsSection(certifications);
        populateExperiencesSection(experiences);
        populateAchievementsSection(achievements);
        populateScheduleSection(schedule);
        populateStatistics(stats);
        populateStudentCards(students);
        populateFollowerStats(followers);
        updateUpcomingEvents();
        
        // Hide loading indicators
        hideLoadingIndicators();
        
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showToast('Error loading dashboard data', 'error');
        hideLoadingIndicators();
    }
}

// =============================================
// API CALLS
// =============================================

async function fetchTutorProfile() {
    const token = localStorage.getItem('access_token');
    const response = await fetch('http://localhost:8000/api/tutor/profile', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error('Failed to fetch profile');
    return await response.json();
}

async function fetchCertifications() {
    const token = localStorage.getItem('access_token');
    const response = await fetch('http://localhost:8000/api/tutor/certifications', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) return [];
    return await response.json();
}

async function fetchExperiences() {
    const token = localStorage.getItem('access_token');
    const response = await fetch('http://localhost:8000/api/tutor/experiences', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) return [];
    return await response.json();
}

async function fetchAchievements() {
    const token = localStorage.getItem('access_token');
    const response = await fetch('http://localhost:8000/api/tutor/achievements', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) return [];
    return await response.json();
}

async function fetchSchedule() {
    const token = localStorage.getItem('access_token');
    const response = await fetch('http://localhost:8000/api/tutor/schedule', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) return [];
    return await response.json();
}

async function fetchTutorStats() {
    const token = localStorage.getItem('access_token');
    const response = await fetch('http://localhost:8000/api/tutor/stats', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) return {};
    return await response.json();
}

async function fetchTutorStudents() {
    const token = localStorage.getItem('access_token');
    const response = await fetch('http://localhost:8000/api/tutor/students', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) return [];
    return await response.json();
}

async function fetchFollowerStats() {
    const token = localStorage.getItem('access_token');
    const response = await fetch('http://localhost:8000/api/tutor/followers', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) return { followers: 0, following: 0 };
    return await response.json();
}

// =============================================
// POPULATE DASHBOARD SECTIONS
// =============================================

async function uploadImage(type) {
    const fileInput = document.getElementById(`${type}Input`);
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select an image first');
        return;
    }

    // Show progress
    document.getElementById(`${type}Progress`).classList.add('active');
    document.getElementById(`${type}Spinner`).classList.add('active');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const token = localStorage.getItem('access_token');
        const endpoint = type === 'cover' 
            ? '/api/tutor/upload-cover' 
            : '/api/tutor/upload-profile-picture';

        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                document.getElementById(`${type}ProgressFill`).style.width = percentComplete + '%';
                document.getElementById(`${type}ProgressText`).textContent = `Uploading... ${Math.round(percentComplete)}%`;
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                
                // Update the image on the page
                if (type === 'cover') {
                    const coverImg = document.querySelector('.cover-img');
                    if (coverImg) {
                        coverImg.src = getImageUrl(response.url);
                    }
                } else {
                    const profileImg = document.querySelector('.profile-avatar');
                    if (profileImg) {
                        profileImg.src = getImageUrl(response.url);
                    }
                    // Also update navbar profile picture
                    const navProfilePic = document.getElementById('profile-pic');
                    if (navProfilePic) {
                        navProfilePic.src = getImageUrl(response.url);
                    }
                }
                
                alert(`${type === 'cover' ? 'Cover' : 'Profile'} image uploaded successfully!`);
                closeModal(`${type}UploadModal`);
            } else {
                throw new Error('Upload failed');
            }
        });

        xhr.addEventListener('error', () => {
            alert('Error uploading image');
            document.getElementById(`${type}Progress`).classList.remove('active');
            document.getElementById(`${type}Spinner`).classList.remove('active');
        });

        xhr.open('POST', `http://localhost:8000${endpoint}`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
        
    } catch (error) {
        alert('Error uploading image');
        document.getElementById(`${type}Progress`).classList.remove('active');
        document.getElementById(`${type}Spinner`).classList.remove('active');
    }
}

function populateProfileSection(profile) {
    // Update profile header
    document.getElementById('centerName').textContent = profile.name || 'Tutor Profile';
    document.getElementById('tutor-rating').textContent = profile.rating?.toFixed(1) || 'N/A';
    document.getElementById('tutor-gender').textContent = profile.gender || 'Not specified';
    document.getElementById('tutor-address').textContent = `Address: ${profile.address || 'Not set'}`;
    document.getElementById('tutor-school').textContent = `Teaches at: ${profile.school || 'Under verification'}`;
    document.getElementById('tutor-bio').textContent = profile.bio || 'No bio provided';
    document.getElementById('quote').textContent = profile.quote || '"Education is the key to success."';
    
    // Update verification status
    const verificationElement = document.getElementById('verification-status');
    if (profile.is_verified) {
        verificationElement.innerHTML = '✓ Verified';
        verificationElement.className = 'verified-badge verified';
    } else {
        verificationElement.innerHTML = '✗ Unverified';
        verificationElement.className = 'verified-badge';
    }

    // Load cover image if exists
    if (profile.cover_image) {
        const coverImg = document.querySelector('.cover-img');
        if (coverImg) {
            coverImg.src = getImageUrl(profile.cover_image);
        }
    }
    
    // Load profile picture from user data
    const auth = window.AuthManager;
    const user = auth.getUser();
    if (user && user.profile_picture) {
        const profileAvatar = document.querySelector('.profile-avatar');
        if (profileAvatar) {
            profileAvatar.src = getImageUrl(user.profile_picture);
        }
    }
    
    // Update rating stars
    const starsElement = document.getElementById('tutor-rating-stars');
    if (profile.rating) {
        const fullStars = Math.floor(profile.rating);
        const hasHalfStar = profile.rating % 1 !== 0;
        let starsHTML = '';
        for (let i = 0; i < fullStars; i++) {
            starsHTML += '⭐';
        }
        if (hasHalfStar) starsHTML += '✨';
        starsElement.innerHTML = starsHTML;
    }
}

function populateSubjectTags(subjects) {
    const container = document.querySelector('.subject-tags');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (subjects.length === 0) {
        container.innerHTML = '<span class="subject-tag">No subjects added</span>';
        return;
    }
    
    subjects.forEach(subject => {
        const tag = document.createElement('span');
        tag.className = 'subject-tag';
        tag.textContent = subject;
        container.appendChild(tag);
    });
}

function populateTeachingMethods(methods) {
    const container = document.querySelector('.teaching-methods-tags');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (methods.length === 0) {
        container.innerHTML = '<span class="teaching-method-tag">No methods specified</span>';
        return;
    }
    
    methods.forEach(method => {
        const tag = document.createElement('span');
        tag.className = 'teaching-method-tag';
        tag.textContent = method;
        container.appendChild(tag);
    });
}

function populateStatistics(stats) {
    // Update all statistics dynamically
    const statCards = document.querySelectorAll('.stat-card, .follow-card');
    
    statCards.forEach(card => {
        const descElement = card.querySelector('.stat-desc, .stat-label');
        if (!descElement) return;
        
        const text = descElement.textContent.toLowerCase();
        const valueElement = card.querySelector('.stat-number, .stat-value');
        
        if (!valueElement) return;
        
        if (text.includes('total students')) {
            valueElement.textContent = stats.total_students || 0;
        } else if (text.includes('current students')) {
            valueElement.textContent = stats.current_students || 0;
        } else if (text.includes('sessions completed')) {
            valueElement.textContent = stats.sessions_completed || 0;
        } else if (text.includes('success rate')) {
            valueElement.textContent = `${stats.success_rate || 0}%`;
        } else if (text.includes('monthly earnings')) {
            valueElement.textContent = `ETB ${(stats.monthly_earnings || 0).toLocaleString()}`;
        } else if (text.includes('years experience')) {
            valueElement.textContent = `${stats.years_experience || 0}+`;
        } else if (text.includes('average rating')) {
            valueElement.textContent = (stats.average_rating || 0).toFixed(1);
        }
    });
}

function populateFollowerStats(followers) {
    const followerCards = document.querySelectorAll('.follow-card');
    followerCards.forEach(card => {
        const labelElement = card.querySelector('.stat-label');
        if (!labelElement) return;
        
        const valueElement = card.querySelector('.stat-value');
        if (!valueElement) return;
        
        if (labelElement.textContent.toLowerCase().includes('followers')) {
            valueElement.textContent = formatFollowerCount(followers.followers || 0);
        } else if (labelElement.textContent.toLowerCase().includes('following')) {
            valueElement.textContent = formatFollowerCount(followers.following || 0);
        }
    });
}

function formatFollowerCount(count) {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
}

function populateCertificationsSection(certifications) {
    const container = document.getElementById('dashboard-content')?.querySelector('.card-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (certifications.length === 0) {
        container.innerHTML = '<p>No certifications added yet. Click "Manage Certifications" to add.</p>';
        return;
    }
    
    certifications.forEach(cert => {
        const card = createCertificationCard(cert);
        container.appendChild(card);
    });
}

function createCertificationCard(cert) {
    const div = document.createElement('div');
    div.className = 'info-card';
    div.innerHTML = `
        <h4>🎓 ${cert.title}</h4>
        <p>${cert.institution}</p>
        <p>${cert.year || new Date(cert.date).getFullYear()}</p>
        <button class="btn-view" onclick="viewCertificate('${cert.id}')">View Certificate</button>
    `;
    return div;
}

function populateExperiencesSection(experiences) {
    const containers = document.querySelectorAll('.dashboard-card');
    const expContainer = Array.from(containers).find(c => 
        c.querySelector('h3')?.textContent === 'Professional Experience'
    );
    
    if (!expContainer) return;
    
    const grid = expContainer.querySelector('.card-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (experiences.length === 0) {
        grid.innerHTML = '<p>No experiences added yet. Click "Manage Experience" to add.</p>';
        return;
    }
    
    experiences.forEach(exp => {
        const card = createExperienceCard(exp);
        grid.appendChild(card);
    });
}

function createExperienceCard(exp) {
    const div = document.createElement('div');
    div.className = 'info-card';
    div.innerHTML = `
        <h4>🏫 ${exp.position}</h4>
        <p>${exp.institution}</p>
        <p>${exp.start_date} - ${exp.end_date || 'Present'}</p>
        <p>${exp.description || ''}</p>
        <button class="btn-view" onclick="viewExperience('${exp.id}')">View Details</button>
    `;
    return div;
}

function populateAchievementsSection(achievements) {
    const containers = document.querySelectorAll('.dashboard-card');
    const achContainer = Array.from(containers).find(c => 
        c.querySelector('h3')?.textContent === 'Achievements & Awards'
    );
    
    if (!achContainer) return;
    
    const grid = achContainer.querySelector('.card-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (achievements.length === 0) {
        grid.innerHTML = '<p>No achievements added yet. Click "Manage Achievements" to add.</p>';
        return;
    }
    
    achievements.forEach(ach => {
        const card = createAchievementCard(ach);
        grid.appendChild(card);
    });
}

function createAchievementCard(ach) {
    const div = document.createElement('div');
    div.className = 'info-card';
    div.innerHTML = `
        <h4>${ach.icon || '🏆'} ${ach.title}</h4>
        <p>${ach.issuer}</p>
        <p>${ach.description || ''}</p>
        <button class="btn-view" onclick="viewAchievement('${ach.id}')">View Details</button>
    `;
    return div;
}

function populateScheduleSection(schedule) {
    const upcomingSessionsDiv = document.querySelector('.upcoming-sessions .session-list');
    if (!upcomingSessionsDiv) return;
    
    upcomingSessionsDiv.innerHTML = '';
    
    if (schedule.length === 0) {
        upcomingSessionsDiv.innerHTML = '<p>No sessions scheduled. Click "Create Schedule" to add.</p>';
        return;
    }
    
    // Sort by date and time
    const sortedSchedule = schedule.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    
    // Display next 5 sessions
    sortedSchedule.slice(0, 5).forEach(session => {
        const sessionDiv = createSessionElement(session);
        upcomingSessionsDiv.appendChild(sessionDiv);
    });
}

function createSessionElement(session) {
    const div = document.createElement('div');
    div.className = 'session-item';
    const sessionDate = new Date(session.datetime);
    const isToday = isDateToday(sessionDate);
    
    div.innerHTML = `
        <span class="session-time">${isToday ? 'Today' : formatDate(sessionDate)}, ${formatTime(sessionDate)}</span>
        <span class="session-student">${session.student_name}</span>
        <span class="session-subject">${session.subject}</span>
    `;
    return div;
}

function populateStudentCards(students) {
    const container = document.querySelector('.students-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (students.length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <p>No students enrolled yet.</p>
                <p>Students will appear here once they enroll in your courses.</p>
            </div>
        `;
        return;
    }
    
    students.forEach(student => {
        const card = createStudentCard(student);
        container.appendChild(card);
    });
}

function createStudentCard(student) {
    const div = document.createElement('div');
    div.className = 'student-card';
    
    // Generate random stats for now (replace with actual data later)
    const stats = {
        sessions: Math.floor(Math.random() * 30) + 10,
        attendance: Math.floor(Math.random() * 20) + 80,
        grade: ['A', 'A-', 'B+', 'B'][Math.floor(Math.random() * 4)],
        progress: Math.floor(Math.random() * 40) + 60
    };
    
    div.innerHTML = `
        <div class="student-header">
            <div class="student-avatar">👨‍🎓</div>
            <div class="student-info">
                <a href="../view-profile-tier-1/view-student.html">
                    <h3>${student.name}</h3>
                </a>
                <p>Enrolled: ${new Date(student.enrollment_date).toLocaleDateString()}</p>
            </div>
        </div>

        <div class="student-stats">
            <div class="stat-item">
                <span class="stat-label">Sessions</span>
                <span class="stat-value">${stats.sessions}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Attendance</span>
                <span class="stat-value">${stats.attendance}%</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Avg Grade</span>
                <span class="stat-value">${stats.grade}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Next Session</span>
                <span class="stat-value">Scheduled</span>
            </div>
        </div>

        <div class="student-progress">
            <div class="progress-label">
                <span>Overall Progress</span>
                <span>${stats.progress}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${stats.progress}%"></div>
            </div>
        </div>

        <div class="student-actions">
            <button class="btn-view-details" onclick="openStudentDetailsModal('${student.id}')">View Details</button>
            <button class="btn-quick-action" onclick="contactStudent('${student.id}')">Contact</button>
        </div>
    `;
    
    return div;
}

function updateUpcomingEvents() {
    const eventsWidget = document.querySelector('.events-widget .events-list');
    if (!eventsWidget) return;
    
    eventsWidget.innerHTML = '';
    
    const upcomingSessions = tutorState.schedule
        .filter(s => new Date(s.datetime) > new Date())
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
        .slice(0, 3);
    
    upcomingSessions.forEach(session => {
        const eventDiv = createEventElement(session);
        eventsWidget.appendChild(eventDiv);
    });
}

function createEventElement(session) {
    const div = document.createElement('div');
    div.className = 'event-item';
    const sessionDate = new Date(session.datetime);
    
    div.innerHTML = `
        <div class="event-time">
            <span class="time">${formatTime(sessionDate)}</span>
            <span class="date">${isDateToday(sessionDate) ? 'Today' : formatShortDate(sessionDate)}</span>
        </div>
        <div class="event-info">
            <h4>${session.subject} Session</h4>
            <p>${session.student_name} - ${session.mode || 'Online'}</p>
        </div>
    `;
    return div;
}

// =============================================
// MODAL MANAGEMENT - ALL ORIGINAL MODALS
// =============================================

function setupModalHandlers() {
    // Add Certification Modal
// =============================================
// EXPOSE ALL MODAL FUNCTIONS TO GLOBAL SCOPE
// =============================================

// Make sure all these functions are accessible globally
window.openEditProfileModal = function() {
    const modalHTML = `
        <div id="edit-profile-modal" class="modal show">
            <div class="modal-overlay" onclick="closeEditProfileModal()"></div>
            <div class="modal-content edit-profile-modal">
                <div class="modal-header">
                    <h2>Edit Tutor Profile</h2>
                    <button class="modal-close" onclick="closeEditProfileModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="editProfileForm">
                        <div class="form-section">
                            <label class="form-label">Full Name</label>
                            <input type="text" class="form-input" id="tutorName" value="${tutorState.profileData.name || ''}" placeholder="Your full name">
                        </div>

                        <div class="form-section">
                            <label class="form-label">Gender</label>
                            <select class="form-input" id="tutorGender">
                                <option value="">Select Gender</option>
                                <option value="Male" ${tutorState.profileData.gender === 'Male' ? 'selected' : ''}>Male</option>
                                <option value="Female" ${tutorState.profileData.gender === 'Female' ? 'selected' : ''}>Female</option>
                                <option value="Other" ${tutorState.profileData.gender === 'Other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>

                        <div class="form-section">
                            <label class="form-label">Address</label>
                            <input type="text" class="form-input" id="tutorAddress" value="${tutorState.profileData.address || ''}" placeholder="Your address">
                        </div>

                        <div class="form-section">
                            <label class="form-label">Currently teaches at</label>
                            <input type="text" class="form-input" id="teachesAt" value="${tutorState.profileData.school || ''}" placeholder="Institution name">
                        </div>

                        <div class="form-section">
                            <label class="form-label">Subjects (comma separated)</label>
                            <input type="text" class="form-input" id="tutorSubjects" value="${(tutorState.profileData.subjects || []).join(', ')}" placeholder="Math, Physics, Chemistry">
                        </div>

                        <div class="form-section">
                            <label class="form-label">Teaching Methods (comma separated)</label>
                            <input type="text" class="form-input" id="teachingMethods" value="${(tutorState.profileData.teaching_methods || []).join(', ')}" placeholder="Online, In-person, Hybrid">
                        </div>

                        <div class="form-section">
                            <label class="form-label">Quote</label>
                            <textarea class="form-textarea" id="tutorQuote" rows="3" placeholder="Your inspiring quote">${tutorState.profileData.quote || ''}</textarea>
                        </div>

                        <div class="form-section">
                            <label class="form-label">Bio</label>
                            <textarea class="form-textarea" id="tutorBio" rows="5" placeholder="Tell students about yourself">${tutorState.profileData.bio || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeEditProfileModal()">Cancel</button>
                    <button class="btn-primary" onclick="saveProfile()">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.closeEditProfileModal = function() {
    closeModal('edit-profile-modal');
};

window.saveProfile = async function() {
    const profileData = {
        name: document.getElementById('tutorName').value,
        gender: document.getElementById('tutorGender').value,
        address: document.getElementById('tutorAddress').value,
        teaches_at: document.getElementById('teachesAt').value,
        school: document.getElementById('teachesAt').value,
        subjects: document.getElementById('tutorSubjects').value.split(',').map(s => s.trim()).filter(s => s),
        teaching_methods: document.getElementById('teachingMethods').value.split(',').map(s => s.trim()).filter(s => s),
        quote: document.getElementById('tutorQuote').value,
        bio: document.getElementById('tutorBio').value
    };
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/tutor/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });
        
        if (response.ok) {
            showToast('Profile updated successfully!', 'success');
            closeEditProfileModal();
            // Refresh profile data
            const updatedProfile = await fetchTutorProfile();
            tutorState.profileData = updatedProfile;
            populateProfileSection(updatedProfile);
            populateSubjectTags(updatedProfile.subjects || []);
            populateTeachingMethods(updatedProfile.teaching_methods || []);
        } else {
            throw new Error('Failed to update profile');
        }
    } catch (error) {
        showToast('Error updating profile', 'error');
    }
};

window.shareProfile = function() {
    const profileUrl = window.location.href;
    
    const modalHTML = `
        <div id="share-profile-modal" class="modal show">
            <div class="modal-overlay" onclick="closeModal('share-profile-modal')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Share Profile</h2>
                    <button class="modal-close" onclick="closeModal('share-profile-modal')">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Profile Link</label>
                        <input type="text" id="profile-link" class="form-input" value="${profileUrl}" readonly>
                    </div>
                    <div class="share-buttons">
                        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}" 
                           target="_blank" class="btn-social facebook">Share on Facebook</a>
                        <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(profileUrl)}" 
                           target="_blank" class="btn-social twitter">Share on Twitter</a>
                        <a href="https://t.me/share/url?url=${encodeURIComponent(profileUrl)}" 
                           target="_blank" class="btn-social telegram">Share on Telegram</a>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('share-profile-modal')">Close</button>
                    <button class="btn-primary" onclick="copyProfileLink()">Copy Link</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.copyProfileLink = function() {
    const profileLink = document.getElementById('profile-link');
    profileLink.select();
    document.execCommand('copy');
    showToast('Profile link copied to clipboard!', 'success');
};

// Edit functions for certifications, experiences, achievements
window.editCertification = function(id) {
    const cert = tutorState.certifications.find(c => c.id == id);
    if (!cert) return;
    
    const modalHTML = `
        <div id="edit-certification-modal" class="modal show">
            <div class="modal-overlay" onclick="closeModal('edit-certification-modal')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Certification</h2>
                    <button class="modal-close" onclick="closeModal('edit-certification-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="editCertificationForm">
                        <div class="form-group">
                            <label>Institution</label>
                            <input type="text" id="edit-cert-institution" class="form-input" value="${cert.institution}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Certification Title</label>
                            <input type="text" id="edit-cert-title" class="form-input" value="${cert.title}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Field</label>
                            <input type="text" id="edit-cert-field" class="form-input" value="${cert.field}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Type</label>
                            <select id="edit-cert-type" class="form-input" required>
                                <option value="BSc" ${cert.type === 'BSc' ? 'selected' : ''}>BSc</option>
                                <option value="MSc" ${cert.type === 'MSc' ? 'selected' : ''}>MSc</option>
                                <option value="PhD" ${cert.type === 'PhD' ? 'selected' : ''}>PhD</option>
                                <option value="Diploma" ${cert.type === 'Diploma' ? 'selected' : ''}>Diploma</option>
                                <option value="Certificate" ${cert.type === 'Certificate' ? 'selected' : ''}>Certificate</option>
                                <option value="Other" ${cert.type === 'Other' ? 'selected' : ''}>Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Date Received</label>
                            <input type="date" id="edit-cert-date" class="form-input" value="${cert.date.split('T')[0]}" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('edit-certification-modal')">Cancel</button>
                    <button class="btn-primary" onclick="updateCertification(${cert.id})">Update</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.updateCertification = async function(id) {
    const formData = new FormData();
    formData.append('institution', document.getElementById('edit-cert-institution').value);
    formData.append('title', document.getElementById('edit-cert-title').value);
    formData.append('field', document.getElementById('edit-cert-field').value);
    formData.append('type', document.getElementById('edit-cert-type').value);
    formData.append('date', document.getElementById('edit-cert-date').value);
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/api/tutor/certifications/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (response.ok) {
            showToast('Certification updated successfully!', 'success');
            closeModal('edit-certification-modal');
            tutorState.certifications = await fetchCertifications();
            populateCertificationsSection(tutorState.certifications);
        } else {
            throw new Error('Failed to update certification');
        }
    } catch (error) {
        showToast('Error updating certification', 'error');
    }
};

window.editExperience = function(id) {
    const exp = tutorState.experiences.find(e => e.id == id);
    if (!exp) return;
    
    const modalHTML = `
        <div id="edit-experience-modal" class="modal show">
            <div class="modal-overlay" onclick="closeModal('edit-experience-modal')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Experience</h2>
                    <button class="modal-close" onclick="closeModal('edit-experience-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form>
                        <div class="form-group">
                            <label>Position</label>
                            <input type="text" id="edit-exp-position" class="form-input" value="${exp.position}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Institution</label>
                            <input type="text" id="edit-exp-institution" class="form-input" value="${exp.institution}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Start Date</label>
                            <input type="date" id="edit-exp-start-date" class="form-input" value="${exp.start_date}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>End Date</label>
                            <input type="date" id="edit-exp-end-date" class="form-input" value="${exp.end_date || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="edit-exp-description" class="form-input" rows="4">${exp.description || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('edit-experience-modal')">Cancel</button>
                    <button class="btn-primary" onclick="updateExperience(${exp.id})">Update</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.editAchievement = function(id) {
    const ach = tutorState.achievements.find(a => a.id == id);
    if (!ach) return;
    
    const modalHTML = `
        <div id="edit-achievement-modal" class="modal show">
            <div class="modal-overlay" onclick="closeModal('edit-achievement-modal')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Edit Achievement</h2>
                    <button class="modal-close" onclick="closeModal('edit-achievement-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form>
                        <div class="form-group">
                            <label>Title</label>
                            <input type="text" id="edit-ach-title" class="form-input" value="${ach.title}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Issuer</label>
                            <input type="text" id="edit-ach-issuer" class="form-input" value="${ach.issuer}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Date</label>
                            <input type="date" id="edit-ach-date" class="form-input" value="${ach.date.split('T')[0]}" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="edit-ach-description" class="form-input" rows="4">${ach.description || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('edit-achievement-modal')">Cancel</button>
                    <button class="btn-primary" onclick="updateAchievement(${ach.id})">Update</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// Make sure the existing functions are also exposed
window.addCertification = openAddCertificationModal;
window.addExperience = openAddExperienceModal;
window.addAchievement = openAddAchievementModal;
window.openScheduleModal = openCreateScheduleModal;

// Ensure setupModalHandlers is called during initialization
function setupModalHandlers() {
    // All functions are already exposed to window object above
    console.log('Modal handlers initialized');
}

// Add missing CSS for modals if not present
if (!document.querySelector('#modal-styles')) {
    const modalStyles = document.createElement('style');
    modalStyles.id = 'modal-styles';
    modalStyles.textContent = `
        .btn-social {
            display: inline-block;
            padding: 10px 20px;
            margin: 5px;
            border-radius: 5px;
            text-decoration: none;
            color: white;
        }
        .btn-social.facebook { background: #3b5998; }
        .btn-social.twitter { background: #1da1f2; }
        .btn-social.telegram { background: #0088cc; }
        
        .share-buttons {
            text-align: center;
            margin: 20px 0;
        }
        
        .form-textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            resize: vertical;
        }
        
        .form-section {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
    `;
    document.head.appendChild(modalStyles);
}
}

// =============================================
// ADD CERTIFICATION MODAL
// =============================================

function openAddCertificationModal() {
    const modalHTML = `
        <div id="add-certification-modal" class="modal show">
            <div class="modal-overlay" onclick="closeModal('add-certification-modal')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add Certification</h2>
                    <button class="modal-close" onclick="closeModal('add-certification-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="addCertificationForm">
                        <div class="form-group">
                            <label>Search School/Institution</label>
                            <input type="text" id="cert-school-search" class="form-input" 
                                   placeholder="Type to search..." oninput="searchSchools(this.value)">
                            <div id="school-suggestions" class="suggestions-dropdown"></div>
                            <button type="button" id="request-school-btn" class="btn-secondary hidden" 
                                    onclick="openRequestSchoolModal()">Request School Listing</button>
                        </div>
                        
                        <div class="form-group">
                            <label>Certification Title</label>
                            <input type="text" id="cert-title" class="form-input" 
                                   placeholder="e.g., Bachelor of Science" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Certified In</label>
                            <input type="text" id="cert-field" class="form-input" 
                                   placeholder="e.g., Physics" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Certification Type</label>
                            <select id="cert-type" class="form-input" required>
                                <option value="">Select Type</option>
                                <option value="BSc">BSc</option>
                                <option value="MSc">MSc</option>
                                <option value="PhD">PhD</option>
                                <option value="Diploma">Diploma</option>
                                <option value="Certificate">Certificate</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Date Received</label>
                            <input type="date" id="cert-date" class="form-input" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Upload Certificate</label>
                            <input type="file" id="cert-file" class="form-input" 
                                   accept=".pdf,.jpg,.jpeg,.png">
                            <small>Accepted formats: PDF, JPG, PNG (Max 5MB)</small>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('add-certification-modal')">Cancel</button>
                    <button class="btn-primary" onclick="submitCertification()">Submit</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function submitCertification() {
    const formData = new FormData();
    formData.append('institution', document.getElementById('cert-school-search').value);
    formData.append('title', document.getElementById('cert-title').value);
    formData.append('field', document.getElementById('cert-field').value);
    formData.append('type', document.getElementById('cert-type').value);
    formData.append('date', document.getElementById('cert-date').value);
    
    const fileInput = document.getElementById('cert-file');
    if (fileInput.files[0]) {
        formData.append('certificate_file', fileInput.files[0]);
    }
    
    // Show verification modal
    showVerificationModal('certification', formData);
}

// =============================================
// ADD EXPERIENCE MODAL
// =============================================

function openAddExperienceModal() {
    const modalHTML = `
        <div id="add-experience-modal" class="modal show">
            <div class="modal-overlay" onclick="closeModal('add-experience-modal')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add Experience</h2>
                    <button class="modal-close" onclick="closeModal('add-experience-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="addExperienceForm">
                        <div class="form-group">
                            <label>Position/Role</label>
                            <input type="text" id="exp-position" class="form-input" 
                                   placeholder="e.g., Senior Math Teacher" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Institution/Company</label>
                            <input type="text" id="exp-institution" class="form-input" 
                                   placeholder="e.g., Unity High School" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Start Date</label>
                            <input type="date" id="exp-start-date" class="form-input" required>
                        </div>
                        
                        <div class="form-group">
                            <label>End Date</label>
                            <input type="date" id="exp-end-date" class="form-input">
                            <small>Leave empty if currently working here</small>
                        </div>
                        
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="exp-description" class="form-input" rows="4" 
                                      placeholder="Describe your responsibilities and achievements"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Upload Supporting Document (Optional)</label>
                            <input type="file" id="exp-file" class="form-input" 
                                   accept=".pdf,.jpg,.jpeg,.png">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('add-experience-modal')">Cancel</button>
                    <button class="btn-primary" onclick="submitExperience()">Submit</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function submitExperience() {
    const formData = new FormData();
    formData.append('position', document.getElementById('exp-position').value);
    formData.append('institution', document.getElementById('exp-institution').value);
    formData.append('start_date', document.getElementById('exp-start-date').value);
    formData.append('end_date', document.getElementById('exp-end-date').value || '');
    formData.append('description', document.getElementById('exp-description').value);
    
    const fileInput = document.getElementById('exp-file');
    if (fileInput.files[0]) {
        formData.append('document_file', fileInput.files[0]);
    }
    
    // Show verification modal
    showVerificationModal('experience', formData);
}

// =============================================
// ADD ACHIEVEMENT MODAL
// =============================================

function openAddAchievementModal() {
    const modalHTML = `
        <div id="add-achievement-modal" class="modal show">
            <div class="modal-overlay" onclick="closeModal('add-achievement-modal')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add Achievement</h2>
                    <button class="modal-close" onclick="closeModal('add-achievement-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="addAchievementForm">
                        <div class="form-group">
                            <label>Achievement Title</label>
                            <input type="text" id="ach-title" class="form-input" 
                                   placeholder="e.g., Best Tutor Award 2023" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Issuing Organization</label>
                            <input type="text" id="ach-issuer" class="form-input" 
                                   placeholder="e.g., Astegni Platform" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Date Received</label>
                            <input type="date" id="ach-date" class="form-input" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="ach-description" class="form-input" rows="4" 
                                      placeholder="Describe the achievement and its significance"></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Upload Certificate/Proof (Optional)</label>
                            <input type="file" id="ach-file" class="form-input" 
                                   accept=".pdf,.jpg,.jpeg,.png">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('add-achievement-modal')">Cancel</button>
                    <button class="btn-primary" onclick="submitAchievement()">Submit</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function submitAchievement() {
    const formData = new FormData();
    formData.append('title', document.getElementById('ach-title').value);
    formData.append('issuer', document.getElementById('ach-issuer').value);
    formData.append('date', document.getElementById('ach-date').value);
    formData.append('description', document.getElementById('ach-description').value);
    
    const fileInput = document.getElementById('ach-file');
    if (fileInput.files[0]) {
        formData.append('certificate_file', fileInput.files[0]);
    }
    
    // Show verification modal
    showVerificationModal('achievement', formData);
}

// =============================================
// CREATE SCHEDULE MODAL
// =============================================

function openCreateScheduleModal() {
    const modalHTML = `
        <div id="create-schedule-modal" class="modal show">
            <div class="modal-overlay" onclick="closeModal('create-schedule-modal')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Create Schedule</h2>
                    <button class="modal-close" onclick="closeModal('create-schedule-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="createScheduleForm">
                        <div class="form-group">
                            <label>Student</label>
                            <select id="schedule-student" class="form-input" required>
                                <option value="">Select Student</option>
                                <option value="new">+ Add New Student</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Subject</label>
                            <select id="schedule-subject" class="form-input" required>
                                <option value="">Select Subject</option>
                                <option value="Mathematics">Mathematics</option>
                                <option value="Physics">Physics</option>
                                <option value="Chemistry">Chemistry</option>
                                <option value="Biology">Biology</option>
                                <option value="English">English</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Session Type</label>
                            <select id="schedule-type" class="form-input" required>
                                <option value="regular">Regular Session</option>
                                <option value="makeup">Makeup Session</option>
                                <option value="exam-prep">Exam Preparation</option>
                                <option value="review">Review Session</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Mode</label>
                            <select id="schedule-mode" class="form-input" required>
                                <option value="online">Online</option>
                                <option value="in-person">In-Person</option>
                                <option value="hybrid">Hybrid</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Date</label>
                            <input type="date" id="schedule-date" class="form-input" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Time</label>
                            <input type="time" id="schedule-time" class="form-input" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Duration (minutes)</label>
                            <select id="schedule-duration" class="form-input" required>
                                <option value="30">30 minutes</option>
                                <option value="45">45 minutes</option>
                                <option value="60">1 hour</option>
                                <option value="90">1.5 hours</option>
                                <option value="120">2 hours</option>
                                <option value="180">3 hours</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Notes (Optional)</label>
                            <textarea id="schedule-notes" class="form-input" rows="3" 
                                      placeholder="Topics to cover, materials needed, etc."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="schedule-recurring"> 
                                Make this a recurring session
                            </label>
                        </div>
                        
                        <div id="recurring-options" class="hidden">
                            <div class="form-group">
                                <label>Repeat</label>
                                <select id="schedule-repeat" class="form-input">
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="biweekly">Bi-weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>End Date</label>
                                <input type="date" id="schedule-end-date" class="form-input">
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('create-schedule-modal')">Cancel</button>
                    <button class="btn-primary" onclick="submitSchedule()">Create Schedule</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Load students
    loadStudentsForSchedule();
    
    // Toggle recurring options
    document.getElementById('schedule-recurring').addEventListener('change', function() {
        document.getElementById('recurring-options').classList.toggle('hidden', !this.checked);
    });
}

async function submitSchedule() {
    const scheduleData = {
        student_id: document.getElementById('schedule-student').value,
        subject: document.getElementById('schedule-subject').value,
        session_type: document.getElementById('schedule-type').value,
        mode: document.getElementById('schedule-mode').value,
        date: document.getElementById('schedule-date').value,
        time: document.getElementById('schedule-time').value,
        duration: document.getElementById('schedule-duration').value,
        notes: document.getElementById('schedule-notes').value,
        is_recurring: document.getElementById('schedule-recurring').checked,
        repeat_pattern: document.getElementById('schedule-repeat')?.value,
        end_date: document.getElementById('schedule-end-date')?.value
    };
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/tutor/schedule', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(scheduleData)
        });
        
        if (response.ok) {
            showToast('Schedule created successfully!', 'success');
            closeModal('create-schedule-modal');
            await fetchSchedule(); // Refresh schedule
            populateScheduleSection(tutorState.schedule);
            updateUpcomingEvents();
        } else {
            throw new Error('Failed to create schedule');
        }
    } catch (error) {
        showToast('Error creating schedule', 'error');
    }
}

// =============================================
// REQUEST SCHOOL MODAL
// =============================================

function openRequestSchoolModal() {
    const modalHTML = `
        <div id="request-school-modal" class="modal show">
            <div class="modal-overlay" onclick="closeModal('request-school-modal')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Request School Listing</h2>
                    <button class="modal-close" onclick="closeModal('request-school-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="requestSchoolForm">
                        <div class="form-group">
                            <label>School Name *</label>
                            <input type="text" id="school-name" class="form-input" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Phone Numbers *</label>
                            <div id="phone-numbers-container">
                                <input type="tel" class="form-input phone-input" placeholder="Phone number 1" required>
                            </div>
                            <button type="button" class="btn-secondary" onclick="addPhoneField()">+ Add Phone</button>
                        </div>
                        
                        <div class="form-group">
                            <label>Email (Optional)</label>
                            <input type="email" id="school-email" class="form-input">
                        </div>
                        
                        <div class="form-group">
                            <label>Location *</label>
                            <input type="text" id="school-location" class="form-input" required>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('request-school-modal')">Cancel</button>
                    <button class="btn-primary" onclick="submitSchoolRequest()">Submit Request</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function addPhoneField() {
    const container = document.getElementById('phone-numbers-container');
    const phoneInput = document.createElement('input');
    phoneInput.type = 'tel';
    phoneInput.className = 'form-input phone-input';
    phoneInput.placeholder = `Phone number ${container.children.length + 1}`;
    container.appendChild(phoneInput);
}

async function submitSchoolRequest() {
    const phoneNumbers = Array.from(document.querySelectorAll('.phone-input'))
        .map(input => input.value)
        .filter(value => value);
    
    const requestData = {
        name: document.getElementById('school-name').value,
        phone_numbers: phoneNumbers,
        email: document.getElementById('school-email').value,
        location: document.getElementById('school-location').value
    };
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/schools/request', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (response.ok) {
            showToast('School listing request submitted successfully!', 'success');
            closeModal('request-school-modal');
        } else {
            throw new Error('Failed to submit request');
        }
    } catch (error) {
        showToast('Error submitting school request', 'error');
    }
}

// =============================================
// UPLOAD VIDEO MODAL
// =============================================

function openVideoUploadModal(type) {
    const modalHTML = `
        <div id="upload-video-modal" class="modal show">
            <div class="modal-overlay" onclick="closeModal('upload-video-modal')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Upload Video</h2>
                    <button class="modal-close" onclick="closeModal('upload-video-modal')">×</button>
                </div>
                <div class="modal-body">
                    <form id="uploadVideoForm">
                        <div class="form-group">
                            <label>Video Title *</label>
                            <input type="text" id="video-title" class="form-input" required>
                        </div>
                        
                        <div class="form-group">
                            <label>Description *</label>
                            <textarea id="video-description" class="form-input" rows="4" required></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label>Video Type *</label>
                            <select id="video-type" class="form-input" required>
                                <option value="">Select Type</option>
                                <option value="intro" ${type === 'intro' ? 'selected' : ''}>Introduction Video</option>
                                <option value="normal">Normal Video</option>
                                <option value="short">Short</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>Upload Thumbnail *</label>
                            <input type="file" id="video-thumbnail" class="form-input" 
                                   accept="image/*" required>
                            <small>Recommended: 1280x720px</small>
                        </div>
                        
                        <div class="form-group">
                            <label>Upload Video *</label>
                            <input type="file" id="video-file" class="form-input" 
                                   accept="video/*" required>
                            <small>Max size: 500MB. Formats: MP4, WebM, OGG</small>
                        </div>
                        
                        <div class="upload-progress hidden" id="upload-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" id="progress-fill"></div>
                            </div>
                            <span id="progress-text">0%</span>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('upload-video-modal')">Cancel</button>
                    <button class="btn-secondary" onclick="saveVideoDraft()">Save to Draft</button>
                    <button class="btn-primary" onclick="publishVideo()">Publish</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function publishVideo() {
    const videoData = new FormData();
    videoData.append('title', document.getElementById('video-title').value);
    videoData.append('description', document.getElementById('video-description').value);
    videoData.append('type', document.getElementById('video-type').value);
    videoData.append('status', 'pending_review');
    
    const thumbnailFile = document.getElementById('video-thumbnail').files[0];
    const videoFile = document.getElementById('video-file').files[0];
    
    if (!thumbnailFile || !videoFile) {
        showToast('Please select both thumbnail and video files', 'error');
        return;
    }
    
    videoData.append('thumbnail', thumbnailFile);
    videoData.append('video', videoFile);
    
    // Show progress
    document.getElementById('upload-progress').classList.remove('hidden');
    
    try {
        const token = localStorage.getItem('access_token');
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                document.getElementById('progress-fill').style.width = percentComplete + '%';
                document.getElementById('progress-text').textContent = Math.round(percentComplete) + '%';
            }
        });
        
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                showVideoReviewModal();
                closeModal('upload-video-modal');
            } else {
                throw new Error('Upload failed');
            }
        });
        
        xhr.open('POST', 'http://localhost:8000/api/tutor/videos/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(videoData);
        
    } catch (error) {
        showToast('Error uploading video', 'error');
    }
}

async function saveVideoDraft() {
    const videoData = {
        title: document.getElementById('video-title').value,
        description: document.getElementById('video-description').value,
        type: document.getElementById('video-type').value,
        status: 'draft'
    };
    
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/tutor/videos/draft', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(videoData)
        });
        
        if (response.ok) {
            showToast('Video saved to drafts!', 'success');
            closeModal('upload-video-modal');
        } else {
            throw new Error('Failed to save draft');
        }
    } catch (error) {
        showToast('Error saving draft', 'error');
    }
}

function showVideoReviewModal() {
    const modalHTML = `
        <div id="video-review-modal" class="modal show">
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Video Submitted for Review</h2>
                </div>
                <div class="modal-body">
                    <div class="success-message">
                        <div class="success-icon">✔</div>
                        <h3>Your video is under review</h3>
                        <p>We're checking to ensure your video doesn't violate our community guidelines and policies.</p>
                        <p>Your video will be published within 2 business days if approved, or we'll notify you with feedback if any changes are needed.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary" onclick="closeModal('video-review-modal')">OK</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// =============================================
// VERIFICATION MODAL
// =============================================

function showVerificationModal(type, formData) {
    const dataPreview = generateDataPreview(type, formData);
    
    const modalHTML = `
        <div id="verification-modal" class="modal show">
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Verification Notice</h2>
                </div>
                <div class="modal-body">
                    <div class="verification-notice">
                        <h3>Your data is being verified</h3>
                        <p>We will review your submission within 2 business days to verify the information provided.</p>
                        
                        <div class="data-preview">
                            <h4>Submission Preview:</h4>
                            ${dataPreview}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeModal('verification-modal')">Cancel</button>
                    <button class="btn-primary" onclick="confirmSubmission('${type}')">Confirm & Submit</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Store formData temporarily
    tutorState.pendingSubmission = { type, data: formData };
}

function generateDataPreview(type, formData) {
    let preview = '<ul>';
    
    for (let [key, value] of formData.entries()) {
        if (value && key !== 'certificate_file' && key !== 'document_file') {
            const label = key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
            preview += `<li><strong>${label}:</strong> ${value}</li>`;
        }
    }
    
    preview += '</ul>';
    return preview;
}

async function confirmSubmission(type) {
    const { data } = tutorState.pendingSubmission;
    
    try {
        const token = localStorage.getItem('access_token');
        const endpoint = `http://localhost:8000/api/tutor/${type}s`;
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: data
        });
        
        if (response.ok) {
            showToast(`${type} submitted for verification!`, 'success');
            closeModal('verification-modal');
            closeModal(`add-${type}-modal`);
            
            // Refresh the relevant section
            if (type === 'certification') {
                tutorState.certifications = await fetchCertifications();
                populateCertificationsSection(tutorState.certifications);
            } else if (type === 'experience') {
                tutorState.experiences = await fetchExperiences();
                populateExperiencesSection(tutorState.experiences);
            } else if (type === 'achievement') {
                tutorState.achievements = await fetchAchievements();
                populateAchievementsSection(tutorState.achievements);
            }
        } else {
            throw new Error(`Failed to submit ${type}`);
        }
    } catch (error) {
        showToast(`Error submitting ${type}`, 'error');
    }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function getImageUrl(url) {
    if (!url) return '../pictures/default-cover.jpg';
    if (url.startsWith('http')) return url;
    return `http://localhost:8000${url}`;
}

function searchSchools(query) {
    if (query.length < 2) {
        document.getElementById('school-suggestions').innerHTML = '';
        document.getElementById('request-school-btn').classList.add('hidden');
        return;
    }
    
    // Simulate school search
    setTimeout(() => {
        const mockSchools = [
            'Addis Ababa University',
            'Unity High School',
            'St. Joseph School',
            'International Community School'
        ].filter(school => school.toLowerCase().includes(query.toLowerCase()));
        
        const suggestionsDiv = document.getElementById('school-suggestions');
        
        if (mockSchools.length > 0) {
            suggestionsDiv.innerHTML = mockSchools.map(school => 
                `<div class="suggestion-item" onclick="selectSchool('${school}')">${school}</div>`
            ).join('');
            document.getElementById('request-school-btn').classList.add('hidden');
        } else {
            suggestionsDiv.innerHTML = '<div class="no-results">No schools found</div>';
            document.getElementById('request-school-btn').classList.remove('hidden');
        }
    }, 300);
}

function selectSchool(school) {
    document.getElementById('cert-school-search').value = school;
    document.getElementById('school-suggestions').innerHTML = '';
    document.getElementById('request-school-btn').classList.add('hidden');
}

async function loadStudentsForSchedule() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/tutor/students', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const students = await response.json();
            const select = document.getElementById('schedule-student');
            
            students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = student.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoadingIndicators() {
    document.querySelectorAll('.card-grid, .session-list, .students-grid').forEach(element => {
        if (!element.querySelector('.loading-placeholder')) {
            const loader = document.createElement('div');
            loader.className = 'loading-placeholder';
            loader.textContent = 'Loading...';
            element.appendChild(loader);
        }
    });
}

function hideLoadingIndicators() {
    document.querySelectorAll('.loading-placeholder').forEach(element => {
        element.remove();
    });
}

function isDateToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(date) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// =============================================
// EVENT LISTENERS
// =============================================

function setupEventListeners() {
    // View functions
    window.viewCertificate = function(id) {
        const cert = tutorState.certifications.find(c => c.id === id);
        if (cert && cert.file_url) {
            window.open(cert.file_url, '_blank');
        }
    };
    
    window.viewExperience = function(id) {
        const exp = tutorState.experiences.find(e => e.id === id);
        // Show experience details modal
    };
    
    window.viewAchievement = function(id) {
        const ach = tutorState.achievements.find(a => a.id === id);
        // Show achievement details modal
    };
    
    // Edit functions
    window.editCertification = function(id) {
        // Open edit modal with prefilled data
    };
    
    window.editExperience = function(id) {
        // Open edit modal with prefilled data
    };
    
    window.editAchievement = function(id) {
        // Open edit modal with prefilled data
    };
    
    // Delete functions
    window.deleteCertification = async function(id) {
        if (confirm('Are you sure you want to delete this certification?')) {
            try {
                const token = localStorage.getItem('access_token');
                const response = await fetch(`http://localhost:8000/api/tutor/certifications/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    showToast('Certification deleted successfully', 'success');
                    tutorState.certifications = await fetchCertifications();
                    populateCertificationsSection(tutorState.certifications);
                }
            } catch (error) {
                showToast('Error deleting certification', 'error');
            }
        }
    };
    
    window.deleteExperience = async function(id) {
        if (confirm('Are you sure you want to delete this experience?')) {
            try {
                const token = localStorage.getItem('access_token');
                const response = await fetch(`http://localhost:8000/api/tutor/experiences/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    showToast('Experience deleted successfully', 'success');
                    tutorState.experiences = await fetchExperiences();
                    populateExperiencesSection(tutorState.experiences);
                }
            } catch (error) {
                showToast('Error deleting experience', 'error');
            }
        }
    };
    
    window.deleteAchievement = async function(id) {
        if (confirm('Are you sure you want to delete this achievement?')) {
            try {
                const token = localStorage.getItem('access_token');
                const response = await fetch(`http://localhost:8000/api/tutor/achievements/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    showToast('Achievement deleted successfully', 'success');
                    tutorState.achievements = await fetchAchievements();
                    populateAchievementsSection(tutorState.achievements);
                }
            } catch (error) {
                showToast('Error deleting achievement', 'error');
            }
        }
    };
}

// Add CSS for toast notifications
const style = document.createElement('style');
style.textContent = `
    .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
        z-index: 10000;
    }
    
    .toast.show {
        opacity: 1;
        transform: translateY(0);
    }
    
    .toast-success {
        background: #10b981;
    }
    
    .toast-error {
        background: #ef4444;
    }
    
    .toast-info {
        background: #3b82f6;
    }
    
    .toast-warning {
        background: #f59e0b;
    }
    
    .modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
    }
    
    .modal.show {
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
    }
    
    .modal-content {
        position: relative;
        background: white;
        border-radius: 12px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    
    .modal-header {
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .modal-body {
        padding: 20px;
    }
    
    .modal-footer {
        padding: 20px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }
    
    .form-group {
        margin-bottom: 20px;
    }
    
    .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
    }
    
    .form-input {
        width: 100%;
        padding: 10px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
    }
    
    .suggestions-dropdown {
        position: absolute;
        width: 100%;
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        max-height: 200px;
        overflow-y: auto;
        z-index: 100;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .suggestion-item {
        padding: 10px;
        cursor: pointer;
    }
    
    .suggestion-item:hover {
        background: #f3f4f6;
    }
    
    .no-results {
        padding: 10px;
        color: #6b7280;
        text-align: center;
    }
    
    .hidden {
        display: none !important;
    }
    
    .success-message {
        text-align: center;
        padding: 20px;
    }
    
    .success-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: #10b981;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
        margin: 0 auto 20px;
    }
    
    .data-preview {
        margin-top: 20px;
        padding: 15px;
        background: #f9fafb;
        border-radius: 8px;
        text-align: left;
    }
    
    .data-preview h4 {
        margin-bottom: 10px;
        color: #374151;
    }
    
    .data-preview ul {
        list-style: none;
        padding: 0;
    }
    
    .data-preview li {
        padding: 5px 0;
        color: #6b7280;
    }
    
    .upload-progress {
        margin-top: 20px;
    }
    
    .progress-bar {
        width: 100%;
        height: 20px;
        background: #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
    }
    
    .progress-fill {
        height: 100%;
        background: #3b82f6;
        transition: width 0.3s ease;
    }
    
    #progress-text {
        display: block;
        text-align: center;
        margin-top: 10px;
        color: #6b7280;
    }
    
    .loading-placeholder {
        text-align: center;
        padding: 20px;
        color: #6b7280;
        font-style: italic;
    }
    
    .no-data-message {
        text-align: center;
        padding: 40px;
        color: #6b7280;
    }
    
    .no-data-message p {
        margin: 10px 0;
    }
`;
document.head.appendChild(style);