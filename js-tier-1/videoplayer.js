// ============================================
// ULTIMATE VIDEO PLAYER CLASS - COMPLETE FIXED VERSION
// All critical issues resolved
// ============================================

class UltimateVideoPlayer {
    constructor(config = {}) {
        this.config = {
            containerId: config.containerId || 'ultimate-video-modal',
            enableKeyboard: config.enableKeyboard !== false,
            enableComments: config.enableComments !== false,
            enableEngagement: config.enableEngagement !== false,
            autoplay: config.autoplay !== false,
            persistProgress: config.persistProgress !== false,
            ...config
        };

        this.isInitialized = false;
        this.isPlaying = false;
        this.currentVideoIndex = 0;
        this.playlist = [];
        this.isSeeking = false;
        this.isDragging = false;
        this.isFullscreen = false;
        this.isMinimized = false;
        this.isTheaterMode = false;
        this.pipSize = 'small';
        this.isNavigating = false;
        this.isHoveringNav = false;
        this.elements = {};

        this.callbacks = {
            onVideoLoad: config.onVideoLoad || null,
            onVideoEnd: config.onVideoEnd || null,
            onLike: config.onLike || null,
            onDislike: config.onDislike || null,
            onComment: config.onComment || null,
            onShare: config.onShare || null,
            onSave: config.onSave || null,
            onFavorite: config.onFavorite || null,
            onFollow: config.onFollow || null,
            onClose: config.onClose || null
        };

        this.init();
    }

    init() {
        if (this.isInitialized) return;
        this.cacheElements();
        this.setupEventListeners();
        this.setupCloseButton();
        this.setupVideoCounterVisibility();
        this.addTheaterModeStyles();
        this.isInitialized = true;
    }

    addTheaterModeStyles() {
        const theaterStyles = document.createElement('style');
        theaterStyles.id = 'theater-mode-styles';
        theaterStyles.textContent = `
            /* Theater Mode Styles */
            .theater-mode .video-info-sidebar-enhanced {
                display: none !important;
            }
            
            .theater-mode .video-main-section {
                width: 100% !important;
                max-width: 100% !important;
                flex: 1 1 100% !important;
            }
            
            .theater-mode .video-theater-container {
                max-width: 100% !important;
            }
            
            .theater-mode .enhanced-video {
                max-height: 80vh;
            }
            
            /* PiP Mode improvements */
            .ultimate-video-modal.minimized {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                resize: both;
                overflow: auto;
                min-width: 240px;
                min-height: 135px;
                max-width: 640px;
                max-height: 360px;
            }
            
            .pip-controls {
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .ultimate-video-modal.minimized:hover .pip-controls {
                opacity: 1;
            }
            
            /* Loading spinner */
            .video-loading-spinner {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 100;
                display: none;
                align-items: center;
                justify-content: center;
            }
            
            .spinner-ring {
                width: 60px;
                height: 60px;
                border: 4px solid rgba(255, 255, 255, 0.2);
                border-top-color: white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            /* Theater button tooltip */
            #theaterBtn:hover::after {
                content: 'Theater mode';
                position: absolute;
                bottom: 120%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                pointer-events: none;
            }
            
            /* Video counter visibility */
            .video-counter {
                transition: opacity 0.3s ease;
                cursor: pointer;
            }
            
            .video-counter:hover {
                opacity: 1 !important;
            }
            
            /* Navigation buttons */
            .nav-btn-enhanced {
                position: relative;
                overflow: visible;
            }
            
            .nav-btn-enhanced:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }
            
            /* Close button positioning */
            .modal-close-btn-enhanced {
                position: absolute;
                top: 20px;
                right: 20px;
                z-index: 1000;
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 8px;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .modal-close-btn-enhanced:hover {
                background: rgba(0, 0, 0, 0.8);
                transform: scale(1.1);
            }
        `;
        
        if (!document.getElementById('theater-mode-styles')) {
            document.head.appendChild(theaterStyles);
        }
    }

