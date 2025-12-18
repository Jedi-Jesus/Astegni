/**
 * View Student Parents Manager
 * Dynamically loads and displays parent cards from student_profiles.parent_id[]
 * Uses the /api/view-student/{student_profile_id}/parents endpoint
 */

// API_BASE_URL is defined in view-student-reviews.js

/**
 * Fetch parents for a student from the API
 * @param {number} studentProfileId - The student_profiles.id
 * @returns {Promise<Array>} Array of parent objects
 */
async function fetchStudentParents(studentProfileId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/view-student/${studentProfileId}/parents`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const parents = await response.json();
        console.log(`Fetched ${parents.length} parents for student ${studentProfileId}`);
        return parents;
    } catch (error) {
        console.error('Error fetching student parents:', error);
        return [];
    }
}

/**
 * Get relationship badge color based on type
 * @param {string} relationshipType - Parent's relationship type
 * @returns {object} Color configuration
 */
function getRelationshipColors(relationshipType) {
    const type = (relationshipType || '').toLowerCase();

    const colors = {
        'father': {
            gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            border: 'rgba(59, 130, 246, 0.2)',
            badge: 'Primary Guardian',
            shadow: 'rgba(59, 130, 246, 0.3)'
        },
        'mother': {
            gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
            border: 'rgba(245, 158, 11, 0.2)',
            badge: 'Co-Guardian',
            shadow: 'rgba(245, 158, 11, 0.3)'
        },
        'guardian': {
            gradient: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'rgba(16, 185, 129, 0.2)',
            badge: 'Guardian',
            shadow: 'rgba(16, 185, 129, 0.3)'
        },
        'sibling': {
            gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            border: 'rgba(139, 92, 246, 0.2)',
            badge: 'Sibling',
            shadow: 'rgba(139, 92, 246, 0.3)'
        },
        'parent': {
            gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            border: 'rgba(99, 102, 241, 0.2)',
            badge: 'Parent',
            shadow: 'rgba(99, 102, 241, 0.3)'
        }
    };

    return colors[type] || colors['parent'];
}

/**
 * Get default avatar based on relationship type
 * @param {string} relationshipType - Parent's relationship type
 * @returns {string} Default avatar path
 */
function getDefaultParentAvatar(relationshipType) {
    const type = (relationshipType || '').toLowerCase();

    if (type === 'father' || type === 'dad') {
        return '../uploads/system_images/system_profile_pictures/Dad-profile.jpg';
    } else if (type === 'mother' || type === 'mom') {
        return '../uploads/system_images/system_profile_pictures/Mom-profile.jpg';
    } else {
        return '../uploads/system_images/system_profile_pictures/man-user.jpg';
    }
}

/**
 * Create a parent card HTML
 * @param {object} parent - Parent data object
 * @param {boolean} isPrimary - Whether this is the primary guardian
 * @returns {string} HTML string for the parent card
 */
function createParentCard(parent, isPrimary = false) {
    const colors = getRelationshipColors(parent.relationship_type);
    const fullName = `${parent.first_name || ''} ${parent.father_name || ''}`.trim() || 'Parent';
    const avatar = parent.profile_picture || getDefaultParentAvatar(parent.relationship_type);
    const email = parent.email || 'Not provided';
    const phone = parent.phone || 'Not provided';
    const relationship = parent.relationship_type || 'Parent';
    const badgeText = isPrimary ? 'Primary Guardian' : colors.badge;

    return `
        <div style="background: var(--card-bg); border-radius: 16px; padding: 2rem; border: 2px solid ${colors.border}; position: relative; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); transition: transform 0.3s ease, box-shadow 0.3s ease;">
            <div style="position: absolute; top: 1rem; right: 1rem; background: ${colors.gradient}; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; box-shadow: 0 2px 8px ${colors.shadow};">
                ${badgeText}
            </div>

            <div style="display: flex; gap: 1.5rem; margin-bottom: 1.5rem;">
                <div style="flex-shrink: 0;">
                    <img src="${avatar}"
                        alt="${relationship}"
                        onerror="this.src='${getDefaultParentAvatar(parent.relationship_type)}'"
                        style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid var(--primary-color); box-shadow: 0 4px 12px ${colors.shadow};">
                </div>
                <div style="flex: 1;">
                    <a href="../view-profiles/view-parent.html?id=${parent.id}"
                        style="text-decoration: none; color: inherit;">
                        <h3 style="font-size: 1.5rem; font-weight: 600; color: var(--heading); margin-bottom: 0.5rem; cursor: pointer; transition: color 0.3s;"
                            onmouseover="this.style.color='var(--primary-color)'"
                            onmouseout="this.style.color='var(--heading)'">${fullName}
                        </h3>
                    </a>
                    <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 0.75rem;">
                        ${relationship} ${isPrimary ? '- Primary Guardian' : ''}</p>
                    <div style="display: flex; gap: 0.5rem;">
                        <span style="background: rgba(245, 158, 11, 0.15); color: var(--primary-color); padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">${parent.is_active ? 'Active' : 'Inactive'}</span>
                        ${parent.is_verified ? '<span style="background: rgba(34, 197, 94, 0.15); color: #059669; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">Verified</span>' : ''}
                    </div>
                </div>
            </div>

            <div style="background: rgba(245, 158, 11, 0.05); border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; border: 1px solid rgba(245, 158, 11, 0.1);">
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.25rem;">📧</span>
                        <div>
                            <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0;">Email</p>
                            <p style="font-size: 0.95rem; color: var(--text); margin: 0; font-weight: 500;">${email}</p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.25rem;">📱</span>
                        <div>
                            <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0;">Phone</p>
                            <p style="font-size: 0.95rem; color: var(--text); margin: 0; font-weight: 500;">${phone}</p>
                        </div>
                    </div>
                    ${parent.location ? `
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 1.25rem;">📍</span>
                        <div>
                            <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0;">Location</p>
                            <p style="font-size: 0.95rem; color: var(--text); margin: 0; font-weight: 500;">${parent.location}</p>
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div style="display: flex; justify-content: center;">
                <button onclick="messageParent(${parent.user_id || parent.id}, ${parent.id}, '${fullName.replace(/'/g, "\\'")}', '${avatar.replace(/'/g, "\\'")}')"
                    style="width: 100%; padding: 0.75rem; background: var(--primary-color); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <span>💬</span> Message
                </button>
            </div>
        </div>
    `;
}

/**
 * Create empty state HTML when no parents are linked
 * @returns {string} HTML string for empty state
 */
function createEmptyParentsState() {
    return `
        <div style="text-align: center; padding: 3rem 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">👨‍👩‍👧</div>
            <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--heading); margin-bottom: 0.5rem;">No Parents Linked</h3>
            <p style="color: var(--text-secondary); font-size: 0.95rem;">This student hasn't linked any parents or guardians to their profile yet.</p>
        </div>
    `;
}

/**
 * Render parents into the parents panel container
 * @param {Array} parents - Array of parent objects
 */
function renderParentsPanel(parents) {
    const container = document.getElementById('parents-cards-container');

    if (!container) {
        console.error('Parents cards container not found (id: parents-cards-container)');
        return;
    }

    if (!parents || parents.length === 0) {
        container.innerHTML = createEmptyParentsState();
        return;
    }

    // Create cards HTML
    const cardsHtml = parents.map((parent, index) => {
        // First parent is typically primary guardian
        const isPrimary = index === 0;
        return createParentCard(parent, isPrimary);
    }).join('');

    container.innerHTML = cardsHtml;
    console.log(`Rendered ${parents.length} parent cards`);
}

/**
 * Initialize parents panel loading
 * @param {number} studentProfileId - The student_profiles.id
 */
async function initializeStudentParents(studentProfileId) {
    console.log('Initializing student parents for profile ID:', studentProfileId);

    // Show loading state
    const container = document.getElementById('parents-cards-container');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div class="loading-spinner" style="width: 40px; height: 40px; border: 3px solid var(--border); border-top-color: var(--primary-color); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                <p style="color: var(--text-secondary);">Loading parents...</p>
            </div>
        `;
    }

    // Fetch and render parents
    const parents = await fetchStudentParents(studentProfileId);
    renderParentsPanel(parents);
}

// Export to window for global access
window.initializeStudentParents = initializeStudentParents;
window.fetchStudentParents = fetchStudentParents;

// Add spinner animation if not already present
(function() {
    if (!document.getElementById('parents-panel-styles')) {
        const style = document.createElement('style');
        style.id = 'parents-panel-styles';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
})();

/**
 * Message a parent - opens chat modal with parent as target
 * @param {number} userId - Parent's user ID (from users table)
 * @param {number} profileId - Parent's profile ID (from parent_profiles table)
 * @param {string} parentName - Parent's name
 * @param {string} profilePicture - Parent's profile picture URL
 */
function messageParent(userId, profileId, parentName, profilePicture) {
    console.log('[ViewStudentParents] messageParent called with:', { userId, profileId, parentName, profilePicture });

    // Check if chat modal HTML is loaded
    const chatModal = document.getElementById('chatModal');
    if (!chatModal) {
        console.warn('[ViewStudentParents] Chat modal HTML not loaded yet, retrying in 500ms...');
        if (typeof showNotification === 'function') {
            showNotification('Loading chat... Please wait.', 'info');
        }
        // Retry after a short delay
        setTimeout(() => messageParent(userId, profileId, parentName, profilePicture), 500);
        return;
    }

    // Open chat modal with parent's data
    if (typeof ChatModalManager !== 'undefined' && typeof ChatModalManager.open === 'function') {
        const targetUser = {
            user_id: userId,
            id: userId,
            profile_id: profileId,
            full_name: parentName,
            name: parentName,
            profile_picture: profilePicture || '',
            avatar: profilePicture || '',
            profile_type: 'parent',
            role: 'parent'
        };

        console.log('[ViewStudentParents] Opening chat with parent:', targetUser);
        ChatModalManager.open(targetUser);
    } else if (typeof openChatModal === 'function') {
        const targetUser = {
            user_id: userId,
            id: userId,
            profile_id: profileId,
            full_name: parentName,
            name: parentName,
            profile_picture: profilePicture || '',
            avatar: profilePicture || '',
            profile_type: 'parent',
            role: 'parent'
        };
        console.log('[ViewStudentParents] Opening chat with openChatModal:', targetUser);
        openChatModal(targetUser);
    } else {
        console.error('[ViewStudentParents] ChatModalManager not available. ChatModalManager:', typeof ChatModalManager);
        if (typeof showNotification === 'function') {
            showNotification('Chat feature is loading. Please try again.', 'info');
        } else {
            alert('Chat feature is loading. Please try again.');
        }
    }
}

// Export to window for onclick handlers
window.messageParent = messageParent;
