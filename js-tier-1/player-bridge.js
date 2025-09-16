// ============================================
// UNIVERSAL PLAYER BRIDGE
// Connects the Ultimate Video Player to any page context
// Works with Reels, Courses, Tutorials, etc.
// ============================================

class VideoPlayerBridge {
    constructor(context) {
        this.context = context; // 'reels', 'course', 'tutorial', etc.
        this.player = null;
        this.dataAdapter = null;

        // Initialize based on context
        this.initialize();
    }

    initialize() {
        // Create player instance
        this.player = new UltimateVideoPlayer({
            containerId: 'ultimate-video-modal',
            enableKeyboard: true,
            enableComments: true,
            enableEngagement: true,
            autoplay: true,
            persistProgress: true,

            // Callbacks
            onVideoLoad: (video) => this.handleVideoLoad(video),
            onVideoEnd: (video) => this.handleVideoEnd(video),
            onLike: (video) => this.handleLike(video),
            onDislike: (video) => this.handleDislike(video),
            onComment: (comment) => this.handleComment(comment),
            onShare: (video) => this.handleShare(video),
            onSave: (video) => this.handleSave(video),
            onFavorite: (video) => this.handleFavorite(video),
            onFollow: (creator) => this.handleFollow(creator),
            onClose: () => this.handleClose()
        });

        // Setup data adapter based on context
        this.setupDataAdapter();

        // Make bridge globally available
        window.videoPlayerBridge = this;
    }

    setupDataAdapter() {
        switch (this.context) {
            case 'reels':
                this.dataAdapter = new ReelsDataAdapter();
                break;
            case 'course':
                this.dataAdapter = new CourseDataAdapter();
                break;
            case 'tutorial':
                this.dataAdapter = new TutorialDataAdapter();
                break;
            case 'webinar':
                this.dataAdapter = new WebinarDataAdapter();
                break;
            default:
                this.dataAdapter = new DefaultDataAdapter();
        }
    }

    // ============================================
    // PUBLIC API
    // ============================================

