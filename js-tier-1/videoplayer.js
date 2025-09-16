// ============================================
// ULTIMATE VIDEO PLAYER CLASS - FOR REELS INTEGRATION
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
            followBtn: document.getElementById('followBtn'),
            descriptionTab: document.getElementById('descriptionTab'),
            commentsTab: document.getElementById('commentsTab'),
            chaptersTab: document.getElementById('chaptersTab'),
            sidebar: document.querySelector('.video-info-sidebar-enhanced'),
            theaterContainer: document.querySelector('.video-theater-container')
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
    
    setupEventListeners() {
        if (!this.elements.video) return;
        
        // Video events
        this.elements.video.addEventListener('loadedmetadata', () => this.handleLoadedMetadata());
        this.elements.video.addEventListener('timeupdate', () => this.updateProgress());
        this.elements.video.addEventListener('progress', () => this.updateBufferProgress());
        this.elements.video.addEventListener('play', () => this.handlePlay());
        this.elements.video.addEventListener('pause', () => this.handlePause());
        this.elements.video.addEventListener('ended', () => this.handleVideoEnded());
        this.elements.video.addEventListener('click', () => this.togglePlayPause());
        
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
        const prevBtn = document.getElementById('prevVideoBtn');
        const nextBtn = document.getElementById('nextVideoBtn');
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousVideo());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextVideo());
        
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
        
        this.currentVideoIndex = index;
        const videoData = this.playlist[index];
        
        if (this.elements.video) {
            this.elements.video.pause();
            this.elements.video.src = videoData.src;
            this.elements.video.load();
        }
        
        this.updateVideoUI(videoData);
        
        if (this.config.autoplay && this.elements.video) {
            this.elements.video.play().catch(e => console.log('Autoplay prevented:', e));
        }
        
        if (this.callbacks.onVideoLoad) {
            this.callbacks.onVideoLoad(videoData);
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
            const initials = videoData.creator.split(' ').map(n => n[0]).join('').toUpperCase();
            this.elements.creatorAvatar.textContent = initials;
        }
        
        // Update description tab with actual description
        if (this.elements.descriptionTab && videoData.description) {
            this.elements.descriptionTab.innerHTML = `
                <div class="enhanced-card">
                    <h4 style="font-weight: 600; margin-bottom: 12px;">Description</h4>
                    <p style="line-height: 1.6; white-space: pre-wrap;">${videoData.description}</p>
                    ${videoData.subject ? `
                        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                            <p style="opacity: 0.8;">Subject: ${videoData.subject}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        } else if (this.elements.descriptionTab) {
            this.elements.descriptionTab.innerHTML = `
                <div class="enhanced-card">
                    <p style="opacity: 0.6;">No description available for this video.</p>
                </div>
            `;
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
    }
    
    handlePause() {
        this.isPlaying = false;
        if (this.elements.playPauseBtn) {
            this.elements.playPauseBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
        }
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



// In the UltimateVideoPlayer class, update the togglePiP method:
// In UltimateVideoPlayer class, replace the togglePiP method:
async togglePiP() {
    const modal = document.getElementById('ultimate-video-modal');
    
// In togglePiP method, update the button creation part:
if (!modal.classList.contains('minimized')) {
    // Add restore button
    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'pip-restore-btn';
    restoreBtn.innerHTML = '⬜';
    restoreBtn.title = 'Restore';
    restoreBtn.onclick = () => this.togglePiP();
    
    // Add close button  
    const closeBtn = document.createElement('button');
    closeBtn.className = 'pip-close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Close';
    closeBtn.onclick = () => this.close();
    
    // Append to video wrapper instead of header
    const videoWrapper = modal.querySelector('.video-wrapper-advanced');
    if (videoWrapper) {
        videoWrapper.appendChild(restoreBtn);
        videoWrapper.appendChild(closeBtn);
    }
} else {
        // Minimize the modal so user can see reels grid
        modal.classList.add('minimized');
        
        // Add restore button to minimized player
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'pip-restore-btn';
        restoreBtn.innerHTML = '⬜';
        restoreBtn.title = 'Restore';
        restoreBtn.onclick = () => this.togglePiP();
        
        const headerOverlay = modal.querySelector('.video-header-overlay');
        if (headerOverlay && !document.querySelector('.pip-restore-btn')) {
            headerOverlay.appendChild(restoreBtn);
        }
        
        // Show notification
        this.showNotification('Video minimized - Browse other videos!');
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
        const prevBtn = document.getElementById('prevVideoBtn');
        const nextBtn = document.getElementById('nextVideoBtn');
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
        const dotsContainer = document.getElementById('videoDots');
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
    
    switchTab(e) {
        const targetTab = e.currentTarget.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        ['comments', 'description', 'chapters'].forEach(tab => {
            const element = document.getElementById(`${tab}Tab`);
            if (element) {
                element.style.display = tab === targetTab ? 'block' : 'none';
            }
        });
    }
    
    handleKeyboard(e) {
        if (!this.elements.modal || !this.elements.modal.classList.contains('active')) return;
        
        switch(e.key) {
            case 'Escape':
                e.preventDefault();
                if (this.isFullscreen) {
                    this.toggleFullscreen();
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
        }
    }
    
    open() {
        console.log('Opening video player modal');
        if (this.elements.modal) {
            this.elements.modal.classList.add('active');
            this.elements.modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }
    
    close() {
        if (this.elements.video) {
            this.elements.video.pause();
        }
        if (this.elements.modal) {
            this.elements.modal.classList.remove('active');
            this.elements.modal.style.display = 'none';
            document.body.style.overflow = '';
        }
        // Exit fullscreen if active
        if (this.isFullscreen) {
            document.exitFullscreen();
        }
        if (this.callbacks.onClose) {
            this.callbacks.onClose();
        }
    }
    
    loadComments(videoId) {
        console.log('Loading comments for video:', videoId);
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = 'notification-toast';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 24px;
            border-radius: 8px;
            background: ${type === 'error' ? '#f44336' : '#4CAF50'};
            color: white;
            z-index: 10001;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
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

// Make the class globally available
window.UltimateVideoPlayer = UltimateVideoPlayer;