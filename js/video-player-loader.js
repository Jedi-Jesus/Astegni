// video-player-loader.js
class VideoPlayerLoader {
    constructor() {
        this.isLoaded = false;
        this.playerModal = null;
        this.video = null;
        this.currentPlaylist = [];
        this.currentIndex = 0;
    }

    async load() {
        if (this.isLoaded) return true;

        try {
            // Load CSS if not already loaded
            if (!document.querySelector('link[href*="videoplayer.css"]')) {
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = '../css/videoplayer.css';
                document.head.appendChild(cssLink);
            }

            // Create container for video player
            const container = document.createElement('div');
            container.id = 'videoPlayerContainer';
            container.style.display = 'none';
            document.body.appendChild(container);

            // Load the video player HTML structure
            const playerHTML = this.getPlayerHTML();
            container.innerHTML = playerHTML;

            // Move the modal to body
            this.playerModal = container.querySelector('.ultimate-video-modal');
            document.body.appendChild(this.playerModal);
            container.remove();

            // Store video reference
            this.video = document.getElementById('enhancedVideo');

            // Initialize player functionality
            this.initializePlayer();

            this.isLoaded = true;
            return true;
        } catch (error) {
            console.error('Failed to load video player:', error);
            return false;
        }
    }

    initializePlayer() {
        const video = this.video;
        const playPauseBtn = document.getElementById('playPauseBtn');
        const progressContainer = document.getElementById('progressContainer');
        const progressPlayed = document.getElementById('progressPlayed');
        const progressBuffer = document.getElementById('progressBuffer');
        const progressScrubber = document.getElementById('progressScrubber');
        const progressPreview = document.getElementById('progressPreview');
        const currentTimeEl = document.getElementById('currentTime');
        const durationEl = document.getElementById('duration');
        const volumeBtn = document.getElementById('volumeBtn');
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeLevel = document.getElementById('volumeLevel');
        const speedBtn = document.getElementById('speedBtn');
        const speedMenu = document.getElementById('speedMenu');
        const qualityBtn = document.getElementById('qualityBtn');
        const qualityMenu = document.getElementById('qualityMenu');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const pipBtn = document.getElementById('pipBtn');
        const closeBtn = document.getElementById('closePlayerBtn');
        const skipBackBtn = document.getElementById('skipBackBtn');
        const skipForwardBtn = document.getElementById('skipForwardBtn');
        const prevVideoBtn = document.getElementById('prevVideoBtn');
        const nextVideoBtn = document.getElementById('nextVideoBtn');
        const gestureIndicator = document.getElementById('gestureIndicator');
        const videoControls = document.getElementById('videoControls');

        let hideControlsTimeout;
        let isSeeking = false;

        // Helper function to format time
        const formatTime = (seconds) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            
            if (h > 0) {
                return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            } else {
                return `${m}:${s.toString().padStart(2, '0')}`;
            }
        };

        // Helper function to show gesture
        const showGesture = (icon) => {
            gestureIndicator.textContent = icon;
            gestureIndicator.style.opacity = '1';
            gestureIndicator.style.animation = 'gestureShow 0.8s ease';
            setTimeout(() => {
                gestureIndicator.style.opacity = '0';
            }, 800);
        };

        // Play/Pause functionality
        const togglePlayPause = () => {
            if (video.paused) {
                video.play();
                playPauseBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
                showGesture('▶️');
            } else {
                video.pause();
                playPauseBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
                showGesture('⏸️');
            }
        };

        playPauseBtn?.addEventListener('click', togglePlayPause);
        video?.addEventListener('click', togglePlayPause);

        // Video events
        video?.addEventListener('loadedmetadata', () => {
            durationEl.textContent = formatTime(video.duration);
            volumeLevel.style.width = (video.volume * 100) + '%';
        });