    openVideo(videoId, options = {}) {
        console.log('Bridge openVideo called with:', videoId);

        // Get video data from adapter
        const videoData = this.dataAdapter.getVideoData(videoId);
        if (!videoData) {
            console.error('Video not found:', videoId);
            return;
        }

        // Get playlist based on options
        const playlist = options.playlist || this.dataAdapter.getPlaylist(videoId, options);

        // Find video index in playlist
        const videoIndex = playlist.findIndex(v => v.id === String(videoId));

        // Load playlist and video
        this.player.loadPlaylist(playlist);
        this.player.loadVideo(videoIndex >= 0 ? videoIndex : 0);

        // Update engagement UI
        this.updateEngagementUI(videoId);

        // Open player
        this.player.open();

        // Add active class to modal as backup
        const modal = document.getElementById('ultimate-video-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        // Track view
        this.trackView(videoId);
    }

    updateEngagementUI(videoId) {
        const engagementBar = document.getElementById('ultimate-engagement-bar');
        if (!engagementBar) return;

        const stats = this.dataAdapter.getEngagementStats(videoId);

        // Two-row layout for engagement buttons
        engagementBar.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
            <!-- First row -->
            <div style="display: flex; gap: 8px; justify-content: space-around;">
                <button class="engagement-btn-enhanced hover-lift ${stats.isLiked ? 'active' : ''}" 
                        onclick="videoPlayerBridge.toggleLike('${videoId}')"
                        style="flex: 1; padding: 10px;">
                    <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                        <path d="M7 22V11L12 2L13.09 3.09C13.31 3.31 13.44 3.61 13.47 3.92L13 7H20C20.55 7 21.05 7.22 21.41 7.59C21.77 7.95 22 8.45 22 9V11C22 11.26 21.95 11.52 21.86 11.76L18.84 19.76C18.54 20.54 17.77 21 16.91 21H9C7.9 21 7 20.1 7 19V11Z"/>
                    </svg>
                    <span class="engagement-count-enhanced">${this.formatCount(stats.likes)}</span>
                </button>
                
                <button class="engagement-btn-enhanced hover-lift ${stats.isDisliked ? 'active' : ''}" 
                        onclick="videoPlayerBridge.toggleDislike('${videoId}')"
                        style="flex: 1; padding: 10px;">
                    <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                        <path d="M17 2V13L12 22L10.91 20.91C10.69 20.69 10.56 20.39 10.53 20.08L11 17H4C3.45 17 2.95 16.78 2.59 16.41C2.23 16.05 2 15.55 2 15V13C2 12.74 2.05 12.48 2.14 12.24L5.16 4.24C5.46 3.46 6.23 3 7.09 3H15C16.1 3 17 3.9 17 5V13Z"/>
                    </svg>
                    <span class="engagement-count-enhanced">${this.formatCount(stats.dislikes)}</span>
                </button>
                
                <button class="engagement-btn-enhanced hover-lift ${stats.isFavorite ? 'active favorite-active' : ''}" 
                        onclick="videoPlayerBridge.toggleFavorite('${videoId}')"
                        style="flex: 1; padding: 10px;">
                    <svg class="engagement-icon-enhanced favorite-icon" viewBox="0 0 24 24" fill="${stats.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    <span class="engagement-count-enhanced">${stats.isFavorite ? 'Favorited' : 'Favorite'}</span>
                </button>
            </div>
            
            <!-- Second row -->
            <div style="display: flex; gap: 8px; justify-content: space-around;">
                <button class="engagement-btn-enhanced hover-lift" 
                        onclick="videoPlayerBridge.scrollToComments()"
                        style="flex: 1; padding: 10px;">
                    <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                    </svg>
                    <span class="engagement-count-enhanced">${this.formatCount(stats.comments)}</span>
                </button>
                
                <button class="engagement-btn-enhanced hover-lift" 
                        onclick="videoPlayerBridge.shareVideo('${videoId}')"
                        style="flex: 1; padding: 10px;">
                    <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                        <circle cx="18" cy="5" r="3"/>
                        <circle cx="6" cy="12" r="3"/>
                        <circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                    <span class="engagement-count-enhanced">Share</span>
                </button>
                
                <button class="engagement-btn-enhanced hover-lift ${stats.isSaved ? 'active saved-active' : ''}" 
                        onclick="videoPlayerBridge.toggleSave('${videoId}')"
                        style="flex: 1; padding: 10px;">
                    <svg class="engagement-icon-enhanced save-icon" viewBox="0 0 24 24" fill="${stats.isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span class="engagement-count-enhanced">${stats.isSaved ? 'Saved' : 'Save'}</span>
                </button>
            </div>
        </div>
    `;

        // Update follow button if creator info available
        const creatorId = this.dataAdapter.getCreatorId(videoId);
        if (creatorId) {
            this.updateFollowButton(creatorId);
        }

        // Load comments from database
        this.loadComments(videoId);
    }

    loadComments(videoId) {
        const commentsTab = document.getElementById('commentsTab');
        if (!commentsTab) return;

        // Show loading state
        commentsTab.innerHTML = '<div style="text-align: center; padding: 20px;">Loading comments...</div>';

        // Fetch comments from API
        this.dataAdapter.getComments(videoId).then(comments => {
            if (comments && comments.length > 0) {
                commentsTab.innerHTML = `
                <div class="comments-list" style="max-height: 400px; overflow-y: auto;">
                    ${comments.map(comment => `
                        <div class="comment-enhanced" style="padding: 12px; margin-bottom: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                            <div class="comment-header" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                ${comment.user_picture ?
                        `<img src="${comment.user_picture}" alt="${comment.user_name}" 
                                         style="width: 32px; height: 32px; border-radius: 50%;">` :
                        `<div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; font-weight: bold;">
                                        ${comment.user_name ? comment.user_name.charAt(0).toUpperCase() : '?'}
                                    </div>`
                    }
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; font-size: 14px;">${comment.user_name}</div>
                                    <div style="font-size: 12px; opacity: 0.6;">${new Date(comment.created_at).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div class="comment-text" style="font-size: 14px; line-height: 1.5;">${comment.text}</div>
                            ${comment.replies && comment.replies.length > 0 ? `
                                <div class="comment-replies" style="margin-left: 42px; margin-top: 12px;">
                                    ${comment.replies.map(reply => `
                                        <div style="padding: 8px; margin-bottom: 8px; background: rgba(255,255,255,0.03); border-radius: 6px;">
                                            <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">${reply.user_name}</div>
                                            <div style="font-size: 13px;">${reply.text}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <textarea id="new-comment-input" 
                              placeholder="Add a comment..." 
                              style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; resize: vertical; min-height: 60px;"
                              ${!window.currentUser ? 'disabled' : ''}></textarea>
                    <button onclick="videoPlayerBridge.addComment('${videoId}')" 
                            style="margin-top: 8px; padding: 8px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 6px; color: white; cursor: pointer;"
                            ${!window.currentUser ? 'disabled' : ''}>
                        ${window.currentUser ? 'Post Comment' : 'Login to Comment'}
                    </button>
                </div>
            `;
            } else {
                commentsTab.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <p style="opacity: 0.6; margin-bottom: 20px;">No comments yet. Be the first to comment!</p>
                    <textarea id="new-comment-input" 
                              placeholder="Add a comment..." 
                              style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white; resize: vertical; min-height: 60px;"
                              ${!window.currentUser ? 'disabled' : ''}></textarea>
                    <button onclick="videoPlayerBridge.addComment('${videoId}')" 
                            style="margin-top: 8px; padding: 8px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 6px; color: white; cursor: pointer;"
                            ${!window.currentUser ? 'disabled' : ''}>
                        ${window.currentUser ? 'Post Comment' : 'Login to Comment'}
                    </button>
                </div>
            `;
            }
        }).catch(error => {
            console.error('Error loading comments:', error);
            commentsTab.innerHTML = '<div style="text-align: center; padding: 20px; color: #ff6b6b;">Failed to load comments</div>';
        });
    }

    async addComment(videoId) {
        const input = document.getElementById('new-comment-input');
        if (!input || !input.value.trim()) {
            this.player.showNotification('Please enter a comment', 'error');
            return;
        }

        if (!window.currentUser) {
            this.player.showNotification('Please login to comment', 'error');
            return;
        }

        try {
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/videos/reels/${videoId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ text: input.value.trim() })
            });

            if (response.ok) {
                this.player.showNotification('Comment added successfully');
                input.value = '';
                // Reload comments
                this.loadComments(videoId);
            } else {
                throw new Error('Failed to add comment');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            this.player.showNotification('Failed to add comment', 'error');
        }
    }

    // ============================================
    // ENGAGEMENT HANDLERS
    // ============================================

    toggleLike(videoId) {
        const result = this.dataAdapter.toggleLike(videoId);
        this.updateEngagementUI(videoId);
        this.updatePageUI(videoId);

        if (result.success) {
            this.player.showNotification(result.isLiked ? '👍 Liked!' : 'Like removed');
        }
    }

    toggleDislike(videoId) {
        const result = this.dataAdapter.toggleDislike(videoId);
        this.updateEngagementUI(videoId);
        this.updatePageUI(videoId);

        if (result.success) {
            this.player.showNotification(result.isDisliked ? '👎 Disliked' : 'Dislike removed');
        }
    }

    toggleFavorite(videoId) {
        const result = this.dataAdapter.toggleFavorite(videoId);
        this.updateEngagementUI(videoId);
        this.updatePageUI(videoId);

        if (result.success) {
            this.player.showNotification(result.isFavorite ? '❤️ Added to favorites!' : 'Removed from favorites');
        }
    }

    toggleSave(videoId) {
        const result = this.dataAdapter.toggleSave(videoId);

        if (result.showPlaylistSelector) {
            this.showPlaylistSelector(videoId);
        } else {
            this.updateEngagementUI(videoId);
            this.updatePageUI(videoId);
            this.player.showNotification(result.isSaved ? '📌 Saved!' : 'Removed from saved');
        }
    }

    shareVideo(videoId) {
        const videoData = this.dataAdapter.getVideoData(videoId);
        const url = `${window.location.origin}/video/${videoId}`;

        if (navigator.share) {
            navigator.share({
                title: videoData.title,
                text: videoData.description,
                url: url
            }).catch(() => {
                this.copyToClipboard(url);
            });
        } else {
            this.copyToClipboard(url);
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.player.showNotification('📋 Link copied to clipboard!');
        }).catch(() => {
            this.player.showNotification('Failed to copy link', 'error');
        });
    }

    updateFollowButton(creatorId) {
        const followBtn = document.getElementById('followBtn');
        if (!followBtn) return;

        const stats = this.dataAdapter.getCreatorStats(creatorId);

        followBtn.innerHTML = `
            ${stats.isFollowing ?
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' :
                '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10m0 0l4-4m-4 4l-4-4"/><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/></svg>'
            }
            <span>${stats.isFollowing ? 'Following' : 'Follow'}</span>
        `;

        followBtn.onclick = () => {
            const result = this.dataAdapter.toggleFollow(creatorId);
            this.updateFollowButton(creatorId);
            this.player.showNotification(result.isFollowing ? '🔔 Following!' : 'Unfollowed');
        };

        // Update creator stats display
        const creatorStats = document.getElementById('ultimate-creator-stats');
        if (creatorStats) {
            creatorStats.textContent = `${this.formatCount(stats.followers)} followers`;
        }
    }

    loadComments(videoId) {
        // Implementation to load comments
        const commentsTab = document.getElementById('commentsTab');
        if (!commentsTab) return;

        // Fetch and display comments from API
        this.dataAdapter.getComments(videoId).then(comments => {
            if (comments && comments.length > 0) {
                commentsTab.innerHTML = comments.map(comment => `
                    <div class="comment-enhanced">
                        <div class="comment-header">
                            <span class="comment-author">${comment.user_name}</span>
                            <span class="comment-date">${comment.created_at}</span>
                        </div>
                        <div class="comment-text">${comment.text}</div>
                    </div>
                `).join('');
            } else {
                commentsTab.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
            }
        });
    }

    scrollToComments() {
        const commentsTab = document.getElementById('commentsTab');
        if (commentsTab) {
            // Switch to comments tab
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === 'comments');
            });

            commentsTab.style.display = 'block';
            document.getElementById('descriptionTab').style.display = 'none';
            document.getElementById('chaptersTab').style.display = 'none';

            commentsTab.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // ============================================
    // CALLBACKS
    // ============================================

    handleVideoLoad(video) {
        // Update page-specific UI
        this.updatePageUI(video.id);

        // Track event
        this.trackEvent('video_loaded', { videoId: video.id });
    }

    handleVideoEnd(video) {
        // Auto-play next or show recommendations
        this.trackEvent('video_completed', { videoId: video.id });
    }

    handleLike(video) {
        this.toggleLike(video.id);
    }

    handleDislike(video) {
        this.toggleDislike(video.id);
    }

    handleComment(comment) {
        this.trackEvent('comment_added', { comment });
    }

    handleShare(video) {
        this.shareVideo(video.id);
    }

    handleSave(video) {
        this.toggleSave(video.id);
    }

    handleFavorite(video) {
        this.toggleFavorite(video.id);
    }

    handleFollow(creator) {
        this.dataAdapter.toggleFollow(creator.id);
    }

    handleClose() {
        // Update page UI after closing
        this.updatePageUI(null);
    }

    // ============================================
    // UTILITIES
    // ============================================

    updatePageUI(videoId) {
        // Update the parent page UI based on context
        if (this.dataAdapter.updatePageUI) {
            this.dataAdapter.updatePageUI(videoId);
        }
    }

    trackView(videoId) {
        this.dataAdapter.incrementViews(videoId);
        this.trackEvent('video_view', { videoId });
    }

    trackEvent(event, data) {
        // Send to analytics
        if (window.gtag) {
            gtag('event', event, data);
        }

        // Log for debugging
        console.log('📊 Event:', event, data);
    }

    formatCount(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    showPlaylistSelector(videoId) {
        // Implementation depends on your playlist UI
        // This would show a modal to select/create playlists
        console.log('Show playlist selector for video:', videoId);

        // For now, open the existing playlist modal
        if (window.openPlaylistModal) {
            window.openPlaylistModal(videoId);
        }
    }
}

// ============================================
// DATA ADAPTERS FOR DIFFERENT CONTEXTS
// ============================================

class ReelsDataAdapter {
    getVideoData(videoId) {
        const reel = window.currentReels ?
            window.currentReels.find(r => r.id === parseInt(videoId)) :
            null;

        if (!reel) return null;

        // Use UrlHelper if available, otherwise fallback
        const videoUrl = typeof UrlHelper !== 'undefined'
            ? UrlHelper.getAssetUrl(reel.video_url)
            : reel.video_url;

        return {
            id: String(videoId),
            title: `${reel.title} ${reel.video_number || ''}`,
            src: videoUrl,
            creator: reel.tutor_name || 'Unknown',
            creatorId: reel.tutor_id,
            views: reel.views,
            description: reel.description,
            date: reel.upload_date,
            subject: reel.tutor_subject || reel.subject
        };
    }

    getPlaylist(videoId, options = {}) {
        if (!window.currentReels) return [];

        return window.currentReels.map(reel => ({
            id: String(reel.id),
            title: `${reel.title} ${reel.video_number || ''}`,
            src: typeof UrlHelper !== 'undefined'
                ? UrlHelper.getAssetUrl(reel.video_url)
                : reel.video_url,
            creator: reel.tutor_name || 'Unknown',
            creatorId: reel.tutor_id,
            views: reel.views,
            description: reel.description,
            date: reel.upload_date,
            subject: reel.tutor_subject || reel.subject
        }));
    }

    getEngagementStats(videoId) {
        const reel = window.currentReels ?
            window.currentReels.find(r => r.id === parseInt(videoId)) :
            null;

        if (!reel || !reel.engagement_stats) {
            return {
                likes: 0,
                dislikes: 0,
                comments: 0,
                favorites: 0,
                saves: 0,
                isLiked: false,
                isDisliked: false,
                isFavorite: false,
                isSaved: false
            };
        }

        return {
            likes: reel.engagement_stats.likes || 0,
            dislikes: reel.engagement_stats.dislikes || 0,
            comments: reel.engagement_stats.comments || 0,
            favorites: reel.engagement_stats.favorites || 0,
            saves: reel.engagement_stats.saves || 0,
            isLiked: reel.engagement_stats.user_liked || false,
            isDisliked: reel.engagement_stats.user_disliked || false,
            isFavorite: reel.engagement_stats.user_favorited || false,
            isSaved: reel.engagement_stats.user_saved || false
        };
    }

    getCreatorId(videoId) {
        const reel = window.currentReels ?
            window.currentReels.find(r => r.id === parseInt(videoId)) :
            null;
        return reel ? reel.tutor_id : null;
    }

    getCreatorStats(creatorId) {
        // Get all videos by this creator
        const creatorVideos = window.currentReels ?
            window.currentReels.filter(r => r.tutor_id === creatorId) : [];

        // Check if following (assuming first video has the info)
        const isFollowing = creatorVideos.length > 0 && creatorVideos[0].is_following;

        return {
            followers: 0, // Would need API call for actual count
            isFollowing: isFollowing
        };
    }

    async getComments(videoId) {
        // Call API to get comments
        try {
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/videos/reels/${videoId}/comments`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
        return [];
    }

    toggleLike(videoId) {
        // Use the global function from reels_dynamic.js
        if (window.toggleEngagement) {
            window.toggleEngagement(videoId, 'like');
        }

        // Get updated stats
        const reel = window.currentReels ?
            window.currentReels.find(r => r.id === parseInt(videoId)) : null;

        return {
            success: true,
            isLiked: reel ? reel.engagement_stats.user_liked : false
        };
    }

    toggleDislike(videoId) {
        if (window.toggleEngagement) {
            window.toggleEngagement(videoId, 'dislike');
        }

        const reel = window.currentReels ?
            window.currentReels.find(r => r.id === parseInt(videoId)) : null;

        return {
            success: true,
            isDisliked: reel ? reel.engagement_stats.user_disliked : false
        };
    }

    toggleFavorite(videoId) {
        if (window.toggleEngagement) {
            window.toggleEngagement(videoId, 'favorite');
        }

        const reel = window.currentReels ?
            window.currentReels.find(r => r.id === parseInt(videoId)) : null;

        return {
            success: true,
            isFavorite: reel ? reel.engagement_stats.user_favorited : false
        };
    }

    toggleSave(videoId) {
        const reel = window.currentReels ?
            window.currentReels.find(r => r.id === parseInt(videoId)) : null;

        const isSaved = reel ? reel.engagement_stats.user_saved : false;

        return {
            success: true,
            isSaved: !isSaved,
            showPlaylistSelector: !isSaved
        };
    }

    toggleFollow(creatorId) {
        if (window.toggleFollow) {
            window.toggleFollow(creatorId);
        }

        // Find a video by this creator to check follow status
        const creatorVideo = window.currentReels ?
            window.currentReels.find(r => r.tutor_id === creatorId) : null;

        return {
            success: true,
            isFollowing: creatorVideo ? creatorVideo.is_following : false
        };
    }

    incrementViews(videoId) {
        // Views are handled by the API automatically
        console.log('View tracked for video:', videoId);
    }

    updatePageUI(videoId) {
        // Reload reels to get updated engagement stats
        if (window.loadReels) {
            window.loadReels();
        }
    }
}

class CourseDataAdapter {
    getVideoData(videoId) {
        // Get from course data structure
        const lesson = window.courseLessons?.[videoId];
        if (!lesson) return null;

        return {
            id: videoId,
            title: lesson.title,
            src: lesson.videoUrl,
            creator: lesson.instructor,
            creatorId: lesson.instructorId,
            views: lesson.views || 0,
            description: lesson.description,
            duration: lesson.duration,
            chapter: lesson.chapter
        };
    }

    getPlaylist(videoId, options = {}) {
        // Get all lessons in the same course
        const currentLesson = window.courseLessons?.[videoId];
        if (!currentLesson) return [];

        return Object.values(window.courseLessons || {})
            .filter(lesson => lesson.courseId === currentLesson.courseId)
            .sort((a, b) => a.order - b.order)
            .map(lesson => this.getVideoData(lesson.id));
    }

    getEngagementStats(videoId) {
        // Course-specific engagement
        const lesson = window.courseLessons?.[videoId];

        return {
            likes: lesson?.likes || 0,
            dislikes: 0, // Courses might not have dislikes
            comments: lesson?.comments?.length || 0,
            isLiked: lesson?.likedBy?.includes(window.currentUser?.id),
            isCompleted: lesson?.completedBy?.includes(window.currentUser?.id),
            isSaved: lesson?.savedBy?.includes(window.currentUser?.id)
        };
    }

    // ... implement other methods based on your course structure
}

class TutorialDataAdapter {
    // Similar to CourseDataAdapter but for tutorials
    getVideoData(videoId) {
        const tutorial = window.tutorials?.[videoId];
        if (!tutorial) return null;

        return {
            id: videoId,
            title: tutorial.title,
            src: tutorial.videoUrl,
            creator: tutorial.author,
            creatorId: tutorial.authorId,
            views: tutorial.views || 0,
            description: tutorial.description,
            tags: tutorial.tags,
            difficulty: tutorial.difficulty
        };
    }

    // ... implement other methods
}

class WebinarDataAdapter {
    // For live/recorded webinars
    getVideoData(videoId) {
        const webinar = window.webinars?.[videoId];
        if (!webinar) return null;

        return {
            id: videoId,
            title: webinar.title,
            src: webinar.recordingUrl,
            creator: webinar.host,
            creatorId: webinar.hostId,
            views: webinar.attendees || 0,
            description: webinar.description,
            date: webinar.date,
            isLive: webinar.isLive
        };
    }

    // ... implement other methods
}

class DefaultDataAdapter {
    // Fallback adapter for unknown contexts
    getVideoData(videoId) {
        // Try to get video data from a generic structure
        return {
            id: videoId,
            title: 'Video',
            src: '',
            creator: 'Unknown',
            views: 0,
            description: ''
        };
    }

    getPlaylist(videoId) {
        return [this.getVideoData(videoId)];
    }

    getEngagementStats(videoId) {
        return {
            likes: 0,
            dislikes: 0,
            comments: 0,
            isLiked: false,
            isDisliked: false,
            isFavorite: false,
            isSaved: false
        };
    }

    // ... minimal implementation for other methods
}

// ============================================
// INITIALIZATION
// ============================================

// Auto-initialize based on page context
document.addEventListener('DOMContentLoaded', () => {
    // Detect context from page
    let context = 'default';

    if (window.location.pathname.includes('reels')) {
        context = 'reels';
    } else if (window.location.pathname.includes('course')) {
        context = 'course';
    } else if (window.location.pathname.includes('tutorial')) {
        context = 'tutorial';
    } else if (window.location.pathname.includes('webinar')) {
        context = 'webinar';
    }

    // Initialize bridge
    new VideoPlayerBridge(context);

    console.log(`🎬 Video Player Bridge initialized for: ${context}`);
});