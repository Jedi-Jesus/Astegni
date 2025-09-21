// ============================================
// TUTOR PROFILE - STREAMLINED VERSION
// Works with page-structure managers
// ============================================

// ============================================
// GLOBAL VARIABLES
// ============================================
let currentUser = null;
let tutorProfile = null;
let currentToken = null;
let requestedSessions = [];
let confirmedStudents = [];
let allVideos = [];
let schoolDatabase = [];
let currentModalContext = null;
const API_BASE_URL = 'http://localhost:8000';

// ============================================
// INITIALIZATION
// ============================================
// Initialize modals manager if not already initialized
if (!window.modalsManager) {
    // Create a simple fallback manager
    window.modalsManager = {
        open: function(modalId) {
            console.log(`Fallback opening modal: ${modalId}`);
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('show');
                modal.style.display = 'flex';
            }
        },
        close: function(modalId) {
            console.log(`Fallback closing modal: ${modalId}`);
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('show');
                modal.style.display = 'none';
            }
        }
    };
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing Tutor Profile...');
    
    // Check authentication first
    if (!checkAuthentication()) {
        setupAuthModalButtons();
        return;
    }
    
    // Initialize everything
    await initializeTutorProfile();
    setupTutorSpecificListeners();
    initializeSchoolDatabase();
    setupUploadHandlers();
});


// Add this standardized verification modal system
class VerificationModalManager {
    constructor() {
        this.modalTemplate = null;
    }
    
    show(type, data) {
        const modalId = `${type}-verification-modal`;
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = this.createModal(modalId, type, data);
            document.body.appendChild(modal);
        }
        