        video?.addEventListener('timeupdate', () => {
            if (!isSeeking) {
                const percent = (video.currentTime / video.duration) * 100;
                progressPlayed.style.width = percent + '%';
                progressScrubber.style.left = percent + '%';
                currentTimeEl.textContent = formatTime(video.currentTime);
            }
        });

        video?.addEventListener('progress', () => {
            if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                const duration = video.duration;
                if (duration > 0) {
                    progressBuffer.style.width = ((bufferedEnd / duration) * 100) + '%';
                }
            }
        });

        video?.addEventListener('ended', () => {
            // Auto-play next video if available
            if (this.currentIndex < this.currentPlaylist.length - 1) {
                setTimeout(() => {
                    this.playNext();
                }, 2000);
            }
        });

        // Progress bar seeking
        progressContainer?.addEventListener('click', (e) => {
            const rect = progressContainer.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            video.currentTime = percent * video.duration;
        });

        progressContainer?.addEventListener('mousemove', (e) => {
            const rect = progressContainer.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const time = percent * video.duration;
            progressPreview.textContent = formatTime(time);
            progressPreview.style.left = (e.clientX - rect.left) + 'px';
        });

        // Skip controls
        skipBackBtn?.addEventListener('click', () => {
            video.currentTime = Math.max(0, video.currentTime - 10);
            showGesture('⏪ 10s');
        });

        skipForwardBtn?.addEventListener('click', () => {
            video.currentTime = Math.min(video.duration, video.currentTime + 10);
            showGesture('⏩ 10s');
        });

        // Volume control
        volumeBtn?.addEventListener('click', () => {
            video.muted = !video.muted;
            updateVolumeIcon();
            showGesture(video.muted ? '🔇' : '🔊');
        });

        const updateVolumeIcon = () => {
            if (video.muted || video.volume === 0) {
                volumeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
            } else if (video.volume < 0.5) {
                volumeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>';
            } else {
                volumeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
            }
        };

        volumeSlider?.addEventListener('click', (e) => {
            const rect = volumeSlider.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            video.volume = percent;
            volumeLevel.style.width = (percent * 100) + '%';
            updateVolumeIcon();
        });

        // Speed control
        speedBtn?.addEventListener('click', () => {
            speedMenu.classList.toggle('active');
            qualityMenu.classList.remove('active');
        });

        document.querySelectorAll('.speed-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                video.playbackRate = speed;
                speedBtn.textContent = speed === 1 ? '1x' : speed + 'x';
                document.querySelectorAll('.speed-option').forEach(o => o.classList.remove('active'));
                e.target.classList.add('active');
                speedMenu.classList.remove('active');
                showGesture(`⚡ ${speedBtn.textContent}`);
            });
        });

        // Quality control
        qualityBtn?.addEventListener('click', () => {
            qualityMenu.classList.toggle('active');
            speedMenu.classList.remove('active');
        });

        document.querySelectorAll('.quality-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const quality = e.currentTarget.dataset.quality;
                document.querySelectorAll('.quality-option').forEach(o => o.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                const qualityMap = {
                    '2160': '4K',
                    '1440': 'QHD',
                    '1080': 'HD',
                    '720': '720p',
                    '480': '480p',
                    '360': '360p',
                    'auto': 'Auto'
                };
                
                qualityBtn.textContent = qualityMap[quality];
                qualityMenu.classList.remove('active');
                showGesture(`📺 ${qualityBtn.textContent}`);
            });
        });

        // Fullscreen
        fullscreenBtn?.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                this.playerModal.requestFullscreen();
                fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>';
            } else {
                document.exitFullscreen();
                fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
            }
        });

        // Picture-in-Picture
        pipBtn?.addEventListener('click', async () => {
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                    document.querySelector('.pip-indicator')?.classList.remove('active');
                } else {
                    await video.requestPictureInPicture();
                    document.querySelector('.pip-indicator')?.classList.add('active');
                }
            } catch (error) {
                console.error('PiP failed:', error);
            }
        });

        // Navigation buttons
        prevVideoBtn?.addEventListener('click', () => {
            this.playPrevious();
        });

        nextVideoBtn?.addEventListener('click', () => {
            this.playNext();
        });

        // Close button
        closeBtn?.addEventListener('click', () => {
            this.close();
        });

        // Engagement buttons
        document.getElementById('likeBtn')?.addEventListener('click', function() {
            this.classList.toggle('active');
            if (this.classList.contains('active')) {
                document.getElementById('dislikeBtn').classList.remove('active');
                const count = this.querySelector('.engagement-count-enhanced');
                count.textContent = '2.6K';
            }
        });

        document.getElementById('dislikeBtn')?.addEventListener('click', function() {
            this.classList.toggle('active');
            if (this.classList.contains('active')) {
                document.getElementById('likeBtn').classList.remove('active');
            }
        });

        document.getElementById('shareBtn')?.addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({
                    title: document.querySelector('.video-title-enhanced').textContent,
                    text: 'Check out this video!',
                    url: window.location.href
                });
            } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
            }
        });

        document.getElementById('saveBtn')?.addEventListener('click', function() {
            this.classList.toggle('active');
        });

        document.getElementById('followBtn')?.addEventListener('click', function() {
            if (this.textContent === 'Follow') {
                this.textContent = 'Following';
                this.classList.add('following');
            } else {
                this.textContent = 'Follow';
                this.classList.remove('following');
            }
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const targetTab = this.dataset.tab;
                
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                document.getElementById('commentsTab').style.display = targetTab === 'comments' ? 'block' : 'none';
                document.getElementById('descriptionTab').style.display = targetTab === 'description' ? 'block' : 'none';
                document.getElementById('chaptersTab').style.display = targetTab === 'chapters' ? 'block' : 'none';
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when modal is active
            if (!this.playerModal?.classList.contains('active')) return;

            switch(e.key) {
                case ' ':
                    e.preventDefault();
                    togglePlayPause();
                    break;
                case 'ArrowLeft':
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    showGesture('⏪ 10s');
                    break;
                case 'ArrowRight':
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    showGesture('⏩ 10s');
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    video.volume = Math.min(1, video.volume + 0.1);
                    volumeLevel.style.width = (video.volume * 100) + '%';
                    updateVolumeIcon();
                    showGesture('🔊 ' + Math.round(video.volume * 100) + '%');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    video.volume = Math.max(0, video.volume - 0.1);
                    volumeLevel.style.width = (video.volume * 100) + '%';
                    updateVolumeIcon();
                    showGesture('🔉 ' + Math.round(video.volume * 100) + '%');
                    break;
                case 'j':
                case 'J':
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    showGesture('⏪ 10s');
                    break;
                case 'l':
                case 'L':
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    showGesture('⏩ 10s');
                    break;
                case 'm':
                case 'M':
                    video.muted = !video.muted;
                    updateVolumeIcon();
                    showGesture(video.muted ? '🔇' : '🔊');
                    break;
                case 'f':
                case 'F':
                    fullscreenBtn.click();
                    break;
                case '?':
                    document.getElementById('shortcutsOverlay')?.classList.toggle('active');
                    break;
                case 'Escape':
                    if (document.getElementById('shortcutsOverlay')?.classList.contains('active')) {
                        document.getElementById('shortcutsOverlay').classList.remove('active');
                    } else if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        this.close();
                    }
                    break;
            }
        });

        // Close menus on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.speed-selector')) {
                speedMenu?.classList.remove('active');
            }
            if (!e.target.closest('.quality-selector')) {
                qualityMenu?.classList.remove('active');
            }
        });

        // Show/hide controls on mouse movement
        const showControls = () => {
            videoControls?.classList.add('visible');
            clearTimeout(hideControlsTimeout);
            hideControlsTimeout = setTimeout(() => {
                if (!video.paused) {
                    videoControls?.classList.remove('visible');
                }
            }, 3000);
        };

        this.playerModal?.addEventListener('mousemove', showControls);
        video?.addEventListener('mousemove', showControls);
    }

    async open(videoData, playlist = []) {
        const loaded = await this.load();
        if (!loaded) {
            console.error('Failed to load video player');
            return;
        }

        // Set playlist if provided
        if (playlist.length > 0) {
            this.currentPlaylist = playlist;
            this.currentIndex = playlist.findIndex(v => v.src === videoData.src);
            if (this.currentIndex === -1) {
                this.currentPlaylist = [videoData];
                this.currentIndex = 0;
            }
        } else {
            this.currentPlaylist = [videoData];
            this.currentIndex = 0;
        }

        this.loadVideoData(videoData);

        // Show modal
        this.playerModal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Auto-play
        setTimeout(() => {
            this.video?.play().catch(e => console.log('Autoplay prevented:', e));
        }, 500);
    }

    loadVideoData(videoData) {
        // Update video source
        if (this.video) {
            this.video.src = videoData.src;
            this.video.load();
        }

        // Update UI elements
        const titleEl = document.querySelector('.video-title-enhanced');
        const creatorEl = document.querySelector('.creator-name');
        const viewsEl = document.querySelector('.view-count');
        const descriptionEl = document.getElementById('videoDescription');
        const videoCountText = document.getElementById('videoCountText');

        if (titleEl) titleEl.textContent = videoData.title || 'Untitled Video';
        if (creatorEl) creatorEl.textContent = videoData.creator || 'Zenith Academy';
        if (viewsEl) viewsEl.textContent = videoData.views || '0 views';
        if (descriptionEl) descriptionEl.textContent = videoData.description || 'Video from Zenith Academy';
        
        // Update video counter
        if (videoCountText && this.currentPlaylist.length > 1) {
            videoCountText.textContent = `Video ${this.currentIndex + 1} of ${this.currentPlaylist.length}`;
        }

        // Update creator avatar
        const avatarEl = document.querySelector('.creator-avatar');
        if (avatarEl && videoData.creator) {
            const initials = videoData.creator.split(' ').map(n => n[0]).join('').substring(0, 2);
            avatarEl.textContent = initials;
        }

        // Update navigation buttons
        this.updateNavigationButtons();
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevVideoBtn');
        const nextBtn = document.getElementById('nextVideoBtn');
        const prevTitle = document.getElementById('prevVideoTitle');
        const nextTitle = document.getElementById('nextVideoTitle');

        if (this.currentIndex > 0) {
            prevBtn?.removeAttribute('disabled');
            if (prevTitle) prevTitle.textContent = this.currentPlaylist[this.currentIndex - 1].title;
        } else {
            prevBtn?.setAttribute('disabled', 'true');
            if (prevTitle) prevTitle.textContent = 'No previous video';
        }

        if (this.currentIndex < this.currentPlaylist.length - 1) {
            nextBtn?.removeAttribute('disabled');
            if (nextTitle) nextTitle.textContent = this.currentPlaylist[this.currentIndex + 1].title;
        } else {
            nextBtn?.setAttribute('disabled', 'true');
            if (nextTitle) nextTitle.textContent = 'No next video';
        }
    }

    playPrevious() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.loadVideoData(this.currentPlaylist[this.currentIndex]);
            this.video?.play();
        }
    }

    playNext() {
        if (this.currentIndex < this.currentPlaylist.length - 1) {
            this.currentIndex++;
            this.loadVideoData(this.currentPlaylist[this.currentIndex]);
            this.video?.play();
        }
    }

    close() {
        if (this.playerModal) {
            const video = this.video;
            if (video) {
                video.pause();
                video.currentTime = 0;
            }
            this.playerModal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    getPlayerHTML() {
        // [Keep the same complete HTML from my previous response]
        return `...`; // Use the complete HTML from the previous response
    }
}

// Create global instance
window.videoPlayerLoader = new VideoPlayerLoader();