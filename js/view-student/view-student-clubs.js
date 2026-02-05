/**
 * View Student Clubs Manager
 * Dynamically loads and displays student clubs
 */

// Category colors mapping for clubs
const CLUB_CATEGORY_COLORS = {
    'Academic': { gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.05)' },
    'Science': { gradient: 'linear-gradient(135deg, #10b981, #059669)', border: '#10b981', bg: 'rgba(16, 185, 129, 0.05)' },
    'Technology': { gradient: 'linear-gradient(135deg, #667eea, #764ba2)', border: '#667eea', bg: 'rgba(102, 126, 234, 0.05)' },
    'Communication': { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.05)' },
    'Cultural': { gradient: 'linear-gradient(135deg, #ec4899, #db2777)', border: '#ec4899', bg: 'rgba(236, 72, 153, 0.05)' },
    'Arts': { gradient: 'linear-gradient(135deg, #a855f7, #9333ea)', border: '#a855f7', bg: 'rgba(168, 85, 247, 0.05)' },
    'Sports': { gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', border: '#22c55e', bg: 'rgba(34, 197, 94, 0.05)' },
    'default': { gradient: 'linear-gradient(135deg, #6b7280, #4b5563)', border: '#6b7280', bg: 'rgba(107, 114, 128, 0.05)' }
};

/**
 * Fetch student clubs from API
 */
async function fetchStudentClubs(studentId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return [];
        }

        console.log(`🔍 Fetching clubs for student ID: ${studentId}`);
        const response = await fetch(`${API_BASE_URL}/api/student/${studentId}/clubs`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Clubs API response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Clubs API error:', errorData);
            throw new Error('Failed to fetch clubs');
        }

        const data = await response.json();
        console.log('✅ Clubs API success:', data);
        return data.clubs || [];
    } catch (error) {
        console.error('Error fetching student clubs:', error);
        return [];
    }
}

/**
 * Format date to readable string
 */
function formatClubDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Get club category color
 */
function getClubCategoryColor(category) {
    return CLUB_CATEGORY_COLORS[category] || CLUB_CATEGORY_COLORS['default'];
}

/**
 * Render a single club card
 */