        this.updateModalContent(modal, data);
        window.modalsManager.open(modalId);
    }
    
    createModal(id, type, data) {
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="window.modalsManager.close('${id}')"></div>
            <div class="modal-content review-modal-content">
                <div class="modal-header">
                    <h2>${this.getTitle(type)}</h2>
                    <button class="modal-close" onclick="window.modalsManager.close('${id}')">×</button>
                </div>
                <div class="modal-body">
                    <div class="review-icon-container">
                        <div class="review-icon">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#667eea" stroke-width="2">
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    
                    <div class="review-message">
                        <h3>${data.title || 'Under Review'}</h3>
                        <p>${data.message || 'Your submission is being reviewed by our team.'}</p>
                        
                        <div class="review-timeline">
                            <div class="timeline-item active">
                                <span class="timeline-dot"></span>
                                <div class="timeline-content">
                                    <strong>Submitted</strong>
                                    <span>Just now</span>
                                </div>
                            </div>
                            <div class="timeline-item">
                                <span class="timeline-dot"></span>
                                <div class="timeline-content">
                                    <strong>Under Review</strong>
                                    <span>In progress</span>
                                </div>
                            </div>
                            <div class="timeline-item">
                                <span class="timeline-dot"></span>
                                <div class="timeline-content">
                                    <strong>Decision</strong>
                                    <span>Within 24-48 hours</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="review-info">
                            ${this.getReviewInfo(type)}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="window.modalsManager.close('${id}')">Got it</button>
                </div>
            </div>
        `;
        return modal;
    }
    
    getTitle(type) {
        const titles = {
            'profile': 'Profile Update Under Review',
            'video': 'Video Under Review',
            'certification': 'Certification Under Verification',
            'achievement': 'Achievement Under Verification',
            'experience': 'Experience Under Verification'
        };
        return titles[type] || 'Under Review';
    }
    
    getReviewInfo(type) {
        const info = {
            'profile': `
                <p><strong>What happens next?</strong></p>
                <ul>
                    <li>✅ We'll verify your profile information</li>
                    <li>📧 You'll receive an email once approved</li>
                    <li>🔒 Your current profile remains active</li>
                </ul>
            `,
            'video': `
                <p><strong>What happens next?</strong></p>
                <ul>
                    <li>✅ Content review for community guidelines</li>
                    <li>📧 Email notification upon approval</li>
                    <li>🎥 Video will be published automatically if approved</li>
                </ul>
            `,
            'certification': `
                <p><strong>What happens next?</strong></p>
                <ul>
                    <li>✅ Document verification with issuing institution</li>
                    <li>📧 Notification once verified</li>
                    <li>✓ Verified badge will be added to your profile</li>
                </ul>
            `
        };
        return info[type] || info.profile;
    }
    
    updateModalContent(modal, data) {
        // Update specific content based on data
        if (data.title) {
            const titleEl = modal.querySelector('.review-message h3');
            if (titleEl) titleEl.textContent = data.title;
        }
        if (data.message) {
            const messageEl = modal.querySelector('.review-message p');
            if (messageEl) messageEl.textContent = data.message;
        }
    }
}


// Initialize verification manager
window.verificationManager = new VerificationModalManager();


// Add this right after the DOMContentLoaded in tutor-profile.js
const modalStyles = document.createElement('style');
modalStyles.innerHTML = `
    .modal {
        position: fixed !important;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
    }
    
    .modal.hidden {
        display: none !important;
    }
    
    .modal.show {
        display: flex !important;
    }
    
    .modal-content {
        background: white;
        border-radius: 12px;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    }
    
    @keyframes modalSlideIn {
        from {
            transform: translateY(-50px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(modalStyles);


// ============================================
// AUTHENTICATION & INITIALIZATION
// ============================================
function checkAuthentication() {
    const auth = window.AuthManager;
    
    if (!auth || !auth.isAuthenticated()) {
        const authModal = document.getElementById('authRequiredModal');
        if (authModal) {
            authModal.style.display = 'flex';
        }
        return false;
    }
    
    const userRole = auth.getUserRole();
    if (userRole !== 'tutor' && !auth.hasRole('tutor')) {
        alert('This page is for tutors only');
        window.location.href = '../index.html';
        return false;
    }
    
    return true;
}

function setupAuthModalButtons() {
    const loginBtn = document.querySelector('.auth-modal-btn.primary');
    if (loginBtn) {
        loginBtn.onclick = function() {
            window.location.href = '../index.html#login';
        };
    }
    
    const backBtn = document.querySelector('.auth-modal-btn.secondary');
    if (backBtn) {
        backBtn.onclick = function() {
            window.history.back();
        };
    }
}

async function initializeTutorProfile() {
    const auth = window.AuthManager;
    currentUser = auth.getUser();
    currentToken = auth.getToken() || localStorage.getItem('access_token');
    
    // Load all data
    await Promise.allSettled([
        loadUserProfile(),
        loadTutorData(),
        loadTutorVideos(),
        loadSessionRequests(),
        loadTutorSchedules(),
        loadConfirmedStudents()
    ]);
    
    // Update UI
    updateUserInterface();
    updateStatistics();
    initializeDefaultSocialLinks();
}

// ============================================
// DATA LOADING
// ============================================
async function loadUserProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/me`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.ok) {
            const userData = await response.json();
            currentUser = {
                ...currentUser,
                ...userData
            };
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

async function loadTutorData() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tutors?search=${currentUser?.email}`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const currentTutorData = data.tutors?.find(t => t.email === currentUser?.email);
            
            if (currentTutorData) {
                tutorProfile = currentTutorData;
                displayTutorProfile();
            } else {
                createEmptyProfile();
            }
        } else {
            createEmptyProfile();
        }
    } catch (error) {
        console.error('Error loading tutor data:', error);
        createEmptyProfile();
    }
}

function createEmptyProfile() {
    tutorProfile = {
        id: currentUser?.id || null,
        user_id: currentUser?.id || null,
        bio: '',
        quote: '',
        gender: '',
        courses: [],
        grades: [],
        location: '',
        teaches_at: '',
        teaching_methods: [],
        experience: 0,
        price: 0,
        currency: 'ETB',
        rating: 0,
        rating_count: 0,
        total_students: 0,
        total_sessions: 0,
        is_verified: false,
        certifications: [],
        experiences: [],
        achievements: []
    };
    displayTutorProfile();
}

async function loadSessionRequests() {
    try {
        // Mock data for now since endpoint doesn't exist
        requestedSessions = [];
        displayRequestedSessions();
    } catch (error) {
        console.error('Error loading session requests:', error);
    }
}

async function loadTutorSchedules() {
    try {
        // Mock data for now
        const schedules = [];
        displaySchedules(schedules);
    } catch (error) {
        console.error('Error loading schedules:', error);
    }
}

async function loadConfirmedStudents() {
    confirmedStudents = [];
    displayConfirmedStudents();
}

async function loadTutorVideos() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/videos/reels?page=1&limit=20`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            allVideos = data.videos || [];
            
            if (tutorProfile && tutorProfile.id) {
                allVideos = allVideos.filter(v => v.tutor_id === tutorProfile.id);
            }
            
            displayVideos();
            updateElement('videos-count', allVideos.length.toString());
        }
    } catch (error) {
        console.error('Error loading videos:', error);
    }
}

// ============================================
// MODAL FUNCTIONS - Using page structure managers
// ============================================

// Edit Profile Modal
function openEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (!modal) {
        console.error('Edit profile modal not found');
        return;
    }
    
    if (tutorProfile) {
        setInputValue('tutorName', `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`);
        setInputValue('centerQuote', tutorProfile.quote);
        setInputValue('aboutUs', tutorProfile.bio);
        setInputValue('TeachesAt', tutorProfile.teaches_at);
        
        const container = document.getElementById('teachingMethodContainer');
        if (container) {
            container.innerHTML = '';
            const methods = ['online', 'in-person', 'self-paced'];
            methods.forEach(method => {
                const div = document.createElement('div');
                div.className = 'checkbox-group';
                div.innerHTML = `
                    <input type="checkbox" id="method-${method}" value="${method}" 
                           ${tutorProfile.teaching_methods?.includes(method) ? 'checked' : ''}>
                    <label for="method-${method}">${method.charAt(0).toUpperCase() + method.slice(1)}</label>
                `;
                container.appendChild(div);
            });
        }
    }
    
    // Use page structure modal manager if available
    if (window.modalsManager) {
        window.modalsManager.open('edit-profile-modal');
    } else {
        modal.style.display = 'flex';
        modal.classList.add('show');
    }
}

function closeEditProfileModal() {
    if (window.modalsManager) {
        window.modalsManager.close('edit-profile-modal');
    } else {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    }
}

// Certification Modal Functions
function openCertificationModal() {
    if (window.modalsManager) {
        window.modalsManager.open('certification-modal');
    } else {
        const modal = document.getElementById('certification-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
            modal.classList.add('show');
        }
    }
    setupSchoolSearch('cert');
}

function closeCertificationModal() {
    if (window.modalsManager) {
        window.modalsManager.close('certification-modal');
    } else {
        const modal = document.getElementById('certification-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
            modal.classList.remove('show');
        }
    }
}

// Experience Modal Functions
function openExperienceModal() {
    if (window.modalsManager) {
        window.modalsManager.open('experience-modal');
    } else {
        const modal = document.getElementById('experience-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
            modal.classList.add('show');
        }
    }
    setupSchoolSearch('exp');
}

function closeExperienceModal() {
    if (window.modalsManager) {
        window.modalsManager.close('experience-modal');
    } else {
        const modal = document.getElementById('experience-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
            modal.classList.remove('show');
        }
    }
}

// Achievement Modal Functions
function openAchievementModal() {
    if (window.modalsManager) {
        window.modalsManager.open('achievement-modal');
    } else {
        const modal = document.getElementById('achievement-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
            modal.classList.add('show');
        }
    }
    setupSchoolSearch('ach');
}

function closeAchievementModal() {
    if (window.modalsManager) {
        window.modalsManager.close('achievement-modal');
    } else {
        const modal = document.getElementById('achievement-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
            modal.classList.remove('show');
        }
    }
}

// Schedule Modal Functions
// ============================================
// SCHEDULE MODAL FUNCTIONS - FIXED
// ============================================

function openScheduleModal() {
    if (window.modalsManager) {
        window.modalsManager.open('create-schedule-modal');  // Use correct ID
    } else {
        const modal = document.getElementById('create-schedule-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
            modal.classList.add('show');
        }
    }
}

function closeScheduleModal() {
    if (window.modalsManager) {
        window.modalsManager.close('create-schedule-modal');  // Use correct ID
    } else {
        const modal = document.getElementById('create-schedule-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
            modal.classList.remove('show');
        }
    }
}

// School Request Modal Functions
function openSchoolRequestModal(context) {
    currentModalContext = context;
    if (window.modalsManager) {
        window.modalsManager.open('school-request-modal');
    } else {
        const modal = document.getElementById('school-request-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
            modal.classList.add('show');
        }
    }
}

function closeSchoolRequestModal() {
    if (window.modalsManager) {
        window.modalsManager.close('school-request-modal');
    } else {
        const modal = document.getElementById('school-request-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
            modal.classList.remove('show');
        }
    }
}

// Student Details Modal Functions
function openStudentDetailsModal(studentId) {
    const modal = document.getElementById('studentDetailsModal');
    if (!modal) {
        console.error('Student details modal not found');
        return;
    }
    
    const student = confirmedStudents.find(s => s.id == studentId);
    if (student) {
        updateElement('studentName', student.name);
    }
    
    if (window.modalsManager) {
        window.modalsManager.open('studentDetailsModal');
    } else {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
    
    switchStudentSection('progress-tracking');
}

function closeStudentDetailsModal() {
    if (window.modalsManager) {
        window.modalsManager.close('studentDetailsModal');
    } else {
        const modal = document.getElementById('studentDetailsModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    }
}

function switchStudentSection(section) {
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    const selectedSection = document.getElementById(section);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }
    
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`.sidebar-menu-item[onclick*="${section}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

// Upload Modal Functions
function openCoverUploadModal() {
    if (window.modalsManager) {
        window.modalsManager.open('coverUploadModal');
    } else {
        const modal = document.getElementById('coverUploadModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    }
}

function openProfileUploadModal() {
    if (window.modalsManager) {
        window.modalsManager.open('profileUploadModal');
    } else {
        const modal = document.getElementById('profileUploadModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    }
}

function closeModal(modalId) {
    if (window.modalsManager) {
        window.modalsManager.close(modalId);
    } else {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show', 'active');
            modal.classList.add('hidden');
        }
    }
}

// ============================================
// SAVE FUNCTIONS
// ============================================

// Community Modal Functions
function openCommunityModal() {
    const modal = document.getElementById('communityModal');
    if (modal) {
        modal.classList.remove('hidden');
        loadConnections();
    }
}

function closeCommunityModal() {
    const modal = document.getElementById('communityModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function switchCommunitySection(section) {
    // Update menu items
    document.querySelectorAll('.community-menu .menu-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.menu-item').classList.add('active');
    
    // Update sections
    document.querySelectorAll('.community-section').forEach(sec => {
        sec.classList.add('hidden');
    });
    document.getElementById(`${section}-section`).classList.remove('hidden');
}

function filterConnections(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (filter === 'live') {
        // Filter to show only live connections
        loadConnections(true);
    } else {
        loadConnections(false);
    }
}

function loadConnections(liveOnly = false) {
    const grid = document.getElementById('connectionsGrid');
    const connections = getConnectionsData();
    
    const filtered = liveOnly 
        ? connections.filter(c => c.isLive) 
        : connections;
    
    grid.innerHTML = filtered.map(connection => `
        <div class="connection-card">
            <img src="${connection.avatar}" alt="${connection.name}" class="connection-avatar">
            <h4>${connection.name}</h4>
            <p>${connection.role}</p>
            ${connection.isLive ? '<span class="live-badge">🟢 Live</span>' : ''}
            <button class="btn-connect" onclick="connectWith('${connection.id}')">
                ${connection.connected ? 'Message' : 'Connect'}
            </button>
        </div>
    `).join('');
}

function getConnectionsData() {
    // This would fetch from your backend
    return [
        { id: 1, name: 'John Doe', role: 'Student', avatar: '../Pictures/student1.jpg', isLive: true, connected: true },
        { id: 2, name: 'Jane Smith', role: 'Parent', avatar: '../Pictures/parent1.jpg', isLive: false, connected: false }
    ];
}

// ============================================
// CONSOLIDATED FIXES
// ============================================

// 1. Form helper functions
function getLocations() {
    const inputs = document.querySelectorAll('#locationsContainer input');
    return Array.from(inputs).map(i => i.value.trim()).filter(v => v);
}

function getTeachesAt() {
    const inputs = document.querySelectorAll('#teachesAtContainer input');
    return Array.from(inputs).map(i => i.value.trim()).filter(v => v);
}

function getCourses() {
    const inputs = document.querySelectorAll('#coursesContainer input');
    return Array.from(inputs).map(i => i.value.trim()).filter(v => v);
}

function getSocialLinks() {
    const items = document.querySelectorAll('#socialLinksContainer .input-group');
    return Array.from(items).map(item => ({
        platform: item.querySelector('select')?.value,
        url: item.querySelector('input[type="text"]')?.value
    })).filter(link => link.platform && link.url);
}

// Enhanced Profile Functions
function saveProfile() {
    const profileData = {
        tutorName: document.getElementById('tutorName').value,
        username: document.getElementById('username').value,
        gender: document.getElementById('gender').value,
        locations: getLocations(),
        teachesAt: getTeachesAt(),
        courses: getCourses(),
        teachingMethod: document.querySelector('input[name="teachingMethod"]:checked')?.value,
        quote: document.getElementById('profileQuote').value,
        aboutUs: document.getElementById('aboutUs').value,
        socialLinks: getSocialLinks()
    };
    
    // Check if teaches at changed
    const oldTeachesAt = localStorage.getItem('teachesAt');
    if (oldTeachesAt && oldTeachesAt !== JSON.stringify(profileData.teachesAt)) {
        // Show verification modal
        showVerificationModal();
    }
    
    // Save profile data
    localStorage.setItem('tutorProfile', JSON.stringify(profileData));
    localStorage.setItem('teachesAt', JSON.stringify(profileData.teachesAt));
    
    // Update UI
    updateProfileDisplay(profileData);
    closeEditProfileModal();
    showNotification('Profile updated successfully!', 'success');

    // Show verification modal instead of custom modal
    window.verificationManager.show('profile', {
        title: 'Profile changes submitted',
        message: 'Your profile updates are being reviewed. This usually takes 24-48 hours.'
    });
}

function showVerificationModal() {
    document.getElementById('verificationModal').classList.remove('hidden');
}

function closeVerificationModal() {
    document.getElementById('verificationModal').classList.add('hidden');
}

function addLocation() {
    const container = document.getElementById('locationsContainer');
    const locationDiv = document.createElement('div');
    locationDiv.className = 'input-group';
    locationDiv.innerHTML = `
        <input type="text" class="form-input" placeholder="Enter location">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(locationDiv);
}

function addTeachesAt() {
    const container = document.getElementById('teachesAtContainer');
    const schoolDiv = document.createElement('div');
    schoolDiv.className = 'input-group';
    schoolDiv.innerHTML = `
        <input type="text" class="form-input" placeholder="Enter school name">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(schoolDiv);
}

function addCourse() {
    const container = document.getElementById('coursesContainer');
    const courseDiv = document.createElement('div');
    courseDiv.className = 'input-group';
    courseDiv.innerHTML = `
        <input type="text" class="form-input" placeholder="Enter course name">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(courseDiv);
}

function addSocialLink() {
    const container = document.getElementById('socialLinksContainer');
    const linkDiv = document.createElement('div');
    linkDiv.className = 'input-group';
    linkDiv.innerHTML = `
        <select class="form-select">
            <option>Facebook</option>
            <option>Twitter</option>
            <option>LinkedIn</option>
            <option>Instagram</option>
            <option>YouTube</option>
        </select>
        <input type="text" class="form-input" placeholder="Enter URL">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(linkDiv);
}

// Schedule Functions
function saveSchedule() {
    const scheduleData = {
        title: document.getElementById('scheduleTitle').value,
        description: document.getElementById('scheduleDescription').value,
        date: document.getElementById('scheduleDate').value,
        time: document.getElementById('scheduleTime').value,
        type: document.getElementById('scheduleType').value,
        duration: document.getElementById('scheduleDuration').value,
        notes: document.getElementById('scheduleNotes').value,
        createdAt: new Date().toISOString()
    };
    
    // Save to localStorage or backend
    const schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
    schedules.push(scheduleData);
    localStorage.setItem('schedules', JSON.stringify(schedules));
    
    // Update profile next session
    updateProfileNextSession();
    
    // Update bottom widget
    updateEventsWidget();
    
    closeScheduleModal();
    showNotification('Schedule created successfully!', 'success');
}

function updateProfileNextSession() {
    const schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
    const upcoming = schedules
        .filter(s => new Date(`${s.date} ${s.time}`) > new Date())
        .sort((a, b) => new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`));
    
    const nextSessionElement = document.getElementById('nextSessionText');
    if (nextSessionElement && upcoming.length > 0) {
        const next = upcoming[0];
        const sessionDate = new Date(`${next.date} ${next.time}`);
        const timeUntil = getTimeUntil(sessionDate);
        
        nextSessionElement.innerHTML = `
            <strong class="gradient-text">Next Session:</strong> 
            ${next.title} - ${formatDate(sessionDate)} (${timeUntil})
        `;
    }
}

function updateEventsWidget() {
    const schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
    const eventsList = document.getElementById('upcoming-events-list');
    
    if (eventsList) {
        const upcoming = schedules
            .filter(s => new Date(`${s.date} ${s.time}`) > new Date())
            .slice(0, 3);
        
        eventsList.innerHTML = upcoming.map(schedule => `
            <div class="event-item">
                <div class="event-date">
                    <span class="date-day">${new Date(schedule.date).getDate()}</span>
                    <span class="date-month">${new Date(schedule.date).toLocaleDateString('en', { month: 'short' })}</span>
                </div>
                <div class="event-details">
                    <h4>${schedule.title}</h4>
                    <p>${schedule.type} - ${schedule.duration} min</p>
                </div>
            </div>
        `).join('');
    }
}

// Blog Functions
function openCreateBlogModal() {
    document.getElementById('createBlogModal').classList.remove('hidden');
}

function closeBlogModal() {
    document.getElementById('createBlogModal').classList.add('hidden');
}

function saveBlogDraft() {
    const blogData = getBlogFormData();
    blogData.status = 'draft';
    saveBlog(blogData);
    closeBlogModal();
    showNotification('Blog saved as draft!', 'success');
}

async function publishBlog() {
    const blogData = {
        title: getInputValue('blogTitle'),
        description: getInputValue('blogDescription'),
        content: getInputValue('blogContent'),
        category: getInputValue('blogCategory')
    };
    
    if (!blogData.title || !blogData.content) {
        showNotification('Please fill in required fields', 'error');
        return;
    }
    
    try {
        // First create the blog post
        const createResponse = await fetch(`${API_BASE_URL}/api/blog/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(blogData)
        });
        
        if (createResponse.ok) {
            const { id } = await createResponse.json();
            
            // Then publish it for review
            const publishResponse = await fetch(`${API_BASE_URL}/api/blog/posts/${id}/publish`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });
            
            if (publishResponse.ok) {
                // Show verification modal
                window.verificationManager.show('blog', {
                    title: 'Blog post submitted',
                    message: 'Your blog post has been submitted for review and will be published once approved.'
                });
                
                closeBlogModal();
                loadBlogPosts();
            }
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error publishing blog post', 'error');
    }
}

function getBlogFormData() {
    return {
        title: document.getElementById('blogTitle').value,
        description: document.getElementById('blogDescription').value,
        category: document.getElementById('blogCategory').value,
        content: document.getElementById('blogContent').value,
        author: getCurrentUser(),
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: 0,
        views: 0,
        readTime: calculateReadTime(document.getElementById('blogContent').value)
    };
}

function saveBlog(blogData) {
    const blogs = JSON.parse(localStorage.getItem('blogs') || '[]');
    blogs.push(blogData);
    localStorage.setItem('blogs', JSON.stringify(blogs));
    loadBlogs();
}

function loadBlogs(filter = 'all') {
    const blogs = JSON.parse(localStorage.getItem('blogs') || '[]');
    const filtered = filter === 'all' ? blogs : blogs.filter(b => b.status === filter || b.category === filter);
    
    const blogGrid = document.getElementById('blog-grid');
    if (blogGrid) {
        blogGrid.innerHTML = filtered.map(blog => `
            <div class="blog-card">
                <img src="${blog.thumbnail || '../Pictures/default-blog.jpg'}" alt="${blog.title}" class="blog-thumbnail">
                <div class="blog-content">
                    <h3>${blog.title}</h3>
                    <p>${blog.description}</p>
                    <div class="blog-meta">
                        <div class="author-info">
                            <img src="${blog.author.avatar}" alt="${blog.author.name}">
                            <span>${blog.author.name}</span>
                        </div>
                        <span>${formatDate(blog.publishedAt)}</span>
                        <span>${blog.readTime} min read</span>
                    </div>
                    <div class="blog-stats">
                        <span>💬 ${blog.comments}</span>
                        <span>❤️ ${blog.likes}</span>
                        <span>👁️ ${blog.views}</span>
                    </div>
                    <div class="blog-actions">
                        <button class="btn-view" onclick="viewBlog('${blog.id}')">View</button>
                        <button class="btn-delete" onclick="deleteBlog('${blog.id}')">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// ============================================
// FIX BLOG SECTION - Add Create Button
// ============================================

// Override the blog content display
function loadBlogContent() {
    const blogContent = document.querySelector('#blog-content .sidebar-content-panel');
    if (!blogContent) return;
    
    // Add header with Create button
    const headerHTML = `
        <div class="section-header">
            <h2 class="section-title">My Blog Posts</h2>
            <button class="btn-primary" onclick="openCreateBlogModal()">
                <span>✍️</span> Create Blog Post
            </button>
        </div>
        <div class="blog-filters">
            <button class="filter-chip active" onclick="filterBlogPosts('all')">All Posts</button>
            <button class="filter-chip" onclick="filterBlogPosts('published')">Published</button>
            <button class="filter-chip" onclick="filterBlogPosts('draft')">Drafts</button>
            <button class="filter-chip" onclick="filterBlogPosts('under_review')">Under Review</button>
        </div>
        <div class="blog-grid" id="blog-grid">
            <!-- Blog posts will be loaded here -->
        </div>
    `;
    
    blogContent.innerHTML = headerHTML;
    loadBlogPosts();
}

// Utility Functions
function getTimeUntil(date) {
    const now = new Date();
    const diff = date - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours < 24) {
        return `${hours}h ${minutes}m`;
    } else {
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''}`;
    }
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function calculateReadTime(text) {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
}

function getCurrentUser() {
    // This would get from your auth system
    return {
        id: 'user123',
        name: 'John Doe',
        avatar: '../Pictures/tutor-man.jpg'
    };
}

function showNotification(message, type = 'info') {
    // Use your existing notification system
    if (window.Utils && window.Utils.showToast) {
        window.Utils.showToast(message, type);
    } else {
        alert(message);
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    updateProfileNextSession();
    updateEventsWidget();
    loadBlogs();

    // Fix blog content display
    const blogBtn = document.querySelector('.sidebar-btn[data-content="blog"]');
    if (blogBtn) {
        blogBtn.addEventListener('click', loadBlogContent);
    }
    
    // Initialize blog section if it's the active content
    if (document.querySelector('#blog-content.active')) {
        loadBlogContent();
    }
}
);

// ============================================
// FIX BLOG SECTION - Add Create Button
// ============================================

// Override the blog content display
function loadBlogContent() {
    const blogContent = document.querySelector('#blog-content .sidebar-content-panel');
    if (!blogContent) return;
    
    // Add header with Create button
    const headerHTML = `
        <div class="section-header">
            <h2 class="section-title">My Blog Posts</h2>
            <button class="btn-primary" onclick="openCreateBlogModal()">
                <span>✍️</span> Create Blog Post
            </button>
        </div>
        <div class="blog-filters">
            <button class="filter-chip active" onclick="filterBlogPosts('all')">All Posts</button>
            <button class="filter-chip" onclick="filterBlogPosts('published')">Published</button>
            <button class="filter-chip" onclick="filterBlogPosts('draft')">Drafts</button>
            <button class="filter-chip" onclick="filterBlogPosts('under_review')">Under Review</button>
        </div>
        <div class="blog-grid" id="blog-grid">
            <!-- Blog posts will be loaded here -->
        </div>
    `;
    
    blogContent.innerHTML = headerHTML;
    loadBlogPosts();
}

async function submitSchoolRequest() {
    const requestData = {
        name: getInputValue('request-school-name'),
        location: getInputValue('request-school-location'),
        phone: getInputValue('request-school-phone')
    };
    
    if (!requestData.name || !requestData.location || !requestData.phone) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    schoolDatabase.push({
        id: Date.now(),
        ...requestData
    });
    
    closeSchoolRequestModal();
    showNotification('School request submitted successfully!', 'success');
    
    if (currentModalContext) {
        const searchInput = document.getElementById(`${currentModalContext}-school-search`) ||
                           document.getElementById(`${currentModalContext}-organization-search`) ||
                           document.getElementById(`${currentModalContext}-institution-search`);
        if (searchInput) {
            searchInput.value = requestData.name;
        }
    }
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================
function displayTutorProfile() {
    if (!tutorProfile) return;
    
    const tutorName = currentUser ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}` : 'Tutor Name';
    updateElement('centerName', tutorName || 'Your name will be displayed here');
    updateElement('tutor-bio', tutorProfile.bio || 'Your bio will be displayed here');
    updateElement('quote', tutorProfile.quote || '"Your quote will be displayed here"');
    updateElement('tutor-address', tutorProfile.location ? `Address: ${tutorProfile.location}` : 'Your address will be displayed here');
    updateElement('tutor-school', tutorProfile.teaches_at ? `Teaches at: ${tutorProfile.teaches_at}` : 'Your school will be displayed here');
    updateElement('tutor-rating', tutorProfile.rating ? `${tutorProfile.rating}/5.0` : 'Not rated yet');
    updateElement('tutor-gender', tutorProfile.gender || 'Gender will be displayed here');
    
    const verificationElement = document.getElementById('verification-status');
    if (verificationElement) {
        verificationElement.textContent = tutorProfile.is_verified ? '✓ Verified' : '✗ Unverified';
        verificationElement.className = tutorProfile.is_verified ? 'verified-badge verified' : 'verified-badge';
    }
    
    displayTags('subject-tags', tutorProfile.courses || [], 'subject-tag');
    displayTags('teaching-methods-tags', tutorProfile.teaching_methods || [], 'teaching-method-tag');
    
    displayCertifications();
    displayExperiences();
    displayAchievements();
    
    if (currentUser?.profile_picture) {
        updateImage('profile-avatar', currentUser.profile_picture);
    }
}

function displayCertifications() {
    const grid = document.getElementById('certifications-grid');
    
    if (!tutorProfile?.certifications || tutorProfile.certifications.length === 0) {
        if (grid) grid.innerHTML = '<p class="empty-state">Your certifications will be displayed here</p>';
        return;
    }
    
    const certHtml = tutorProfile.certifications.map(cert => `
        <div class="info-card">
            ${cert.is_verified ? '<span class="verified-badge-small">✓ Verified</span>' : '<span class="unverified-badge">✗ Not Verified</span>'}
            <h4>${cert.title || cert.certified_in}</h4>
            <p><strong>Institution:</strong> ${cert.institution}</p>
            <p><strong>Type:</strong> ${cert.type || 'Certificate'}</p>
            <p><strong>Year:</strong> ${cert.year || cert.date || 'Not specified'}</p>
            <div class="card-actions">
                <button onclick="viewCertificate('${cert.id}')" class="btn-sm btn-view">View</button>
                <button onclick="editCertification('${cert.id}')" class="btn-sm btn-primary">Edit</button>
                <button onclick="deleteCertification('${cert.id}')" class="btn-sm btn-danger">Delete</button>
            </div>
        </div>
    `).join('');
    
    if (grid) grid.innerHTML = certHtml;
}

function viewCertificate(id) {
    const cert = tutorProfile.certifications.find(c => c.id == id);
    if (cert && cert.fileUrl) {
        window.open(cert.fileUrl, '_blank');
    } else {
        showNotification('No certificate file available', 'info');
    }
}

function displayExperiences() {
    const grid = document.getElementById('experience-grid');
    
    if (!tutorProfile?.experiences || tutorProfile.experiences.length === 0) {
        if (grid) grid.innerHTML = '<p class="empty-state">Your experience will be displayed here</p>';
        return;
    }
    
    const expHtml = tutorProfile.experiences.map(exp => `
        <div class="info-card">
            ${exp.is_verified ? '<span class="verified-badge-small">✓ Verified</span>' : ''}
            <h4>${exp.title}</h4>
            <p><strong>Organization:</strong> ${exp.organization}</p>
            <p><strong>Duration:</strong> ${exp.start_date} - ${exp.end_date || 'Present'}</p>
            ${exp.description ? `<p>${exp.description}</p>` : ''}
            <div class="card-actions">
                <button onclick="editExperience('${exp.id}')" class="btn-sm btn-primary">Edit</button>
                <button onclick="deleteExperience('${exp.id}')" class="btn-sm btn-danger">Delete</button>
            </div>
        </div>
    `).join('');
    
    if (grid) grid.innerHTML = expHtml;
}

function displayAchievements() {
    const grid = document.getElementById('achievements-grid');
    
    if (!tutorProfile?.achievements || tutorProfile.achievements.length === 0) {
        if (grid) grid.innerHTML = '<p class="empty-state">Your achievements will be displayed here</p>';
        return;
    }
    
    const achHtml = tutorProfile.achievements.map(ach => `
        <div class="info-card">
            ${ach.is_verified ? '<span class="verified-badge-small">✓ Verified</span>' : ''}
            <h4>${ach.title}</h4>
            <p><strong>Institution:</strong> ${ach.institution}</p>
            <p><strong>Date:</strong> ${ach.date || 'Not specified'}</p>
            ${ach.description ? `<p>${ach.description}</p>` : ''}
            <div class="card-actions">
                <button onclick="editAchievement('${ach.id}')" class="btn-sm btn-primary">Edit</button>
                <button onclick="deleteAchievement('${ach.id}')" class="btn-sm btn-danger">Delete</button>
            </div>
        </div>
    `).join('');
    
    if (grid) grid.innerHTML = achHtml;
}

function requestSession() {
    const userRole = getCurrentUser().role;
    if (userRole === 'student' || userRole === 'parent') {
        // Open session request modal
        openSessionRequestModal();
    } else {
        showNotification('Only students and parents can request sessions', 'info');
    }
}

function openSessionRequestModal() {
    const modal = document.getElementById('sessionRequestModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function displayRequestedSessions() {
    const container = document.getElementById('session-requests-list');
    if (!container) return;
    
    const packageButtons = `
        <div class="package-buttons" style="margin-bottom: 1rem;">
            <button class="btn-primary" onclick="setPackages()">Set Packages</button>
            <button class="btn-secondary" onclick="viewPackages()">View Packages</button>
        </div>
    `;
    
    if (requestedSessions.length === 0) {
        container.innerHTML = packageButtons + '<p class="empty-state">No pending session requests</p>';
        updateElement('requests-count', '0');
        return;
    }
    
    let html = packageButtons;
    requestedSessions.forEach(request => {
        html += createRequestCardHTML(request);
    });
    container.innerHTML = html;
    
    updateElement('requests-count', requestedSessions.length.toString());
}

function createRequestCardHTML(request) {
    return `
        <div class="session-request-card">
            <div class="request-header">
                <h4>Student: <a href="#" onclick="viewStudentProfile('${request.student_id}'); return false;">${request.student_name}</a></h4>
                <span class="request-badge ${request.status}">${request.status}</span>
            </div>
            <div class="request-details">
                <p>Subject: ${request.subject}</p>
                <p>Date: ${request.session_date}</p>
                <p>Time: ${request.start_time}</p>
                <p>Duration: ${request.duration} minutes</p>
                <p>Mode: ${request.mode}</p>
                ${request.message ? `<p>Message: ${request.message}</p>` : ''}
            </div>
            <div class="request-actions">
                <button onclick="acceptSession('${request.id}')" class="btn-success">Accept</button>
                <button onclick="rejectSession('${request.id}')" class="btn-danger">Reject</button>
                <button onclick="contactStudent('${request.student_id}')" class="btn-secondary">Contact</button>
            </div>
        </div>
    `;
}

function displaySchedules(schedules) {
    const container = document.getElementById('upcoming-sessions-list');
    if (!container) return;
    
    if (schedules.length === 0) {
        container.innerHTML = '<p class="empty-state">No schedules set. Click "Create Schedule" to add your availability.</p>';
        return;
    }
    
    container.innerHTML = schedules.map(schedule => `
        <div class="session-item">
            <span class="day">${schedule.day_of_week}</span>
            <span class="time">${schedule.start_time} - ${schedule.end_time}</span>
            <span class="availability">${schedule.is_available ? 'Available' : 'Busy'}</span>
        </div>
    `).join('');
}

function displayConfirmedStudents() {
    const container = document.getElementById('my-students-grid');
    if (!container) return;
    
    if (confirmedStudents.length === 0) {
        container.innerHTML = '<p class="empty-state">No students enrolled yet.</p>';
        return;
    }
    
    container.innerHTML = '';
    confirmedStudents.forEach(student => {
        const card = createStudentCard(student);
        container.appendChild(card);
    });
}

function createStudentCard(student) {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.innerHTML = `
        <div class="student-header">
            <div class="student-avatar">${student.name ? student.name.charAt(0) : 'S'}</div>
            <div class="student-info">
                <h3><a href="#" onclick="viewStudentProfile('${student.id}'); return false;">${student.name}</a></h3>
                <p>Grade ${student.grade_level} • ${student.school_name || 'School not specified'}</p>
            </div>
        </div>
        
        <div class="student-stats">
            <div class="stat-item">
                <span class="stat-label">Sessions</span>
                <span class="stat-value">${student.total_sessions || 0}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Attendance</span>
                <span class="stat-value">${student.attendance_rate || 0}%</span>
            </div>
        </div>
        
        <div class="student-actions">
            <button class="btn-view-details" onclick="openStudentDetailsModal('${student.id}')">View Details</button>
            <button class="btn-quick-action" onclick="contactStudent('${student.id}')">📞</button>
        </div>
    `;
    return card;
}

// Add this to the blog content display
function displayBlogContent() {
    const blogContent = document.getElementById('blog-content');
    if (blogContent) {
        blogContent.innerHTML = `
            <div class="section-header">
                <h2 class="section-title">My Blog Posts</h2>
                <button class="btn-primary" onclick="openCreateBlogModal()">
                    <span>✍️</span> Create Blog Post
                </button>
            </div>
            <div class="blog-grid" id="blog-grid">
                <!-- Blog posts will be loaded here -->
            </div>
        `;
        loadBlogPosts();
    }
}

async function loadBlogPosts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/blog/posts`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayBlogPosts(data.posts);
        }
    } catch (error) {
        console.error('Error loading blog posts:', error);
    }
}

// Fix the blog modal open function
window.openCreateBlogModal = function() {
    window.modalsManager.open('createBlogModal');
};

window.filterBlogPosts = async function(filter) {
    // Update active filter chip
    document.querySelectorAll('.blog-filters .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Load filtered posts
    try {
        const response = await fetch(`${API_BASE_URL}/api/blog/posts?status=${filter}`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayBlogPosts(data.posts);
        }
    } catch (error) {
        console.error('Error:', error);
    }
};

function displayVideos() {
    const grid = document.getElementById('videos-grid');
    if (!grid) return;
    
    if (allVideos.length === 0) {
        grid.innerHTML = '<p class="empty-state">No videos uploaded yet</p>';
        return;
    }
    
    grid.innerHTML = allVideos.map(video => `
        <div class="video-card enhanced">
            <div class="video-thumbnail-container">
                <img src="${video.thumbnail_url || '../Pictures/default-video.jpg'}" alt="${video.title}" class="video-thumbnail">
                <span class="video-duration">${video.duration || '00:00'}</span>
                <div class="video-overlay">
                    <button class="play-btn" onclick="playVideo('${video.id}')">▶</button>
                </div>
                ${video.status === 'draft' ? '<span class="draft-badge">Draft</span>' : ''}
                ${video.is_verified ? '<span class="verified-badge">✓</span>' : ''}
            </div>
            <div class="video-info">
                <h4>${video.title}</h4>
                <div class="video-meta">
                    <span>👁 ${video.views || 0} views</span>
                    <span>❤️ ${video.likes || 0} likes</span>
                    <span>${formatDate(video.created_at)}</span>
                </div>
                <div class="video-actions">
                    <button class="btn-sm btn-edit" onclick="editVideo('${video.id}')">Edit</button>
                    <button class="btn-sm btn-delete" onclick="deleteVideo('${video.id}')">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Fix the video filters function
function filterVideos(filter) {
    // Remove active class from all filters
    document.querySelectorAll('.video-filters .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    
    // Add active class to clicked filter
    event.target.classList.add('active');
    
    // Handle playlist panel visibility
    const playlistPanel = document.getElementById('playlist-panel');
    const videosGrid = document.getElementById('videos-grid');
    
    if (filter === 'playlists') {
        playlistPanel.classList.remove('hidden');
        videosGrid.classList.add('hidden');
        loadPlaylists();
    } else {
        playlistPanel.classList.add('hidden');
        videosGrid.classList.remove('hidden');
        loadFilteredVideos(filter);
    }
}

async function loadFilteredVideos(filter) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/videos/reels?filter=${filter}`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayVideos(data.videos);
        }
    } catch (error) {
        console.error('Error loading videos:', error);
    }
}

async function loadPlaylists() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/videos/playlists`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        
        if (response.ok) {
            const playlists = await response.json();
            displayPlaylists(playlists);
        }
    } catch (error) {
        console.error('Error loading playlists:', error);
    }
}

function displayPlaylists(playlists) {
    const grid = document.getElementById('playlists-grid');
    if (!grid) return;
    
    if (playlists.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📁</span>
                <h3>No playlists yet</h3>
                <p>Create your first playlist to organize your videos</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = playlists.map(playlist => `
        <div class="playlist-card">
            <div class="playlist-header">
                <h4>${playlist.name}</h4>
                <span class="video-count">${playlist.video_count} videos</span>
            </div>
            <p>${playlist.description || 'No description'}</p>
            <div class="playlist-actions">
                <button onclick="viewPlaylist('${playlist.id}')" class="btn-view">View</button>
                <button onclick="editPlaylist('${playlist.id}')" class="btn-secondary">Edit</button>
            </div>
        </div>
    `).join('');
}

// ============================================
// EDIT/DELETE FUNCTIONS
// ============================================
function editCertification(id) {
    const cert = tutorProfile.certifications.find(c => c.id == id);
    if (cert) {
        openCertificationModal();
        setInputValue('cert-certified-in', cert.title || cert.certified_in);
        setInputValue('cert-type', cert.type);
        setInputValue('cert-date', cert.date);
        setInputValue('cert-school-search', cert.institution);
    }
}

function deleteCertification(id) {
    if (confirm('Are you sure you want to delete this certification?')) {
        tutorProfile.certifications = tutorProfile.certifications.filter(c => c.id != id);
        displayCertifications();
        showNotification('Certification deleted', 'info');
    }
}

function editExperience(id) {
    const exp = tutorProfile.experiences.find(e => e.id == id);
    if (exp) {
        openExperienceModal();
        setInputValue('exp-position', exp.title);
        setInputValue('exp-organization-search', exp.organization);
        setInputValue('exp-type', exp.type);
        setInputValue('exp-start-date', exp.start_date);
        setInputValue('exp-end-date', exp.end_date);
        setInputValue('exp-description', exp.description);
    }
}

function deleteExperience(id) {
    if (confirm('Are you sure you want to delete this experience?')) {
        tutorProfile.experiences = tutorProfile.experiences.filter(e => e.id != id);
        displayExperiences();
        showNotification('Experience deleted', 'info');
    }
}

function editAchievement(id) {
    const ach = tutorProfile.achievements.find(a => a.id == id);
    if (ach) {
        openAchievementModal();
        setInputValue('ach-title', ach.title);
        setInputValue('ach-institution-search', ach.institution);
        setInputValue('ach-type', ach.type);
        setInputValue('ach-date', ach.date);
        setInputValue('ach-description', ach.description);
    }
}

function deleteAchievement(id) {
    if (confirm('Are you sure you want to delete this achievement?')) {
        tutorProfile.achievements = tutorProfile.achievements.filter(a => a.id != id);
        displayAchievements();
        showNotification('Achievement deleted', 'info');
    }
}

// ============================================
// SESSION MANAGEMENT
// ============================================
async function acceptSession(sessionId) {
    showNotification('Session accepted successfully!', 'success');
    await loadSessionRequests();
}

async function rejectSession(sessionId) {
    showNotification('Session rejected', 'info');
    await loadSessionRequests();
}

function contactStudent(studentId) {
    showNotification('Opening chat with student...', 'info');
    // Implement chat functionality
}

function viewStudentProfile(studentId) {
    openStudentDetailsModal(studentId);
}

async function refreshRequests() {
    showNotification('Refreshing session requests...', 'info');
    await loadSessionRequests();
}

// ============================================
// PACKAGE MANAGEMENT
// ============================================
function setPackages() {
    window.modalsManager.open('setPackageModal');
}

function viewPackages() {
    window.modalsManager.open('viewPackageModal');
}

function loadPackages() {
    const packages = JSON.parse(localStorage.getItem('packages') || '[]');
    const display = document.getElementById('coursesDisplay');
    
    if (display) {
        if (packages.length === 0) {
            display.innerHTML = '<p class="no-courses-message">No packages have been set.</p>';
        } else {
            display.innerHTML = packages.map(pkg => `
                <div class="package-card">
                    <h3>${pkg.courses.join(', ')}</h3>
                    <p>Payment: ${pkg.paymentFrequency}</p>
                    <p>Rate: ${pkg.hourlyRate} ETB/hour</p>
                    <div class="discount-info">
                        <span>3 months: ${pkg.discount3}%</span>
                        <span>6 months: ${pkg.discount6}%</span>
                        <span>Yearly: ${pkg.discountYearly}%</span>
                    </div>
                </div>
            `).join('');
        }
    }
}

// ============================================
// SOCIAL MEDIA & COMMUNITY
// ============================================
function initializeDefaultSocialLinks() {
    const container = document.getElementById('socialLinksContainer');
    if (!container) return;
    
    const defaultSocials = [
        { name: 'Facebook', icon: 'fab fa-facebook-f', url: '#' },
        { name: 'Twitter', icon: 'fab fa-twitter', url: '#' },
        { name: 'LinkedIn', icon: 'fab fa-linkedin-in', url: '#' },
        { name: 'Instagram', icon: 'fab fa-instagram', url: '#' },
        { name: 'YouTube', icon: 'fab fa-youtube', url: '#' }
    ];
    
    container.innerHTML = defaultSocials.map(social => `
        <a href="${social.url}" class="social-link" title="${social.name}" target="_blank">
            <i class="${social.icon}"></i>
        </a>
    `).join('');
}


// Community Modal Functions
function openCommunityModal() {
    const modal = document.getElementById('communityModal');
    if (modal) {
        modal.classList.remove('hidden');
        loadConnections();
    }
}

function closeCommunityModal() {
    const modal = document.getElementById('communityModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function switchCommunitySection(section) {
    // Update menu items
    document.querySelectorAll('.community-menu .menu-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.menu-item').classList.add('active');
    
    // Update sections
    document.querySelectorAll('.community-section').forEach(sec => {
        sec.classList.add('hidden');
    });
    document.getElementById(`${section}-section`).classList.remove('hidden');
}

function filterConnections(filter) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (filter === 'live') {
        // Filter to show only live connections
        loadConnections(true);
    } else {
        loadConnections(false);
    }
}

function loadConnections(liveOnly = false) {
    const grid = document.getElementById('connectionsGrid');
    const connections = getConnectionsData();
    
    const filtered = liveOnly 
        ? connections.filter(c => c.isLive) 
        : connections;
    
    grid.innerHTML = filtered.map(connection => `
        <div class="connection-card">
            <img src="${connection.avatar}" alt="${connection.name}" class="connection-avatar">
            <h4>${connection.name}</h4>
            <p>${connection.role}</p>
            ${connection.isLive ? '<span class="live-badge">🟢 Live</span>' : ''}
            <button class="btn-connect" onclick="connectWith('${connection.id}')">
                ${connection.connected ? 'Message' : 'Connect'}
            </button>
        </div>
    `).join('');
}

function getConnectionsData() {
    // This would fetch from your backend
    return [
        { id: 1, name: 'John Doe', role: 'Student', avatar: '../Pictures/student1.jpg', isLive: true, connected: true },
        { id: 2, name: 'Jane Smith', role: 'Parent', avatar: '../Pictures/parent1.jpg', isLive: false, connected: false }
    ];
}



// ============================================
// TEACHING TOOLS FUNCTIONS
// ============================================

function openDigitalLab() {
    showComingSoonModal('Digital Lab');
}

function openWhiteboardTool() {
    showComingSoonModal('Digital Whiteboard');
}

function openQuizMaker() {
    showComingSoonModal('Quiz Maker');
}

function openResourceLibrary() {
    showComingSoonModal('Resource Library');
}

// Make them globally available
window.openDigitalLab = openDigitalLab;
window.openWhiteboardTool = openWhiteboardTool;
window.openQuizMaker = openQuizMaker;
window.openResourceLibrary = openResourceLibrary;

function showComingSoonModal(feature) {
    const modal = document.getElementById('coming-soon-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const message = document.getElementById('coming-soon-message');
        if (message) {
            message.textContent = `${feature} is coming soon! We're working hard to bring you this amazing feature.`;
        }
    }
}

// ============================================
// UPLOAD HANDLERS
// ============================================
function setupUploadHandlers() {
    const coverArea = document.getElementById('coverUploadArea');
    const profileArea = document.getElementById('profileUploadArea');
    
    if (coverArea) {
        setupDragAndDrop(coverArea, 'cover');
    }
    
    if (profileArea) {
        setupDragAndDrop(profileArea, 'profile');
    }
}

function setupDragAndDrop(element, type) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        element.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        element.addEventListener(eventName, () => element.classList.add('dragover'), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        element.addEventListener(eventName, () => element.classList.remove('dragover'), false);
    });
    
    element.addEventListener('drop', (e) => handleDrop(e, type), false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e, type) {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleImageSelect({ target: { files: [files[0]] } }, type);
    }
}

