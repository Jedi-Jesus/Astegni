// ============================================
// UNIVERSAL PLAYER BRIDGE - COMPLETE FIXED VERSION
// Connects the Ultimate Video Player to any page context
// All critical issues resolved
// ============================================

class VideoPlayerBridge {
    constructor(context) {
        this.context = context; // 'reels', 'course', 'tutorial', etc.
        this.player = null;
        this.dataAdapter = null;
        this.currentVideoId = null;
        this.isTheaterMode = false;

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

        // Add engagement styles
        this.addEngagementStyles();

        // Make bridge globally available
        window.videoPlayerBridge = this;

        // Also make player available globally for navigation
        window.player = this.player;
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

    addEngagementStyles() {
        const engagementStyles = document.createElement('style');
        engagementStyles.textContent = `
            /* Theme-matching colors for engagement buttons */
            .engagement-btn-enhanced {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                padding: 10px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: white;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 12px;
            }
            
            .engagement-btn-enhanced:hover {
                background: rgba(255, 255, 255, 0.1);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            
            .engagement-btn-enhanced.liked {
                background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%) !important;
                border-color: #667eea !important;
                color: #667eea !important;
            }
            
            .engagement-btn-enhanced.disliked {
                background: linear-gradient(135deg, rgba(118, 75, 162, 0.15) 0%, rgba(102, 126, 234, 0.15) 100%) !important;
                border-color: #764ba2 !important;
                color: #764ba2 !important;
            }
            
            .engagement-btn-enhanced.liked svg,
            .engagement-btn-enhanced.disliked svg {
                fill: currentColor;
            }
            
            .engagement-btn-enhanced.favorite-active {
                background: rgba(231, 76, 60, 0.1) !important;
                border-color: #e74c3c !important;
                color: #e74c3c !important;
            }
            
            .engagement-btn-enhanced.saved-active {
                background: rgba(243, 156, 18, 0.1) !important;
                border-color: #f39c12 !important;
                color: #f39c12 !important;
            }
            
            .engagement-icon-enhanced {
                width: 20px;
                height: 20px;
            }
            
            .engagement-count-enhanced {
                font-size: 11px;
                opacity: 0.8;
            }
            
            .hover-lift {
                transition: transform 0.3s ease;
            }
            
            .hover-lift:hover {
                transform: translateY(-2px);
            }

            /* Fixed Connection Button Theme Support */
            .connect-btn {
                padding: 8px 16px;
                background: var(--button-bg, #667eea);
                border: none;
                border-radius: 6px;
                color: var(--button-text, white);
                cursor: pointer;
                font-weight: 500;
                transition: all 0.3s ease;
                min-width: 120px;
            }
            
            .connect-btn:hover:not(:disabled) {
                background: var(--button-hover, #764ba2);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            
            .connect-btn.connecting {
                background: var(--warning-bg, #ffc107);
                color: var(--warning-text, #000);
            }
            
            .connect-btn.connected {
                background: var(--success-bg, #4caf50);
                color: var(--success-text, white);
            }
            
            .connect-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .connection-menu {
                position: absolute;
                top: 100%;
                right: 0;
                margin-top: 5px;
                background: var(--card-bg, #fff);
                border: 1px solid var(--border-color, #ddd);
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                min-width: 150px;
                z-index: 1000;
            }
            
            .connection-menu button {
                display: block;
                width: 100%;
                padding: 8px 12px;
                text-align: left;
                background: none;
                border: none;
                color: var(--text, #333);
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .connection-menu button:hover {
                background: rgba(102, 126, 234, 0.1);
            }
            
            .connection-dropdown {
                position: relative;
                display: inline-block;
            }
            
            .dots-animation span {
                animation: blink 1.4s infinite;
                animation-fill-mode: both;
            }
            
            .dots-animation span:nth-child(2) {
                animation-delay: 0.2s;
            }
            
            .dots-animation span:nth-child(3) {
                animation-delay: 0.4s;
            }
            
            @keyframes blink {
                0%, 60%, 100% { opacity: 0; }
                30% { opacity: 1; }
            }
            
            /* Navigation buttons with titles */
            .nav-btn-with-title {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                color: white;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .nav-btn-with-title:hover:not(:disabled) {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-2px);
            }
            
            .nav-btn-with-title:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }
            
            .nav-btn-text {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 2px;
            }
            
            .nav-btn-label {
                font-size: 11px;
                font-weight: 600;
            }
            
            .nav-btn-title {
                font-size: 9px;
                opacity: 0.7;
                max-width: 80px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .video-counter-display {
                font-size: 13px;
                opacity: 0.8;
                padding: 4px 12px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
            }
            
            .engagement-bar-inner {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 20px;
                gap: 20px;
            }
            
            .engagement-left,
            .engagement-right {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            
            .engagement-center {
                flex: 0 0 auto;
            }
            
            .connection-btn-wrapper {
                min-width: 140px;
            }
        `;
        document.head.appendChild(engagementStyles);
    }

    // ============================================
    // PUBLIC API
    // ============================================

    openVideo(videoId, options = {}) {
        console.log('Opening video with full content update:', videoId);
        this.currentVideoId = videoId;

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
        this.loadRelatedVideos(videoId);

        // Update engagement UI
        this.updateEngagementUI(videoId);

        // Load video details from database
        this.loadVideoDetails(videoId);

        // Open player
        this.player.open();

        // Add active class to modal as backup
        const modal = document.getElementById('ultimate-video-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        // Track view (with error handling for non-authenticated users)
        this.trackView(videoId);

        // Ensure all content is updated
        Promise.all([
            this.loadVideoDetails(videoId),
            this.loadComments(videoId),
            this.loadChapters(videoId),
            this.loadRelatedVideos(videoId)
        ]).then(() => {
            console.log('All video content loaded successfully');
        }).catch(error => {
            console.error('Error loading video content:', error);
        });
    }

    // ============================================
    // ENGAGEMENT UI - FIXED
    // ============================================

    // 2. Fixed updateEngagementUI with consistent unique IDs
    updateEngagementUI(videoId) {
        const engagementBar = document.getElementById('ultimate-engagement-bar');
        if (!engagementBar) return;

        const stats = this.dataAdapter.getEngagementStats(videoId);
        const videoData = this.dataAdapter.getVideoData(videoId);

        // Null safety for playlist navigation
        const playlist = window.currentReels || [];
        const currentIndex = playlist.findIndex(v => v.id === parseInt(videoId));
        const prevVideo = currentIndex > 0 ? playlist[currentIndex - 1] : null;
        const nextVideo = currentIndex < playlist.length - 1 ? playlist[currentIndex + 1] : null;

        // Use consistent unique ID format - just videoId
        const uniqueId = videoId;

        engagementBar.innerHTML = `
    <div class="engagement-bar-inner">
        <!-- Left side - Engagement buttons -->
        <div class="engagement-left">
            <!-- Like Button -->
            <button class="engagement-btn-enhanced ${stats.isLiked ? 'liked' : ''}" 
                    onclick="videoPlayerBridge.toggleEngagement('${videoId}', 'like')">
                <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" 
                     fill="${stats.isLiked ? 'currentColor' : 'none'}" 
                     stroke="currentColor" stroke-width="2">
                    <path d="M7 22V11L12 2L13.09 3.09C13.31 3.31 13.44 3.61 13.47 3.92L13 7H20C20.55 7 21.05 7.22 21.41 7.59C21.77 7.95 22 8.45 22 9V11C22 11.26 21.95 11.52 21.86 11.76L18.84 19.76C18.54 20.54 17.77 21 16.91 21H9C7.9 21 7 20.1 7 19V11Z"/>
                </svg>
                <span class="engagement-count-enhanced">${this.formatCount(stats.likes)}</span>
            </button>
            
            <!-- Dislike Button -->
            <button class="engagement-btn-enhanced ${stats.isDisliked ? 'disliked' : ''}" 
                    onclick="videoPlayerBridge.toggleEngagement('${videoId}', 'dislike')">
                <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" 
                     fill="${stats.isDisliked ? 'currentColor' : 'none'}" 
                     stroke="currentColor" stroke-width="2">
                    <path d="M17 2V13L12 22L10.91 20.91C10.69 20.69 10.56 20.39 10.53 20.08L11 17H4C3.45 17 2.95 16.78 2.59 16.41C2.23 16.05 2 15.55 2 15V13C2 12.74 2.05 12.48 2.14 12.24L5.16 4.24C5.46 3.46 6.23 3 7.09 3H15C16.1 3 17 3.9 17 5V13Z"/>
                </svg>
                <span class="engagement-count-enhanced">${this.formatCount(stats.dislikes)}</span>
            </button>
            
            <!-- Share Button -->
            <button class="engagement-btn-enhanced" 
                    onclick="videoPlayerBridge.shareVideo('${videoId}')">
                <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" 
                     fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="5" r="3"/>
                    <circle cx="6" cy="12" r="3"/>
                    <circle cx="18" cy="19" r="3"/>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                <span class="engagement-count-enhanced">Share</span>
            </button>
            
            <!-- Favorite Button - Fixed engagement type -->
            <button class="engagement-btn-enhanced ${stats.isFavorite ? 'favorite-active' : ''}" 
                    onclick="videoPlayerBridge.toggleEngagement('${videoId}', 'favorite')">
                <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" 
                     fill="${stats.isFavorite ? 'currentColor' : 'none'}" 
                     stroke="currentColor" stroke-width="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span class="engagement-count-enhanced">${this.formatCount(stats.favorites)}</span>
            </button>
            
            <!-- Save Button -->
            <button class="engagement-btn-enhanced ${stats.isSaved ? 'saved-active' : ''}" 
                    onclick="videoPlayerBridge.toggleEngagement('${videoId}', 'save')">
                <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" 
                     fill="${stats.isSaved ? 'currentColor' : 'none'}" 
                     stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                <span class="engagement-count-enhanced">${this.formatCount(stats.saves)}</span>
            </button>
        </div>
        
        <!-- Center - Video counter -->
        <div class="engagement-center">
            <span class="video-counter-display">
                Video ${currentIndex + 1} of ${playlist.length}
            </span>
        </div>
        
        <!-- Right side - Navigation and Connection button -->
        <div class="engagement-right">
            <!-- Previous button with title -->
            <button class="nav-btn-with-title ${!prevVideo ? 'disabled' : ''}" 
                    onclick="${prevVideo ? 'window.player && window.player.previousVideo()' : 'return false'}" 
                    ${!prevVideo ? 'disabled' : ''}
                    title="${prevVideo ? prevVideo.title : 'No previous video'}">
                <div class="nav-btn-text">
                    <span class="nav-btn-label">Previous</span>
                    <span class="nav-btn-title">${prevVideo ? prevVideo.title : 'No video'}</span>
                </div>
            </button>
            
            <!-- Next button with title -->
            <button class="nav-btn-with-title ${!nextVideo ? 'disabled' : ''}" 
                    onclick="${nextVideo ? 'window.player && window.player.nextVideo()' : 'return false'}" 
                    ${!nextVideo ? 'disabled' : ''}
                    title="${nextVideo ? nextVideo.title : 'No next video'}">
                <div class="nav-btn-text">
                    <span class="nav-btn-label">Next</span>
                    <span class="nav-btn-title">${nextVideo ? nextVideo.title : 'No video'}</span>
                </div>
            </button>
            
            <!-- Connection button with simplified ID -->
            ${videoData && videoData.tutor_id ? `
                <div id="connection-btn-${uniqueId}" 
                     class="connection-btn-wrapper"
                     data-tutor-id="${videoData.tutor_id}"
                     data-video-id="${videoId}">
                    <!-- Will be populated by updateConnectionButton -->
                </div>
            ` : ''}
        </div>
    </div>
`;

        // Update connection button if tutor_id exists
        if (videoData && videoData.tutor_id) {
            this.updateConnectionButton(videoData.tutor_id, uniqueId);
        }
    }

    // Fixed loadRelatedVideos with null safety
    // 5. Fixed loadRelatedVideos with better null safety
loadRelatedVideos(currentVideoId) {
    const container = document.getElementById('related-videos-container');
    if (!container) return;

    const currentVideo = this.dataAdapter.getVideoData(currentVideoId);
    if (!currentVideo) {
        container.innerHTML = '';
        return;
    }

    const allVideos = window.currentReels || [];
    
    // Get videos from same uploader
    const fromSameUploader = allVideos.filter(reel => 
        reel && reel.id !== parseInt(currentVideoId) && 
        reel.tutor_id === currentVideo.tutor_id
    );
    
    // Get videos by subject/grade
    const relatedByTopic = allVideos.filter(reel => {
        if (!reel || reel.id === parseInt(currentVideoId)) return false;
        if (reel.tutor_id === currentVideo.tutor_id) return false; // Already in uploader section
        
        const matchesSubject = currentVideo.subject && reel.subject && 
                               currentVideo.subject === reel.subject;
        const matchesGrade = currentVideo.grade_level && reel.grade_level && 
                            currentVideo.grade_level === reel.grade_level;
        
        return matchesSubject || matchesGrade;
    });

    container.innerHTML = `
        ${fromSameUploader.length > 0 ? `
            <div class="related-section">
                <h4 class="related-section-title">More from ${currentVideo.creator || 'this tutor'}</h4>
                <div class="related-videos-grid">
                    ${fromSameUploader.slice(0, 6).map((video, index) => 
                        this.createRelatedVideoCard(video, index)
                    ).join('')}
                </div>
            </div>
        ` : ''}
        
        ${relatedByTopic.length > 0 ? `
            <div class="related-section">
                <h4 class="related-section-title">
                    Related Videos 
                    ${currentVideo.subject || currentVideo.grade_level ? 
                      `(${[currentVideo.subject, currentVideo.grade_level].filter(Boolean).join(' - ')})` : ''}
                </h4>
                <div class="related-videos-grid">
                    ${relatedByTopic.slice(0, 9).map((video, index) => 
                        this.createRelatedVideoCard(video, index)
                    ).join('')}
                </div>
            </div>
        ` : ''}
    `;
}



    createRelatedVideoCard(video, index) {
        const uploadDate = new Date(video.upload_date || video.created_at);
        const videoUrl = typeof UrlHelper !== 'undefined'
            ? UrlHelper.getAssetUrl(video.video_url)
            : video.video_url;
        const thumbnailUrl = video.thumbnail_url && typeof UrlHelper !== 'undefined'
            ? UrlHelper.getAssetUrl(video.thumbnail_url)
            : video.thumbnail_url;
        const tutorPicture = video.tutor_picture && typeof UrlHelper !== 'undefined'
            ? UrlHelper.getAssetUrl(video.tutor_picture)
            : video.tutor_picture;

        // Null safety for tutor name
        const tutorName = video.tutor_name || 'Unknown';
        const tutorInitial = tutorName.charAt(0).toUpperCase();

        return `
        <div class="related-video-card" style="animation-delay: ${index * 0.05}s;">
            <div class="video-thumbnail-wrapper" onclick="videoPlayerBridge.openVideo(${video.id})">
                ${thumbnailUrl ?
                `<img src="${thumbnailUrl}" class="related-video-thumbnail" alt="${video.title}">` :
                `<video class="related-video-thumbnail" muted>
                        <source src="${videoUrl}" type="video/mp4">
                    </video>`
            }
                ${video.duration ? `<span class="video-duration">${video.duration}</span>` : ''}
            </div>
            <div class="related-video-info">
                <h4 class="related-video-title" title="${video.title || 'Untitled'}" onclick="videoPlayerBridge.openVideo(${video.id})">
                    ${video.title || 'Untitled'}
                </h4>
                
                ${video.description ? `
                    <p class="related-video-description">
                        ${video.description}
                    </p>
                ` : ''}
                
                <div class="related-video-meta">
                    <a href="../view-profile-tier-1/view-tutor.html?tutorId=${video.tutor_id}" 
                       class="tutor-link"
                       onclick="event.stopPropagation();">
                        ${tutorPicture ?
                `<img src="${tutorPicture}" alt="${tutorName}" class="tutor-avatar">` :
                `<span class="tutor-avatar-placeholder">${tutorInitial}</span>`
            }
                        <span class="tutor-name">${tutorName}</span>
                    </a>
                </div>
                <div class="related-video-stats">
                    <span>${this.formatCount(video.views || 0)} views</span>
                    <span>•</span>
                    <span>${this.formatTimeAgo(uploadDate)}</span>
                </div>
            </div>
        </div>
    `;
    }

    // Fixed updateConnectionButton with consistent unique IDs
    // 3. Fixed updateConnectionButton with consistent IDs
    async updateConnectionButton(tutorId, uniqueId) {
        const container = document.getElementById(`connection-btn-${uniqueId}`);
        if (!container) {
            console.debug('Connection button container not found:', uniqueId);
            return;
        }

        try {
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/tutor/${tutorId}/connection-status`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to get connection status');
            }

            const data = await response.json();
            const status = data.status;

            // Clear and update container
            container.innerHTML = '';

            if (status === 'not_connected') {
                container.innerHTML = `
            <button class="connect-btn" onclick="videoPlayerBridge.sendConnectionRequest('${tutorId}', '${uniqueId}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
                <span>Connect</span>
            </button>
        `;
            } else if (status === 'pending') {
                container.innerHTML = `
            <div class="connection-dropdown">
                <button class="connect-btn connecting" onclick="videoPlayerBridge.togglePendingMenu('${tutorId}', '${uniqueId}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>Pending</span>
                    <span class="dots-animation">
                        <span>.</span><span>.</span><span>.</span>
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-left: 4px;">
                        <path d="M7 10l5 5 5-5z"/>
                    </svg>
                </button>
                <div id="pending-menu-${uniqueId}" class="connection-menu hidden">
                    <button onclick="videoPlayerBridge.cancelConnectionRequest('${tutorId}', '${uniqueId}')" class="cancel-btn">
                        Cancel Request
                    </button>
                </div>
            </div>
        `;
            } else if (status === 'accepted') {
                container.innerHTML = `
            <div class="connection-dropdown">
                <button class="connect-btn connected" onclick="videoPlayerBridge.toggleConnectionMenu('${tutorId}', '${uniqueId}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <polyline points="17 11 19 13 23 9"></polyline>
                    </svg>
                    <span>Connected</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="margin-left: 4px;">
                        <path d="M7 10l5 5 5-5z"/>
                    </svg>
                </button>
                <div id="connection-menu-${uniqueId}" class="connection-menu hidden">
                    <button onclick="videoPlayerBridge.contactTutor('${tutorId}')">
                        Contact
                    </button>
                    <button onclick="videoPlayerBridge.disconnectFromTutor('${tutorId}', '${uniqueId}')">
                        Disconnect
                    </button>
                </div>
            </div>
        `;
            }
        } catch (error) {
            console.debug('Error updating connection button:', error);

            // Fallback to connect button
            container.innerHTML = `
        <button class="connect-btn" onclick="videoPlayerBridge.sendConnectionRequest('${tutorId}', '${uniqueId}')">
            <span>Connect</span>
        </button>
    `;
        }
    }

    // Fixed menu toggle methods with unique IDs
    togglePendingMenu(tutorId, uniqueId) {
        const menu = document.getElementById(`pending-menu-${uniqueId}`);
        if (menu) {
            menu.classList.toggle('hidden');

            const closeMenu = (e) => {
                if (!e.target.closest('.connection-dropdown')) {
                    menu.classList.add('hidden');
                    document.removeEventListener('click', closeMenu);
                }
            };

            if (!menu.classList.contains('hidden')) {
                setTimeout(() => {
                    document.addEventListener('click', closeMenu);
                }, 100);
            }
        }
    }

    toggleConnectionMenu(tutorId, uniqueId) {
        const menu = document.getElementById(`connection-menu-${uniqueId}`);
        if (menu) {
            menu.classList.toggle('hidden');

            const closeMenu = (e) => {
                if (!e.target.closest('.connection-dropdown')) {
                    menu.classList.add('hidden');
                    document.removeEventListener('click', closeMenu);
                }
            };

            if (!menu.classList.contains('hidden')) {
                setTimeout(() => {
                    document.addEventListener('click', closeMenu);
                }, 100);
            }
        }
    }

    // Fixed connection request methods with unique IDs
    async sendConnectionRequest(tutorId, uniqueId) {
        if (!window.currentUser) {
            this.player.showNotification('Please login to connect', 'warning');
            return;
        }

        const container = document.getElementById(`connection-btn-${uniqueId}`);
        if (container) {
            container.innerHTML = `
            <button class="connect-btn connecting" disabled>
                <span>Connecting</span>
                <span class="dots-animation">
                    <span>.</span><span>.</span><span>.</span>
                </span>
            </button>
        `;
        }

        try {
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/tutor/${tutorId}/connect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to send connection request');
            }

            const result = await response.json();
            this.player.showNotification('Connection request sent!');

            setTimeout(() => {
                this.updateConnectionButton(tutorId, uniqueId);
            }, 500);

        } catch (error) {
            console.error('Error sending connection request:', error);
            this.player.showNotification('Failed to send connection request', 'error');
            this.updateConnectionButton(tutorId, uniqueId);
        }
    }

    async cancelConnectionRequest(tutorId, uniqueId) {
        if (!window.currentUser) {
            this.player.showNotification('Please login first', 'warning');
            return;
        }

        const container = document.getElementById(`connection-btn-${uniqueId}`);
        if (container) {
            container.innerHTML = `
            <button class="connect-btn" disabled>
                <span>Cancelling...</span>
            </button>
        `;
        }

        try {
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/tutor/${tutorId}/disconnect`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to cancel connection request');
            }

            this.player.showNotification('Connection request cancelled');

            setTimeout(() => {
                this.updateConnectionButton(tutorId, uniqueId);
            }, 500);

        } catch (error) {
            console.error('Error cancelling connection request:', error);
            this.player.showNotification('Failed to cancel request', 'error');
            this.updateConnectionButton(tutorId, uniqueId);
        }
    }

    async disconnectFromTutor(tutorId, uniqueId) {
        if (confirm('Are you sure you want to disconnect?')) {
            try {
                const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/tutor/${tutorId}/disconnect`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to disconnect');
                }

                this.player.showNotification('Disconnected successfully');
                this.updateConnectionButton(tutorId, uniqueId);

            } catch (error) {
                console.error('Error disconnecting:', error);
                this.player.showNotification('Failed to disconnect', 'error');
            }
        }
    }

    // Fixed contact tutor method
    // 1. Fixed contactTutor function to handle missing chat feature
    contactTutor(tutorId) {
        // Check if chat is available
        if (typeof window.openChat === 'function') {
            window.openChat(tutorId);
        } else if (typeof openModal === 'function' && document.getElementById('coming-soon-modal')) {
            // Show coming soon modal if available
            openModal('coming-soon-modal');

            // Update the message in the modal
            const messageEl = document.getElementById('coming-soon-message');
            if (messageEl) {
                messageEl.textContent = 'Chat feature is coming soon! We\'re working hard to bring you real-time messaging with tutors.';
            }
        } else {
            // Fallback to simple notification
            this.player.showNotification('Chat feature is coming soon!', 'info');
        }
    }

    // ============================================
    // ENGAGEMENT HANDLERS - FIXED
    // ============================================

    async toggleEngagement(videoId, engagementType) {
        console.log(`Toggling ${engagementType} for video ${videoId}`);

        if (!window.currentUser && engagementType !== 'share') {
            this.player.showNotification('Please login to interact', 'warning');
            return;
        }

        if (engagementType === 'share') {
            this.shareVideo(videoId);
            return;
        }

        try {
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/videos/${videoId}/engage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ engagement_type: engagementType })
            });

            if (!response.ok) {
                throw new Error('Failed to update engagement');
            }

            const result = await response.json();
            console.log('Engagement result:', result);

            // Update notification messages
            const messages = {
                'like': result.message.includes('Removed') ? 'Like removed' : '👍 Liked!',
                'dislike': result.message.includes('Removed') ? 'Dislike removed' : '👎 Disliked',
                'favorite': result.message.includes('Removed') ? 'Removed from favorites' : '❤️ Added to favorites!',
                'save': result.message.includes('Removed') ? 'Removed from saved' : '📌 Saved!'
            };

            this.player.showNotification(messages[engagementType] || result.message);

            // Update local video data in currentReels
            if (window.currentReels) {
                const videoIndex = window.currentReels.findIndex(r => r.id === parseInt(videoId));
                if (videoIndex !== -1) {
                    const video = window.currentReels[videoIndex];

                    if (!video.user_engagement) {
                        video.user_engagement = {};
                    }

                    const isRemoving = result.message.includes('Removed');

                    switch (engagementType) {
                        case 'like':
                            video.user_engagement.like = !isRemoving;
                            video.likes = Math.max(0, (video.likes || 0) + (isRemoving ? -1 : 1));
                            if (!isRemoving && video.user_engagement.dislike) {
                                video.user_engagement.dislike = false;
                                video.dislikes = Math.max(0, (video.dislikes || 0) - 1);
                            }
                            break;
                        case 'dislike':
                            video.user_engagement.dislike = !isRemoving;
                            video.dislikes = Math.max(0, (video.dislikes || 0) + (isRemoving ? -1 : 1));
                            if (!isRemoving && video.user_engagement.like) {
                                video.user_engagement.like = false;
                                video.likes = Math.max(0, (video.likes || 0) - 1);
                            }
                            break;
                        case 'favorite':
                            video.user_engagement.favorite = !isRemoving;
                            video.favorites = Math.max(0, (video.favorites || 0) + (isRemoving ? -1 : 1));
                            break;
                        case 'save':
                            video.user_engagement.save = !isRemoving;
                            video.saves = Math.max(0, (video.saves || 0) + (isRemoving ? -1 : 1));
                            break;
                    }
                }
            }

            // Update engagement UI immediately
            this.updateEngagementUI(videoId);

            // Update filter counts
            if (typeof window.updateFilterCounts === 'function') {
                console.log('Updating filter counts from player...');
                await window.updateFilterCounts();
            }

            // If viewing filtered list and removing item, update the view
            if (window.currentFilter && window.currentFilter !== 'all') {
                const shouldRefresh = (
                    (window.currentFilter === 'liked' && engagementType === 'like' && result.message.includes('Removed')) ||
                    (window.currentFilter === 'saved' && engagementType === 'save' && result.message.includes('Removed')) ||
                    (window.currentFilter === 'favorites' && engagementType === 'favorite' && result.message.includes('Removed'))
                );

                if (shouldRefresh) {
                    console.log(`Item removed from ${window.currentFilter}, refreshing list...`);
                    setTimeout(() => {
                        if (typeof window.filterReels === 'function') {
                            window.filterReels(window.currentFilter);
                        }
                    }, 500);
                }
            }

        } catch (error) {
            console.error('Error toggling engagement:', error);
            this.player.showNotification('Failed to update', 'error');
        }
    }

    shareVideo(videoId) {
        const videoData = this.dataAdapter.getVideoData(videoId);
        const url = `${window.location.origin}/video/${videoId}`;

        if (navigator.share) {
            navigator.share({
                title: videoData ? videoData.title : 'Check out this video',
                text: videoData ? videoData.description : 'Amazing content on Astegni',
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

    // Fixed trackView with error handling for non-authenticated users
    trackView(videoId) {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = localStorage.getItem('access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Fire and forget with error suppression
        fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/videos/${videoId}/view`, {
            method: 'POST',
            headers: headers
        }).catch(err => {
            // Only log debug message, don't show errors to user
            console.debug('View tracking (non-critical):', err.message);
        });

        this.trackEvent('video_view', { videoId });
    }

    // ============================================
    // VIDEO DETAILS FROM DATABASE
    // ============================================

    async loadVideoDetails(videoId) {
        try {
            const headers = {};
            const token = localStorage.getItem('access_token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/videos/reels/${videoId}`, {
                headers
            });

            if (response.ok) {
                const videoData = await response.json();

                // Update all tabs with video-specific content
                this.updateDescriptionTab(videoData);
                await this.loadComments(videoId);
                await this.loadChapters(videoId);

                // Set description tab as active by default
                this.setActiveTab('description');

                // Update creator stats
                await this.updateCreatorStats(videoData.tutor_id);
            }
        } catch (error) {
            console.error('Error loading video details:', error);
        }
    }

    async updateCreatorStats(tutorId) {
        if (!tutorId) return;

        try {
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/tutor/${tutorId}/connections`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
                }
            });

            let connectionCount = 0;
            let totalVideos = 0;

            if (response.ok) {
                const data = await response.json();
                connectionCount = data.total || 0;
                totalVideos = data.videos || 0;
            }

            // Update creator stats display
            const creatorStats = document.getElementById('ultimate-creator-stats');
            if (creatorStats) {
                creatorStats.innerHTML = `
                    <span>${connectionCount} connections</span> • 
                    <span>${totalVideos} videos</span>
                `;
            }
        } catch (error) {
            console.error('Error updating creator stats:', error);
        }
    }

    setActiveTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        ['description', 'chapters', 'comments'].forEach(tab => {
            const element = document.getElementById(`${tab}Tab`);
            if (element) {
                element.style.display = tab === tabName ? 'block' : 'none';
            }
        });
    }

    updateDescriptionTab(videoData) {
        const descriptionTab = document.getElementById('descriptionTab');
        if (!descriptionTab) return;

        descriptionTab.innerHTML = `
            <div class="enhanced-card" style="padding: 20px;">
                <h4 style="font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">Description</h4>
                <div style="line-height: 1.8; color: var(--text-secondary);">
                    <p style="white-space: pre-wrap; margin-bottom: 16px;">${videoData.description || 'No description available.'}</p>
                    
                    ${videoData.subject || videoData.grade_level || videoData.category ? `
                        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; margin-top: 16px;">
                            ${videoData.subject ? `
                                <p style="margin-bottom: 8px;">
                                    <strong>Subject:</strong> ${videoData.subject}
                                </p>
                            ` : ''}
                            ${videoData.grade_level ? `
                                <p style="margin-bottom: 8px;">
                                    <strong>Grade Level:</strong> ${videoData.grade_level}
                                </p>
                            ` : ''}
                            ${videoData.category && videoData.category !== 'Ad' ? `
                                <p style="margin-bottom: 8px;">
                                    <strong>Category:</strong> ${videoData.category}
                                </p>
                            ` : ''}
                            ${videoData.duration ? `
                                <p style="margin-bottom: 8px;">
                                    <strong>Duration:</strong> ${videoData.duration}
                                </p>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // ============================================
    // COMMENTS SYSTEM - FIXED
    // ============================================

    async loadComments(videoId) {
        const commentsTab = document.getElementById('commentsTab');
        if (!commentsTab) return;

        commentsTab.innerHTML = '<div style="text-align: center; padding: 20px;">Loading comments...</div>';

        try {
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/videos/reels/${videoId}/comments`);

            if (response.ok) {
                const data = await response.json();
                const comments = data.comments || [];

                commentsTab.innerHTML = `
                <div class="comments-container enhanced-comments" style="padding: 20px; max-height: 600px; overflow-y: auto;">
                    <h4 style="font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">
                        Comments (${data.total || 0})
                    </h4>
                    
                    <!-- Comment input section -->
                    <div class="comment-input-section" style="margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <div style="display: flex; gap: 12px;">
                            ${window.currentUser ? `
                                <img src="${window.currentUser.profile_picture || '/default-avatar.png'}" 
                                     alt="You" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                            ` : `
                                <div style="width: 40px; height: 40px; border-radius: 50%; 
                                           background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                           display: flex; align-items: center; justify-content: center;">
                                    <span style="color: white; font-weight: bold;">?</span>
                                </div>
                            `}
                            <div style="flex: 1;">
                                <div class="comment-input-wrapper" style="position: relative;">
                                    <textarea id="new-comment-input-${videoId}" 
                                              class="comment-textarea"
                                              placeholder="${window.currentUser ? 'Add a comment...' : 'Login to comment'}" 
                                              style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); 
                                                     border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; 
                                                     color: white; resize: vertical; min-height: 45px; max-height: 120px;
                                                     font-family: inherit; line-height: 1.4;"
                                              ${!window.currentUser ? 'disabled' : ''}
                                              oninput="videoPlayerBridge.handleCommentInput(event, '${videoId}')"
                                              onkeydown="videoPlayerBridge.handleCommentKeydown(event, '${videoId}')"></textarea>
                                    
                                    ${window.currentUser ? `
                                        <button class="emoji-picker-btn" 
                                                onclick="videoPlayerBridge.toggleEmojiPicker('${videoId}')"
                                                style="position: absolute; right: 12px; bottom: 12px; 
                                                       background: none; border: none; cursor: pointer; 
                                                       font-size: 20px; opacity: 0.7; transition: opacity 0.2s;">
                                            😊
                                        </button>
                                    ` : ''}
                                </div>
                                
                                <!-- Emoji picker -->
                                <div id="emoji-picker-${videoId}" class="emoji-picker" style="display: none; 
                                     margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.9); 
                                     border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                                    ${this.getBasicEmojis().map(emoji => `
                                        <button onclick="videoPlayerBridge.insertEmoji('${emoji}', '${videoId}')"
                                                style="background: none; border: none; font-size: 20px; 
                                                       padding: 4px; cursor: pointer; transition: transform 0.2s;"
                                                onmouseover="this.style.transform='scale(1.3)'"
                                                onmouseout="this.style.transform='scale(1)'">
                                            ${emoji}
                                        </button>
                                    `).join('')}
                                </div>
                                
                                <!-- Action buttons -->
                                <div id="comment-actions-${videoId}" style="display: none; margin-top: 8px; gap: 8px;">
                                    <button onclick="videoPlayerBridge.cancelComment('${videoId}')" 
                                            style="padding: 8px 16px; background: rgba(255,255,255,0.1); 
                                                   border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; 
                                                   color: white; cursor: pointer; font-size: 14px;">
                                        Cancel
                                    </button>
                                    <button onclick="videoPlayerBridge.postComment('${videoId}')" 
                                            id="post-comment-btn-${videoId}"
                                            style="padding: 8px 16px; 
                                                   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                                   border: none; border-radius: 6px; color: white; cursor: pointer; 
                                                   font-weight: 500; font-size: 14px; opacity: 0.5;"
                                            disabled>
                                        Comment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Comments list -->
                    <div class="comments-list">
                        ${comments.length > 0 ? comments.map(comment => this.renderCommentWithReplies(comment, videoId)).join('') : `
                            <div style="text-align: center; padding: 40px; opacity: 0.6;">
                                <p>No comments yet. Be the first to comment!</p>
                            </div>
                        `}
                    </div>
                </div>
            `;
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            commentsTab.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #ff6b6b;">
                Failed to load comments. Please try again.
            </div>
        `;
        }
    }

    // Add this complete method for rendering comments with replies
renderCommentWithReplies(comment, videoId) {
    const isOwner = window.currentUser && comment.user_id === window.currentUser.id;
    
    return `
        <div class="comment-item" id="comment-${comment.id}" style="margin-bottom: 20px;">
            <div style="display: flex; gap: 12px;">
                ${comment.user_picture ? `
                    <img src="${comment.user_picture}" alt="${comment.user_name}" 
                         style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                ` : `
                    <div style="width: 40px; height: 40px; border-radius: 50%; 
                               background: linear-gradient(135deg, var(--button-bg), var(--button-hover)); 
                               display: flex; align-items: center; justify-content: center; 
                               font-weight: bold; color: white;">
                        ${comment.user_name ? comment.user_name.charAt(0).toUpperCase() : '?'}
                    </div>
                `}
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-weight: 600; color: var(--text);">
                            ${comment.user_name || 'Unknown'}
                        </span>
                        <span style="font-size: 12px; opacity: 0.6;">
                            ${this.formatTimeAgo(new Date(comment.created_at))}
                        </span>
                        ${comment.is_edited ? `
                            <span style="font-size: 11px; opacity: 0.5;">(edited)</span>
                        ` : ''}
                    </div>
                    
                    <div id="comment-text-${comment.id}" style="color: var(--text); line-height: 1.5;">
                        ${comment.text}
                    </div>
                    
                    <div style="display: flex; gap: 16px; margin-top: 8px;">
                        ${window.currentUser ? `
                            <button onclick="videoPlayerBridge.toggleReplyInput('${comment.id}', '${videoId}')" 
                                    style="background: none; border: none; color: var(--text-muted); 
                                           cursor: pointer; font-size: 13px; opacity: 0.8;">
                                Reply
                            </button>
                        ` : ''}
                        ${isOwner ? `
                            <button onclick="videoPlayerBridge.editComment('${comment.id}')" 
                                    style="background: none; border: none; color: var(--text-muted); 
                                           cursor: pointer; font-size: 13px; opacity: 0.8;">
                                Edit
                            </button>
                            <button onclick="videoPlayerBridge.deleteComment('${comment.id}')" 
                                    style="background: none; border: none; color: #ff6b6b; 
                                           cursor: pointer; font-size: 13px; opacity: 0.8;">
                                Delete
                            </button>
                        ` : ''}
                    </div>
                    
                    <!-- Reply input -->
                    <div id="reply-input-${comment.id}" style="display: none; margin-top: 12px;">
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="reply-text-${comment.id}"
                                   placeholder="Write a reply..." 
                                   style="flex: 1; padding: 8px; background: var(--input-bg); 
                                          border: 1px solid var(--border-color); border-radius: 6px; 
                                          color: var(--text);">
                            <button onclick="videoPlayerBridge.postReply('${comment.id}', '${videoId}')"
                                    style="padding: 8px 16px; background: var(--button-bg); 
                                           border: none; border-radius: 6px; color: var(--button-text); 
                                           cursor: pointer;">
                                Reply
                            </button>
                        </div>
                    </div>
                    
                    <!-- Render replies -->
                    ${comment.replies && comment.replies.length > 0 ? `
                        <div style="margin-top: 12px; margin-left: 20px;">
                            ${comment.replies.map(reply => this.renderReply(reply, videoId)).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

renderReply(reply, videoId) {
    const isOwner = window.currentUser && reply.user_id === window.currentUser.id;
    
    return `
        <div class="reply-item" style="display: flex; gap: 8px; margin-bottom: 12px;">
            ${reply.user_picture ? `
                <img src="${reply.user_picture}" alt="${reply.user_name}" 
                     style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
            ` : `
                <div style="width: 32px; height: 32px; border-radius: 50%; 
                           background: linear-gradient(135deg, var(--button-bg), var(--button-hover)); 
                           display: flex; align-items: center; justify-content: center; 
                           font-size: 12px; color: white;">
                    ${reply.user_name ? reply.user_name.charAt(0).toUpperCase() : '?'}
                </div>
            `}
            <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span style="font-weight: 500; font-size: 13px; color: var(--text);">
                        ${reply.user_name || 'Unknown'}
                    </span>
                    <span style="font-size: 11px; opacity: 0.5;">
                        ${this.formatTimeAgo(new Date(reply.created_at))}
                    </span>
                </div>
                <div id="reply-text-${reply.id}" style="font-size: 13px; color: var(--text);">
                    ${reply.text}
                </div>
                <div style="display: flex; gap: 12px; margin-top: 4px;">
                    ${window.currentUser ? `
                        <button onclick="videoPlayerBridge.toggleReplyInput('reply-${reply.id}', '${videoId}')" 
                                style="background: none; border: none; color: var(--text-muted); 
                                       cursor: pointer; font-size: 11px; opacity: 0.7;">
                            Reply
                        </button>
                    ` : ''}
                    ${isOwner ? `
                        <button onclick="videoPlayerBridge.editReply('${reply.id}')" 
                                style="background: none; border: none; color: var(--text-muted); 
                                       cursor: pointer; font-size: 11px; opacity: 0.7;">
                            Edit
                        </button>
                        <button onclick="videoPlayerBridge.deleteReply('${reply.id}')" 
                                style="background: none; border: none; color: #ff6b6b; 
                                       cursor: pointer; font-size: 11px; opacity: 0.7;">
                            Delete
                        </button>
                    ` : ''}
                </div>
                
                <!-- Reply input for nested replies -->
                <div id="reply-input-reply-${reply.id}" style="display: none; margin-top: 8px;">
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="reply-text-reply-${reply.id}"
                               placeholder="Write a reply..." 
                               style="flex: 1; padding: 6px; background: var(--input-bg); 
                                      border: 1px solid var(--border-color); border-radius: 4px; 
                                      color: var(--text); font-size: 12px;">
                        <button onclick="videoPlayerBridge.postReply('${reply.parent_comment_id || reply.id}', '${videoId}')"
                                style="padding: 6px 12px; background: var(--button-bg); 
                                       border: none; border-radius: 4px; color: var(--button-text); 
                                       cursor: pointer; font-size: 12px;">
                            Reply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}


// Fixed comment methods
handleCommentInput(event, videoId) {
    event.stopPropagation(); // Prevent event bubbling
    const textarea = event.target;
    const actionsDiv = document.getElementById(`comment-actions-${videoId}`);
    const postBtn = document.getElementById(`post-comment-btn-${videoId}`);

    // Auto-resize textarea
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';

    // Show/hide action buttons
    if (textarea.value.trim()) {
        actionsDiv.style.display = 'flex';
        postBtn.disabled = false;
        postBtn.style.opacity = '1';
    } else {
        postBtn.disabled = true;
        postBtn.style.opacity = '0.5';
    }
}

handleCommentKeydown(event, videoId) {
    event.stopPropagation(); // Prevent keyboard shortcuts from affecting video
    
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this.postComment(videoId);
    }
}

    handleCommentKeydown(event, videoId) {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            this.postComment(videoId);
        }
    }

    cancelComment(videoId) {
        const textarea = document.getElementById(`new-comment-input-${videoId}`);
        const actionsDiv = document.getElementById(`comment-actions-${videoId}`);

        if (textarea) {
            textarea.value = '';
            textarea.style.height = '45px';
        }
        if (actionsDiv) actionsDiv.style.display = 'none';
    }

    getBasicEmojis() {
        return ['😀', '😂', '❤️', '👍', '👎', '😮', '😢', '😡', '🔥', '💯', '🎉', '👏', '💪', '🙏', '😎'];
    }

    toggleEmojiPicker(videoId) {
        const picker = document.getElementById(`emoji-picker-${videoId}`);
        if (picker) {
            picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
        }
    }

    insertEmoji(emoji, videoId) {
        const textarea = document.getElementById(`new-comment-input-${videoId}`);
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = textarea.value;
            textarea.value = text.substring(0, start) + emoji + text.substring(end);
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = start + emoji.length;

            const event = new Event('input', { bubbles: true });
            textarea.dispatchEvent(event);
        }
        this.toggleEmojiPicker(videoId);
    }

    async postComment(videoId) {
        const input = document.getElementById(`new-comment-input-${videoId}`);
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
                this.player.showNotification('Comment posted successfully');
                input.value = '';
                input.style.height = '45px';

                const actionsDiv = document.getElementById(`comment-actions-${videoId}`);
                if (actionsDiv) actionsDiv.style.display = 'none';

                this.loadComments(videoId);
            } else {
                throw new Error('Failed to post comment');
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            this.player.showNotification('Failed to post comment', 'error');
        }
    }

    // Fixed postReply with correct body format
    // 4. Fixed postReply with correct body format
    async postReply(commentId, videoId) {
        const input = document.getElementById(`reply-text-${commentId}`);
        if (!input || !input.value.trim()) return;

        try {
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/videos/reels/${videoId}/comments/${commentId}/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ text: input.value.trim() })  // Send as object, not plain text
            });

            if (response.ok) {
                this.player.showNotification('Reply posted');
                this.loadComments(videoId);
            }
        } catch (error) {
            console.error('Error posting reply:', error);
            this.player.showNotification('Failed to post reply', 'error');
        }
    }



    toggleReplyInput(commentId) {
        const replyDiv = document.getElementById(`reply-input-${commentId}`);
        if (replyDiv) {
            replyDiv.style.display = replyDiv.style.display === 'none' ? 'block' : 'none';
            if (replyDiv.style.display === 'block') {
                const input = document.getElementById(`reply-text-${commentId}`);
                if (input) input.focus();
            }
        }
    }

    editComment(commentId) {
        const textDiv = document.getElementById(`comment-text-${commentId}`);
        if (!textDiv) return;

        const currentText = textDiv.innerText;
        textDiv.innerHTML = `
        <textarea id="edit-textarea-${commentId}" 
                  style="width: 100%; padding: 8px; background: rgba(255,255,255,0.05); 
                         border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; 
                         color: white; resize: vertical; min-height: 60px;">${currentText}</textarea>
        <div style="margin-top: 8px; gap: 8px; display: flex;">
            <button onclick="videoPlayerBridge.saveEditComment('${commentId}')" 
                    style="padding: 6px 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                           border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 13px;">
                Save
            </button>
            <button onclick="videoPlayerBridge.cancelEditComment('${commentId}', \`${currentText.replace(/`/g, '\\`')}\`)" 
                    style="padding: 6px 12px; background: rgba(255,255,255,0.1); 
                           border: none; border-radius: 4px; color: white; cursor: pointer; font-size: 13px;">
                Cancel
            </button>
        </div>
    `;

        const textarea = document.getElementById(`edit-textarea-${commentId}`);
        if (textarea) {
            textarea.focus();
            textarea.select();
        }
    }

    async saveEditComment(commentId) {
        const textarea = document.getElementById(`edit-textarea-${commentId}`);
        if (!textarea) return;

        const newText = textarea.value.trim();
        if (!newText) return;

        try {
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/comments/${commentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                },
                body: JSON.stringify({ text: newText })
            });

            if (response.ok) {
                this.player.showNotification('Comment updated');
                this.loadComments(this.currentVideoId);
            }
        } catch (error) {
            console.error('Error updating comment:', error);
            this.player.showNotification('Failed to update comment', 'error');
        }
    }

    cancelEditComment(commentId, originalText) {
        const textDiv = document.getElementById(`comment-text-${commentId}`);
        if (textDiv) {
            textDiv.innerText = originalText;
        }
    }

    async deleteComment(commentId) {
        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                this.player.showNotification('Comment deleted');
                this.loadComments(this.currentVideoId);
            } else {
                throw new Error('Failed to delete comment');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            this.player.showNotification('Failed to delete comment', 'error');
        }
    }

    // ============================================
    // CHAPTERS SYSTEM
    // ============================================

    async loadChapters(videoId) {
        const chaptersTab = document.getElementById('chaptersTab');
        if (!chaptersTab) return;

        try {
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/videos/reels/${videoId}/chapters`);

            if (response.ok) {
                const chapters = await response.json();

                if (chapters && chapters.length > 0) {
                    chaptersTab.innerHTML = `
                        <div class="chapters-container" style="padding: 20px;">
                            <h4 style="font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">
                                Chapters
                            </h4>
                            <div class="chapters-list">
                                ${chapters.map((chapter, index) => `
                                    <div class="chapter-item" 
                                         onclick="videoPlayerBridge.seekToChapter(${chapter.timestamp})"
                                         style="padding: 12px; margin-bottom: 8px; 
                                                background: rgba(255,255,255,0.05); 
                                                border-radius: 8px; cursor: pointer; 
                                                transition: all 0.3s ease;">
                                        <div style="display: flex; align-items: center; gap: 16px;">
                                            <span style="font-size: 18px; font-weight: bold; 
                                                       color: rgba(102, 126, 234, 0.8);">
                                                ${(index + 1).toString().padStart(2, '0')}
                                            </span>
                                            <div style="flex: 1;">
                                                <div style="font-weight: 500; margin-bottom: 4px;">
                                                    ${chapter.title}
                                                </div>
                                                <div style="font-size: 12px; opacity: 0.6;">
                                                    ${this.formatTime(chapter.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                } else {
                    chaptersTab.innerHTML = `
                        <div style="text-align: center; padding: 40px; opacity: 0.6;">
                            <p>No chapters available for this video</p>
                        </div>
                    `;
                }
            } else {
                throw new Error('Failed to load chapters');
            }
        } catch (error) {
            console.error('Error loading chapters:', error);
            chaptersTab.innerHTML = `
                <div style="text-align: center; padding: 40px; opacity: 0.6;">
                    <p>No chapters available</p>
                </div>
            `;
        }
    }

    seekToChapter(timestamp) {
        if (this.player && this.player.elements.video) {
            this.player.elements.video.currentTime = timestamp;
            this.player.showNotification('Jumped to chapter');
        }
    }

    // ============================================
    // TRACKING & ANALYTICS
    // ============================================

    trackEvent(event, data) {
        if (window.gtag) {
            gtag('event', event, data);
        }
        console.log('📊 Event:', event, data);
    }

    // ============================================
    // CALLBACKS
    // ============================================

    handleVideoLoad(video) {
        this.updatePageUI(video.id);
        this.trackEvent('video_loaded', { videoId: video.id });
    }

    handleVideoEnd(video) {
        this.trackEvent('video_completed', { videoId: video.id });
    }

    handleLike(video) {
        this.toggleEngagement(video.id, 'like');
    }

    handleDislike(video) {
        this.toggleEngagement(video.id, 'dislike');
    }

    handleComment(comment) {
        this.trackEvent('comment_added', { comment });
    }

    handleShare(video) {
        this.shareVideo(video.id);
    }

    handleSave(video) {
        this.toggleEngagement(video.id, 'save');
    }

    handleFavorite(video) {
        this.toggleEngagement(video.id, 'favorite');
    }

    handleFollow(creator) {
        this.dataAdapter.toggleFollow(creator.id);
    }

    handleClose() {
        this.updatePageUI(null);
    }

    // ============================================
    // UTILITIES
    // ============================================

    updatePageUI(videoId) {
        if (this.dataAdapter.updatePageUI) {
            this.dataAdapter.updatePageUI(videoId);
        }
    }

    formatCount(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    formatTimeAgo(date) {
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

        return date.toLocaleDateString();
    }
}

// ============================================
// DATA ADAPTERS FOR DIFFERENT CONTEXTS
// ============================================

class ReelsDataAdapter {
    constructor() {
        this.currentReels = [];
        console.log('ReelsDataAdapter initialized');
    }

    getVideoData(videoId) {
        this.currentReels = window.currentReels || [];

        const reel = this.currentReels.find(r => r.id === parseInt(videoId));

        if (!reel) {
            console.warn(`Reel not found for ID: ${videoId}`);
            return null;
        }

        const videoUrl = typeof UrlHelper !== 'undefined'
            ? UrlHelper.getAssetUrl(reel.video_url)
            : reel.video_url;

        console.log('Adapter: Processing reel data:', {
            id: reel.id,
            title: reel.title,
            tutor_id: reel.tutor_id,
            tutor_name: reel.tutor_name
        });

        return {
            id: String(videoId),
            title: reel.title || 'Untitled',
            src: videoUrl,
            creator: reel.tutor_name || 'Unknown Tutor',
            creatorId: reel.tutor_id,
            tutor_id: reel.tutor_id,
            views: reel.views || 0,
            description: reel.description || '',
            date: reel.upload_date || reel.created_at || new Date().toISOString(),
            subject: reel.subject || reel.tutor_subject || '',
            category: reel.category || '',
            grade_level: reel.grade_level || '',
            thumbnail_url: reel.thumbnail_url,
            duration: reel.duration || '',
            is_featured: reel.is_featured || false,
            is_ad: reel.category === 'Ad'
        };
    }

    getCurrentVideoIndex() {
        if (this.currentReels && window.videoPlayerBridge?.currentVideoId) {
            return this.currentReels.findIndex(r => r.id === parseInt(window.videoPlayerBridge.currentVideoId));
        }
        return 0;
    }

    getTotalVideos() {
        return this.currentReels ? this.currentReels.length : 0;
    }

    getPlaylist(videoId, options = {}) {
        this.currentReels = window.currentReels || [];

        if (this.currentReels.length === 0) {
            console.warn('No reels available for playlist');
            return [];
        }

        let playlist = [...this.currentReels];

        if (options.filter) {
            playlist = this.filterPlaylist(playlist, options.filter);
        }

        return playlist.map(reel => ({
            id: String(reel.id),
            title: `${reel.title || 'Untitled'} ${reel.video_number || ''}`.trim(),
            src: typeof UrlHelper !== 'undefined'
                ? UrlHelper.getAssetUrl(reel.video_url)
                : reel.video_url,
            creator: reel.tutor_name || 'Unknown',
            creatorId: reel.tutor_id,
            tutor_id: reel.tutor_id,
            views: reel.views || 0,
            description: reel.description || '',
            date: reel.upload_date || reel.created_at,
            subject: reel.tutor_subject || reel.subject || '',
            thumbnail_url: reel.thumbnail_url
        }));
    }

    filterPlaylist(playlist, filter) {
        switch (filter) {
            case 'same-tutor':
                const currentReel = playlist.find(r => r.id === parseInt(this.currentVideoId));
                if (currentReel && currentReel.tutor_id) {
                    return playlist.filter(r => r.tutor_id === currentReel.tutor_id);
                }
                break;
            case 'same-subject':
                const subjectReel = playlist.find(r => r.id === parseInt(this.currentVideoId));
                if (subjectReel && subjectReel.subject) {
                    return playlist.filter(r => r.subject === subjectReel.subject);
                }
                break;
        }
        return playlist;
    }

    getEngagementStats(videoId) {
        this.currentReels = window.currentReels || [];
        const reel = this.currentReels.find(r => r.id === parseInt(videoId));

        if (!reel) {
            console.warn(`No engagement stats for video ID: ${videoId}`);
            return this.getDefaultEngagementStats();
        }

        const userEngagement = reel.user_engagement || {};

        return {
            likes: parseInt(reel.likes) || 0,
            dislikes: parseInt(reel.dislikes) || 0,
            favorites: parseInt(reel.favorites) || 0,
            saves: parseInt(reel.saves) || 0,
            shares: parseInt(reel.shares) || 0,
            comments: parseInt(reel.comments_count) || 0,
            isLiked: userEngagement.like === true,
            isDisliked: userEngagement.dislike === true,
            isFavorite: userEngagement.favorite === true,
            isSaved: userEngagement.save === true,
            hasViewed: userEngagement.view === true
        };
    }

    getDefaultEngagementStats() {
        return {
            likes: 0,
            dislikes: 0,
            favorites: 0,
            saves: 0,
            shares: 0,
            comments: 0,
            isLiked: false,
            isDisliked: false,
            isFavorite: false,
            isSaved: false,
            hasViewed: false
        };
    }

    getCreatorId(videoId) {
        this.currentReels = window.currentReels || [];
        const reel = this.currentReels.find(r => r.id === parseInt(videoId));
        return reel ? reel.tutor_id : null;
    }

    getCreatorStats(creatorId) {
        if (!creatorId) {
            return {
                followers: 0,
                isFollowing: false,
                totalVideos: 0,
                totalViews: 0
            };
        }

        this.currentReels = window.currentReels || [];
        const creatorVideos = this.currentReels.filter(r => r.tutor_id === creatorId);

        const totalViews = creatorVideos.reduce((sum, video) => sum + (video.views || 0), 0);
        const isFollowing = creatorVideos.length > 0 && creatorVideos[0].is_following === true;

        return {
            followers: creatorVideos[0]?.followers_count || 0,
            isFollowing: isFollowing,
            totalVideos: creatorVideos.length,
            totalViews: totalViews
        };
    }

    async toggleFollow(creatorId) {
        if (!window.currentUser) {
            console.warn('User not authenticated');
            return {
                success: false,
                message: 'Please login to follow tutors'
            };
        }

        try {
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/tutor/${creatorId}/follow`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.updateFollowStatus(creatorId, result.is_following);

                return {
                    success: true,
                    isFollowing: result.is_following,
                    message: result.message
                };
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
        }

        return {
            success: false,
            message: 'Failed to update follow status'
        };
    }

    updateFollowStatus(creatorId, isFollowing) {
        this.currentReels = window.currentReels || [];
        this.currentReels.forEach(reel => {
            if (reel.tutor_id === creatorId) {
                reel.is_following = isFollowing;
            }
        });
        window.currentReels = this.currentReels;
    }

    updatePageUI(videoId) {
        if (typeof window.loadReels === 'function') {
            console.log('Refreshing reels after update');
            setTimeout(() => window.loadReels(), 500);
        }
    }

    getVideoByIndex(index) {
        this.currentReels = window.currentReels || [];
        if (index >= 0 && index < this.currentReels.length) {
            return this.getVideoData(this.currentReels[index].id);
        }
        return null;
    }

    isAdVideo(videoId) {
        const reel = this.currentReels.find(r => r.id === parseInt(videoId));
        if (!reel) return false;
        return reel.category === 'Ad' || reel.is_featured === true;
    }
}

// Placeholder adapters for other contexts
class CourseDataAdapter extends ReelsDataAdapter { }
class TutorialDataAdapter extends ReelsDataAdapter { }
class WebinarDataAdapter extends ReelsDataAdapter { }
class DefaultDataAdapter extends ReelsDataAdapter { }

// ============================================
// INITIALIZATION
// ============================================

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