function renderClubCard(club) {
    const colors = getClubCategoryColor(club.category);
    const membershipBadge = club.is_member ? '<span class="club-member-badge">Member</span>' : '';
    const creatorBadge = club.is_creator ? '<span class="club-creator-badge">Creator</span>' : '';
    const memberPercentage = club.member_limit ? Math.round((club.member_count / club.member_limit) * 100) : 0;

    // Format subjects array
    const subjects = Array.isArray(club.subjects) ? club.subjects : [];
    const subjectsHTML = subjects.slice(0, 3).map(subject =>
        `<span class="club-subject-tag">${subject}</span>`
    ).join('');
    const moreSubjects = subjects.length > 3 ? `<span class="club-subject-tag">+${subjects.length - 3} more</span>` : '';

    return `
        <div class="club-card" data-club-id="${club.id}">
            <div class="club-card-header">
                ${club.club_picture ?
                    `<img src="${club.club_picture}" alt="${club.title}" class="club-card-image" />` :
                    `<div class="club-card-placeholder" style="background: ${colors.gradient};">
                        <i class="fas fa-users"></i>
                    </div>`
                }
                <div class="club-card-badges">
                    ${membershipBadge}
                    ${creatorBadge}
                </div>
            </div>

            <div class="club-card-content">
                <div class="club-card-category" style="color: ${colors.border}; background: ${colors.bg}; border-left: 3px solid ${colors.border};">
                    <i class="fas fa-tag"></i>
                    ${club.category}
                </div>

                <h3 class="club-card-title">${club.title}</h3>

                <p class="club-card-description">${club.description.substring(0, 120)}${club.description.length > 120 ? '...' : ''}</p>

                <div class="club-subjects">
                    ${subjectsHTML}
                    ${moreSubjects}
                </div>

                <div class="club-stats">
                    <div class="club-stat-item">
                        <i class="fas fa-users"></i>
                        <span>${club.member_count} / ${club.member_limit || '∞'} members</span>
                    </div>
                    <div class="club-stat-item">
                        <i class="fas fa-clock"></i>
                        <span>${club.meeting_schedule || 'TBD'}</span>
                    </div>
                </div>

                ${club.member_limit ? `
                    <div class="club-progress">
                        <div class="club-progress-bar">
                            <div class="club-progress-fill" style="width: ${memberPercentage}%; background: ${colors.gradient};"></div>
                        </div>
                        <span class="club-progress-text">${memberPercentage}% full</span>
                    </div>
                ` : ''}

                <div class="club-info">
                    <div class="club-info-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${club.meeting_location || 'Location TBD'}</span>
                    </div>
                    ${club.is_paid ? `
                        <div class="club-info-item club-fee">
                            <i class="fas fa-money-bill-wave"></i>
                            <span>${club.membership_fee} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}</span>
                        </div>
                    ` : `
                        <div class="club-info-item club-free">
                            <i class="fas fa-check-circle"></i>
                            <span>Free</span>
                        </div>
                    `}
                </div>

                <div class="club-card-actions">
                    <button class="club-view-btn" onclick="viewClubDetails(${club.id})">
                        <i class="fas fa-eye"></i>
                        View Details
                    </button>
                    ${!club.is_member ? `
                        <button class="club-join-btn" onclick="joinClub(${club.id})">
                            <i class="fas fa-user-plus"></i>
                            Join Club
                        </button>
                    ` : `
                        <button class="club-joined-btn" disabled>
                            <i class="fas fa-check"></i>
                            Already Joined
                        </button>
                    `}
                </div>

                <div class="club-card-footer">
                    <span class="club-date">Created ${formatClubDate(club.created_at)}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Load and display clubs
 */
async function loadStudentClubs(studentId) {
    const clubsPanel = document.getElementById('clubs-panel');
    if (!clubsPanel) return;

    const clubsContent = clubsPanel.querySelector('.clubs-content');
    if (!clubsContent) {
        console.error('Clubs content container not found');
        return;
    }

    // Show loading state
    clubsContent.innerHTML = '<div class="clubs-loading"><i class="fas fa-spinner fa-spin"></i> Loading clubs...</div>';

    try {
        const clubs = await fetchStudentClubs(studentId);
        console.log('📊 Fetched clubs data:', clubs);
        console.log('📊 Clubs array length:', clubs ? clubs.length : 'null/undefined');
        console.log('📊 Clubs is array?', Array.isArray(clubs));

        if (!clubs || clubs.length === 0) {
            clubsContent.innerHTML = `
                <div class="clubs-empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No Clubs Yet</h3>
                    <p>This student hasn't joined or created any clubs yet.</p>
                </div>
            `;
            return;
        }

        // Render clubs in grid
        console.log('🎨 Starting to render clubs...');
        try {
            const cardsHTML = clubs.map((club, index) => {
                console.log(`🎨 Rendering club ${index + 1}:`, club.title);
                return renderClubCard(club);
            }).join('');

            console.log('🎨 Rendering clubs cards HTML length:', cardsHTML.length);
            console.log('🎨 First club card preview:', cardsHTML.substring(0, 200));

            clubsContent.innerHTML = `
                <div class="clubs-grid">
                    ${cardsHTML}
                </div>
            `;

            console.log('✅ Clubs cards rendered to DOM');
            console.log('🔍 DOM Check - clubsContent.innerHTML length:', clubsContent.innerHTML.length);
            console.log('🔍 DOM Check - Number of .club-card elements:', clubsContent.querySelectorAll('.club-card').length);
            console.log('🔍 DOM Check - clubs-grid exists?', clubsContent.querySelector('.clubs-grid') !== null);

            // Check if cards are visible
            const firstCard = clubsContent.querySelector('.club-card');
            if (firstCard) {
                const styles = window.getComputedStyle(firstCard);
                console.log('🔍 First card styles - display:', styles.display, 'visibility:', styles.visibility, 'height:', styles.height);
            }
        } catch (renderError) {
            console.error('❌ Error rendering clubs cards:', renderError);
            throw renderError;
        }

    } catch (error) {
        console.error('Error loading clubs:', error);
        clubsContent.innerHTML = `
            <div class="clubs-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load clubs. Please try again.</p>
            </div>
        `;
    }
}

/**
 * View club details (placeholder function)
 */
function viewClubDetails(clubId) {
    console.log('Viewing club details for club ID:', clubId);
    // TODO: Implement club details modal or navigation
    alert(`Club details functionality coming soon! Club ID: ${clubId}`);
}

/**
 * Join a club
 */
async function joinClub(clubId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to join a club');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/clubs/${clubId}/join`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            alert('Successfully joined the club!');
            // Reload clubs to update UI
            const urlParams = new URLSearchParams(window.location.search);
            const studentId = urlParams.get('id');
            if (studentId) {
                loadStudentClubs(studentId);
            }
        } else {
            const error = await response.json();
            alert(error.detail || 'Failed to join club');
        }
    } catch (error) {
        console.error('Error joining club:', error);
        alert('Failed to join club. Please try again.');
    }
}

// Make functions globally available
window.viewClubDetails = viewClubDetails;
window.joinClub = joinClub;
window.loadStudentClubs = loadStudentClubs;