function handleImageSelect(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.match('image.*')) {
        showNotification('Please select an image file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById(`${type}PreviewImage`).src = e.target.result;
        document.getElementById(`${type}Preview`).classList.add('active');
        document.getElementById(`${type}FileName`).textContent = file.name;
        document.getElementById(`${type}FileSize`).textContent = formatFileSize(file.size);
    };
    reader.readAsDataURL(file);
}

function handleFileSelect(event, prefix) {
    const file = event.target.files[0];
    if (!file) return;
    
    const preview = document.getElementById(`${prefix}-file-preview`);
    const fileName = preview.querySelector('.file-name');
    
    if (preview && fileName) {
        fileName.textContent = file.name;
        preview.classList.remove('hidden');
    }
}

function removeFile(prefix) {
    const fileInput = document.getElementById(`${prefix}-file`);
    const preview = document.getElementById(`${prefix}-file-preview`);
    
    if (fileInput) fileInput.value = '';
    if (preview) preview.classList.add('hidden');
}

function toggleEndDate() {
    const checkbox = document.getElementById('exp-current');
    const endDateInput = document.getElementById('exp-end-date');
    
    if (checkbox && endDateInput) {
        endDateInput.disabled = checkbox.checked;
        if (checkbox.checked) {
            endDateInput.value = '';
        }
    }
}

