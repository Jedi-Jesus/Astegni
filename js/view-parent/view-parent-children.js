/**
 * View Parent Children Manager
 * Handles loading and displaying children profiles from student_profiles table
 * Reads from parent_profiles.children_ids which contains student_profile.id values
 */

// Use the same API base URL as the loader
const CHILDREN_API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? (window.API_BASE_URL || 'http://localhost:8000')
    : 'https://api.astegni.com';

class ViewParentChildren {
    constructor() {
        this.children = [];
        this.parentId = null;
    }

    /**
     * Initialize children display
     * @param {Array} childrenInfo - Array of children from parent API response
     */
    init(childrenInfo) {
        this.children = childrenInfo || [];

        // Update children count in sidebar badge
        this.updateSidebarBadge();

        // Update dashboard children section
        this.updateDashboardChildren();

        // Update children profiles panel
        this.updateChildrenPanel();

        // Update hero stats
        this.updateHeroChildrenCount();

        console.log(`Initialized ${this.children.length} children`);
    }

    /**
     * Update sidebar badge count
     */
    updateSidebarBadge() {
        // Try specific ID first, then fallback to data-panel selector
        const badge = document.getElementById('children-count-badge') ||
            document.querySelector('[data-panel="children-profiles"] .badge-count');
        if (badge) {
            badge.textContent = this.children.length;
        }
    }

    /**
     * Update hero section children count
     */
    updateHeroChildrenCount() {
        const childrenStat = document.querySelector('.stat-item:nth-child(1) .stat-number');
        if (childrenStat) {
            childrenStat.setAttribute('data-target', this.children.length);
            childrenStat.textContent = this.children.length;
        }
    }

    /**
     * Update dashboard children section (shows summary cards)
     */
    updateDashboardChildren() {
        // Find the Parent Statistics section and update children count
        const statsSection = document.querySelector('#dashboard-panel section h2');
        if (!statsSection) return;

        // Find all stat items in Parent Statistics
        const parentStatsHeaders = document.querySelectorAll('#dashboard-panel h2');
        parentStatsHeaders.forEach(header => {
            if (header.textContent.includes('Parent Statistics')) {
                const statsContainer = header.nextElementSibling;
                if (statsContainer) {
                    const statItems = statsContainer.querySelectorAll('[style*="text-align: center"]');
                    // First stat is Children Enrolled
                    if (statItems[0]) {
                        const valueEl = statItems[0].querySelector('div:nth-child(2)');
                        if (valueEl) {
                            valueEl.textContent = this.children.length;
                        }
                        // Update subtitle
                        const subtitleEl = statItems[0].querySelector('div:nth-child(4)');
                        if (subtitleEl) {
                            subtitleEl.textContent = this.children.length === this.children.filter(c => c.grade_level).length
                                ? 'All Active'
                                : `${this.children.filter(c => c.grade_level).length} Active`;
                        }
                    }
                }
            }
        });
    }