    cacheElements() {
        this.elements = {
            modal: document.getElementById(this.config.containerId),
            video: document.getElementById('enhancedVideo'),
            playPauseBtn: document.getElementById('playPauseBtn'),
            progressContainer: document.getElementById('progressContainer'),
            progressPlayed: document.getElementById('progressPlayed'),
            progressBuffer: document.getElementById('progressBuffer'),
            progressScrubber: document.getElementById('progressScrubber'),
            progressPreview: document.getElementById('progressPreview'),
            currentTime: document.getElementById('currentTime'),
            duration: document.getElementById('duration'),
            volumeBtn: document.getElementById('volumeBtn'),
            volumeSlider: document.getElementById('volumeSlider'),
            volumeLevel: document.getElementById('volumeLevel'),
            speedBtn: document.getElementById('speedBtn'),
            speedMenu: document.getElementById('speedMenu'),
            qualityBtn: document.getElementById('qualityBtn'),
            qualityMenu: document.getElementById('qualityMenu'),
            fullscreenBtn: document.getElementById('fullscreenBtn'),
            pipBtn: document.getElementById('pipBtn'),
            theaterBtn: document.getElementById('theaterBtn'),
            videoControls: document.getElementById('videoControls'),
            gestureIndicator: document.getElementById('gestureIndicator'),
            videoTitle: document.getElementById('ultimate-video-title'),
            creatorName: document.getElementById('ultimate-creator-name'),
            viewCount: document.getElementById('ultimate-view-count'),
            uploadDate: document.getElementById('ultimate-upload-date'),
            creatorAvatar: document.getElementById('ultimate-creator-avatar'),
            videoCountText: document.getElementById('videoCountText'),
            videoDots: document.getElementById('videoDots'),
            followBtn: document.getElementById('followBtn'),
            descriptionTab: document.getElementById('descriptionTab'),
            commentsTab: document.getElementById('commentsTab'),
            chaptersTab: document.getElementById('chaptersTab'),
            sidebar: document.querySelector('.video-info-sidebar-enhanced'),
            theaterContainer: document.querySelector('.video-theater-container'),
            loadingSpinner: document.querySelector('.video-loading-spinner'),
            prevVideoBtn: document.getElementById('prevVideoBtn'),
            nextVideoBtn: document.getElementById('nextVideoBtn'),
            videoCounter: document.querySelector('.video-counter'),
        };
    }