async function uploadImage(type) {
    const fileInput = document.getElementById(`${type}Input`);
    if (!fileInput.files[0]) {
        showNotification('Please select an image', 'error');
        return;
    }
    
    // Simulate upload
    showNotification(`${type === 'cover' ? 'Cover' : 'Profile'} image uploaded successfully!`, 'success');
    
    if (type === 'cover') {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('cover-img').src = e.target.result;
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('profile-avatar').src = e.target.result;
            updateImage('profile-pic', e.target.result);
            updateImage('dropdown-profile-pic', e.target.result);
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
    
    closeModal(`${type}UploadModal`);
}

function resetUpload(type) {
    document.getElementById(`${type}Input`).value = '';
    document.getElementById(`${type}Preview`).classList.remove('active');
}

// File handling functions
function handleVideoFile() {
    const fileInput = document.getElementById('videoFile');
    const fileInfo = document.getElementById('videoFileInfo');
    const fileName = fileInfo.querySelector('.file-name');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        fileName.textContent = file.name;
        fileInfo.classList.remove('hidden');
    }
}

function removeVideoFile() {
    const fileInput = document.getElementById('videoFile');
    const fileInfo = document.getElementById('videoFileInfo');
    
    fileInput.value = '';
    fileInfo.classList.add('hidden');
}

