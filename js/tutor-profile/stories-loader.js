/**
 * Stories Loader
 * Loads and displays user stories from the database
 */

const StoriesLoader = {
    currentStories: [],
    currentPage: 0,
    limit: 20,

    /**
     * Initialize stories loading
     */
    async initialize() {
        await this.loadStories();
    },

    /**
     * Load stories for current user's profile
     */
    async loadStories() {
        try {
            // Get current user and profile data
            const profileData = TutorProfileState?.tutorProfile;
            if (!profileData) {
                console.error('Profile data not available');
                this.showEmptyState();
                return;
            }

            const profileId = profileData.id;
            const profileType = 'tutor'; // Could be dynamic based on active role

            // Fetch stories from API
            const response = await TutorProfileAPI.getStories(profileId, profileType);

            if (response && response.stories) {
                this.currentStories = response.stories;
                this.renderStories();
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Error loading stories:', error);
            this.showEmptyState();
        }
    },

    /**
     * Render stories in the grid
     */
    renderStories() {
        const grid = document.getElementById('stories-grid');
        if (!grid) return;

        if (this.currentStories.length === 0) {
            this.showEmptyState();
            this.updateStats(0, 0);
            this.hideStoryRing();
            return;
        }

        grid.innerHTML = '';

        this.currentStories.forEach((story, index) => {
            const storyCard = this.createStoryCard(story, index);
            grid.appendChild(storyCard);
        });

        // Update stats
        const totalViews = this.currentStories.reduce((sum, story) => sum + (story.views || 0), 0);
        this.updateStats(this.currentStories.length, totalViews);

        // Show story ring if stories exist
        this.showStoryRing();
    },

    /**
     * Create a story card element
     */
    createStoryCard(story, index) {
        const card = document.createElement('div');
        card.className = 'story-card';
        card.style.cssText = `
            background: var(--card-bg);
            border-radius: 12px;
            overflow: hidden;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            position: relative;
        `;

        // Calculate time ago
        const timeAgo = this.getTimeAgo(story.created_at);

        card.innerHTML = `
            <div style="position: relative;" onclick="window.StoriesLoader.viewStory(${story.id})">
                ${story.media_type === 'video' ?
                    `<video src="${story.media_url}" style="width: 100%; height: 250px; object-fit: cover;" muted></video>` :
                    `<img src="${story.media_url}" alt="Story" style="width: 100%; height: 250px; object-fit: cover;">`
                }
                <div style="position: absolute; top: 10px; left: 10px; background: var(--button-bg); color: white; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">
                    ${story.media_type === 'video' ? '🎥 Video' : '📷 Photo'}
                </div>
                ${story.caption ? `
                    <div style="position: absolute; bottom: 10px; left: 10px; right: 10px;">
                        <p style="color: white; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.5); margin: 0;">
                            ${story.caption}
                        </p>
                        <p style="color: rgba(255,255,255,0.9); font-size: 0.75rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5); margin: 0;">
                            ${timeAgo}
                        </p>
                    </div>
                ` : `
                    <div style="position: absolute; bottom: 10px; left: 10px; right: 10px;">
                        <p style="color: rgba(255,255,255,0.9); font-size: 0.75rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5); margin: 0;">
                            ${timeAgo}
                        </p>
                    </div>
                `}
            </div>
            <div style="padding: 0.75rem;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.875rem; color: var(--text-muted);">👁️ ${story.views || 0} views</span>
                    <button onclick="event.stopPropagation(); window.StoriesLoader.confirmDeleteStory(${story.id})"
                        style="background: rgba(239, 68, 68, 0.9); color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.3s ease; font-size: 0.75rem; font-weight: 600;"
                        onmouseover="this.style.background='rgba(220, 38, 38, 1)'; this.style.transform='translateY(-2px)'"
                        onmouseout="this.style.background='rgba(239, 68, 68, 0.9)'; this.style.transform='translateY(0)'">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        `;

        return card;
    },

    /**
     * Show empty state when no stories
     */
    showEmptyState() {
        const grid = document.getElementById('stories-grid');
        if (!grid) return;

        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <div style="font-size: 4rem; margin-bottom: 1rem;">📱</div>
                <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem; color: var(--heading);">No Stories Yet</h3>
                <p style="margin-bottom: 1.5rem;">Share your first story with your students!</p>
                <button onclick="openUploadStoryModal('story')"
                    style="padding: 0.75rem 2rem; background: var(--button-bg); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                    Upload Story
                </button>
            </div>
        `;
    },

    /**
     * View a specific story
     */
    viewStory(storyId) {
        // Find the story index
        const storyIndex = this.currentStories.findIndex(s => s.id === storyId);
        if (storyIndex === -1) {
            console.error('Story not found:', storyId);
            return;
        }

        // Use global viewStoryAtIndex function to open the story viewer
        if (typeof window.viewStoryAtIndex === 'function') {
            window.viewStoryAtIndex(storyIndex, this.currentStories);
        } else {
            console.error('viewStoryAtIndex function not available');
        }
    },

    /**
     * Calculate time ago from timestamp
     */
    getTimeAgo(timestamp) {
        if (!timestamp) return 'Just now';

        const now = new Date();
        const created = new Date(timestamp);
        const diffMs = now - created;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays}d ago`;
    },

    /**
     * Update story stats in UI
     */
    updateStats(totalStories, totalViews) {
        // Update total stories count
        const totalStoriesEl = document.getElementById('total-stories-count');
        if (totalStoriesEl) {
            totalStoriesEl.textContent = totalStories;
        }

        // Update active stories count (same as total since we only fetch active stories)
        const activeStoriesEl = document.getElementById('active-stories-count');
        if (activeStoriesEl) {
            activeStoriesEl.textContent = totalStories;
        }

        // Update total views count
        const totalViewsEl = document.getElementById('total-views-count');
        if (totalViewsEl) {
            totalViewsEl.textContent = totalViews.toLocaleString();
        }

        // Update average views
        const avgViews = totalStories > 0 ? Math.round(totalViews / totalStories) : 0;
        const avgViewsEl = document.getElementById('avg-views-count');
        if (avgViewsEl) {
            avgViewsEl.textContent = avgViews;
        }

        // Update sidebar count
        const sidebarCount = document.getElementById('sidebar-stories-count');
        if (sidebarCount) {
            if (totalStories > 0) {
                sidebarCount.textContent = totalStories;
                sidebarCount.style.display = 'block';
            } else {
                sidebarCount.style.display = 'none';
            }
        }
    },

    /**
     * Show story ring when stories exist
     */
    showStoryRing() {
        const storyRing = document.getElementById('story-ring-wrapper');
        if (storyRing) {
            storyRing.style.display = 'block';
            storyRing.style.background = 'linear-gradient(45deg, #f59e0b, #ec4899, #8b5cf6)';
            storyRing.style.animation = 'pulse 2s infinite';
        }
    },

    /**
     * Hide story ring when no stories
     */
    hideStoryRing() {
        const storyRing = document.getElementById('story-ring-wrapper');
        if (storyRing) {
            storyRing.style.display = 'none';
        }
    },

    /**
     * Refresh stories (called after uploading new story)
     */
    async refresh() {
        await this.loadStories();
    },

    /**
     * Confirm delete story - opens confirmation modal
     */
    confirmDeleteStory(storyId) {
        const story = this.currentStories.find(s => s.id === storyId);
        if (!story) {
            console.error('Story not found:', storyId);
            return;
        }

        // Create confirmation modal
        const modal = document.createElement('div');
        modal.id = 'delete-story-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div style="background: var(--card-bg); border-radius: 16px; padding: 2rem; max-width: 400px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <div style="width: 64px; height: 64px; background: rgba(239, 68, 68, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
                        </svg>
                    </div>
                    <h3 style="margin: 0 0 0.5rem; font-size: 1.5rem; color: var(--heading);">Delete Story?</h3>
                    <p style="margin: 0; color: var(--text-muted); font-size: 0.95rem;">
                        Are you sure you want to delete this story? This action cannot be undone.
                    </p>
                </div>
                <div style="display: flex; gap: 1rem;">
                    <button onclick="window.StoriesLoader.closeDeleteModal()"
                        style="flex: 1; padding: 0.75rem 1.5rem; background: var(--card-bg); color: var(--text-primary); border: 2px solid var(--border-color); border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                        Cancel
                    </button>
                    <button onclick="window.StoriesLoader.deleteStory(${storyId})"
                        style="flex: 1; padding: 0.75rem 1.5rem; background: #ef4444; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                        Delete
                    </button>
                </div>
            </div>
        `;

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeDeleteModal();
            }
        });

        document.body.appendChild(modal);
    },

    /**
     * Close delete confirmation modal
     */
    closeDeleteModal() {
        const modal = document.getElementById('delete-story-modal');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * Delete a story
     */
    async deleteStory(storyId) {
        try {
            // Show loading state
            const deleteBtn = document.querySelector('#delete-story-modal button:last-child');
            if (deleteBtn) {
                deleteBtn.innerHTML = '<span style="display: inline-block; width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite;"></span>';
                deleteBtn.disabled = true;
            }

            // Call API to delete story
            const response = await TutorProfileAPI.deleteStory(storyId);

            if (response && response.success) {
                // Success - show notification
                if (typeof TutorProfileUI !== 'undefined') {
                    TutorProfileUI.showNotification('Story deleted successfully!', 'success');
                }

                // Close modal
                this.closeDeleteModal();

                // Refresh stories
                await this.refresh();
            } else {
                throw new Error('Failed to delete story');
            }
        } catch (error) {
            console.error('Error deleting story:', error);

            // Show error notification
            if (typeof TutorProfileUI !== 'undefined') {
                TutorProfileUI.showNotification('Failed to delete story. Please try again.', 'error');
            } else {
                alert('Failed to delete story. Please try again.');
            }

            // Close modal
            this.closeDeleteModal();
        }
    }
};

// Make StoriesLoader globally accessible
window.StoriesLoader = StoriesLoader;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for profile data to load
        setTimeout(() => StoriesLoader.initialize(), 1000);
    });
} else {
    setTimeout(() => StoriesLoader.initialize(), 1000);
}

// Global function for load more button
function loadMoreStories() {
    // TODO: Implement pagination
    console.log('Load more stories');
    alert('Pagination coming soon!');
}
