// ============================================
// UNIVERSAL PLAYER BRIDGE - COMPLETE VERSION
// Connects the Ultimate Video Player to any page context
// Works with Reels, Courses, Tutorials, etc.
// ============================================

class VideoPlayerBridge {
    constructor(context) {
        this.context = context; // 'reels', 'course', 'tutorial', etc.
        this.player = null;
        this.dataAdapter = null;
        this.currentVideoId = null;

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
            }
            
            .engagement-btn-enhanced.saved-active {
                background: rgba(243, 156, 18, 0.1) !important;
                border-color: #f39c12 !important;
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

            /* ADD THE CONNECTION STYLES HERE */
/* Connect Button Theme Support */
        .connect-btn {
            padding: 8px 16px;
            background: var(--button-bg, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
            border: none;
            border-radius: 6px;
            color: white;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
            min-width: 120px;
        }
        
        [data-theme="light"] .connect-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .connect-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        .connect-btn.connecting {
            background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
        }
        
        .connect-btn.connected {
            background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
        }
        
        .connection-menu {
            background: var(--card-bg, white);
            border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        [data-theme="dark"] .connection-menu {
            background: #2a2a2a;
            border-color: rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }
        
        .connection-menu button {
            color: var(--text, #333);
        }
        
        [data-theme="dark"] .connection-menu button {
            color: #fff;
        }
        
        .connection-menu button:hover {
            background: rgba(var(--button-bg-rgb, 102, 126, 234), 0.1);
        }
        
        [data-theme="light"] .related-video-creator:hover {
            color: #764ba2;
            text-decoration: underline;
        }
        
        [data-theme="dark"] .related-video-creator {
            color: #818cf8;
        }
        
        [data-theme="dark"] .related-video-creator:hover {
            color: #a5b4fc;
            text-decoration: underline;
        }
        
        .dots-animation {
            display: inline-block;
            margin-left: 4px;
        }
        
        .dots-animation span {
            animation: dot-blink 1.4s infinite both;
            display: inline-block;
        }
        
        .dots-animation span:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .dots-animation span:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes dot-blink {
            0%, 60%, 100% {
                opacity: 0.3;
            }
            30% {
                opacity: 1;
            }
        }
        
        .connection-dropdown {
            position: relative;
        }
        
        .connection-menu {
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 4px;
            background: white;
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            min-width: 150px;
            z-index: 1000;
            overflow: hidden;
        }
        
        .connection-menu.hidden {
            display: none;
        }
        
        .connection-menu button {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 12px 16px;
            background: none;
            border: none;
            text-align: left;
            cursor: pointer;
            transition: background 0.2s;
            color: #333;
        }
        
        .connection-menu button:hover {
            background: rgba(102, 126, 234, 0.1);
        }
        
        .connection-menu button svg {
            flex-shrink: 0;
        }
    `;
        document.head.appendChild(engagementStyles);
    }

    // ============================================
    // PUBLIC API
    // ============================================

    openVideo(videoId, options = {}) {
        console.log('Bridge openVideo called with:', videoId);
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

        // Track view
        this.trackView(videoId);
    }

    // ============================================
    // ENGAGEMENT UI
    // ============================================

    // Updates for player-bridge.js and reels_dynamic.js

    // 1. Update the engagement bar UI in player-bridge.js
    // Replace the updateEngagementUI function with this enhanced version:


    updateEngagementUI(videoId) {
        const engagementBar = document.getElementById('ultimate-engagement-bar');
        if (!engagementBar) return;

        const stats = this.dataAdapter.getEngagementStats(videoId);

        engagementBar.innerHTML = `
        <div style="display: flex; gap: 12px; justify-content: space-between; padding: 12px;">
            <div style="display: flex; gap: 12px; flex: 1;">
                <!-- Like Button -->
                <button class="engagement-btn-enhanced hover-lift ${stats.isLiked ? 'active liked' : ''}" 
                        onclick="videoPlayerBridge.toggleEngagement('${videoId}', 'like')"
                        style="flex: 1; padding: 10px;">
                    <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" 
                         fill="${stats.isLiked ? 'currentColor' : 'none'}" 
                         stroke="currentColor" stroke-width="2">
                        <path d="M7 22V11L12 2L13.09 3.09C13.31 3.31 13.44 3.61 13.47 3.92L13 7H20C20.55 7 21.05 7.22 21.41 7.59C21.77 7.95 22 8.45 22 9V11C22 11.26 21.95 11.52 21.86 11.76L18.84 19.76C18.54 20.54 17.77 21 16.91 21H9C7.9 21 7 20.1 7 19V11Z"/>
                    </svg>
                    <span class="engagement-count-enhanced">${this.formatCount(stats.likes)}</span>
                </button>
                
                <!-- Dislike Button -->
                <button class="engagement-btn-enhanced hover-lift ${stats.isDisliked ? 'active disliked' : ''}" 
                        onclick="videoPlayerBridge.toggleEngagement('${videoId}', 'dislike')"
                        style="flex: 1; padding: 10px;">
                    <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" 
                         fill="${stats.isDisliked ? 'currentColor' : 'none'}" 
                         stroke="currentColor" stroke-width="2">
                        <path d="M17 2V13L12 22L10.91 20.91C10.69 20.69 10.56 20.39 10.53 20.08L11 17H4C3.45 17 2.95 16.78 2.59 16.41C2.23 16.05 2 15.55 2 15V13C2 12.74 2.05 12.48 2.14 12.24L5.16 4.24C5.46 3.46 6.23 3 7.09 3H15C16.1 3 17 3.9 17 5V13Z"/>
                    </svg>
                    <span class="engagement-count-enhanced">${this.formatCount(stats.dislikes)}</span>
                </button>
                
                <!-- Favorite Button -->
                <button class="engagement-btn-enhanced hover-lift ${stats.isFavorite ? 'active favorite-active' : ''}" 
                        onclick="videoPlayerBridge.toggleEngagement('${videoId}', 'favorite')"
                        style="flex: 1; padding: 10px;">
                    <svg class="engagement-icon-enhanced favorite-icon" viewBox="0 0 24 24" 
                         fill="${stats.isFavorite ? '#e74c3c' : 'none'}" 
                         stroke="${stats.isFavorite ? '#e74c3c' : 'currentColor'}" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                    <span class="engagement-count-enhanced">${this.formatCount(stats.favorites)}</span>
                </button>
                
                <!-- Save Button -->
                <button class="engagement-btn-enhanced hover-lift ${stats.isSaved ? 'active saved-active' : ''}" 
                        onclick="videoPlayerBridge.toggleEngagement('${videoId}', 'save')"
                        style="flex: 1; padding: 10px;">
                    <svg class="engagement-icon-enhanced save-icon" viewBox="0 0 24 24" 
                         fill="${stats.isSaved ? '#f39c12' : 'none'}" 
                         stroke="${stats.isSaved ? '#f39c12' : 'currentColor'}" stroke-width="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span class="engagement-count-enhanced">${this.formatCount(stats.saves)}</span>
                </button>
                
                <!-- Share Button -->
                <button class="engagement-btn-enhanced hover-lift" 
                        onclick="videoPlayerBridge.shareVideo('${videoId}')"
                        style="flex: 1; padding: 10px;">
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
            </div>
        </div>
    `;
    }

    // In VideoPlayerBridge class, add:

    loadRelatedVideos(currentVideoId) {
    const container = document.getElementById('related-videos-container');
    if (!container) return;
    
    const currentVideo = this.dataAdapter.getVideoData(currentVideoId);
    if (!currentVideo) return;
    
    // Get videos from same uploader
    const uploaderVideos = window.currentReels.filter(reel => 
        reel.id !== parseInt(currentVideoId) && 
        reel.tutor_id === currentVideo.tutor_id
    ).slice(0, 10);
    
    // Get related videos (different uploader, same subject/grade)
    const relatedVideos = window.currentReels.filter(reel => 
        reel.id !== parseInt(currentVideoId) && 
        reel.tutor_id !== currentVideo.tutor_id &&
        (reel.subject === currentVideo.subject || 
         reel.grade_level === currentVideo.grade_level)
    ).slice(0, 10);
    
    // Build HTML with two horizontal sections
    container.innerHTML = `
        ${uploaderVideos.length > 0 ? `
            <div class="related-section">
                <h4 class="related-section-title">More from ${currentVideo.creator}</h4>
                <div class="related-videos-horizontal">
                    <div class="related-videos-track">
                        ${uploaderVideos.map(video => this.createRelatedVideoCard(video)).join('')}
                    </div>
                </div>
            </div>
        ` : ''}
        
        ${relatedVideos.length > 0 ? `
            <div class="related-section">
                <h4 class="related-section-title">Related Videos</h4>
                <div class="related-videos-horizontal">
                    <div class="related-videos-track">
                        ${relatedVideos.map(video => this.createRelatedVideoCard(video)).join('')}
                    </div>
                </div>
            </div>
        ` : ''}
        
        ${uploaderVideos.length === 0 && relatedVideos.length === 0 ? `
            <div class="no-related-videos">
                <p>No related videos available</p>
            </div>
        ` : ''}
    `;
}

createRelatedVideoCard(video) {
    return `
        <div class="related-video-card-horizontal" onclick="videoPlayerBridge.openVideo(${video.id})">
            <img class="related-video-thumbnail" 
                 src="${video.thumbnail_url || '/default-thumbnail.jpg'}" 
                 alt="${video.title}">
            <div class="related-video-info">
                <div class="related-video-title">${video.title}</div>
                <div class="related-video-meta">
                    <a href="../view-profile-tier-1/view-tutor.html?tutorId=${video.tutor_id}" 
                       class="related-video-creator-link"
                       onclick="event.stopPropagation();">
                        ${video.tutor_picture ? 
                            `<img src="${video.tutor_picture}" alt="${video.tutor_name}" class="related-tutor-avatar">` :
                            `<div class="related-tutor-avatar-default">
                                ${video.tutor_name ? video.tutor_name.charAt(0).toUpperCase() : 'T'}
                            </div>`
                        }
                        <span class="related-video-creator">${video.tutor_name}</span>
                    </a>
                </div>
                <div class="related-video-stats">
                    <span>${this.formatCount(video.views)} views</span>
                </div>
            </div>
        </div>
    `;
}


    // 2. Add new connection functions to player-bridge.js

    // In player-bridge.js, update the updateConnectionButton method to handle both engagement bar and sidebar:

    // Update the updateConnectionButton method in player-bridge.js to add cancel functionality:

    // Update the updateConnectionButton method in player-bridge.js with themed styling:

    async updateConnectionButton(tutorId, uniqueId) {
        // Find the specific container for this tutor/video combination
        const container = document.getElementById(`connection-btn-${uniqueId}`);

        if (!container) {
            console.warn('No connection button container found for:', uniqueId);
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
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
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
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                            </svg>
                            Contact
                        </button>
                        <button onclick="videoPlayerBridge.disconnectFromTutor('${tutorId}', '${uniqueId}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14.59 8L12 10.59 9.41 8 8 9.41 10.59 12 8 14.59 9.41 16 12 13.41 14.59 16 16 14.59 13.41 12 16 9.41 14.59 8zM12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                            </svg>
                            Disconnect
                        </button>
                    </div>
                </div>
            `;
            }
        } catch (error) {
            console.error('Error updating connection button:', error);

            // Fallback to connect button
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
        }
    }

    // Update toggleConnectionMenu to handle both IDs:
    toggleConnectionMenu(tutorId, videoId, menuId) {
        const menu = document.getElementById(menuId);
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

    // Update the menu toggle methods to use unique IDs
    // Update the menu toggle methods to use unique IDs
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



    // Add new method to handle pending menu toggle
    togglePendingMenu(tutorId, videoId) {
        const menu = document.getElementById(`pending-menu-${videoId}`);
        if (menu) {
            menu.classList.toggle('hidden');

            // Close menu when clicking outside
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

    // Add new method to cancel connection request
    async cancelConnectionRequest(tutorId, videoId) {
        if (!window.currentUser) {
            this.player.showNotification('Please login first', 'warning');
            return;
        }

        // Show cancelling state
        const containers = [
            document.getElementById(`connection-btn-${videoId}`),
            document.getElementById(`connection-btn-sidebar-${videoId}`)
        ].filter(Boolean);

        containers.forEach(container => {
            container.innerHTML = `
        <button class="connect-btn" disabled>
            <span>Cancelling...</span>
        </button>
    `;
        });

        try {
            // Call the disconnect endpoint (which removes pending requests too)
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

            // Update button back to "Connect" state
            setTimeout(() => {
                this.updateConnectionButton(tutorId, videoId);
            }, 500);

        } catch (error) {
            console.error('Error cancelling connection request:', error);
            this.player.showNotification('Failed to cancel request', 'error');
            this.updateConnectionButton(tutorId, videoId);
        }
    }

    // Also update the sendConnectionRequest method to update both buttons:
    async sendConnectionRequest(tutorId, videoId) {
        if (!window.currentUser) {
            this.player.showNotification('Please login to connect', 'warning');
            return;
        }

        // Update both button containers if they exist
        const containers = [
            document.getElementById(`connection-btn-${videoId}`),
            document.getElementById(`connection-btn-sidebar-${videoId}`)
        ].filter(Boolean);

        containers.forEach(container => {
            container.innerHTML = `
        <button class="connect-btn connecting" disabled>
            <span>Connecting</span>
            <span class="dots-animation">
                <span>.</span><span>.</span><span>.</span>
            </span>
        </button>
    `;
        });

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

            // Update both buttons to show pending state
            setTimeout(() => {
                this.updateConnectionButton(tutorId, videoId);
            }, 500);

        } catch (error) {
            console.error('Error sending connection request:', error);
            this.player.showNotification('Failed to send connection request', 'error');
            this.updateConnectionButton(tutorId, videoId);
        }
    }

    // Update disconnectFromTutor to refresh both buttons:
    async disconnectFromTutor(tutorId, videoId) {
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
                this.updateConnectionButton(tutorId, videoId);

            } catch (error) {
                console.error('Error disconnecting:', error);
                this.player.showNotification('Failed to disconnect', 'error');
            }
        }
    }



    async sendConnectionRequest(tutorId, videoId) {
        if (!window.currentUser) {
            this.player.showNotification('Please login to connect', 'warning');
            return;
        }

        const container = document.getElementById(`connection-btn-${videoId}`);
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

            // Update button to show pending state
            setTimeout(() => {
                this.updateConnectionButton(tutorId, videoId);
            }, 500);

        } catch (error) {
            console.error('Error sending connection request:', error);
            this.player.showNotification('Failed to send connection request', 'error');
            this.updateConnectionButton(tutorId, videoId);
        }
    }