    /**
     * Update children profiles panel with dynamic cards
     */
    updateChildrenPanel() {
        const panel = document.getElementById('children-profiles-panel');
        if (!panel) return;

        const grid = panel.querySelector('.children-cards-grid');
        if (!grid) return;

        // Update header count
        const header = panel.querySelector('p');
        if (header) {
            header.textContent = `View detailed profiles and academic progress of ${this.children.length} child${this.children.length !== 1 ? 'ren' : ''}`;
        }

        // Clear existing cards
        grid.innerHTML = '';

        // If no children, show empty state
        if (this.children.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">👨‍👩‍👧‍👦</div>
                    <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--heading); margin-bottom: 0.5rem;">
                        No Children Linked
                    </h3>
                    <p style="color: var(--text-secondary);">
                        This parent hasn't linked any children to their profile yet.
                    </p>
                </div>
            `;
            return;
        }

        // Create cards for each child
        this.children.forEach((child, index) => {
            const card = this.createChildCard(child, index);
            grid.appendChild(card);
        });
    }

    /**
     * Create a child card element
     */
    createChildCard(child, index) {
        const card = document.createElement('div');
        card.className = 'child-card';

        // Determine default avatar based on gender and name
        const defaultAvatar = this.getDefaultAvatar(child.gender, child.name);
        const profilePicture = child.profile_picture || defaultAvatar;

        // Format grade level display
        const gradeDisplay = child.grade_level || 'Grade not set';

        // Get interested subjects (first 3)
        const interests = (child.interested_in || []).slice(0, 3);
        const interestsDisplay = interests.length > 0
            ? interests.join(', ')
            : 'Not specified';

        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
                <img src="${profilePicture}" alt="${child.name}" class="child-avatar"
                    onerror="this.src='${defaultAvatar}'">
                <div style="flex: 1;">
                    <a href="view-student.html?id=${child.id}" style="text-decoration: none;">
                        <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.25rem; color: var(--heading); cursor: pointer; transition: color 0.2s ease;"
                            onmouseover="this.style.color='var(--button-bg)'"
                            onmouseout="this.style.color='var(--heading)'">${child.name}</h3>
                    </a>
                    <p style="font-size: 0.875rem; color: var(--text-secondary);">${gradeDisplay}</p>
                    ${child.username ? `<p style="font-size: 0.75rem; color: var(--text-muted);">@${child.username}</p>` : ''}
                </div>
            </div>

            <div class="child-info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                <div style="padding: 0.75rem; background: rgba(var(--button-bg-rgb), 0.05); border-radius: 8px;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.25rem;">School</div>
                    <div style="font-size: 0.85rem; color: var(--text); font-weight: 500;">${child.studying_at || 'Not specified'}</div>
                </div>
                <div style="padding: 0.75rem; background: rgba(var(--button-bg-rgb), 0.05); border-radius: 8px;">
                    <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.25rem;">Location</div>
                    <div style="font-size: 0.85rem; color: var(--text); font-weight: 500;">${child.location || 'Not specified'}</div>
                </div>
            </div>

            ${interests.length > 0 ? `
                <div style="margin-bottom: 1rem;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">Interested In</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${interests.map(interest => `
                            <span style="padding: 0.25rem 0.75rem; background: linear-gradient(135deg, rgba(79,70,229,0.1), rgba(124,58,237,0.05)); border-radius: 20px; font-size: 0.75rem; color: var(--text);">${interest}</span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${child.about ? `
                <div style="margin-bottom: 1rem;">
                    <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${child.about}
                    </p>
                </div>
            ` : ''}

            <button onclick="messageChild(${child.id}, ${child.user_id || 'null'}, '${child.name.replace(/'/g, "\\'")}', '${(profilePicture || '').replace(/'/g, "\\'")}')"
                style="width: 100%; margin-top: auto; padding: 0.75rem; background: var(--button-bg); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem;"
                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(79,70,229,0.3)'"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                <span>💬</span> Message
            </button>
        `;

        return card;
    }

    /**
     * Get default avatar based on gender using UI Avatars service
     * @param {string} gender - The gender of the child
     * @param {string} name - The name of the child (for avatar initials)
     */
    getDefaultAvatar(gender, name = 'Student') {
        // Use UI Avatars as a reliable fallback
        const encodedName = encodeURIComponent(name || 'Student');

        // Different background colors based on gender
        let bgColor = '8B5CF6'; // Purple default
        if (gender) {
            const genderLower = gender.toLowerCase();
            if (genderLower === 'female' || genderLower === 'f') {
                bgColor = 'EC4899'; // Pink for female
            } else if (genderLower === 'male' || genderLower === 'm') {
                bgColor = '3B82F6'; // Blue for male
            }
        }

        return `https://ui-avatars.com/api/?name=${encodedName}&background=${bgColor}&color=fff&size=128`;
    }
}

// Create global instance
const viewParentChildren = new ViewParentChildren();

// Initialize function to be called by loader
window.loadParentChildren = function(childrenInfo) {
    viewParentChildren.init(childrenInfo);
};

// Listen for parent data loaded event
window.addEventListener('parentDataLoaded', (event) => {
    const { parentData } = event.detail;
    if (parentData && parentData.children_info) {
        viewParentChildren.init(parentData.children_info);
    }
});

// Export for use in other modules
window.viewParentChildren = viewParentChildren;
window.ViewParentChildren = ViewParentChildren;

/**
 * Message a child - opens chat modal with child as target
 * @param {number} profileId - Child's student profile ID (from student_profiles table)
 * @param {number} userId - Child's user ID (from users table)
 * @param {string} childName - Child's name
 * @param {string} profilePicture - Child's profile picture URL
 */
function messageChild(profileId, userId, childName, profilePicture) {
    console.log('[ViewParentChildren] messageChild called with:', { profileId, userId, childName, profilePicture });

    // Check if chat modal HTML is loaded
    const chatModal = document.getElementById('chatModal');
    if (!chatModal) {
        console.warn('[ViewParentChildren] Chat modal HTML not loaded yet, retrying in 500ms...');
        if (typeof showNotification === 'function') {
            showNotification('Loading chat... Please wait.', 'info');
        }
        // Retry after a short delay
        setTimeout(() => messageChild(profileId, userId, childName, profilePicture), 500);
        return;
    }

    // Open chat modal with child's data
    if (typeof ChatModalManager !== 'undefined' && typeof ChatModalManager.open === 'function') {
        const targetUser = {
            id: profileId,
            user_id: userId,
            profile_id: profileId,
            full_name: childName,
            name: childName,
            profile_picture: profilePicture || '',
            avatar: profilePicture || '',
            profile_type: 'student',
            role: 'student'
        };

        console.log('[ViewParentChildren] Opening chat with child:', targetUser);
        ChatModalManager.open(targetUser);
    } else if (typeof openChatModal === 'function') {
        const targetUser = {
            id: profileId,
            user_id: userId,
            profile_id: profileId,
            full_name: childName,
            name: childName,
            profile_picture: profilePicture || '',
            avatar: profilePicture || '',
            profile_type: 'student',
            role: 'student'
        };
        console.log('[ViewParentChildren] Opening chat with openChatModal:', targetUser);
        openChatModal(targetUser);
    } else {
        console.error('[ViewParentChildren] ChatModalManager not available. ChatModalManager:', typeof ChatModalManager);
        if (typeof showNotification === 'function') {
            showNotification('Chat feature is loading. Please try again.', 'info');
        } else {
            alert('Chat feature is loading. Please try again.');
        }
    }
}

// Export to window for onclick handlers
window.messageChild = messageChild;