    setupCloseButton() {
        let closeBtn = document.querySelector('.modal-close-btn-enhanced');
        if (!closeBtn) {
            closeBtn = document.createElement('button');
            closeBtn.className = 'modal-close-btn-enhanced btn glass-effect';
            closeBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            `;
            closeBtn.onclick = () => this.close();

            const videoSection = document.querySelector('.video-main-section');
            if (videoSection) {
                videoSection.style.position = 'relative';
                videoSection.appendChild(closeBtn);
            }
        }
    }

    setupVideoCounterVisibility() {
        if (this.elements.videoCounter) {
            this.elements.videoCounter.style.opacity = '0';
            this.elements.videoCounter.style.transition = 'opacity 0.3s ease';

            this.elements.videoCounter.addEventListener('mouseenter', () => {
                this.elements.videoCounter.style.opacity = '1';
            });

            this.elements.videoCounter.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    if (!this.isNavigating && !this.isHoveringNav) {
                        this.elements.videoCounter.style.opacity = '0';
                    }
                }, 2000);
            });
        }

        if (this.elements.prevVideoBtn) {
            this.elements.prevVideoBtn.addEventListener('mouseenter', () => {
                this.isHoveringNav = true;
                if (this.elements.videoCounter) {
                    this.elements.videoCounter.style.opacity = '1';
                }
            });
            
            this.elements.prevVideoBtn.addEventListener('mouseleave', () => {
                this.isHoveringNav = false;
                setTimeout(() => {
                    if (this.elements.videoCounter && !this.isNavigating && !this.isHoveringNav) {
                        this.elements.videoCounter.style.opacity = '0';
                    }
                }, 2000);
            });
        }

        if (this.elements.nextVideoBtn) {
            this.elements.nextVideoBtn.addEventListener('mouseenter', () => {
                this.isHoveringNav = true;
                if (this.elements.videoCounter) {
                    this.elements.videoCounter.style.opacity = '1';
                }
            });
            
            this.elements.nextVideoBtn.addEventListener('mouseleave', () => {
                this.isHoveringNav = false;
                setTimeout(() => {
                    if (this.elements.videoCounter && !this.isNavigating && !this.isHoveringNav) {
                        this.elements.videoCounter.style.opacity = '0';
                    }
                }, 2000);
            });
        }
    }

    showLoadingSpinner() {
        if (this.elements.loadingSpinner) {
            this.elements.loadingSpinner.style.display = 'flex';
        } else {
            // Create spinner if it doesn't exist
            const spinner = document.createElement('div');
            spinner.className = 'video-loading-spinner';
            spinner.innerHTML = '<div class="spinner-ring"></div>';
            spinner.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 100; display: flex;';
            
            const videoWrapper = document.querySelector('.video-wrapper-advanced');
            if (videoWrapper) {
                videoWrapper.appendChild(spinner);
                this.elements.loadingSpinner = spinner;
            }
        }
    }

    hideLoadingSpinner() {
        if (this.elements.loadingSpinner) {
            this.elements.loadingSpinner.style.display = 'none';
        }
    }

    setupEventListeners() {
        if (!this.elements.video) return;

        // Video events
        this.elements.video.addEventListener('loadedmetadata', () => this.handleLoadedMetadata());
        this.elements.video.addEventListener('loadeddata', () => this.hideLoadingSpinner());
        this.elements.video.addEventListener('canplay', () => this.hideLoadingSpinner());
        this.elements.video.addEventListener('waiting', () => this.showLoadingSpinner());
        this.elements.video.addEventListener('playing', () => this.hideLoadingSpinner());
        this.elements.video.addEventListener('timeupdate', () => this.updateProgress());
        this.elements.video.addEventListener('progress', () => this.updateBufferProgress());
        this.elements.video.addEventListener('play', () => this.handlePlay());
        this.elements.video.addEventListener('pause', () => this.handlePause());
        this.elements.video.addEventListener('ended', () => this.handleVideoEnded());
        this.elements.video.addEventListener('click', () => this.togglePlayPause());
        this.elements.video.addEventListener('error', (e) => {
            this.hideLoadingSpinner();
            this.showNotification('Error loading video', 'error');
            console.error('Video error:', e);
        });

        // Theater mode button
        if (this.elements.theaterBtn) {
            this.elements.theaterBtn.addEventListener('click', () => this.toggleTheaterMode());
        }

        // Playback controls
        if (this.elements.playPauseBtn) {
            this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        }

        // Progress bar
        if (this.elements.progressContainer) {
            this.elements.progressContainer.addEventListener('click', (e) => this.seek(e));
            this.elements.progressContainer.addEventListener('mousemove', (e) => this.showPreview(e));
            this.elements.progressContainer.addEventListener('mousedown', (e) => this.startDragging(e));
        }

        // Volume
        if (this.elements.volumeBtn) {
            this.elements.volumeBtn.addEventListener('click', () => this.toggleMute());
        }
        if (this.elements.volumeSlider) {
            this.elements.volumeSlider.addEventListener('click', (e) => this.setVolume(e));
            this.elements.volumeSlider.addEventListener('mousedown', (e) => this.startVolumeDragging(e));
        }

        // Speed
        if (this.elements.speedBtn) {
            this.elements.speedBtn.addEventListener('click', () => this.toggleSpeedMenu());
        }
        document.querySelectorAll('.speed-option').forEach(option => {
            option.addEventListener('click', (e) => this.changeSpeed(e));
        });

        // Quality
        if (this.elements.qualityBtn) {
            this.elements.qualityBtn.addEventListener('click', () => this.toggleQualityMenu());
        }
        document.querySelectorAll('.quality-option').forEach(option => {
            option.addEventListener('click', (e) => this.changeQuality(e));
        });

        // Skip buttons
        const skipBackBtn = document.getElementById('skipBackBtn');
        const skipForwardBtn = document.getElementById('skipForwardBtn');
        if (skipBackBtn) skipBackBtn.addEventListener('click', () => this.skip(-10));
        if (skipForwardBtn) skipForwardBtn.addEventListener('click', () => this.skip(10));

        // Fullscreen & PiP
        if (this.elements.fullscreenBtn) {
            this.elements.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
        if (this.elements.pipBtn) {
            this.elements.pipBtn.addEventListener('click', () => this.togglePiP());
        }

        // Navigation
        if (this.elements.prevVideoBtn) {
            this.elements.prevVideoBtn.addEventListener('click', () => this.previousVideo());
        }
        if (this.elements.nextVideoBtn) {
            this.elements.nextVideoBtn.addEventListener('click', () => this.nextVideo());
        }

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e));
        });

        // Keyboard shortcuts
        if (this.config.enableKeyboard) {
            document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        }

        // Add to videoplayer.js in setupEventListeners:

// Show controls when user interacts
let controlsTimeout;

const showControlsTemporarily = () => {
    this.elements.videoControls?.classList.add('visible');
    const engagementBar = document.querySelector('.engagement-bar-enhanced');
    if (engagementBar) engagementBar.classList.add('visible');
    
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
        if (!this.elements.video?.paused) {
            this.elements.videoControls?.classList.remove('visible');
            if (engagementBar) engagementBar.classList.remove('visible');
        }
    }, 3000);
};

// Show on mouse move
document.addEventListener('mousemove', (e) => {
    if (this.elements.modal?.contains(e.target)) {
        showControlsTemporarily();
    }
});

// Always show when paused
this.elements.video?.addEventListener('pause', () => {
    this.elements.videoControls?.classList.add('visible');
    const engagementBar = document.querySelector('.engagement-bar-enhanced');
    if (engagementBar) engagementBar.classList.add('visible');
});

this.elements.video?.addEventListener('play', () => {
    showControlsTemporarily();
});

        // Document events
        document.addEventListener('mousemove', (e) => this.handleDragging(e));
        document.addEventListener('mouseup', () => this.stopDragging());

        // Fullscreen change event
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('mozfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('MSFullscreenChange', () => this.handleFullscreenChange());
    }

// In videoplayer.js, update the toggleTheaterMode method:
toggleTheaterMode() {
    const modal = this.elements.modal;
    if (!modal) return;

    this.isTheaterMode = !this.isTheaterMode;

    if (this.isTheaterMode) {
        modal.classList.add('theater-mode');
        // Keep controls visible in theater mode
        if (this.elements.videoControls) {
            this.elements.videoControls.classList.add('visible');
        }
        this.showNotification('Theater mode enabled');
    } else {
        modal.classList.remove('theater-mode');
        this.showNotification('Default view');
    }
}

// Enhanced fullscreen with proper control handling
toggleFullscreen() {
    if (!document.fullscreenElement) {
        // Request fullscreen on the video wrapper, not the modal
        const videoWrapper = this.elements.video?.parentElement || this.elements.modal;
        if (videoWrapper) {
            const requestFS = videoWrapper.requestFullscreen || 
                            videoWrapper.webkitRequestFullscreen || 
                            videoWrapper.mozRequestFullScreen || 
                            videoWrapper.msRequestFullscreen;
            
            if (requestFS) {
                requestFS.call(videoWrapper).then(() => {
                    this.isFullscreen = true;
                    if (this.elements.modal) {
                        this.elements.modal.classList.add('fullscreen');
                    }
                }).catch(err => {
                    console.error('Fullscreen error:', err);
                    this.showNotification('Fullscreen not available', 'error');
                });
            }
        }
    } else {
        document.exitFullscreen().then(() => {
            this.isFullscreen = false;
            if (this.elements.modal) {
                this.elements.modal.classList.remove('fullscreen');
            }
        });
    }
}
    startVolumeDragging(e) {
        this.isVolumeDragging = true;
        this.setVolume(e);
        
        const handleVolumeDrag = (e) => {
            if (this.isVolumeDragging) {
                this.setVolume(e);
            }
        };
        
        const stopVolumeDrag = () => {
            this.isVolumeDragging = false;
            document.removeEventListener('mousemove', handleVolumeDrag);
            document.removeEventListener('mouseup', stopVolumeDrag);
        };
        
        document.addEventListener('mousemove', handleVolumeDrag);
        document.addEventListener('mouseup', stopVolumeDrag);
    }

    loadPlaylist(playlist) {
        this.playlist = playlist;
        this.currentVideoIndex = 0;
        this.updateVideoDots();
    }

// In videoplayer.js, enhance the loadVideo method:

async loadVideo(index) {
    if (index < 0 || index >= this.playlist.length) return;

    this.isNavigating = true;
    this.currentVideoIndex = index;
    const videoData = this.playlist[index];

    this.showLoadingSpinner();

    if (this.elements.video) {
        this.elements.video.pause();
        this.elements.video.src = videoData.src;
        this.elements.video.load();
    }

    // Update all UI elements
    this.updateVideoUI(videoData);
    
    // Update ALL content sections when changing videos
    if (window.videoPlayerBridge) {
        // Update engagement UI
        window.videoPlayerBridge.updateEngagementUI(videoData.id);
        
        // Update description
        window.videoPlayerBridge.updateDescriptionTab(videoData);
        
        // Load new comments
        window.videoPlayerBridge.loadComments(videoData.id);
        
        // Load new chapters
        window.videoPlayerBridge.loadChapters(videoData.id);
        
        // Update related videos (more from uploader & related by subject)
        window.videoPlayerBridge.loadRelatedVideos(videoData.id);
        
        // Update creator stats
        if (videoData.tutor_id) {
            window.videoPlayerBridge.updateCreatorStats(videoData.tutor_id);
        }
    }

    if (this.config.autoplay && this.elements.video) {
        this.elements.video.play().catch(e => {
            console.log('Autoplay prevented:', e);
            this.hideLoadingSpinner();
        });
    }

    // Trigger callback
    if (this.callbacks.onVideoLoad) {
        this.callbacks.onVideoLoad(videoData);
    }

    // Reset to description tab
    this.setActiveTab('description');
}

// Add this method to the UltimateVideoPlayer class
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
    updateEngagementUI(videoData) {
        const engagementBar = document.getElementById('ultimate-engagement-bar');
        if (!engagementBar || !window.videoPlayerBridge) return;

        if (window.videoPlayerBridge && window.videoPlayerBridge.updateEngagementUI) {
            window.videoPlayerBridge.updateEngagementUI(videoData.id);
        }
    }

    updatePiPNavigationButtons() {
        const prevBtn = document.querySelector('.pip-prev-btn');
        const nextBtn = document.querySelector('.pip-next-btn');

        if (prevBtn) {
            prevBtn.disabled = this.currentVideoIndex === 0;
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentVideoIndex === this.playlist.length - 1;
        }
        
        // Update the video index display
        const indexDisplay = document.querySelector('.pip-video-index');
        if (indexDisplay) {
            indexDisplay.textContent = `${this.currentVideoIndex + 1}/${this.playlist.length}`;
        }
    }

    updateVideoUI(videoData) {
        if (this.elements.videoTitle) {
            this.elements.videoTitle.textContent = videoData.title || 'Untitled Video';
        }

        if (this.elements.creatorName) {
            this.elements.creatorName.textContent = videoData.creator || 'Unknown';
        }
        
        if (this.elements.viewCount) {
            this.elements.viewCount.textContent = `${videoData.views || 0} views`;
        }
        
        if (this.elements.uploadDate) {
            const date = videoData.date ? new Date(videoData.date).toLocaleDateString() : 'Today';
            this.elements.uploadDate.textContent = date;
        }
        
        if (this.elements.videoCountText) {
            this.elements.videoCountText.textContent = `Video ${this.currentVideoIndex + 1} of ${this.playlist.length}`;
        }
        
        if (this.elements.creatorAvatar && videoData.creator) {
            const initials = videoData.creator.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            this.elements.creatorAvatar.textContent = initials;
        }

        this.updateNavigationButtons();
        this.updateVideoDots();
    }

    togglePlayPause() {
        if (!this.elements.video) return;
        if (this.elements.video.paused) {
            this.elements.video.play();
        } else {
            this.elements.video.pause();
        }
    }

    handlePlay() {
        this.isPlaying = true;
        if (this.elements.playPauseBtn) {
            this.elements.playPauseBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
        }
        this.updatePiPPlayPauseButton();
    }

    handlePause() {
        this.isPlaying = false;
        if (this.elements.playPauseBtn) {
            this.elements.playPauseBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        }
        this.updatePiPPlayPauseButton();
    }

    handleVideoEnded() {
        if (this.callbacks.onVideoEnd) {
            this.callbacks.onVideoEnd(this.playlist[this.currentVideoIndex]);
        }
        if (this.currentVideoIndex < this.playlist.length - 1) {
            setTimeout(() => this.nextVideo(), 2000);
        }
    }

    handleLoadedMetadata() {
        this.hideLoadingSpinner();

        if (this.elements.duration && this.elements.video) {
            this.elements.duration.textContent = this.formatTime(this.elements.video.duration);
        }
        if (this.elements.volumeLevel && this.elements.video) {
            this.elements.volumeLevel.style.width = (this.elements.video.volume * 100) + '%';
        }
    }

    updateProgress() {
        if (!this.isSeeking && this.elements.video && this.elements.video.duration) {
            const percent = (this.elements.video.currentTime / this.elements.video.duration) * 100;
            if (this.elements.progressPlayed) {
                this.elements.progressPlayed.style.width = percent + '%';
            }
            if (this.elements.progressScrubber) {
                this.elements.progressScrubber.style.left = percent + '%';
            }
            if (this.elements.currentTime) {
                this.elements.currentTime.textContent = this.formatTime(this.elements.video.currentTime);
            }
        }
    }

    updateBufferProgress() {
        if (this.elements.video && this.elements.video.buffered.length > 0) {
            const bufferedEnd = this.elements.video.buffered.end(this.elements.video.buffered.length - 1);
            const duration = this.elements.video.duration;
            if (duration > 0 && this.elements.progressBuffer) {
                this.elements.progressBuffer.style.width = ((bufferedEnd / duration) * 100) + '%';
            }
        }
    }

    seek(e) {
        if (!this.elements.progressContainer || !this.elements.video) return;
        const rect = this.elements.progressContainer.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.elements.video.currentTime = percent * this.elements.video.duration;
    }

    showPreview(e) {
        if (!this.elements.progressContainer || !this.elements.video || !this.elements.progressPreview) return;
        const rect = this.elements.progressContainer.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const time = percent * this.elements.video.duration;
        this.elements.progressPreview.textContent = this.formatTime(time);
        this.elements.progressPreview.style.left = (e.clientX - rect.left) + 'px';
    }

    startDragging(e) {
        this.isDragging = true;
        this.isSeeking = true;
        this.seek(e);
    }

    handleDragging(e) {
        if (this.isDragging && this.elements.progressContainer && this.elements.video) {
            const rect = this.elements.progressContainer.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            if (this.elements.progressPlayed) {
                this.elements.progressPlayed.style.width = (percent * 100) + '%';
            }
            if (this.elements.progressScrubber) {
                this.elements.progressScrubber.style.left = (percent * 100) + '%';
            }
            if (this.elements.currentTime) {
                this.elements.currentTime.textContent = this.formatTime(percent * this.elements.video.duration);
            }
        }
    }

    stopDragging() {
        if (this.isDragging) {
            this.isDragging = false;
            this.isSeeking = false;
        }
    }

    skip(seconds) {
        if (this.elements.video) {
            this.elements.video.currentTime += seconds;
            this.showNotification(seconds > 0 ? `⏩ ${seconds}s` : `⏪ ${Math.abs(seconds)}s`);
        }
    }

    toggleMute() {
        if (this.elements.video) {
            this.elements.video.muted = !this.elements.video.muted;
            this.updateVolumeIcon();
        }
    }

    setVolume(e) {
        if (!this.elements.volumeSlider || !this.elements.video) return;
        const rect = this.elements.volumeSlider.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this.elements.video.volume = percent;
        if (this.elements.volumeLevel) {
            this.elements.volumeLevel.style.width = (percent * 100) + '%';
        }
        this.updateVolumeIcon();
    }

    updateVolumeIcon() {
        if (!this.elements.volumeBtn || !this.elements.video) return;
        let icon;
        if (this.elements.video.muted || this.elements.video.volume === 0) {
            icon = '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
        } else if (this.elements.video.volume < 0.5) {
            icon = '<svg viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>';
        } else {
            icon = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
        }
        this.elements.volumeBtn.innerHTML = icon;
    }

    toggleSpeedMenu() {
        if (this.elements.speedMenu) {
            this.elements.speedMenu.classList.toggle('visible');
        }
    }

    changeSpeed(e) {
        const speed = parseFloat(e.target.dataset.speed);
        if (this.elements.video) {
            this.elements.video.playbackRate = speed;
        }
        
        document.querySelectorAll('.speed-option').forEach(opt => {
            opt.classList.remove('active');
        });
        e.target.classList.add('active');
        
        if (this.elements.speedBtn) {
            this.elements.speedBtn.textContent = speed === 1 ? '1x' : `${speed}x`;
        }
        
        if (this.elements.speedMenu) {
            this.elements.speedMenu.classList.remove('visible');
        }
        
        this.showNotification(`Speed: ${speed}x`);
    }

    toggleQualityMenu() {
        if (this.elements.qualityMenu) {
            this.elements.qualityMenu.classList.toggle('visible');
        }
    }

    changeQuality(e) {
        const quality = e.target.dataset.quality;
        
        document.querySelectorAll('.quality-option').forEach(opt => {
            opt.classList.remove('active');
        });
        e.target.classList.add('active');
        
        const label = e.target.querySelector('.quality-label')?.textContent || quality;
        if (this.elements.qualityBtn) {
            this.elements.qualityBtn.textContent = label;
        }
        
        if (this.elements.qualityMenu) {
            this.elements.qualityMenu.classList.remove('visible');
        }
        
        this.showNotification(`Quality: ${label}`);
    }



    handleFullscreenChange() {
        this.isFullscreen = !!document.fullscreenElement;
        
        if (this.elements.fullscreenBtn) {
            if (this.isFullscreen) {
                this.elements.fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>';
            } else {
                this.elements.fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
            }
        }
    }

async togglePiP() {
    if (!this.elements.video) return;
    
    try {
        if (!this.isMinimized) {
            // Enter PiP mode
            this.isMinimized = true;
            if (this.elements.modal) {
                this.elements.modal.classList.add('minimized');
                // Show PiP controls
                const pipControls = document.getElementById('pipControls');
                if (pipControls) pipControls.style.display = 'flex';
            }
            this.showNotification('Entered Picture-in-Picture');
        } else {
            // Exit PiP mode
            this.closePiP();
        }
    } catch (error) {
        console.error('Failed to toggle PiP:', error);
        this.showNotification('Picture-in-Picture not available', 'error');
    }
}

closePiP() {
    this.isMinimized = false;
    if (this.elements.modal) {
        this.elements.modal.classList.remove('minimized');
        // Hide PiP controls
        const pipControls = document.getElementById('pipControls');
        if (pipControls) pipControls.style.display = 'none';
    }
    this.showNotification('Exited Picture-in-Picture');
}

    updatePiPPlayPauseButton() {
        const pipPlayBtn = document.querySelector('.pip-play-btn');
        if (!pipPlayBtn) return;
        
        if (this.isPlaying) {
            pipPlayBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
        } else {
            pipPlayBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        }
    }

    previousVideo() {
        if (this.currentVideoIndex > 0) {
            this.loadVideo(this.currentVideoIndex - 1);
        }
    }

    nextVideo() {
        if (this.currentVideoIndex < this.playlist.length - 1) {
            this.loadVideo(this.currentVideoIndex + 1);
        }
    }

    updateNavigationButtons() {
        if (this.elements.prevVideoBtn) {
            this.elements.prevVideoBtn.disabled = this.currentVideoIndex === 0;
        }
        if (this.elements.nextVideoBtn) {
            this.elements.nextVideoBtn.disabled = this.currentVideoIndex === this.playlist.length - 1;
        }
    }

    updateVideoDots() {
        if (!this.elements.videoDots) return;
        
        this.elements.videoDots.innerHTML = '';
        
        for (let i = 0; i < Math.min(this.playlist.length, 10); i++) {
            const dot = document.createElement('span');
            dot.className = 'video-dot';
            if (i === this.currentVideoIndex) {
                dot.classList.add('active');
            }
            dot.addEventListener('click', () => this.loadVideo(i));
            this.elements.videoDots.appendChild(dot);
        }
        
        if (this.playlist.length > 10) {
            const more = document.createElement('span');
            more.className = 'video-dot more';
            more.textContent = '...';
            this.elements.videoDots.appendChild(more);
        }
    }

// Add this method to the UltimateVideoPlayer class
switchTab(e) {
    const tab = e.target.dataset.tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // Show selected tab
    const tabContent = document.getElementById(`${tab}Tab`);
    if (tabContent) {
        tabContent.style.display = 'block';
    }
}

    handleKeyboard(e) {
            // Don't handle shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || 
        e.target.tagName === 'TEXTAREA' || 
        e.target.contentEditable === 'true' ||
        e.target.closest('.comment-input-wrapper') ||
        e.target.closest('.comments-container')) {
        return;
    }
        switch(e.key) {
            case ' ':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
            case 'j':
                this.skip(-10);
                break;
            case 'ArrowRight':
            case 'l':
                this.skip(10);
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (this.elements.video) {
                    this.elements.video.volume = Math.min(1, this.elements.video.volume + 0.1);
                    this.updateVolumeIcon();
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (this.elements.video) {
                    this.elements.video.volume = Math.max(0, this.elements.video.volume - 0.1);
                    this.updateVolumeIcon();
                }
                break;
            case 'm':
                this.toggleMute();
                break;
            case 'f':
                this.toggleFullscreen();
                break;
            case 't':
                this.toggleTheaterMode();
                break;
            case 'p':
                this.togglePiP();
                break;
            case '?':
                this.toggleShortcutsOverlay();
                break;
            case 'Escape':
                if (this.isFullscreen) {
                    this.toggleFullscreen();
                }
                break;
        }
        
        if (e.shiftKey) {
            switch(e.key) {
                case 'N':
                    this.nextVideo();
                    break;
                case 'P':
                    this.previousVideo();
                    break;
            }
        }
        
        // Number keys for seeking
        if (e.key >= '0' && e.key <= '9' && this.elements.video) {
            const percent = parseInt(e.key) * 10;
            this.elements.video.currentTime = (percent / 100) * this.elements.video.duration;
        }
    }

    toggleShortcutsOverlay() {
        const overlay = document.getElementById('shortcutsOverlay');
        if (overlay) {
            overlay.classList.toggle('visible');
            setTimeout(() => {
                overlay.classList.remove('visible');
            }, 3000);
        }
    }

    open() {
        if (this.elements.modal) {
            this.elements.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    close() {
        if (this.elements.modal) {
            this.elements.modal.classList.remove('active');
            document.body.style.overflow = '';
        }
        
        if (this.elements.video) {
            this.elements.video.pause();
        }
        
        if (this.callbacks.onClose) {
            this.callbacks.onClose();
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `video-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideUp 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}

// Auto-initialize styles for notifications
(function() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from {
                transform: translateX(-50%) translateY(100%);
                opacity: 0;
            }
            to {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes slideDown {
            from {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
            to {
                transform: translateX(-50%) translateY(100%);
                opacity: 0;
            }
        }
        
        .video-notification {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .video-notification.error {
            background: rgba(239, 68, 68, 0.9) !important;
        }
        
        .video-notification.success {
            background: rgba(34, 197, 94, 0.9) !important;
        }
        
        .video-notification.warning {
            background: rgba(245, 158, 11, 0.9) !important;
        }
    `;
    document.head.appendChild(style);
})();

// Make player globally available
window.UltimateVideoPlayer = UltimateVideoPlayer;