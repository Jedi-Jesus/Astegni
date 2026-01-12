// ============================================
// PARENT PROFILE - GLOBAL FUNCTIONS
// Global utility functions for parent profile page
// ============================================

// Panel switching (referenced by HTML onclick handlers)
function switchToPanel(panelId) {
    // This function is often overridden by panel-manager.js
    // But we provide a fallback implementation
    if (typeof window.switchPanel === 'function') {
        window.switchPanel(panelId);
    } else {
        // Fallback: update URL and try to show panel
        window.location.hash = panelId;

        // Hide all panels
        document.querySelectorAll('.profile-panel').forEach(panel => {
            panel.classList.remove('active');
            panel.style.display = 'none';
        });

        // Show target panel
        const targetPanel = document.getElementById(`${panelId}-panel`);
        if (targetPanel) {
            targetPanel.classList.add('active');
            targetPanel.style.display = 'block';
        }

        // Update sidebar
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-panel') === panelId) {
                link.classList.add('active');
            }
        });
    }
}

// Quick actions
function quickAddChild() {
    // Open register child modal
    if (typeof openRegisterChildModal === 'function') {
        openRegisterChildModal();
    } else {
        showNotification('Register child modal not available', 'info');
    }
}

function quickViewSessions() {
    switchToPanel('sessions');
}

function quickManagePayments() {
    switchToPanel('payments');
}

// Utility: Format date for display
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Utility: Format time ago
function timeAgo(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'week', seconds: 604800 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];

    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
        }
    }

    return 'Just now';
}

// Utility: Truncate text
function truncateText(text, maxLength = 100) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Make functions available globally
window.switchToPanel = switchToPanel;
window.quickAddChild = quickAddChild;
window.quickViewSessions = quickViewSessions;
window.quickManagePayments = quickManagePayments;
window.formatDate = formatDate;
window.timeAgo = timeAgo;
window.truncateText = truncateText;

// ============================================
// TUTOR INFORMATION FOR STUDENT (from enrolled_students)
// Used in student-details-modal when opened from parent-profile
// ============================================

// Store loaded tutor data for actions
let loadedTutorsData = [];

// Load Tutor Information for Student
async function loadTutorInformation(studentProfileId) {
    const container = document.getElementById('tutor-cards-container');
    const loadingEl = document.getElementById('tutor-loading');
    const noTutorsState = document.getElementById('no-tutors-state');

    if (!container) return;

    // Show loading
    if (loadingEl) loadingEl.style.display = 'block';
    if (noTutorsState) noTutorsState.style.display = 'none';

    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
        const token = localStorage.getItem('token');

        // Use the parent tutors endpoint with student_id filter
        // This endpoint requires authentication and verifies the child belongs to the parent
        const response = await fetch(`${API_BASE_URL}/api/parent/tutors?student_id=${studentProfileId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch tutor information');

        const data = await response.json();
        const tutors = data.tutors || [];

        console.log('[loadTutorInformation] Tutors for student:', tutors);

        // Hide loading
        if (loadingEl) loadingEl.style.display = 'none';

        if (tutors.length === 0) {
            // No tutors enrolled
            container.innerHTML = '';
            if (noTutorsState) noTutorsState.style.display = 'block';
            return;
        }

        // Store for actions
        loadedTutorsData = tutors;

        // Render tutor cards
        container.innerHTML = tutors.map((tutor, index) => createTutorCard(tutor, index)).join('');

    } catch (error) {
        console.error('[loadTutorInformation] Error:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Failed to load tutor information</p>
            </div>
        `;
    }
}