function handleThumbnailFile() {
    const fileInput = document.getElementById('thumbnailFile');
    const preview = document.getElementById('thumbnailPreview');
    const img = preview.querySelector('img');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            img.src = e.target.result;
            preview.classList.remove('hidden');
        };
        
        reader.readAsDataURL(file);
    }
}

function removeThumbnail() {
    const fileInput = document.getElementById('thumbnailFile');
    const preview = document.getElementById('thumbnailPreview');
    
    fileInput.value = '';
    preview.classList.add('hidden');
}

// Add event listeners
document.getElementById('videoFile')?.addEventListener('change', handleVideoFile);
document.getElementById('thumbnailFile')?.addEventListener('change', handleThumbnailFile);

// Updated uploadVideo function
function uploadVideo() {
    const title = document.getElementById('videoTitle').value;
    const description = document.getElementById('videoDescription').value;
    const category = document.getElementById('videoCategory').value;
    const audience = document.getElementById('targetAudience').value;
    const videoFile = document.getElementById('videoFile').files[0];
    const thumbnailFile = document.getElementById('thumbnailFile').files[0];
    
    if (!title || !description || !audience || !videoFile) {
        Utils.showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Here you would normally upload to your backend
    Utils.showToast('Uploading video...', 'info');
    
    // Simulate upload
    setTimeout(() => {
        Utils.showToast('Video uploaded successfully!', 'success');
        window.modalsManager.close('uploadVideoModal');
    }, 2000);
}

// Save video as draft
function saveVideoAsDraft() {
    const title = document.getElementById('videoTitle').value;
    const description = document.getElementById('videoDescription').value;
    const category = document.getElementById('videoCategory').value;
    const audience = document.getElementById('targetAudience').value;
    const videoFile = document.getElementById('videoFile').files[0];
    
    if (!title) {
        Utils.showToast('Please add at least a title to save as draft', 'warning');
        return;
    }
    
    // Save draft logic here
    const draftData = {
        title,
        description,
        category,
        audience,
        videoFileName: videoFile ? videoFile.name : null,
        status: 'draft',
        savedAt: new Date().toISOString()
    };
    
    // Save to localStorage or backend
    const drafts = JSON.parse(localStorage.getItem('videoDrafts') || '[]');
    drafts.push(draftData);
    localStorage.setItem('videoDrafts', JSON.stringify(drafts));
    
    Utils.showToast('Video saved as draft!', 'success');
    window.modalsManager.close('uploadVideoModal');
}

// Publish video for review
// ============================================
// FIX VIDEO UPLOAD WITH BACKEND
// ============================================

async function publishVideo() {
    const videoData = {
        title: getInputValue('videoTitle'),
        description: getInputValue('videoDescription'),
        category: getInputValue('videoCategory'),
        target_audience: getInputValue('targetAudience'),
        video_url: '/uploads/videos/temp.mp4', // Would be from actual upload
        thumbnail_url: '/uploads/thumbnails/temp.jpg'
    };
    
    if (!videoData.title || !videoData.description) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/videos/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(videoData)
        });
        
        if (response.ok) {
            // Close upload modal
            window.modalsManager.close('uploadVideoModal');
            
            // Show review notification modal
            window.modalsManager.open('videoReviewModal');
            
            // Clear form
            document.getElementById('uploadVideoForm').reset();
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error uploading video', 'error');
    }
}

