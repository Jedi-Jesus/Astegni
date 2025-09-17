// ============================================
// ULTIMATE VIDEO PLAYER CLASS - COMPLETE FIXED VERSION
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
        this.isInitialized = true;
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
            videoCounter: document.querySelector('.video-counter')
        };
    }

    setupCloseButton() {
        // Create close button if it doesn't exist
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

            // Position it at the top right of the video section
            const videoSection = document.querySelector('.video-main-section');
            if (videoSection) {
                closeBtn.style.position = 'absolute';
                closeBtn.style.top = '20px';
                closeBtn.style.right = '20px';
                closeBtn.style.zIndex = '1000';
                videoSection.appendChild(closeBtn);
            }
        }
    }

    setupVideoCounterVisibility() {
        // Initially hide the video counter
        if (this.elements.videoCounter) {
            this.elements.videoCounter.style.opacity = '0';
            this.elements.videoCounter.style.transition = 'opacity 0.3s ease';

            // Show counter on hover over the counter itself
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

        // Show counter on navigation button hover
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
        this.elements.video.addEventListener('error', () => {
            this.hideLoadingSpinner();
            this.showNotification('Error loading video', 'error');
        });

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

        // Document events
        document.addEventListener('mousemove', (e) => this.handleDragging(e));
        document.addEventListener('mouseup', () => this.stopDragging());

        // Fullscreen change event
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
    }

    loadPlaylist(playlist) {
        this.playlist = playlist;
        this.currentVideoIndex = 0;
        this.updateVideoDots();
    }

    loadVideo(index) {
        if (index < 0 || index >= this.playlist.length) return;

        this.isNavigating = true;
        this.currentVideoIndex = index;
        const videoData = this.playlist[index];

        // Show loading spinner
        this.showLoadingSpinner();

        if (this.elements.video) {
            this.elements.video.pause();
            this.elements.video.src = videoData.src;
            this.elements.video.load();
        }

        this.updateVideoUI(videoData);

        // Update PiP navigation buttons if minimized
        if (this.isMinimized) {
            this.updatePiPNavigationButtons();
        }

        if (this.config.autoplay && this.elements.video) {
            this.elements.video.play().catch(e => {
                console.log('Autoplay prevented:', e);
                this.hideLoadingSpinner();
            });
        }

        // Show video counter briefly when navigating
        if (this.elements.videoCounter) {
            this.elements.videoCounter.style.opacity = '1';
            setTimeout(() => {
                this.isNavigating = false;
                if (this.elements.videoCounter && !this.isHoveringNav) {
                    this.elements.videoCounter.style.opacity = '0';
                }
            }, 3000);
        }

        // Update engagement UI
        this.updateEngagementUI(videoData);

        if (this.callbacks.onVideoLoad) {
            this.callbacks.onVideoLoad(videoData);
        }
    }

    updateEngagementUI(videoData) {
        const engagementBar = document.getElementById('ultimate-engagement-bar');
        if (!engagementBar || !window.videoPlayerBridge) return;

        // Let the bridge handle the engagement UI update
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
    }

    // In videoplayer.js, find the updateVideoUI method and modify it:

    // Around line 380-420 in videoplayer.js, find where the creator section is updated
    // Replace the follow button section with this:

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
            const initials = videoData.creator.split(' ').map(n => n[0]).join('').toUpperCase();
            this.elements.creatorAvatar.textContent = initials;
        }

        // CONNECTION BUTTON IN CREATOR SECTION ONLY
        const creatorSection = document.querySelector('.creator-section');
        if (creatorSection && videoData.tutor_id) {
            // Remove any existing connection container
            const existingContainer = creatorSection.querySelector('.connection-dropdown-container');
            if (existingContainer) {
                existingContainer.remove();
            }

            // Create unique connection container for THIS specific tutor/video combination
            const uniqueId = `${videoData.id}-${videoData.tutor_id}`;
            const connectionContainer = document.createElement('div');
            connectionContainer.className = 'connection-dropdown-container';
            connectionContainer.style.position = 'relative';
            connectionContainer.innerHTML = `
            <div id="connection-btn-${uniqueId}" 
                 class="connection-status-btn"
                 data-tutor-id="${videoData.tutor_id}"
                 data-video-id="${videoData.id}">
                <!-- Will be populated by updateConnectionButton -->
            </div>
        `;
            creatorSection.appendChild(connectionContainer);

            // Update connection button with unique ID
            if (window.videoPlayerBridge) {
                window.videoPlayerBridge.updateConnectionButton(videoData.tutor_id, uniqueId);
            }
        }

        // Update description, navigation, etc.
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
        // Hide loading spinner
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
        this.isDragging = false;
        this.isSeeking = false;
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
        const percent = (e.clientX - rect.left) / rect.width;
        this.elements.video.volume = Math.max(0, Math.min(1, percent));
        if (this.elements.volumeLevel) {
            this.elements.volumeLevel.style.width = (this.elements.video.volume * 100) + '%';
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
            this.elements.speedMenu.classList.toggle('active');
        }
        if (this.elements.qualityMenu) {
            this.elements.qualityMenu.classList.remove('active');
        }
    }

    changeSpeed(e) {
        const speed = parseFloat(e.currentTarget.dataset.speed);
        if (this.elements.video) {
            this.elements.video.playbackRate = speed;
        }
        if (this.elements.speedBtn) {
            this.elements.speedBtn.textContent = speed === 1 ? '1x' : speed + 'x';
        }
        document.querySelectorAll('.speed-option').forEach(o => o.classList.remove('active'));
        e.currentTarget.classList.add('active');
        if (this.elements.speedMenu) {
            this.elements.speedMenu.classList.remove('active');
        }
    }

    toggleQualityMenu() {
        if (this.elements.qualityMenu) {
            this.elements.qualityMenu.classList.toggle('active');
        }
        if (this.elements.speedMenu) {
            this.elements.speedMenu.classList.remove('active');
        }
    }

    changeQuality(e) {
        const quality = e.currentTarget.dataset.quality;
        document.querySelectorAll('.quality-option').forEach(o => o.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const qualityMap = {
            '2160': '4K', '1440': 'QHD', '1080': 'HD',
            '720': '720p', '480': '480p', '360': '360p', 'auto': 'Auto'
        };

        if (this.elements.qualityBtn) {
            this.elements.qualityBtn.textContent = qualityMap[quality];
        }
        if (this.elements.qualityMenu) {
            this.elements.qualityMenu.classList.remove('active');
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (this.elements.theaterContainer) {
                this.elements.theaterContainer.requestFullscreen();
            }
        } else {
            document.exitFullscreen();
        }
    }

    handleFullscreenChange() {
        this.isFullscreen = !!document.fullscreenElement;

        // Hide/show sidebar based on fullscreen state
        if (this.elements.sidebar) {
            if (this.isFullscreen) {
                this.elements.sidebar.style.display = 'none';
                // Make video section take full width
                const videoSection = document.querySelector('.video-main-section');
                if (videoSection) {
                    videoSection.style.width = '100%';
                    videoSection.style.maxWidth = '100%';
                }
            } else {
                this.elements.sidebar.style.display = 'block';
                // Restore video section width
                const videoSection = document.querySelector('.video-main-section');
                if (videoSection) {
                    videoSection.style.width = '';
                    videoSection.style.maxWidth = '';
                }
            }
        }

        // Update fullscreen button icon
        if (this.elements.fullscreenBtn) {
            if (this.isFullscreen) {
                this.elements.fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>';
            } else {
                this.elements.fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
            }
        }
    }

    async togglePiP() {
        const modal = this.elements.modal;

        if (!this.isMinimized) {
            // Minimize the modal
            modal.classList.add('minimized');
            this.isMinimized = true;
            this.pipSize = 'small'; // Track PiP size

            // Add PiP specific styles
            modal.style.cssText = `
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                width: 320px !important;
                height: 180px !important;
                z-index: 10000 !important;
                border-radius: 8px !important;
                overflow: hidden !important;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important;
                transition: all 0.3s ease !important;
            `;

            // Hide everything except video
            const sidebar = modal.querySelector('.video-info-sidebar-enhanced');
            const controls = modal.querySelector('.video-controls-advanced');
            const header = modal.querySelector('.video-header-overlay');

            if (sidebar) sidebar.style.display = 'none';
            if (controls) controls.style.opacity = '0';
            if (header) header.style.display = 'none';

            // Adjust video wrapper
            const videoWrapper = modal.querySelector('.video-wrapper-advanced');
            if (videoWrapper) {
                videoWrapper.style.cssText = `
                    width: 100% !important;
                    height: 100% !important;
                    position: relative !important;
                `;

                // Add comprehensive PiP controls
                const pipControls = document.createElement('div');
                pipControls.className = 'pip-controls';
                pipControls.innerHTML = `
                    <div class="pip-top-controls">
                        <button class="pip-btn pip-enlarge-btn" onclick="window.player.togglePiPSize()" title="Resize">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 15H6v-2h6v2zm7-4H5V8h14v6z"/>
                            </svg>
                        </button>
                        <button class="pip-btn pip-restore-btn" onclick="window.player.togglePiP()" title="Restore">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                            </svg>
                        </button>
                        <button class="pip-btn pip-close-btn" onclick="window.player.close()" title="Close">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="pip-nav-controls">
                        <button class="pip-btn pip-prev-btn" onclick="window.player.previousVideo()" title="Previous" ${this.currentVideoIndex === 0 ? 'disabled' : ''}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                            </svg>
                        </button>
                        <button class="pip-btn pip-play-pause" onclick="window.player.togglePlayPause()" title="Play/Pause">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                ${this.isPlaying ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' : '<path d="M8 5v14l11-7z"/>'}
                            </svg>
                        </button>
                        <button class="pip-btn pip-next-btn" onclick="window.player.nextVideo()" title="Next" ${this.currentVideoIndex === this.playlist.length - 1 ? 'disabled' : ''}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                            </svg>
                        </button>
                    </div>
                `;
                pipControls.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    pointer-events: none;
                    z-index: 1000;
                `;

                // Style for control groups
                const topControlsStyle = `
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    padding: 10px;
                    pointer-events: all;
                    background: linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%);
                `;

                const navControlsStyle = `
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 20px;
                    padding: 10px;
                    pointer-events: all;
                    background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                `;

                const topControls = pipControls.querySelector('.pip-top-controls');
                const navControls = pipControls.querySelector('.pip-nav-controls');
                if (topControls) topControls.style.cssText = topControlsStyle;
                if (navControls) navControls.style.cssText = navControlsStyle;

                videoWrapper.appendChild(pipControls);

                // Show nav controls on hover
                videoWrapper.addEventListener('mouseenter', () => {
                    navControls.style.opacity = '1';
                    if (controls) controls.style.opacity = '0.8';
                });

                videoWrapper.addEventListener('mouseleave', () => {
                    navControls.style.opacity = '0';
                    if (controls) controls.style.opacity = '0';
                });

                // Update play/pause button on video state change
                this.pipPlayPauseBtn = pipControls.querySelector('.pip-play-pause');
            }

            // Make player globally accessible for PiP controls
            window.player = this;

            this.showNotification('Video minimized - Browse while watching!');
        } else {
            // Restore from PiP
            modal.classList.remove('minimized');
            this.isMinimized = false;
            this.pipSize = 'small';

            // Reset styles
            modal.style.cssText = '';

            // Show all elements again
            const sidebar = modal.querySelector('.video-info-sidebar-enhanced');
            const controls = modal.querySelector('.video-controls-advanced');
            const header = modal.querySelector('.video-header-overlay');
            const videoWrapper = modal.querySelector('.video-wrapper-advanced');

            if (sidebar) sidebar.style.display = '';
            if (controls) controls.style.opacity = '';
            if (header) header.style.display = '';
            if (videoWrapper) videoWrapper.style.cssText = '';

            // Remove PiP controls
            const pipControls = modal.querySelector('.pip-controls');
            if (pipControls) pipControls.remove();

            this.showNotification('Video restored');
        }
    }

    togglePiPSize() {
        if (!this.isMinimized) return;

        const modal = this.elements.modal;
        if (this.pipSize === 'small') {
            // Enlarge to medium
            modal.style.width = '480px !important';
            modal.style.height = '270px !important';
            this.pipSize = 'medium';
        } else if (this.pipSize === 'medium') {
            // Enlarge to large
            modal.style.width = '640px !important';
            modal.style.height = '360px !important';
            this.pipSize = 'large';
        } else {
            // Back to small
            modal.style.width = '320px !important';
            modal.style.height = '180px !important';
            this.pipSize = 'small';
        }
    }

    updatePiPPlayPauseButton() {
        if (this.pipPlayPauseBtn) {
            this.pipPlayPauseBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    ${this.isPlaying ? '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>' : '<path d="M8 5v14l11-7z"/>'}
                </svg>
            `;
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
        const prevBtn = this.elements.prevVideoBtn;
        const nextBtn = this.elements.nextVideoBtn;
        const hasPrev = this.currentVideoIndex > 0;
        const hasNext = this.currentVideoIndex < this.playlist.length - 1;

        if (prevBtn) prevBtn.disabled = !hasPrev;
        if (nextBtn) nextBtn.disabled = !hasNext;

        const prevTitle = document.getElementById('prevVideoTitle');
        const nextTitle = document.getElementById('nextVideoTitle');

        if (prevTitle) {
            prevTitle.textContent = hasPrev ? this.playlist[this.currentVideoIndex - 1].title : 'No previous video';
        }
        if (nextTitle) {
            nextTitle.textContent = hasNext ? this.playlist[this.currentVideoIndex + 1].title : 'No more videos';
        }
    }

    updateVideoDots() {
        const dotsContainer = this.elements.videoDots;
        if (!dotsContainer) return;

        dotsContainer.innerHTML = '';
        const maxDots = Math.min(this.playlist.length, 10);

        for (let i = 0; i < maxDots; i++) {
            const dot = document.createElement('div');
            dot.className = 'video-dot';
            if (i === this.currentVideoIndex) dot.classList.add('active');
            dot.addEventListener('click', () => this.loadVideo(i));
            dotsContainer.appendChild(dot);
        }
    }

    // In the switchTab method, update to show description by default:
    switchTab(e) {
        const targetTab = e.currentTarget.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');

        ['description', 'chapters', 'comments'].forEach(tab => {
            const element = document.getElementById(`${tab}Tab`);
            if (element) {
                element.style.display = tab === targetTab ? 'block' : 'none';
            }
        });
    }

    handleKeyboard(e) {
        if (!this.elements.modal || !this.elements.modal.classList.contains('active')) return;

        switch (e.key) {
            case '?':
            // Toggle shortcuts overlay
            e.preventDefault();
            this.toggleShortcutsOverlay();
            break;
            case 'Escape':
            e.preventDefault();
            // Close shortcuts overlay if open
            const shortcutsOverlay = document.getElementById('shortcutsOverlay');
            if (shortcutsOverlay && shortcutsOverlay.classList.contains('active')) {
                shortcutsOverlay.classList.remove('active');
            } else if (this.isFullscreen) {
                this.toggleFullscreen();
            } else if (this.isMinimized) {
                this.togglePiP();
            } else {
                this.close();
            }
            break;
            case ' ':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.skip(-10);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.skip(10);
                break;
            case 'm':
                this.toggleMute();
                break;
            case 'f':
                this.toggleFullscreen();
                break;
            case 'p':
                this.togglePiP();
                break;
        }
    }

    toggleShortcutsOverlay() {
    const overlay = document.getElementById('shortcutsOverlay');
    if (overlay) {
        overlay.classList.toggle('active');
        // Auto-hide after 5 seconds
        if (overlay.classList.contains('active')) {
            setTimeout(() => {
                overlay.classList.remove('active');
            }, 5000);
        }
    }
}

    open() {
        console.log('Opening video player modal');
        if (this.elements.modal) {
            this.elements.modal.classList.add('active');
            this.elements.modal.style.display = 'block';
            document.body.style.overflow = 'hidden';

            // Reset minimized state
            if (this.isMinimized) {
                this.togglePiP();
            }
        }
    }

    close() {
        if (this.elements.video) {
            this.elements.video.pause();
        }
        if (this.elements.modal) {
            this.elements.modal.classList.remove('active', 'minimized');
            this.elements.modal.style.display = 'none';
            this.elements.modal.style.cssText = '';
            document.body.style.overflow = '';
        }
        // Exit fullscreen if active
        if (this.isFullscreen) {
            document.exitFullscreen();
        }
        // Reset minimized state
        this.isMinimized = false;

        // Remove any PiP controls
        const pipControls = document.querySelector('.pip-controls');
        if (pipControls) pipControls.remove();

        if (this.callbacks.onClose) {
            this.callbacks.onClose();
        }
    }

    

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'video-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 12px 24px;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            z-index: 10001;
            font-size: 16px;
            pointer-events: none;
            animation: fadeInOut 2s ease;
        `;

        if (this.isMinimized) {
            notification.style.cssText = `
                position: fixed;
                bottom: 200px;
                right: 20px;
                transform: none;
                padding: 8px 16px;
                border-radius: 6px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                z-index: 10002;
                font-size: 14px;
                pointer-events: none;
                animation: slideInOut 2s ease;
            `;
        }

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        } else {
            return `${m}:${s.toString().padStart(2, '0')}`;
        }
    }
}




// Add required CSS for animations and PiP mode
const videoPlayerStyles = document.createElement('style');
videoPlayerStyles.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; }
        20% { opacity: 1; }
        80% { opacity: 1; }
        100% { opacity: 0; }
    }
    
    @keyframes slideInOut {
        0% { transform: translateX(100%); opacity: 0; }
        20% { transform: translateX(0); opacity: 1; }
        80% { transform: translateX(0); opacity: 1; }
        100% { transform: translateX(100%); opacity: 0; }
    }
    
    .pip-btn {
        background: rgba(0, 0, 0, 0.7);
        border: none;
        border-radius: 50%;
        padding: 8px;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .pip-btn:hover:not(:disabled) {
        background: rgba(0, 0, 0, 0.9);
        transform: scale(1.1);
    }
    
    .pip-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    
    .pip-play-pause {
        width: 48px;
        height: 48px;
        background: rgba(0, 0, 0, 0.8);
    }
    
    .pip-prev-btn, .pip-next-btn {
        width: 36px;
        height: 36px;
    }
    
    .pip-enlarge-btn, .pip-restore-btn, .pip-close-btn {
        width: 28px;
        height: 28px;
    }
    
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
    
    .ultimate-video-modal.minimized .video-wrapper-advanced {
        position: relative !important;
        width: 100% !important;
        height: 100% !important;
    }
    
    .ultimate-video-modal.minimized .enhanced-video {
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
    }
    
    /* Engagement Bar Styles */
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
    
    .engagement-btn-enhanced.active {
        background: rgba(103, 126, 234, 0.2);
        border-color: #667eea;
        color: #667eea;
    }
    
    .engagement-btn-enhanced.favorite-active .favorite-icon {
        fill: #e74c3c;
        color: #e74c3c;
    }
    
    .engagement-btn-enhanced.saved-active .save-icon {
        fill: #f39c12;
        color: #f39c12;
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
    
    /* Video counter visibility on self-hover */
    .video-counter {
        cursor: pointer;
    }
`;
document.head.appendChild(videoPlayerStyles);

// Make the class globally available
window.UltimateVideoPlayer = UltimateVideoPlayer;