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
    const videoIndex = playlist.findIndex(v => v.id === videoId);
    
    // Load playlist and video
    this.player.loadPlaylist(playlist);
    this.player.loadVideo(videoIndex >= 0 ? videoIndex : 0);
    
    // Update engagement UI
    this.updateEngagementUI(videoId);
    
    // Open player - IMPORTANT: Make sure the modal gets the active class
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
        
        engagementBar.innerHTML = `
            <button class="engagement-btn-enhanced hover-lift ${stats.isLiked ? 'active' : ''}" 
                    onclick="videoPlayerBridge.toggleLike('${videoId}')">
                <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M7 22V11L12 2L13.09 3.09C13.31 3.31 13.44 3.61 13.47 3.92L13 7H20C20.55 7 21.05 7.22 21.41 7.59C21.77 7.95 22 8.45 22 9V11C22 11.26 21.95 11.52 21.86 11.76L18.84 19.76C18.54 20.54 17.77 21 16.91 21H9C7.9 21 7 20.1 7 19V11Z"/>
                </svg>
                <span class="engagement-count-enhanced">${this.formatCount(stats.likes)}</span>
                <span class="engagement-label">Like</span>
            </button>
            
            <button class="engagement-btn-enhanced hover-lift ${stats.isDisliked ? 'active' : ''}" 
                    onclick="videoPlayerBridge.toggleDislike('${videoId}')">
                <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 2V13L12 22L10.91 20.91C10.69 20.69 10.56 20.39 10.53 20.08L11 17H4C3.45 17 2.95 16.78 2.59 16.41C2.23 16.05 2 15.55 2 15V13C2 12.74 2.05 12.48 2.14 12.24L5.16 4.24C5.46 3.46 6.23 3 7.09 3H15C16.1 3 17 3.9 17 5V13Z"/>
                </svg>
                <span class="engagement-count-enhanced">${this.formatCount(stats.dislikes)}</span>
                <span class="engagement-label">Dislike</span>
            </button>
            
            <button class="engagement-btn-enhanced hover-lift ${stats.isFavorite ? 'active favorite-active' : ''}" 
                    onclick="videoPlayerBridge.toggleFavorite('${videoId}')">
                <svg class="engagement-icon-enhanced favorite-icon" viewBox="0 0 24 24" fill="${stats.isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span class="engagement-count-enhanced">${stats.isFavorite ? 'Favorited' : 'Favorite'}</span>
                <span class="engagement-label">Favorite</span>
            </button>
            
            <button class="engagement-btn-enhanced hover-lift" 
                    onclick="videoPlayerBridge.scrollToComments()">
                <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                <span class="engagement-count-enhanced">${this.formatCount(stats.comments)}</span>
                <span class="engagement-label">Comment</span>
            </button>
            
            <button class="engagement-btn-enhanced hover-lift" 
                    onclick="videoPlayerBridge.shareVideo('${videoId}')">
                <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                <span class="engagement-count-enhanced">Share</span>
                <span class="engagement-label">Share</span>
            </button>
            
            <button class="engagement-btn-enhanced hover-lift ${stats.isSaved ? 'active saved-active' : ''}" 
                    onclick="videoPlayerBridge.toggleSave('${videoId}')">
                <svg class="engagement-icon-enhanced save-icon" viewBox="0 0 24 24" fill="${stats.isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                <span class="engagement-count-enhanced">${stats.isSaved ? 'Saved' : 'Save'}</span>
                <span class="engagement-label">Save</span>
            </button>
        `;
        
        // Update follow button if creator info available
        const creatorId = this.dataAdapter.getCreatorId(videoId);
        if (creatorId) {
            this.updateFollowButton(creatorId);
        }
        
        // Load comments
        this.player.loadComments(videoId);
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
        const creatorStats = document.querySelector('.creator-stats');
        if (creatorStats) {
            creatorStats.textContent = `${this.formatCount(stats.followers)} followers`;
        }
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
    }
}

// ============================================
// DATA ADAPTERS FOR DIFFERENT CONTEXTS
// ============================================

class ReelsDataAdapter {
    getVideoData(videoId) {
        // Get from your reels data structure
        const reel = window.reels ? window.reels[videoId] : null;
        if (!reel) return null;
        
        const tutor = window.tutors ? window.tutors[reel.tutorId] : null;
        
        return {
            id: videoId,
            title: `${reel.title} ${reel.videoNumber}`,
            src: reel.videoUrl,
            creator: tutor?.name || 'Unknown',
            creatorId: reel.tutorId,
            views: this.getViewCount(videoId),
            description: reel.description,
            date: reel.date,
            subject: tutor?.subject
        };
    }
    
    getPlaylist(videoId, options = {}) {
        // Get filtered reels as playlist
        const reelIds = window.filteredReelIds || Object.keys(window.reels || {});
        
        return reelIds.map(id => this.getVideoData(id)).filter(v => v !== null);
    }
    
    getEngagementStats(videoId) {
        return {
            likes: window.likes?.[videoId]?.userIds?.length || 0,
            dislikes: window.dislikes?.[videoId]?.userIds?.length || 0,
            comments: window.comments?.[videoId]?.comments?.length || 0,
            isLiked: window.likes?.[videoId]?.userIds?.includes(window.currentUser?.id),
            isDisliked: window.dislikes?.[videoId]?.userIds?.includes(window.currentUser?.id),
            isFavorite: window.favorites?.[videoId]?.userIds?.includes(window.currentUser?.id),
            isSaved: window.savedVideos?.[videoId]?.userIds?.includes(window.currentUser?.id)
        };
    }
    
    getCreatorId(videoId) {
        return window.reels?.[videoId]?.tutorId;
    }
    
    getCreatorStats(creatorId) {
        return {
            followers: window.follows?.[creatorId]?.userIds?.length || 0,
            isFollowing: window.follows?.[creatorId]?.userIds?.includes(window.currentUser?.id)
        };
    }
    
    toggleLike(videoId) {
        // Call your existing toggleLike function
        if (window.toggleLike) {
            window.toggleLike(videoId);
        }
        
        return {
            success: true,
            isLiked: window.likes?.[videoId]?.userIds?.includes(window.currentUser?.id)
        };
    }
    
    toggleDislike(videoId) {
        if (window.toggleDislike) {
            window.toggleDislike(videoId);
        }
        
        return {
            success: true,
            isDisliked: window.dislikes?.[videoId]?.userIds?.includes(window.currentUser?.id)
        };
    }
    
    toggleFavorite(videoId) {
        if (window.toggleFavorite) {
            window.toggleFavorite(videoId);
        }
        
        return {
            success: true,
            isFavorite: window.favorites?.[videoId]?.userIds?.includes(window.currentUser?.id)
        };
    }
    
    toggleSave(videoId) {
        const isSaved = window.savedVideos?.[videoId]?.userIds?.includes(window.currentUser?.id);
        
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
        
        return {
            success: true,
            isFollowing: window.follows?.[creatorId]?.userIds?.includes(window.currentUser?.id)
        };
    }
    
    incrementViews(videoId) {
        // Increment view count
        if (!window.viewCounts) window.viewCounts = {};
        window.viewCounts[videoId] = (window.viewCounts[videoId] || 0) + 1;
    }
    
    getViewCount(videoId) {
        return window.viewCounts?.[videoId] || Math.floor(Math.random() * 10000);
    }
    
    updatePageUI(videoId) {
        // Update the reels grid if needed
        if (window.updateReels) {
            window.updateReels(window.currentFilter || 'all');
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