// Navigate to My Videos
function goToMyVideos() {
    window.modalsManager.close('videoReviewModal');
    // Trigger sidebar navigation to videos
    const videosBtn = document.querySelector('.sidebar-btn[data-content="videos"]');
    if (videosBtn) {
        videosBtn.click();
    }
}

function goLive() {
    showComingSoonModal('Live Streaming');
}

function createPlaylist() {
    const modal = document.getElementById('createPlaylistModal');
    if (!modal) {
        // Create playlist modal dynamically
        const playlistModal = document.createElement('div');
        playlistModal.id = 'createPlaylistModal';
        playlistModal.className = 'modal hidden';
        playlistModal.innerHTML = `
            <div class="modal-overlay" onclick="closePlaylistModal()"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Create Playlist</h2>
                    <button class="modal-close" onclick="closePlaylistModal()">×</button>
                </div>
                <div class="modal-body">
                    <form id="playlistForm">
                        <div class="form-group">
                            <label>Playlist Name *</label>
                            <input type="text" id="playlistName" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="playlistDescription" class="form-textarea" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Privacy</label>
                            <select id="playlistPrivacy" class="form-select">
                                <option value="public">Public</option>
                                <option value="private">Private</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closePlaylistModal()">Cancel</button>
                    <button class="btn-primary" onclick="savePlaylist()">Create</button>
                </div>
            </div>
        `;
        document.body.appendChild(playlistModal);
    }
    
    document.getElementById('createPlaylistModal').classList.remove('hidden');
}