    async disconnectFromTutor(tutorId, videoId) {
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
                this.updateConnectionButton(tutorId, videoId);

            } catch (error) {
                console.error('Error disconnecting:', error);
                this.player.showNotification('Failed to disconnect', 'error');
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

    contactTutor(tutorId) {
        // Open chat/message window
        window.location.href = `/chat?tutor=${tutorId}`;
    }

    // ============================================
    // ENGAGEMENT HANDLERS
    // ============================================

    // In player-bridge.js, replace the toggleEngagement method with this fixed version:

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

            // IMPORTANT: Force update filter counts with await
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
                    // Add delay to allow backend to update
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

    // Also add this method to refresh video stats from the API
    async refreshVideoStats(videoId) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            const token = localStorage.getItem('access_token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/videos/reels/${videoId}`, {
                headers
            });

            if (response.ok) {
                const videoData = await response.json();
                console.log('Refreshed video data:', videoData);

                // Update the video in currentReels array
                if (window.currentReels) {
                    const index = window.currentReels.findIndex(r => r.id === parseInt(videoId));
                    if (index !== -1) {
                        // Preserve existing data but update engagement stats
                        window.currentReels[index] = {
                            ...window.currentReels[index],
                            ...videoData
                        };
                    }
                }

                return videoData;
            }
        } catch (error) {
            console.error('Error refreshing video stats:', error);
        }
        return null;
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

    // ============================================
    // VIDEO DETAILS FROM DATABASE
    // ============================================

    async loadVideoDetails(videoId) {
        try {
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/videos/reels/${videoId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                }
            });

            if (response.ok) {
                const videoData = await response.json();

                // Update description tab
                this.updateDescriptionTab(videoData);

                // Load comments
                this.loadComments(videoId);

                // Load chapters if available
                this.loadChapters(videoId);

                // Update follow button
                if (videoData.tutor_id) {
                    this.updateFollowButton(videoData.tutor_id);
                }
            }
        } catch (error) {
            console.error('Error loading video details:', error);
        }
    }

    updateDescriptionTab(videoData) {
        const descriptionTab = document.getElementById('descriptionTab');
        if (!descriptionTab) return;

        descriptionTab.innerHTML = `
            <div class="enhanced-card" style="padding: 20px;">
                <h4 style="font-weight: 600; margin-bottom: 16px; color: var(--text-primary);">Description</h4>
                <div style="line-height: 1.8; color: var(--text-secondary);">
                    <p style="white-space: pre-wrap; margin-bottom: 16px;">${videoData.description || 'No description available.'}</p>
                    
                    ${videoData.subject || videoData.category ? `
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
                            ${videoData.category ? `
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
                    
                    ${videoData.tags && videoData.tags.length > 0 ? `
                        <div style="margin-top: 16px;">
                            <strong>Tags:</strong>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                                ${videoData.tags.map(tag => `
                                    <span style="padding: 4px 12px; background: rgba(102, 126, 234, 0.1); 
                                               border: 1px solid rgba(102, 126, 234, 0.3); 
                                               border-radius: 16px; font-size: 12px;">
                                        ${tag}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // ============================================
    // COMMENTS SYSTEM
    // ============================================

    // Enhanced comment loading with proper structure
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
                                                     font-family: inherit; line-height: 1.4; white-space: pre-wrap;
                                                     word-wrap: break-word;"
                                              ${!window.currentUser ? 'disabled' : ''}
                                              oninput="videoPlayerBridge.handleCommentInput(event, '${videoId}')"
                                              onkeydown="videoPlayerBridge.handleCommentKeydown(event, '${videoId}')"></textarea>
                                    
                                    <!-- Emoji picker button -->
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
                                
                                <!-- Action buttons (hidden until typing) -->
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

    // New method to render comments with replies
    renderCommentWithReplies(comment, videoId) {
        const isOwner = window.currentUser && comment.user_id === window.currentUser.id;
        const commentId = `comment-${comment.id}`;

        return `
        <div class="comment-item" id="${commentId}" style="margin-bottom: 20px;">
            <div style="display: flex; gap: 12px;">
                ${comment.user_picture ? `
                    <img src="${comment.user_picture}" alt="${comment.user_name}" 
                         style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                ` : `
                    <div style="width: 40px; height: 40px; border-radius: 50%; 
                               background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                               display: flex; align-items: center; justify-content: center; 
                               font-weight: bold; color: white;">
                        ${comment.user_name ? comment.user_name.charAt(0).toUpperCase() : '?'}
                    </div>
                `}
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-weight: 600; color: var(--text-primary);">
                            ${comment.user_name}
                        </span>
                        <span style="font-size: 12px; opacity: 0.6;">
                            ${this.formatTimeAgo(comment.created_at)}
                        </span>
                        ${comment.is_edited ? `
                            <span style="font-size: 11px; opacity: 0.5;">(edited)</span>
                        ` : ''}
                    </div>
                    
                    <!-- Comment text with edit capability -->
                    <div id="comment-text-${comment.id}" style="color: var(--text-secondary); line-height: 1.5; white-space: pre-wrap; word-wrap: break-word;">
                        ${comment.text}
                    </div>
                    
                    <!-- Comment actions -->
                    <div style="display: flex; gap: 16px; margin-top: 8px;">
                        ${window.currentUser ? `
                            <button onclick="videoPlayerBridge.toggleReplyInput('${comment.id}', '${videoId}')" 
                                    style="background: none; border: none; color: var(--text-secondary); 
                                           cursor: pointer; font-size: 13px; opacity: 0.8;">
                                Reply
                            </button>
                        ` : ''}
                        ${isOwner ? `
                            <button onclick="videoPlayerBridge.editComment('${comment.id}')" 
                                    style="background: none; border: none; color: var(--text-secondary); 
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
                    
                    <!-- Reply input (hidden by default) -->
                    <div id="reply-input-${comment.id}" style="display: none; margin-top: 12px;">
                        <div style="display: flex; gap: 8px;">
                            <input type="text" id="reply-text-${comment.id}"
                                   placeholder="Write a reply..." 
                                   style="flex: 1; padding: 8px; background: rgba(255,255,255,0.05); 
                                          border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; 
                                          color: white;"
                                   onkeypress="if(event.key==='Enter') videoPlayerBridge.postReply('${comment.id}', '${videoId}')">
                            <button onclick="videoPlayerBridge.postReply('${comment.id}', '${videoId}')"
                                    style="padding: 8px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                           border: none; border-radius: 6px; color: white; cursor: pointer;">
                                Reply
                            </button>
                            <button onclick="videoPlayerBridge.toggleReplyInput('${comment.id}')"
                                    style="padding: 8px 16px; background: rgba(255,255,255,0.1); 
                                           border: none; border-radius: 6px; color: white; cursor: pointer;">
                                Cancel
                            </button>
                        </div>
                    </div>
                    
                    <!-- Replies -->
                    ${comment.replies && comment.replies.length > 0 ? `
                        <div style="margin-top: 12px; margin-left: 20px;">
                            ${comment.replies.map(reply => `
                                <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                                    ${reply.user_picture ? `
                                        <img src="${reply.user_picture}" alt="${reply.user_name}" 
                                             style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                                    ` : `
                                        <div style="width: 32px; height: 32px; border-radius: 50%; 
                                                   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                                   display: flex; align-items: center; justify-content: center; 
                                                   font-size: 12px; color: white;">
                                            ${reply.user_name ? reply.user_name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                    `}
                                    <div style="flex: 1;">
                                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                            <span style="font-weight: 500; font-size: 13px;">
                                                ${reply.user_name}
                                            </span>
                                            <span style="font-size: 11px; opacity: 0.5;">
                                                ${this.formatTimeAgo(reply.created_at)}
                                            </span>
                                        </div>
                                        <div style="font-size: 13px; color: var(--text-secondary); white-space: pre-wrap;">
                                            ${reply.text}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
    }

    // Add these new methods for comment functionality
    handleCommentInput(event, videoId) {
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
        // Allow Enter for new line, Ctrl/Cmd+Enter to submit
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            this.postComment(videoId);
        }
    }

    cancelComment(videoId) {
        const textarea = document.getElementById(`new-comment-input-${videoId}`);
        const actionsDiv = document.getElementById(`comment-actions-${videoId}`);

        if (textarea) textarea.value = '';
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

            // Trigger input event to show buttons
            const event = new Event('input', { bubbles: true });
            textarea.dispatchEvent(event);
        }
        this.toggleEmojiPicker(videoId);
    }

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
                body: JSON.stringify({ text: input.value.trim() })
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

        // Focus and select text
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

                // Hide action buttons
                const actionsDiv = document.getElementById(`comment-actions-${videoId}`);
                if (actionsDiv) actionsDiv.style.display = 'none';

                // Reset textarea height
                input.style.height = '45px';

                // Reload comments
                this.loadComments(videoId);
            } else {
                throw new Error('Failed to post comment');
            }
        } catch (error) {
            console.error('Error posting comment:', error);
            this.player.showNotification('Failed to post comment', 'error');
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
                // Reload comments
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
    // FOLLOW SYSTEM
    // ============================================

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

    // ============================================
    // TRACKING & ANALYTICS
    // ============================================

    trackView(videoId) {
        // Record view in database
        fetch(`${window.API_BASE_URL || 'http://localhost:8000/api'}/videos/${videoId}/view`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        }).catch(error => console.error('Error tracking view:', error));

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

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
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

// ============================================
// COMPLETE ReelsDataAdapter CLASS
// Replace the existing ReelsDataAdapter in player-bridge.js with this
// ============================================

class ReelsDataAdapter {
    constructor() {
        this.currentReels = [];
        console.log('ReelsDataAdapter initialized');
    }

    // Get video data with all necessary fields for player and connection
    getVideoData(videoId) {
        // Ensure we have the latest reels data
        this.currentReels = window.currentReels || [];

        const reel = this.currentReels.find(r => r.id === parseInt(videoId));

        if (!reel) {
            console.warn(`Reel not found for ID: ${videoId}`);
            return null;
        }

        // Process video URL
        const videoUrl = typeof UrlHelper !== 'undefined'
            ? UrlHelper.getAssetUrl(reel.video_url)
            : reel.video_url;

        // Debug log
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
            creatorId: reel.tutor_id,      // For compatibility
            tutor_id: reel.tutor_id,        // Explicit tutor_id for connection
            views: reel.views || 0,
            description: reel.description || '',
            date: reel.upload_date || reel.created_at || new Date().toISOString(),
            subject: reel.subject || reel.tutor_subject || '',
            category: reel.category || '',
            grade_level: reel.grade_level || '',
            tags: reel.tags || [],
            thumbnail_url: reel.thumbnail_url,
            duration: reel.duration || '',
            is_featured: reel.is_featured || false,
            is_ad: reel.is_ad || false
        };
    }

    // Get playlist from current reels with proper ordering
    getPlaylist(videoId, options = {}) {
        this.currentReels = window.currentReels || [];

        if (this.currentReels.length === 0) {
            console.warn('No reels available for playlist');
            return [];
        }

        // Sort by relevance or keep current order
        let playlist = [...this.currentReels];

        // If a specific filter is applied, use that subset
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
            tutor_id: reel.tutor_id,  // Include explicitly
            views: reel.views || 0,
            description: reel.description || '',
            date: reel.upload_date || reel.created_at,
            subject: reel.tutor_subject || reel.subject || '',
            thumbnail_url: reel.thumbnail_url
        }));
    }

    // Filter playlist based on criteria
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

    // Get engagement statistics for a video
    getEngagementStats(videoId) {
        this.currentReels = window.currentReels || [];
        const reel = this.currentReels.find(r => r.id === parseInt(videoId));

        if (!reel) {
            console.warn(`No engagement stats for video ID: ${videoId}`);
            return this.getDefaultEngagementStats();
        }

        // Get user engagement from the API response
        const userEngagement = reel.user_engagement || {};

        return {
            likes: parseInt(reel.likes) || 0,
            dislikes: parseInt(reel.dislikes) || 0,
            favorites: parseInt(reel.favorites) || 0,
            saves: parseInt(reel.saves) || 0,
            shares: parseInt(reel.shares) || 0,
            comments: parseInt(reel.comments_count) || 0,
            // User-specific engagement states
            isLiked: userEngagement.like === true,
            isDisliked: userEngagement.dislike === true,
            isFavorite: userEngagement.favorite === true,
            isSaved: userEngagement.save === true,
            hasViewed: userEngagement.view === true
        };
    }

    // Default engagement stats
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

    // Get creator/tutor ID from video
    getCreatorId(videoId) {
        this.currentReels = window.currentReels || [];
        const reel = this.currentReels.find(r => r.id === parseInt(videoId));
        return reel ? reel.tutor_id : null;
    }

    // Get creator statistics
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

        // Calculate total views for this creator
        const totalViews = creatorVideos.reduce((sum, video) => sum + (video.views || 0), 0);

        // Check if following (would come from first video with this creator)
        const isFollowing = creatorVideos.length > 0 && creatorVideos[0].is_following === true;

        return {
            followers: creatorVideos[0]?.followers_count || 0,
            isFollowing: isFollowing,
            totalVideos: creatorVideos.length,
            totalViews: totalViews
        };
    }

    // Toggle follow status
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

                // Update local data
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

    // Update follow status in local data
    updateFollowStatus(creatorId, isFollowing) {
        this.currentReels = window.currentReels || [];
        this.currentReels.forEach(reel => {
            if (reel.tutor_id === creatorId) {
                reel.is_following = isFollowing;
            }
        });
        window.currentReels = this.currentReels;
    }

    // Update page UI after actions
    updatePageUI(videoId) {
        // Reload reels to get fresh data
        if (typeof window.loadReels === 'function') {
            console.log('Refreshing reels after update');
            // Don't reload immediately to avoid UI flicker
            setTimeout(() => window.loadReels(), 500);
        }
    }

    // Get video by index in playlist
    getVideoByIndex(index) {
        this.currentReels = window.currentReels || [];
        if (index >= 0 && index < this.currentReels.length) {
            return this.getVideoData(this.currentReels[index].id);
        }
        return null;
    }

    // Check if video is ad
    isAdVideo(videoId) {
        const reel = this.currentReels.find(r => r.id === parseInt(videoId));
        if (!reel) return false;

        // Check various ad indicators
        return reel.is_ad === true ||
            reel.is_featured === true ||
            (reel.tags && reel.tags.includes('Ad'));
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