// Create Tutor Card HTML
function createTutorCard(tutor, index) {
    const name = tutor.name || tutor.username || 'Tutor';
    const bio = tutor.bio || 'No bio available';
    const phone = tutor.phone || 'Not provided';
    const email = tutor.email || 'Not provided';
    const location = tutor.location || 'Not provided';
    const defaultPic = tutor.gender === 'Female'
        ? '/uploads/system_images/system_profile_pictures/girl-user-image.jpg'
        : '/uploads/system_images/system_profile_pictures/boy-user-image.jpg';
    const profilePic = tutor.profile_picture || defaultPic;
    const tutorId = tutor.id;
    const userId = tutor.user_id;
    const rating = tutor.rating ? tutor.rating.toFixed(1) : '0.0';
    const ratingCount = tutor.rating_count || 0;
    const packageName = tutor.package_name || 'No package';
    const hourlyRate = tutor.hourly_rate ? `${tutor.hourly_rate} ETB/hr` : 'Not set';
    const isVerified = tutor.is_verified;
    const expertiseBadge = tutor.expertise_badge;
    const enrollmentStatus = tutor.enrollment_status || 'active';
    const enrolledAt = tutor.enrolled_at ? new Date(tutor.enrolled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

    // Status color
    const statusColors = {
        'active': '#10B981',
        'suspended': '#F59E0B',
        'rejected': '#EF4444',
        'pending': '#6366F1'
    };
    const statusColor = statusColors[enrollmentStatus] || '#10B981';

    return `
        <div class="card" style="padding: 1.5rem;">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                <div style="position: relative;">
                    <img src="${profilePic}" alt="${name}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary-color);">
                    ${isVerified ? `<div style="position: absolute; bottom: 0; right: 0; background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white;"><i class="fas fa-check" style="font-size: 0.6rem; color: white;"></i></div>` : ''}
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <h4 style="font-size: 1.25rem; font-weight: 700; margin: 0; color: var(--heading); cursor: pointer; transition: color 0.3s;" onmouseover="this.style.color='#3b82f6'" onmouseout="this.style.color='var(--heading)'" onclick="viewTutorProfile(${userId})">${name}</h4>
                        ${expertiseBadge ? `<span style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; font-size: 0.65rem; padding: 2px 8px; border-radius: 12px; font-weight: 600;">${expertiseBadge}</span>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;">
                        <span style="color: #f59e0b;">★</span>
                        <span style="font-size: 0.875rem; font-weight: 600; color: var(--text);">${rating}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">(${ratingCount} reviews)</span>
                    </div>
                </div>
                <span style="background: ${statusColor}; color: white; font-size: 0.75rem; padding: 4px 10px; border-radius: 12px; font-weight: 600; text-transform: capitalize;">
                    ${enrollmentStatus}
                </span>
            </div>

            <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--bg-secondary); border-radius: 8px;">
                <p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${bio}</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 1rem; font-size: 0.875rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span>📦</span>
                    <span style="color: var(--text);">${packageName}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span>💰</span>
                    <span style="color: var(--text);">${hourlyRate}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span>📍</span>
                    <span style="color: var(--text);">${location}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span>📅</span>
                    <span style="color: var(--text);">Since ${enrolledAt}</span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                <button class="btn-secondary" style="padding: 0.5rem; border-radius: 8px; font-size: 0.875rem; font-weight: 600;" onclick="callTutor('${phone}')">
                    📞 Call
                </button>
                <button class="btn-secondary" style="padding: 0.5rem; border-radius: 8px; font-size: 0.875rem; font-weight: 600;" onclick="emailTutor('${email}')">
                    📧 Email
                </button>
                <button class="btn-secondary" style="padding: 0.5rem; border-radius: 8px; font-size: 0.875rem; font-weight: 600;" onclick="messageTutor(${tutorId}, '${name.replace(/'/g, "\\'")}')">
                    💬 Message
                </button>
            </div>
        </div>
    `;
}

// Tutor action functions
function viewTutorProfile(userId) {
    console.log('[viewTutorProfile] Opening tutor profile:', userId);
    window.open(`/view-profiles/view-tutor.html?user_id=${userId}`, '_blank');
}

function callTutor(phone) {
    if (phone && phone !== 'Not provided') {
        window.open(`tel:${phone.replace(/\s/g, '')}`, '_self');
    } else {
        alert('Phone number not available');
    }
}

function emailTutor(email) {
    if (email && email !== 'Not provided') {
        window.open(`mailto:${email}`, '_self');
    } else {
        alert('Email address not available');
    }
}

function messageTutor(tutorProfileId, tutorName) {
    console.log('[messageTutor] Opening chat with tutor profile_id:', tutorProfileId, 'name:', tutorName);

    // Create user object with profile_id and profile_type for chat modal
    const tutorUser = {
        profile_id: tutorProfileId,
        profile_type: 'tutor',
        name: tutorName,
        full_name: tutorName,
        role: 'tutor'
    };

    // Use ChatModalManager.open with targetUser
    if (typeof window.ChatModalManager !== 'undefined' && typeof window.ChatModalManager.open === 'function') {
        window.ChatModalManager.open(tutorUser);
    } else if (typeof openChatModal === 'function') {
        openChatModal(tutorUser);
    } else {
        alert('Chat feature coming soon!');
    }
}

// Make tutor functions available globally
window.loadTutorInformation = loadTutorInformation;
window.viewTutorProfile = viewTutorProfile;
window.callTutor = callTutor;
window.emailTutor = emailTutor;
window.messageTutor = messageTutor;

// ============================================
// STUDENT PACKAGES (from enrolled packages)
// Used in student-details-modal when opened from parent-profile
// ============================================

/**
 * Load packages for a specific student
 * @param {number} studentProfileId - The student profile ID
 */
async function loadStudentPackages(studentProfileId) {
    const container = document.getElementById('student-packages-list');
    if (!container) return;

    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
        const token = localStorage.getItem('token');

        // Get tutors for this student to extract package info
        const response = await fetch(`${API_BASE_URL}/api/parent/tutors?student_id=${studentProfileId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error('Failed to fetch packages');

        const data = await response.json();
        const tutors = data.tutors || [];

        console.log('[loadStudentPackages] Packages from tutors:', tutors);

        if (tutors.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>No packages enrolled yet</p>
                    <p style="font-size: 0.875rem; margin-top: 0.5rem;">Enroll in tutoring packages to see them here</p>
                </div>
            `;
            return;
        }

        // Render package cards
        container.innerHTML = tutors.map(tutor => {
            const tutorName = tutor.name || tutor.username || 'Unknown Tutor';
            const packageName = tutor.package_name || 'Standard Package';
            const hourlyRate = tutor.hourly_rate ? `${tutor.hourly_rate} ETB/hr` : 'Rate not set';
            const sessionFormat = tutor.session_format || 'Not specified';
            const gradeLevel = tutor.grade_level || 'All grades';
            const enrolledAt = tutor.enrolled_at ? new Date(tutor.enrolled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
            const status = tutor.enrollment_status || 'active';
            const statusColor = status === 'active' ? '#10B981' : status === 'suspended' ? '#F59E0B' : '#6366F1';

            return `
                <div class="card" style="padding: 1.5rem; display: flex; gap: 1rem; align-items: flex-start;">
                    <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i class="fas fa-box" style="color: white; font-size: 1.25rem;"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                            <h4 style="margin: 0; font-size: 1.1rem; font-weight: 600; color: var(--heading);">${packageName}</h4>
                            <span style="background: ${statusColor}; color: white; font-size: 0.7rem; padding: 3px 8px; border-radius: 10px; font-weight: 600; text-transform: capitalize;">${status}</span>
                        </div>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0 0 0.75rem 0;">with ${tutorName}</p>
                        <div style="display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.8rem; color: var(--text-muted);">
                            <span><i class="fas fa-coins" style="margin-right: 0.25rem;"></i> ${hourlyRate}</span>
                            <span><i class="fas fa-video" style="margin-right: 0.25rem;"></i> ${sessionFormat}</span>
                            <span><i class="fas fa-graduation-cap" style="margin-right: 0.25rem;"></i> ${gradeLevel}</span>
                            <span><i class="fas fa-calendar" style="margin-right: 0.25rem;"></i> Since ${enrolledAt}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('[loadStudentPackages] Error:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Failed to load packages</p>
            </div>
        `;
    }
}

// Make packages function available globally
window.loadStudentPackages = loadStudentPackages;

// ============================================
// STUDENT WHITEBOARD SESSIONS
// Used in student-details-modal when opened from parent-profile
// ============================================

let allWhiteboardSessions = [];

/**
 * Load whiteboard sessions for a specific student
 * @param {number} studentProfileId - The student profile ID
 */
async function loadStudentWhiteboardSessions(studentProfileId) {
    const container = document.getElementById('student-whiteboard-sessions');
    const totalStat = document.getElementById('whiteboard-stat-total');
    const completedStat = document.getElementById('whiteboard-stat-completed');
    const scheduledStat = document.getElementById('whiteboard-stat-scheduled');
    const durationStat = document.getElementById('whiteboard-stat-duration');

    if (!container) return;

    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
        const token = localStorage.getItem('token');

        // Try to fetch whiteboard sessions for this student
        // The endpoint might not exist yet, so we handle gracefully
        const response = await fetch(`${API_BASE_URL}/api/whiteboard/sessions?student_id=${studentProfileId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // If endpoint doesn't exist or returns error, show empty state
            throw new Error('Whiteboard sessions not available');
        }

        const data = await response.json();
        allWhiteboardSessions = data.sessions || [];

        console.log('[loadStudentWhiteboardSessions] Sessions:', allWhiteboardSessions);

        // Update stats
        const completed = allWhiteboardSessions.filter(s => s.status === 'completed').length;
        const scheduled = allWhiteboardSessions.filter(s => s.status === 'scheduled').length;
        const totalDuration = allWhiteboardSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

        if (totalStat) totalStat.textContent = allWhiteboardSessions.length;
        if (completedStat) completedStat.textContent = completed;
        if (scheduledStat) scheduledStat.textContent = scheduled;
        if (durationStat) durationStat.textContent = `${Math.round(totalDuration / 60)}h`;

        // Render sessions
        renderWhiteboardSessions(allWhiteboardSessions);

    } catch (error) {
        console.log('[loadStudentWhiteboardSessions] Info:', error.message);

        // Update stats to 0
        if (totalStat) totalStat.textContent = '0';
        if (completedStat) completedStat.textContent = '0';
        if (scheduledStat) scheduledStat.textContent = '0';
        if (durationStat) durationStat.textContent = '0h';

        // Show empty state
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-chalkboard" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No whiteboard sessions yet</p>
                <p style="font-size: 0.875rem;">Whiteboard sessions with tutors will appear here</p>
            </div>
        `;
    }
}

/**
 * Render whiteboard sessions to the container
 * @param {Array} sessions - Array of session objects
 */
function renderWhiteboardSessions(sessions) {
    const container = document.getElementById('student-whiteboard-sessions');
    if (!container) return;

    if (sessions.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-chalkboard" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No sessions found</p>
            </div>
        `;
        return;
    }

    container.innerHTML = sessions.map(session => {
        const tutorName = session.tutor_name || 'Unknown Tutor';
        const subject = session.subject || 'General';
        const status = session.status || 'scheduled';
        const scheduledTime = session.scheduled_at ? new Date(session.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'TBD';
        const duration = session.duration_minutes ? `${session.duration_minutes} min` : 'N/A';

        const statusColors = {
            'scheduled': { bg: '#EEF2FF', color: '#4F46E5' },
            'in-progress': { bg: '#FEF3C7', color: '#D97706' },
            'completed': { bg: '#D1FAE5', color: '#059669' },
            'cancelled': { bg: '#FEE2E2', color: '#DC2626' }
        };
        const statusStyle = statusColors[status] || statusColors['scheduled'];

        return `
            <div class="card" style="padding: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="background: linear-gradient(135deg, #8B5CF6, #6D28D9); width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-chalkboard-teacher" style="color: white; font-size: 1.1rem;"></i>
                        </div>
                        <div>
                            <h4 style="margin: 0; font-size: 1rem; font-weight: 600; color: var(--heading);">${subject}</h4>
                            <p style="margin: 0; font-size: 0.8rem; color: var(--text-secondary);">with ${tutorName}</p>
                        </div>
                    </div>
                    <span style="background: ${statusStyle.bg}; color: ${statusStyle.color}; font-size: 0.7rem; padding: 4px 10px; border-radius: 10px; font-weight: 600; text-transform: capitalize;">${status}</span>
                </div>
                <div style="display: flex; gap: 1.5rem; font-size: 0.8rem; color: var(--text-muted);">
                    <span><i class="fas fa-calendar" style="margin-right: 0.25rem;"></i> ${scheduledTime}</span>
                    <span><i class="fas fa-clock" style="margin-right: 0.25rem;"></i> ${duration}</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Filter whiteboard sessions by status
 * @param {string} filter - 'all', 'scheduled', 'in-progress', 'completed'
 */
function filterStudentWhiteboardSessions(filter) {
    // Update tab styles
    document.querySelectorAll('.whiteboard-tab').forEach(tab => {
        tab.classList.remove('active');
        tab.style.color = 'var(--text-muted)';
        tab.style.borderBottomColor = 'transparent';
    });
    const activeTab = document.querySelector(`.whiteboard-tab[data-filter="${filter}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.style.color = 'var(--text)';
        activeTab.style.borderBottomColor = 'var(--button-bg)';
    }

    // Filter sessions
    let filtered = allWhiteboardSessions;
    if (filter !== 'all') {
        filtered = allWhiteboardSessions.filter(s => s.status === filter);
    }

    renderWhiteboardSessions(filtered);
}

// Make whiteboard functions available globally
window.loadStudentWhiteboardSessions = loadStudentWhiteboardSessions;
window.filterStudentWhiteboardSessions = filterStudentWhiteboardSessions;

// ============================================
// STUDENT SESSIONS
// Used in student-details-modal when opened from parent-profile
// ============================================

let allStudentSessions = [];

/**
 * Load tutoring sessions for a specific student
 * @param {number} studentProfileId - The student profile ID
 */
async function loadStudentSessions(studentProfileId) {
    const container = document.getElementById('student-sessions-grid');
    const totalStat = document.getElementById('student-total-sessions');
    const completedStat = document.getElementById('student-completed-sessions');
    const scheduledStat = document.getElementById('student-scheduled-sessions');
    const hoursStat = document.getElementById('student-session-hours');

    if (!container) return;

    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
        const token = localStorage.getItem('token');

        // Try to fetch sessions for this student
        const response = await fetch(`${API_BASE_URL}/api/student/${studentProfileId}/sessions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Sessions not available');
        }

        const data = await response.json();
        allStudentSessions = data.sessions || [];

        console.log('[loadStudentSessions] Sessions:', allStudentSessions);

        // Update stats
        const completed = allStudentSessions.filter(s => s.status === 'completed').length;
        const scheduled = allStudentSessions.filter(s => s.status === 'scheduled').length;
        const totalHours = allStudentSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60;

        if (totalStat) totalStat.textContent = allStudentSessions.length;
        if (completedStat) completedStat.textContent = completed;
        if (scheduledStat) scheduledStat.textContent = scheduled;
        if (hoursStat) hoursStat.textContent = `${Math.round(totalHours)}h`;

        // Render sessions
        renderStudentSessions(allStudentSessions);

    } catch (error) {
        console.log('[loadStudentSessions] Info:', error.message);

        // Update stats to 0
        if (totalStat) totalStat.textContent = '0';
        if (completedStat) completedStat.textContent = '0';
        if (scheduledStat) scheduledStat.textContent = '0';
        if (hoursStat) hoursStat.textContent = '0h';

        // Show empty state
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-calendar-alt" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No sessions yet</p>
                <p style="font-size: 0.875rem;">Tutoring sessions will appear here once scheduled</p>
            </div>
        `;
    }
}

/**
 * Render student sessions to the container
 * @param {Array} sessions - Array of session objects
 */
function renderStudentSessions(sessions) {
    const container = document.getElementById('student-sessions-grid');
    if (!container) return;

    if (sessions.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-calendar-alt" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No sessions found</p>
                <p style="font-size: 0.875rem;">Tutoring sessions will appear here once scheduled</p>
            </div>
        `;
        return;
    }

    container.innerHTML = sessions.map(session => {
        const tutorName = session.tutor_name || 'Unknown Tutor';
        const subject = session.subject || session.course_name || 'General';
        const status = session.status || 'scheduled';
        const scheduledTime = session.scheduled_at ? new Date(session.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'TBD';
        const duration = session.duration_minutes ? `${session.duration_minutes} min` : 'N/A';

        const statusColors = {
            'scheduled': { bg: '#EEF2FF', color: '#4F46E5', icon: 'fa-clock' },
            'in-progress': { bg: '#FEF3C7', color: '#D97706', icon: 'fa-play-circle' },
            'completed': { bg: '#D1FAE5', color: '#059669', icon: 'fa-check-circle' },
            'cancelled': { bg: '#FEE2E2', color: '#DC2626', icon: 'fa-times-circle' }
        };
        const statusStyle = statusColors[status] || statusColors['scheduled'];

        return `
            <div class="card" style="padding: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="background: linear-gradient(135deg, #3B82F6, #1D4ED8); width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-video" style="color: white; font-size: 1.1rem;"></i>
                        </div>
                        <div>
                            <h4 style="margin: 0; font-size: 1rem; font-weight: 600; color: var(--heading);">${subject}</h4>
                            <p style="margin: 0; font-size: 0.8rem; color: var(--text-secondary);">with ${tutorName}</p>
                        </div>
                    </div>
                    <span style="background: ${statusStyle.bg}; color: ${statusStyle.color}; font-size: 0.7rem; padding: 4px 10px; border-radius: 10px; font-weight: 600; text-transform: capitalize;">
                        <i class="fas ${statusStyle.icon}" style="margin-right: 4px;"></i>${status}
                    </span>
                </div>
                <div style="display: flex; gap: 1.5rem; font-size: 0.8rem; color: var(--text-muted);">
                    <span><i class="fas fa-calendar" style="margin-right: 0.25rem;"></i> ${scheduledTime}</span>
                    <span><i class="fas fa-clock" style="margin-right: 0.25rem;"></i> ${duration}</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Filter student sessions by status
 * @param {string} filter - 'all', 'scheduled', 'in-progress', 'completed', 'cancelled'
 */
function filterStudentSessions(filter) {
    // Update button styles
    document.querySelectorAll('.session-filter-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'var(--bg-secondary)';
        btn.style.color = 'var(--text-primary)';
    });
    const activeBtn = event?.target;
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.background = 'var(--primary-color)';
        activeBtn.style.color = 'white';
    }

    // Filter sessions
    let filtered = allStudentSessions;
    if (filter !== 'all') {
        filtered = allStudentSessions.filter(s => s.status === filter);
    }

    renderStudentSessions(filtered);
}

// Make session functions available globally
window.loadStudentSessions = loadStudentSessions;
window.filterStudentSessions = filterStudentSessions;

// ============================================
// STUDENT COURSEWORK
// Used in student-details-modal when opened from parent-profile
// ============================================

let allStudentCoursework = [];

/**
 * Load coursework for a specific student
 * @param {number} studentProfileId - The student profile ID
 */
async function loadStudentCoursework(studentProfileId) {
    const container = document.getElementById('student-coursework-grid');
    const totalStat = document.getElementById('coursework-stat-total');
    const pendingStat = document.getElementById('coursework-stat-pending');
    const completedStat = document.getElementById('coursework-stat-completed');
    const avgStat = document.getElementById('coursework-stat-avg');

    if (!container) return;

    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
        const token = localStorage.getItem('token');

        // Try to fetch coursework for this student
        const response = await fetch(`${API_BASE_URL}/api/coursework/student/${studentProfileId}/list`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Coursework not available');
        }

        const data = await response.json();
        allStudentCoursework = data.coursework || data || [];

        console.log('[loadStudentCoursework] Coursework:', allStudentCoursework);

        // Update stats
        const pending = allStudentCoursework.filter(c => c.status === 'pending' || c.status === 'assigned').length;
        const completed = allStudentCoursework.filter(c => c.status === 'completed' || c.status === 'graded').length;
        const scores = allStudentCoursework.filter(c => c.score !== null && c.score !== undefined).map(c => c.score);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

        if (totalStat) totalStat.textContent = allStudentCoursework.length;
        if (pendingStat) pendingStat.textContent = pending;
        if (completedStat) completedStat.textContent = completed;
        if (avgStat) avgStat.textContent = avgScore !== null ? `${avgScore}%` : '-';

        // Render coursework
        renderStudentCoursework(allStudentCoursework);

    } catch (error) {
        console.log('[loadStudentCoursework] Info:', error.message);

        // Update stats to 0
        if (totalStat) totalStat.textContent = '0';
        if (pendingStat) pendingStat.textContent = '0';
        if (completedStat) completedStat.textContent = '0';
        if (avgStat) avgStat.textContent = '-';

        // Show empty state
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-book-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No coursework yet</p>
                <p style="font-size: 0.875rem;">Assignments, quizzes, and projects will appear here</p>
            </div>
        `;
    }
}

/**
 * Render student coursework to the container
 * @param {Array} coursework - Array of coursework objects
 */
function renderStudentCoursework(coursework) {
    const container = document.getElementById('student-coursework-grid');
    if (!container) return;

    if (coursework.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-book-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No coursework found</p>
                <p style="font-size: 0.875rem;">Assignments, quizzes, and projects will appear here</p>
            </div>
        `;
        return;
    }

    container.innerHTML = coursework.map(cw => {
        const title = cw.title || 'Untitled';
        const type = cw.coursework_type || cw.type || 'Assignment';
        const status = cw.status || 'pending';
        const dueDate = cw.due_date ? new Date(cw.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date';
        const score = cw.score !== null && cw.score !== undefined ? `${cw.score}%` : '-';
        const courseName = cw.course_name || 'General';

        const statusColors = {
            'pending': { bg: '#FEF3C7', color: '#D97706' },
            'assigned': { bg: '#EEF2FF', color: '#4F46E5' },
            'submitted': { bg: '#DBEAFE', color: '#2563EB' },
            'graded': { bg: '#D1FAE5', color: '#059669' },
            'completed': { bg: '#D1FAE5', color: '#059669' },
            'overdue': { bg: '#FEE2E2', color: '#DC2626' }
        };
        const statusStyle = statusColors[status] || statusColors['pending'];

        const typeIcons = {
            'quiz': 'fa-question-circle',
            'assignment': 'fa-file-alt',
            'project': 'fa-project-diagram',
            'exam': 'fa-clipboard-list'
        };
        const typeIcon = typeIcons[type.toLowerCase()] || 'fa-file-alt';

        return `
            <div class="card" style="padding: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="background: linear-gradient(135deg, #8B5CF6, #6D28D9); width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas ${typeIcon}" style="color: white; font-size: 1.1rem;"></i>
                        </div>
                        <div>
                            <h4 style="margin: 0; font-size: 1rem; font-weight: 600; color: var(--heading);">${title}</h4>
                            <p style="margin: 0; font-size: 0.8rem; color: var(--text-secondary);">${courseName} - ${type}</p>
                        </div>
                    </div>
                    <span style="background: ${statusStyle.bg}; color: ${statusStyle.color}; font-size: 0.7rem; padding: 4px 10px; border-radius: 10px; font-weight: 600; text-transform: capitalize;">${status}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
                    <span><i class="fas fa-calendar" style="margin-right: 0.25rem;"></i> Due: ${dueDate}</span>
                    <span><i class="fas fa-star" style="margin-right: 0.25rem;"></i> Score: ${score}</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Filter student coursework by status
 * @param {string} filter - 'all', 'pending', 'submitted', 'graded'
 */
function filterStudentCoursework(filter) {
    // Update tab styles
    document.querySelectorAll('.coursework-tab').forEach(tab => {
        tab.classList.remove('active');
        tab.style.color = 'var(--text-muted)';
        tab.style.borderBottomColor = 'transparent';
    });
    const activeTab = document.querySelector(`.coursework-tab[data-filter="${filter}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
        activeTab.style.color = 'var(--text)';
        activeTab.style.borderBottomColor = 'var(--button-bg)';
    }

    // Filter coursework
    let filtered = allStudentCoursework;
    if (filter !== 'all') {
        if (filter === 'pending') {
            filtered = allStudentCoursework.filter(c => c.status === 'pending' || c.status === 'assigned');
        } else if (filter === 'graded') {
            filtered = allStudentCoursework.filter(c => c.status === 'graded' || c.status === 'completed');
        } else {
            filtered = allStudentCoursework.filter(c => c.status === filter);
        }
    }

    renderStudentCoursework(filtered);
}

// Make coursework functions available globally
window.loadStudentCoursework = loadStudentCoursework;
window.filterStudentCoursework = filterStudentCoursework;

// ============================================
// STUDENT DETAILS MODAL CONTEXT MANAGEMENT
// Controls visibility of Parent/Tutor sections based on where modal is opened
// ============================================

// Context: 'tutor-profile' | 'parent-profile' | 'student-profile' | null
window.studentDetailsModalContext = null;

/**
 * Set the context for student details modal
 * @param {string} context - 'tutor-profile' or 'parent-profile' or 'student-profile'
 */
function setStudentDetailsModalContext(context) {
    window.studentDetailsModalContext = context;
    console.log('[StudentDetailsModal] Context set to:', context);
    applyStudentDetailsModalContextVisibility();
}

/**
 * Apply visibility rules based on context
 * - From tutor-profile: Hide Tutor section, Show Parent section
 * - From parent-profile: Hide Parent section, Show Tutor section, Hide Review Student button
 * - From student-profile: Show both sections
 */
function applyStudentDetailsModalContextVisibility() {
    const context = window.studentDetailsModalContext;

    // Get menu items
    const parentMenuItem = document.getElementById('parent-menu-item');
    const tutorMenuItem = document.getElementById('tutor-menu-item');

    // Get sections
    const parentSection = document.getElementById('parent');
    const tutorSection = document.getElementById('tutor');

    // Get Review Student button
    const reviewStudentBtn = document.getElementById('review-student-btn');

    console.log('[StudentDetailsModal] Applying visibility for context:', context);

    if (context === 'tutor-profile') {
        // Opened from tutor-profile: Hide Tutor section, Show Parent section, Show Review button
        if (tutorMenuItem) tutorMenuItem.style.display = 'none';
        if (tutorSection) tutorSection.style.display = 'none';
        if (parentMenuItem) parentMenuItem.style.display = 'flex';
        if (reviewStudentBtn) reviewStudentBtn.style.display = 'flex';
    } else if (context === 'parent-profile') {
        // Opened from parent-profile: Hide Parent section, Show Tutor section, Hide Review button
        if (parentMenuItem) parentMenuItem.style.display = 'none';
        if (parentSection) parentSection.style.display = 'none';
        if (tutorMenuItem) tutorMenuItem.style.display = 'flex';
        // Parents should not review their own children
        if (reviewStudentBtn) reviewStudentBtn.style.display = 'none';
    } else {
        // Default or student-profile: Show both
        if (parentMenuItem) parentMenuItem.style.display = 'flex';
        if (tutorMenuItem) tutorMenuItem.style.display = 'flex';
        if (reviewStudentBtn) reviewStudentBtn.style.display = 'flex';
    }
}

/**
 * Clear the context (called when modal is closed)
 */
function clearStudentDetailsModalContext() {
    window.studentDetailsModalContext = null;

    // Reset visibility
    const parentMenuItem = document.getElementById('parent-menu-item');
    const tutorMenuItem = document.getElementById('tutor-menu-item');
    const reviewStudentBtn = document.getElementById('review-student-btn');

    if (parentMenuItem) parentMenuItem.style.display = 'flex';
    if (tutorMenuItem) tutorMenuItem.style.display = 'flex';
    if (reviewStudentBtn) reviewStudentBtn.style.display = 'flex';
}

// Make context functions available globally
window.setStudentDetailsModalContext = setStudentDetailsModalContext;
window.applyStudentDetailsModalContextVisibility = applyStudentDetailsModalContextVisibility;
window.clearStudentDetailsModalContext = clearStudentDetailsModalContext;

// ============================================
// STUDENT REVIEWS FUNCTIONS (for parent-profile)
// ============================================

// Load Student Reviews (from tutor-profile's implementation)
async function loadStudentReviews(studentProfileId) {
    const container = document.getElementById('student-reviews-container');
    if (!container) {
        console.error('[loadStudentReviews] Container not found');
        return;
    }

    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE_URL}/api/student/reviews/${studentProfileId}`);

        if (!response.ok) throw new Error('Failed to fetch reviews');

        const data = await response.json();
        const reviews = data.reviews || [];

        console.log('[loadStudentReviews] Reviews:', reviews);

        if (reviews.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; background: var(--bg-secondary); border-radius: 12px; border: 2px dashed var(--border-color);">
                    <i class="fas fa-star" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <h4 style="color: var(--text-primary); margin-bottom: 0.5rem;">No Reviews Yet</h4>
                    <p style="color: var(--text-secondary); font-size: 0.875rem;">This student hasn't received any reviews yet</p>
                </div>
            `;

            // Reset rating summary
            updateRatingSummary(null);
            return;
        }

        // Calculate averages
        const avgSubjectUnderstanding = reviews.reduce((sum, r) => sum + (r.subject_understanding || 0), 0) / reviews.length;
        const avgParticipation = reviews.reduce((sum, r) => sum + (r.participation || 0), 0) / reviews.length;
        const avgDiscipline = reviews.reduce((sum, r) => sum + (r.discipline || 0), 0) / reviews.length;
        const avgPunctuality = reviews.reduce((sum, r) => sum + (r.punctuality || 0), 0) / reviews.length;
        const overallRating = (avgSubjectUnderstanding + avgParticipation + avgDiscipline + avgPunctuality) / 4;

        // Update rating summary
        updateRatingSummary({
            overall: overallRating,
            count: reviews.length,
            subject_understanding: avgSubjectUnderstanding,
            participation: avgParticipation,
            discipline: avgDiscipline,
            punctuality: avgPunctuality
        });

        // Render reviews
        container.innerHTML = reviews.map(review => createReviewCard(review)).join('');

    } catch (error) {
        console.error('[loadStudentReviews] Error:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Failed to load reviews</p>
            </div>
        `;
    }
}

function updateRatingSummary(stats) {
    const overallEl = document.getElementById('student-overall-rating');
    const countEl = document.getElementById('student-review-count');
    const starsEl = document.getElementById('student-rating-stars');

    if (!stats) {
        if (overallEl) overallEl.textContent = '0.0';
        if (countEl) countEl.textContent = 'Based on 0 reviews';
        if (starsEl) starsEl.textContent = '☆☆☆☆☆';

        ['subject-understanding', 'participation', 'discipline', 'punctuality'].forEach(key => {
            const bar = document.getElementById(`bar-${key}`);
            const val = document.getElementById(`val-${key}`);
            if (bar) bar.style.width = '0%';
            if (val) val.textContent = '0.0';
        });
        return;
    }

    if (overallEl) overallEl.textContent = stats.overall.toFixed(1);
    if (countEl) countEl.textContent = `Based on ${stats.count} review${stats.count !== 1 ? 's' : ''}`;

    if (starsEl) {
        const fullStars = Math.floor(stats.overall);
        const hasHalf = stats.overall - fullStars >= 0.5;
        let stars = '★'.repeat(fullStars);
        if (hasHalf) stars += '½';
        stars += '☆'.repeat(5 - fullStars - (hasHalf ? 1 : 0));
        starsEl.textContent = stars;
    }

    const barMapping = {
        'subject-understanding': stats.subject_understanding,
        'participation': stats.participation,
        'discipline': stats.discipline,
        'punctuality': stats.punctuality
    };

    Object.entries(barMapping).forEach(([key, value]) => {
        const bar = document.getElementById(`bar-${key}`);
        const val = document.getElementById(`val-${key}`);
        if (bar) bar.style.width = `${(value / 5) * 100}%`;
        if (val) val.textContent = value.toFixed(1);
    });
}

function createReviewCard(review) {
    const reviewerName = review.reviewer_name || 'Anonymous';
    const reviewerRole = review.reviewer_role || 'Tutor';
    const reviewDate = review.created_at ? new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    const rating = review.rating ? review.rating.toFixed(1) : '0.0';

    return `
        <div class="card" style="padding: 1.5rem; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--bg-secondary); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                        👤
                    </div>
                    <div>
                        <h4 style="margin: 0; font-size: 1rem; font-weight: 600; color: var(--heading);">${reviewerName}</h4>
                        <p style="margin: 0; font-size: 0.75rem; color: var(--text-muted);">${reviewerRole} • ${reviewDate}</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.25rem; background: #FEF3C7; padding: 0.25rem 0.75rem; border-radius: 12px;">
                    <span style="color: #f59e0b;">★</span>
                    <span style="font-weight: 600; color: #B45309;">${rating}</span>
                </div>
            </div>

            ${review.review_title ? `<h5 style="margin: 0 0 0.5rem 0; font-size: 1rem; font-weight: 600; color: var(--text);">${review.review_title}</h5>` : ''}
            ${review.review_text ? `<p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5;">${review.review_text}</p>` : ''}
        </div>
    `;
}

// Make review functions available globally
window.loadStudentReviews = loadStudentReviews;
