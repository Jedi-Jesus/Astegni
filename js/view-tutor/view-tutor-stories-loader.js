/**
 * View Tutor Stories Loader
 * Loads and displays stories from the viewed tutor's profile
 */

const ViewTutorStoriesLoader = {
    currentStories: [],
    tutorProfileData: null,

    /**
     * Initialize stories loading for viewed tutor
     * @param {number} tutorId - The tutor ID from URL
     */
    async initialize(tutorId) {
        if (!tutorId) {
            console.error('No tutor ID provided');
            this.showEmptyState();
            this.hideStoryRing();
            return;
        }

        await this.loadStories(tutorId);
    },

    /**
     * Load stories for specific tutor
     * @param {number} tutorId - The tutor ID
     */
    async loadStories(tutorId) {
        try {
            // Fetch stories from API with query parameters
            const response = await fetch(`${API_BASE_URL}/api/stories?profile_id=${tutorId}&profile_type=tutor&limit=20`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                console.error('Failed to fetch stories:', response.status);
                this.showEmptyState();
                this.hideStoryRing();
                return;
            }

            const data = await response.json();

            if (data && data.stories && data.stories.length > 0) {
                this.currentStories = data.stories;
                this.renderStories();
                this.showStoryRing();
            } else {
                this.showEmptyState();
                this.hideStoryRing();
            }
        } catch (error) {
            console.error('Error loading stories:', error);
            this.showEmptyState();
            this.hideStoryRing();
        }
    },

    /**
     * Render stories in the grid
     */
    renderStories() {
        const grid = document.querySelector('#stories-panel .tutor-stories-grid');
        if (!grid) return;

        if (this.currentStories.length === 0) {
            this.showEmptyState();
            this.updateStats(0, 0, 0, 0);
            return;
        }

        grid.innerHTML = '';

        this.currentStories.forEach((story, index) => {
            const storyCard = this.createStoryCard(story, index);
            grid.appendChild(storyCard);
        });

        // Calculate stats
        const totalViews = this.currentStories.reduce((sum, story) => sum + (story.views || 0), 0);
        const totalReactions = this.currentStories.reduce((sum, story) => sum + (story.reactions_count || 0), 0);
        const totalComments = this.currentStories.reduce((sum, story) => sum + (story.comments_count || 0), 0);

        this.updateStats(this.currentStories.length, totalViews, totalReactions, totalComments);
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
        `;

        // Calculate time ago
        const timeAgo = this.getTimeAgo(story.created_at);

        // Determine category badge color
        const categoryColors = {
            'Math Tips': 'var(--button-bg)',
            'Physics Lab': '#8b5cf6',
            'Chemistry': '#22c55e',
            'Study Tips': '#f59e0b',
            'Q&A': '#ef4444',
            'Success': '#3b82f6'
        };
        const categoryColor = categoryColors[story.category] || 'var(--button-bg)';

        card.innerHTML = `
            <div style="position: relative;" onclick="window.ViewTutorStoriesLoader.viewStory(${index})">
                ${story.media_type === 'video' ?
                    `<video src="${story.media_url}" style="width: 100%; height: 250px; object-fit: cover;" muted></video>` :
                    `<img src="${story.media_url}" alt="Story" style="width: 100%; height: 250px; object-fit: cover;">`
                }
                ${story.category ? `
                    <div style="position: absolute; top: 10px; left: 10px; background: ${categoryColor}; color: white; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">
                        ${story.category}
                    </div>
                ` : ''}
                <div style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.6); color: rgba(255,255,255,0.9); padding: 4px 8px; border-radius: 6px; font-size: 0.75rem;">
                    ${timeAgo}
                </div>
            </div>
            <div style="padding: 0.75rem;">
                ${story.caption ? `
                    <p style="color: var(--text-primary); font-size: 0.875rem; margin: 0 0 0.5rem 0; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                        ${story.caption}
                    </p>
                ` : ''}
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.875rem; color: var(--text-muted);">👁️ ${this.formatNumber(story.views || 0)} views</span>
                    ${story.reactions_count ? `
                        <span style="font-size: 0.875rem; color: var(--text-muted);">❤️ ${story.reactions_count}</span>
                    ` : ''}
                </div>
            </div>
        `;

        return card;
    },

    /**
     * Show empty state when no stories
     */
    showEmptyState() {
        const grid = document.querySelector('#stories-panel .tutor-stories-grid');
        if (!grid) return;

        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <div style="font-size: 4rem; margin-bottom: 1rem;">📱</div>
                <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem; color: var(--heading);">No Stories Yet</h3>
                <p style="margin-bottom: 1.5rem;">This tutor hasn't shared any stories yet.</p>
            </div>
        `;

        this.updateStats(0, 0, 0, 0);
    },

    /**
     * View a specific story
     */
    async viewStory(storyIndex) {
        if (storyIndex < 0 || storyIndex >= this.currentStories.length) {
            console.error('Invalid story index:', storyIndex);
            return;
        }

        const story = this.currentStories[storyIndex];
        if (!story) return;

        // Increment view count
        if (story.id) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/stories/${story.id}/view`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    // Update local count
                    if (data && data.views !== undefined) {
                        story.views = data.views;
                        // Update stats
                        const totalViews = this.currentStories.reduce((sum, s) => sum + (s.views || 0), 0);
                        const totalReactions = this.currentStories.reduce((sum, s) => sum + (s.reactions_count || 0), 0);
                        const totalComments = this.currentStories.reduce((sum, s) => sum + (s.comments_count || 0), 0);
                        this.updateStats(this.currentStories.length, totalViews, totalReactions, totalComments);
                    }
                }
            } catch (error) {
                console.error('Error incrementing story view:', error);
            }
        }

        // Calculate if there are previous/next stories
        const hasPrevious = storyIndex > 0;
        const hasNext = storyIndex < this.currentStories.length - 1;

        // Show story viewer with navigation
        const viewerHtml = `
            <div id="story-viewer-container" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.95); z-index: 10000; display: flex; align-items: center; justify-content: center;" onclick="ViewTutorStoriesLoader.closeStoryViewer()">
                <!-- Previous Button -->
                ${hasPrevious ? `
                    <button onclick="event.stopPropagation(); ViewTutorStoriesLoader.navigateStory(${storyIndex - 1})"
                        style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); border: none; color: white; font-size: 28px; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; z-index: 10001; transition: all 0.3s ease;"
                        onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
                        onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
                        ‹
                    </button>
                ` : ''}

                <!-- Story Content -->
                <div style="max-width: 500px; max-height: 90vh; display: flex; flex-direction: column; align-items: center; gap: 16px;" onclick="event.stopPropagation()">
                    <!-- Story Counter -->
                    <div style="color: white; font-size: 14px; font-weight: 600; background: rgba(0,0,0,0.5); padding: 8px 16px; border-radius: 20px;">
                        ${storyIndex + 1} / ${this.currentStories.length}
                    </div>

                    <!-- Story Media -->
                    <div style="border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                        ${story.media_type === 'video' ? `
                            <video src="${story.media_url}" controls autoplay
                                style="max-width: 500px; max-height: 70vh; width: 100%; border-radius: 16px;">
                            </video>
                        ` : `
                            <img src="${story.media_url}" alt="Story"
                                style="max-width: 500px; max-height: 70vh; width: 100%; border-radius: 16px; object-fit: contain;">
                        `}
                    </div>

                    <!-- Caption below image -->
                    ${story.caption ? `
                        <div style="max-width: 500px; background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); padding: 12px 16px; border-radius: 12px; color: white;">
                            <p style="margin: 0; font-size: 15px; line-height: 1.5;">${story.caption}</p>
                        </div>
                    ` : ''}

                    <!-- Story Info -->
                    <div style="display: flex; gap: 20px; color: white; font-size: 14px;">
                        <span>👁️ ${this.formatNumber(story.views || 0)} views</span>
                        ${story.reactions_count ? `<span>❤️ ${story.reactions_count}</span>` : ''}
                        <span>${this.getTimeAgo(story.created_at)}</span>
                    </div>

                    <!-- Close Button -->
                    <button onclick="ViewTutorStoriesLoader.closeStoryViewer()"
                        style="background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); border: none; color: white; padding: 10px 24px; border-radius: 25px; cursor: pointer; font-weight: 600; transition: all 0.3s ease;"
                        onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
                        onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
                        Close
                    </button>
                </div>

                <!-- Next Button -->
                ${hasNext ? `
                    <button onclick="event.stopPropagation(); ViewTutorStoriesLoader.navigateStory(${storyIndex + 1})"
                        style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px); border: none; color: white; font-size: 28px; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; z-index: 10001; transition: all 0.3s ease;"
                        onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
                        onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
                        ›
                    </button>
                ` : ''}
            </div>
        `;

        // Add viewer to page
        document.body.insertAdjacentHTML('beforeend', viewerHtml);
    },

    /**
     * Navigate to a different story
     */
    async navigateStory(newIndex) {
        if (newIndex < 0 || newIndex >= this.currentStories.length) return;

        // Close current viewer
        this.closeStoryViewer();

        // Open new story
        await this.viewStory(newIndex);
    },

    /**
     * Close story viewer
     */
    closeStoryViewer() {
        const container = document.getElementById('story-viewer-container');
        if (container) {
            container.remove();
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
        if (diffDays < 7) return `${diffDays}d ago`;
        return `${Math.floor(diffDays / 7)}w ago`;
    },

    /**
     * Format number with K/M suffix
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },

    /**
     * Update story stats in UI
     */
    updateStats(totalStories, totalViews, totalReactions, totalComments) {
        // Update stats in stories panel
        const statsContainer = document.querySelector('#stories-panel .story-stats');
        if (statsContainer) {
            const statDivs = statsContainer.querySelectorAll('div[style*="text-align: center"]');
            if (statDivs.length >= 4) {
                statDivs[0].querySelector('div').textContent = totalStories;
                statDivs[1].querySelector('div').textContent = this.formatNumber(totalViews);
                statDivs[2].querySelector('div').textContent = totalReactions || 0;
                statDivs[3].querySelector('div').textContent = totalComments || 0;
            }
        }
    },

    /**
     * Show story ring when stories exist
     */
    showStoryRing() {
        const storyRingContainer = document.querySelector('.story-ring-container');
        const storyText = document.querySelector('.story-text');

        if (storyRingContainer) {
            storyRingContainer.style.display = 'block';
            storyRingContainer.style.background = 'linear-gradient(45deg, #f59e0b, #ec4899, #8b5cf6)';
            storyRingContainer.style.animation = 'astegniPulse 3s infinite';
            storyRingContainer.style.padding = '4px';
            storyRingContainer.style.cursor = 'pointer';
            storyRingContainer.setAttribute('onclick', 'ViewTutorStoriesLoader.viewStory(0)');
        }

        if (storyText) {
            storyText.style.display = 'block';
        }
    },

    /**
     * Hide story ring when no stories
     */
    hideStoryRing() {
        const storyRingContainer = document.querySelector('.story-ring-container');
        const storyText = document.querySelector('.story-text');

        if (storyRingContainer) {
            // Keep the container visible but remove the gradient and animation
            storyRingContainer.style.display = 'block';
            storyRingContainer.style.background = 'transparent';
            storyRingContainer.style.animation = 'none';
            storyRingContainer.style.cursor = 'default';
            storyRingContainer.style.padding = '0';
            storyRingContainer.removeAttribute('onclick');
        }

        if (storyText) {
            storyText.style.display = 'none';
        }
    },

    /**
     * Refresh stories (called when needed)
     */
    async refresh(tutorId) {
        await this.loadStories(tutorId);
    }
};

// Make ViewTutorStoriesLoader globally accessible
window.ViewTutorStoriesLoader = ViewTutorStoriesLoader;

console.log('✅ View Tutor Stories Loader initialized');