// ============================================
// SCHOOL SEARCH & SELECTION
// ============================================
function initializeSchoolDatabase() {
    schoolDatabase = [
        { id: 1, name: 'Unity High School', location: 'Addis Ababa', phone: '+251911111111' },
        { id: 2, name: 'Hope Academy', location: 'Addis Ababa', phone: '+251922222222' },
        { id: 3, name: 'Victory School', location: 'Dire Dawa', phone: '+251933333333' },
        { id: 4, name: 'Excellence Academy', location: 'Hawassa', phone: '+251944444444' },
        { id: 5, name: 'St. Joseph School', location: 'Addis Ababa', phone: '+251955555555' },
        { id: 6, name: 'International Community School', location: 'Addis Ababa', phone: '+251966666666' },
        { id: 7, name: 'Addis Ababa University', location: 'Addis Ababa', phone: '+251977777777' },
        { id: 8, name: 'Bahir Dar University', location: 'Bahir Dar', phone: '+251988888888' }
    ];
}

function setupSchoolSearch(prefix) {
    const searchInput = document.getElementById(`${prefix}-school-search`) || 
                       document.getElementById(`${prefix}-organization-search`) ||
                       document.getElementById(`${prefix}-institution-search`);
    const suggestionsDiv = document.getElementById(`${prefix}-school-suggestions`) ||
                          document.getElementById(`${prefix}-organization-suggestions`) ||
                          document.getElementById(`${prefix}-institution-suggestions`);
    const requestBtn = document.getElementById(`${prefix}-request-school-btn`);
    
    if (!searchInput || !suggestionsDiv) return;
    
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        
        if (query.length < 2) {
            suggestionsDiv.innerHTML = '';
            suggestionsDiv.style.display = 'none';
            if (requestBtn) requestBtn.classList.add('hidden');
            return;
        }
        
        const filtered = schoolDatabase.filter(school => 
            school.name.toLowerCase().includes(query) ||
            school.location.toLowerCase().includes(query)
        );
        
        if (filtered.length > 0) {
            suggestionsDiv.innerHTML = filtered.map(school => `
                <div class="suggestion-item" onclick="selectSchool('${prefix}', '${school.name}')">
                    <strong>${school.name}</strong> - ${school.location}
                </div>
            `).join('');
            suggestionsDiv.style.display = 'block';
            if (requestBtn) requestBtn.classList.add('hidden');
        } else {
            suggestionsDiv.innerHTML = '<div class="no-results"><p>No schools found</p></div>';
            suggestionsDiv.style.display = 'block';
            if (requestBtn) requestBtn.classList.remove('hidden');
        }
    });
    
    // Close suggestions on click outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.style.display = 'none';
        }
    });
}

function selectSchool(prefix, schoolName) {
    const searchInput = document.getElementById(`${prefix}-school-search`) || 
                       document.getElementById(`${prefix}-organization-search`) ||
                       document.getElementById(`${prefix}-institution-search`);
    const suggestionsDiv = document.getElementById(`${prefix}-school-suggestions`) ||
                          document.getElementById(`${prefix}-organization-suggestions`) ||
                          document.getElementById(`${prefix}-institution-suggestions`);
    
    if (searchInput) {
        searchInput.value = schoolName;
    }
    
    if (suggestionsDiv) {
        suggestionsDiv.style.display = 'none';
    }
}

// ============================================
// SAVE FUNCTIONS FOR CERTIFICATIONS, EXPERIENCES, ACHIEVEMENTS
// ============================================


async function saveCertification() {
    const certifiedIn = getInputValue('cert-certified-in');
    const institution = getInputValue('cert-school-search');
    const certType = getInputValue('cert-type');
    const certDate = getInputValue('cert-date');
    
    if (!certifiedIn || !institution) {
        showNotification('Please fill in required fields', 'error');
        return;
    }
    
    const certData = {
        title: certifiedIn,
        issuing_organization: institution,
        issue_date: certDate || null,
        credential_id: null,
        file_url: null
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/tutor/certifications`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(certData)
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Server response:', errorData);
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Show verification modal
        window.verificationManager.show('certification', {
            title: 'Certification submitted',
            message: 'Your certification has been submitted for verification.'
        });
        
        closeCertificationModal();
        
        // Refresh the display
        await loadTutorData();
        
    } catch (error) {
        console.error('Error saving certification:', error);
        showNotification('Error saving certification. Please try again.', 'error');
    }
}

async function saveExperience() {
    const position = getInputValue('exp-position');
    const organization = getInputValue('exp-organization-search');
    const expType = getInputValue('exp-type');
    const startDate = getInputValue('exp-start-date');
    const endDate = getInputValue('exp-end-date');
    const description = getInputValue('exp-description');
    const isCurrent = document.getElementById('exp-current')?.checked;
    
    if (!position || !organization || !startDate) {
        showNotification('Please fill in required fields', 'error');
        return;
    }
    
    const expData = {
        position: position,
        organization: organization,
        start_date: startDate,
        end_date: isCurrent ? null : endDate,
        description: description
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/tutor/experiences`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(expData)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Show verification modal
            window.verificationManager.show('experience', {
                title: 'Experience submitted',
                message: 'Your experience has been submitted for verification. This usually takes 24-48 hours.'
            });
            
            closeExperienceModal();
            
            // Add to local profile
            if (!tutorProfile.experiences) {
                tutorProfile.experiences = [];
            }
            tutorProfile.experiences.push({
                ...expData,
                id: result.id,
                title: position,
                type: expType,
                status: 'pending_verification',
                is_verified: false
            });
            
            displayExperiences();
        } else {
            throw new Error('Failed to save experience');
        }
    } catch (error) {
        console.error('Error saving experience:', error);
        showNotification('Error saving experience', 'error');
    }
}

async function saveAchievement() {
    const title = getInputValue('ach-title');
    const institution = getInputValue('ach-institution-search');
    const achType = getInputValue('ach-type');
    const achDate = getInputValue('ach-date');
    const description = getInputValue('ach-description');
    
    if (!title || !institution) {
        showNotification('Please fill in required fields', 'error');
        return;
    }
    
    const achData = {
        title: title,
        institution: institution,
        date: achDate || null,
        description: description
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/tutor/achievements`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify(achData)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Show verification modal
            window.verificationManager.show('achievement', {
                title: 'Achievement submitted',
                message: 'Your achievement has been submitted for verification. This usually takes 24-48 hours.'
            });
            
            closeAchievementModal();
            
            // Add to local profile
            if (!tutorProfile.achievements) {
                tutorProfile.achievements = [];
            }
            tutorProfile.achievements.push({
                ...achData,
                id: result.id,
                type: achType,
                status: 'pending_verification',
                is_verified: false
            });
            
            displayAchievements();
        } else {
            throw new Error('Failed to save achievement');
        }
    } catch (error) {
        console.error('Error saving achievement:', error);
        showNotification('Error saving achievement', 'error');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function updateImage(id, src) {
    const element = document.getElementById(id);
    if (element && element.tagName === 'IMG') {
        element.src = src;
    }
}

function setInputValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value || '';
    }
}

function getInputValue(id) {
    const element = document.getElementById(id);
    return element ? element.value : '';
}

function displayTags(containerId, items, className) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (items.length === 0) {
        container.innerHTML = '<span class="empty-tag">No tags added yet</span>';
        return;
    }
    
    container.innerHTML = items.map(item => 
        `<span class="${className}">${item}</span>`
    ).join('');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function showNotification(message, type = 'info') {
    // Use the Utils.showToast from page structure if available
    if (window.Utils && window.Utils.showToast) {
        window.Utils.showToast(message, type);
        return;
    }
    
    // Otherwise use a simple notification
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 100001;
        animation: slideIn 0.3s ease;
        max-width: 350px;
    `;
    notification.innerHTML = `
        <div class="notification-content">
            ${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'} ${message}
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

function updateStatistics() {
    updateElement('stat-total-students', confirmedStudents.length);
    updateElement('stat-current-students', confirmedStudents.length);
    updateElement('stat-sessions', tutorProfile?.total_sessions || 0);
    updateElement('stat-avg-rating', tutorProfile?.rating || '0.0');
    updateElement('stat-experience', tutorProfile?.experience || 0);
    updateElement('stat-courses', tutorProfile?.courses?.length || 0);
    updateElement('sidebar-total-students', confirmedStudents.length);
    updateElement('sidebar-week-sessions', '0');
    updateElement('sidebar-rating', tutorProfile?.rating ? `${tutorProfile.rating}/5.0` : '0.0/5.0');
}

function updateUserInterface() {
    if (!currentUser) return;
    
    updateElement('profile-name', currentUser.first_name);
    updateElement('dropdown-user-name', `${currentUser.first_name} ${currentUser.last_name}`);
    updateElement('dropdown-user-email', currentUser.email);
    updateElement('dropdown-user-role', 'Tutor');
    
    const profilePic = currentUser.profile_picture || '../pictures/tutor-man.jpg';
    updateImage('profile-pic', profilePic);
    updateImage('dropdown-profile-pic', profilePic);
    updateImage('profile-avatar', profilePic);
    
    const profileContainer = document.getElementById('profile-container');
    if (profileContainer) {
        profileContainer.classList.remove('hidden');
    }
}

// ============================================
// EVENT LISTENERS - TUTOR SPECIFIC ONLY
// ============================================
function setupTutorSpecificListeners() {
    // Only add listeners specific to tutor functionality
    // The general listeners are handled by page structure files
    
    // Add location functionality
    const addLocationBtn = document.querySelector('.btn-add[onclick="addLocation()"]');
    if (addLocationBtn) {
        addLocationBtn.onclick = addLocation;
    }
    
    const addCourseBtn = document.querySelector('.btn-add[onclick="addCourse()"]');
    if (addCourseBtn) {
        addCourseBtn.onclick = addCourse;
    }
    
    const addTeachingMethodBtn = document.querySelector('.btn-add[onclick="addTeachingMethod()"]');
    if (addTeachingMethodBtn) {
        addTeachingMethodBtn.onclick = addTeachingMethod;
    }
    
    const addSocialBtn = document.querySelector('.btn-add[onclick="addSocialMedia()"]');
    if (addSocialBtn) {
        addSocialBtn.onclick = addSocialMedia;
    }
}

// ============================================
// FORM INPUT MANAGEMENT
// ============================================
function addLocation() {
    const container = document.getElementById('locationsContainer');
    if (container) {
        const newLocation = document.createElement('div');
        newLocation.className = 'location-item';
        newLocation.innerHTML = `
            <input type="text" class="form-input" placeholder="Location">
            <button type="button" class="btn-remove" onclick="removeLocation(this)">×</button>
        `;
        container.appendChild(newLocation);
    }
}

function removeLocation(button) {
    button.parentElement.remove();
}

function addCourse() {
    const container = document.getElementById('locationsContainer');
    if (container) {
        const newCourse = document.createElement('div');
        newCourse.className = 'location-item';
        newCourse.innerHTML = `
            <input type="text" class="form-input" placeholder="Course">
            <button type="button" class="btn-remove" onclick="removeCourse(this)">×</button>
        `;
        container.appendChild(newCourse);
    }
}

function removeCourse(button) {
    button.parentElement.remove();
}

function addTeachingMethod() {
    const container = document.getElementById('teachingMethodContainer');
    if (container) {
        const newMethod = document.createElement('div');
        newMethod.className = 'location-item';
        newMethod.innerHTML = `
            <input type="text" class="form-input" placeholder="Teaching Method">
            <button type="button" class="btn-remove" onclick="removeTeachingMethod(this)">×</button>
        `;
        container.appendChild(newMethod);
    }
}

function removeTeachingMethod(button) {
    button.parentElement.remove();
}

function addSocialMedia() {
    const container = document.getElementById('socialMediaContainer');
    if (container) {
        const newSocial = document.createElement('div');
        newSocial.className = 'social-item';
        newSocial.innerHTML = `
            <select class="form-select">
                <option value="facebook">Facebook</option>
                <option value="twitter">Twitter/X</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
                <option value="telegram">Telegram</option>
                <option value="website">Website</option>
            </select>
            <input type="text" class="form-input" placeholder="URL or username">
            <button type="button" class="btn-remove" onclick="removeSocial(this)">×</button>
        `;
        container.appendChild(newSocial);
    }
}

function removeSocial(button) {
    button.parentElement.remove();
}

function addCertification() {
    openCertificationModal();
}

function addExperience() {
    openExperienceModal();
}

function addAchievement() {
    openAchievementModal();
}

// Ensure all functions are globally available
window.shareProfile = window.shareProfile || function() {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    showNotification('Profile link copied!', 'success');
};

window.toggleSidebar = window.toggleSidebar || function() {
    document.body.classList.toggle('sidebar-collapsed');
};

// Fix modal manager fallback
if (!window.modalsManager) {
    window.modalsManager = {
        open: (id) => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('show');
                modal.style.display = 'flex';
            }
        },
        close: (id) => {
            const modal = document.getElementById(id);
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('show');
                modal.style.display = 'none';
            }
        }
    };
}

// ============================================
// EXPORT FUNCTIONS TO GLOBAL SCOPE
// ============================================
// Only export functions that aren't handled by page structure
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.saveProfile = saveProfile;
window.openCertificationModal = openCertificationModal;
window.closeCertificationModal = closeCertificationModal;
window.saveCertification = saveCertification;
window.editCertification = editCertification;
window.deleteCertification = deleteCertification;
window.openExperienceModal = openExperienceModal;
window.closeExperienceModal = closeExperienceModal;
window.saveExperience = saveExperience;
window.editExperience = editExperience;
window.deleteExperience = deleteExperience;
window.openAchievementModal = openAchievementModal;
window.closeAchievementModal = closeAchievementModal;
window.saveAchievement = saveAchievement;
window.editAchievement = editAchievement;
window.deleteAchievement = deleteAchievement;
window.openStudentDetailsModal = openStudentDetailsModal;
window.closeStudentDetailsModal = closeStudentDetailsModal;
window.switchStudentSection = switchStudentSection;
window.openCoverUploadModal = openCoverUploadModal;
window.openProfileUploadModal = openProfileUploadModal;
window.closeModal = closeModal;
window.handleImageSelect = handleImageSelect;
window.uploadImage = uploadImage;
window.resetUpload = resetUpload;
window.openScheduleModal = openScheduleModal;
window.closeScheduleModal = closeScheduleModal;
window.openSchoolRequestModal = openSchoolRequestModal;
window.closeSchoolRequestModal = closeSchoolRequestModal;
window.submitSchoolRequest = submitSchoolRequest;
window.acceptSession = acceptSession;
window.rejectSession = rejectSession;
window.contactStudent = contactStudent;
window.viewStudentProfile = viewStudentProfile;
window.refreshRequests = refreshRequests;
window.setPackages = setPackages;
window.viewPackages = viewPackages;
window.openCommunityModal = openCommunityModal;
window.selectSchool = selectSchool;
window.handleFileSelect = handleFileSelect;
window.removeFile = removeFile;
window.toggleEndDate = toggleEndDate;
window.addLocation = addLocation;
window.removeLocation = removeLocation;
window.addCourse = addCourse;
window.removeCourse = removeCourse;
window.addTeachingMethod = addTeachingMethod;
window.removeTeachingMethod = removeTeachingMethod;
window.addSocialMedia = addSocialMedia;
window.removeSocial = removeSocial;
window.addCertification = addCertification;
window.addExperience = addExperience;
window.addAchievement = addAchievement;
// At the end of the file where you export functions
window.saveCertification = saveCertification;
window.saveExperience = saveExperience;
window.saveAchievement = saveAchievement;

// ============================================
// ADD REQUIRED STYLES IF NOT PRESENT
// ============================================
if (!document.getElementById('tutor-profile-dynamic-styles')) {
    const style = document.createElement('style');
    style.id = 'tutor-profile-dynamic-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .empty-state {
            text-align: center;
            color: #999;
            padding: 40px 20px;
            font-style: italic;
        }
        .empty-tag {
            color: #999;
            font-style: italic;
        }
        .verified-badge-small {
            position: absolute;
            top: 10px;
            right: 10px;
            background: #10b981;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
        }
        .package-buttons {
            display: flex;
            gap: 10px;
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 8px 0;
        }
        .checkbox-group input[type="checkbox"] {
            width: 18px;
            height: 18px;
        }
        .card-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }
        .btn-sm {
            padding: 4px 8px;
            font-size: 12px;
            border-radius: 4px;
            border: none;
            cursor: pointer;
        }
        .btn-primary {
            background: #667eea;
            color: white;
        }
        .btn-danger {
            background: #ef4444;
            color: white;
        }
        .btn-success {
            background: #10b981;
            color: white;
        }
        .btn-secondary {
            background: #6b7280;
            color: white;
        }
        .info-card {
            background: #f9fafb;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            position: relative;
        }
        .info-card h4 {
            margin: 0 0 10px 0;
            color: #1f2937;
        }
        .info-card p {
            margin: 5px 0;
            color: #4b5563;
        }
    `;
    document.head.appendChild(style);
}