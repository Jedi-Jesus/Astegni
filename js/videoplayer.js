// ============================================
// VIDEO PLAYER JAVASCRIPT
// ============================================

// Video Player Elements
const video = document.getElementById('enhancedVideo');
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
const gestureIndicator = document.getElementById('gestureIndicator');
const videoControls = document.getElementById('videoControls');
const shortcutsOverlay = document.getElementById('shortcutsOverlay');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const prevVideoBtn = document.getElementById('prevVideoBtn');
const nextVideoBtn = document.getElementById('nextVideoBtn');
const prevVideoTitle = document.getElementById('prevVideoTitle');
const nextVideoTitle = document.getElementById('nextVideoTitle');

// Video Playlist
const videoPlaylist = [
    {
        title: "Big Buck Bunny - Animation Short",
        src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        creator: "Blender Foundation",
        views: "1.2M",
        description: "Big Buck Bunny is a short animated film created by the Blender Institute.",
        duration: "9:56"
    },
    {
        title: "Sintel - Epic Animation",
        src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        creator: "Blender Studio",
        views: "856K",
        description: "Sintel is an epic short film about a girl's quest to rescue her dragon friend.",
        duration: "14:48"
    },
    {
        title: "Tears of Steel - Sci-Fi Short",
        src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        creator: "Mango Project",
        views: "523K",
        description: "Tears of Steel is a science fiction short film by the Blender Institute.",
        duration: "12:14"
    },
    {
        title: "Elephant's Dream - Surreal Journey",
        src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        creator: "Orange Project",
        views: "445K",
        description: "The story of two strange characters exploring a capricious world.",
        duration: "10:53"
    },
    {
        title: "For Bigger Blazes - Adventure",
        src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        creator: "Google Creative",
        views: "234K",
        description: "An exciting adventure showcasing stunning visuals.",
        duration: "0:15"
    }
];

// Player State
let currentVideoIndex = 0;
let isPlaying = false;
let isSeeking = false;
let isDragging = false;

// Initialize Player
function initializePlayer() {
    loadTheme();
    initializeVideoDots();
    updateNavigationButtons();
    setupEventListeners();
    
    // Load first video
    loadVideo(0);
}

// Theme Management
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
    if (theme === 'light') {
        themeIcon.innerHTML = '<path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>';
    } else {
        themeIcon.innerHTML = '<path d="M12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18ZM12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16ZM11 1H13V4H11V1ZM11 20H13V23H11V20ZM3.51472 4.92893L4.92893 3.51472L7.05025 5.63604L5.63604 7.05025L3.51472 4.92893ZM16.9497 18.364L18.364 16.9497L20.4853 19.0711L19.0711 20.4853L16.9497 18.364ZM19.0711 3.51472L20.4853 4.92893L18.364 7.05025L16.9497 5.63604L19.0711 3.51472ZM5.63604 16.9497L7.05025 18.364L4.92893 20.4853L3.51472 19.0711L5.63604 16.9497ZM23 11V13H20V11H23ZM4 11V13H1V11H4Z"/>';
    }
}

themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    themeIcon.style.transform = 'rotate(360deg)';
    setTimeout(() => {
        themeIcon.style.transform = 'rotate(0deg)';
    }, 300);
    
    showNotification(newTheme === 'light' ? '☀️ Light mode activated' : '🌙 Dark mode activated');
});

// Initialize Video Dots
function initializeVideoDots() {
    const dotsContainer = document.getElementById('videoDots');
    dotsContainer.innerHTML = '';
    
    for (let i = 0; i < videoPlaylist.length; i++) {
        const dot = document.createElement('div');
        dot.className = 'video-dot';
        if (i === currentVideoIndex) dot.classList.add('active');
        dot.addEventListener('click', () => loadVideo(i));
        dotsContainer.appendChild(dot);
    }
}

// Load Video
function loadVideo(index) {
    if (index < 0 || index >= videoPlaylist.length) return;
    
    currentVideoIndex = index;
    const videoData = videoPlaylist[index];
    
    // Pause current video
    video.pause();
    
    // Update video source
    video.src = videoData.src;
    video.load();
    
    // Update UI elements
    document.querySelector('.video-title-enhanced').textContent = videoData.title;
    document.querySelector('.creator-name').textContent = videoData.creator;
    document.querySelector('.view-count').textContent = videoData.views + ' views';
    document.getElementById('videoCountText').textContent = `Video ${index + 1} of ${videoPlaylist.length}`;
    
    // Update creator avatar
    const creatorAvatar = document.querySelector('.creator-avatar');
    const initials = videoData.creator.split(' ').map(n => n[0]).join('');
    creatorAvatar.textContent = initials;
    
    // Update description
    const descriptionTab = document.getElementById('descriptionTab');
    descriptionTab.innerHTML = `
        <div class="enhanced-card">
            <p style="line-height: 1.6; margin-bottom: 1rem;">
                ${videoData.description}
            </p>
            <div class="video-details">
                <div class="detail-item">
                    <span class="detail-icon">📺</span>
                    <span>Duration: ${videoData.duration || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-icon">🎬</span>
                    <span>Quality: HD 1080p</span>
                </div>
                <div class="detail-item">
                    <span class="detail-icon">🏷️</span>
                    <span>Category: Animation</span>
                </div>
            </div>
        </div>
    `;
    
    // Update dots
    document.querySelectorAll('.video-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
    
    // Update navigation buttons
    updateNavigationButtons();
    
    // Show transition effect
    const transitionEl = document.getElementById('fullscreenTransition');
    transitionEl.classList.add('active');
    setTimeout(() => {
        transitionEl.classList.remove('active');
        video.play();
    }, 300);
    
    // Reset progress bar
    progressPlayed.style.width = '0%';
    progressScrubber.style.left = '0%';
    currentTimeEl.textContent = '0:00';
    
    showNotification(`📺 Now playing: ${videoData.title}`);
}

// Update Navigation Buttons
function updateNavigationButtons() {
    const hasPrev = currentVideoIndex > 0;
    const hasNext = currentVideoIndex < videoPlaylist.length - 1;
    
    // Update previous button
    prevVideoBtn.disabled = !hasPrev;
    if (hasPrev) {
        prevVideoTitle.textContent = videoPlaylist[currentVideoIndex - 1].title;
    } else {
        prevVideoTitle.textContent = 'No previous video';
    }
    
    // Update next button
    nextVideoBtn.disabled = !hasNext;
    if (hasNext) {
        nextVideoTitle.textContent = videoPlaylist[currentVideoIndex + 1].title;
    } else {
        nextVideoTitle.textContent = 'No more videos';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Video events
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('progress', updateBufferProgress);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', showLoading);
    video.addEventListener('canplay', hideLoading);
    video.addEventListener('ended', handleVideoEnded);
    
    // Play/Pause
    playPauseBtn.addEventListener('click', togglePlayPause);
    video.addEventListener('click', togglePlayPause);
    
    // Progress bar
    progressContainer.addEventListener('click', seek);
    progressContainer.addEventListener('mousemove', showPreview);
    progressContainer.addEventListener('mousedown', startDragging);
    
    // Volume
    volumeBtn.addEventListener('click', toggleMute);
    volumeSlider.addEventListener('click', setVolume);
    
    // Speed control
    speedBtn.addEventListener('click', toggleSpeedMenu);
    document.querySelectorAll('.speed-option').forEach(option => {
        option.addEventListener('click', changeSpeed);
    });
    
    // Quality control
    qualityBtn.addEventListener('click', toggleQualityMenu);
    document.querySelectorAll('.quality-option').forEach(option => {
        option.addEventListener('click', changeQuality);
    });
    
    // Skip controls
    document.getElementById('skipBackBtn').addEventListener('click', () => skipTime(-10));
    document.getElementById('skipForwardBtn').addEventListener('click', () => skipTime(10));
    
    // Fullscreen
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    
    // Picture-in-Picture
    pipBtn.addEventListener('click', togglePiP);
    
    // Navigation buttons
    prevVideoBtn.addEventListener('click', () => {
        if (currentVideoIndex > 0) {
            loadVideo(currentVideoIndex - 1);
        }
    });
    
    nextVideoBtn.addEventListener('click', () => {
        if (currentVideoIndex < videoPlaylist.length - 1) {
            loadVideo(currentVideoIndex + 1);
        }
    });
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', switchTab);
    });
    
    // Engagement buttons
    document.getElementById('likeBtn').addEventListener('click', handleLike);
    document.getElementById('dislikeBtn').addEventListener('click', handleDislike);
    document.getElementById('shareBtn').addEventListener('click', handleShare);
    document.getElementById('saveBtn').addEventListener('click', handleSave);
    document.getElementById('followBtn').addEventListener('click', handleFollow);
    
    // Comment reactions
    document.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.addEventListener('click', handleReaction);
    });
    
    // Chapters
    document.querySelectorAll('.chapter-item').forEach(chapter => {
        chapter.addEventListener('click', handleChapterClick);
    });
    

    // 1. CLOSE FUNCTIONALITY
// ============================================

// Update the close button function
function closeUltimateModal() {
    const modal = document.getElementById("ultimate-video-modal");
    if (modal) {
        // Save watch progress before closing
        saveWatchProgress();
        
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }
    
    const video = document.getElementById('enhancedVideo');
    if (video) {
        video.pause();
    }
}

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
    
    // Mouse movement for controls
    let hideControlsTimeout;
    video.addEventListener('mousemove', () => {
        showControls();
        clearTimeout(hideControlsTimeout);
        hideControlsTimeout = setTimeout(() => {
            if (!video.paused) {
                videoControls.classList.remove('visible');
            }
        }, 3000);
    });
    
    // Document events for dragging
    document.addEventListener('mousemove', handleDragging);
    document.addEventListener('mouseup', stopDragging);
    
    // Close menus on outside click
    document.addEventListener('click', handleOutsideClick);
    
    // Comment field auto-resize
    const commentField = document.querySelector('.comment-field');
    commentField.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });
}

// Video Control Functions
function handleLoadedMetadata() {
    durationEl.textContent = formatTime(video.duration);
    volumeLevel.style.width = (video.volume * 100) + '%';
    updateVolumeIcon();
}

function togglePlayPause() {
    if (video.paused) {
        video.play();
    } else {
        video.pause();
    }
}

function handlePlay() {
    isPlaying = true;
    playPauseBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    showGesture('▶️');
}

function handlePause() {
    isPlaying = false;
    playPauseBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    showGesture('⏸️');
}

function handleVideoEnded() {
    // Auto-play next video if available
    if (currentVideoIndex < videoPlaylist.length - 1) {
        setTimeout(() => {
            loadVideo(currentVideoIndex + 1);
        }, 2000);
    }
}

function updateProgress() {
    if (!isSeeking) {
        const percent = (video.currentTime / video.duration) * 100;
        progressPlayed.style.width = percent + '%';
        progressScrubber.style.left = percent + '%';
        currentTimeEl.textContent = formatTime(video.currentTime);
    }
}

function updateBufferProgress() {
    if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;
        if (duration > 0) {
            progressBuffer.style.width = ((bufferedEnd / duration) * 100) + '%';
        }
    }
}

function seek(e) {
    const rect = progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = percent * video.duration;
}

function showPreview(e) {
    const rect = progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * video.duration;
    progressPreview.textContent = formatTime(time);
    progressPreview.style.left = (e.clientX - rect.left) + 'px';
}

function startDragging(e) {
    isDragging = true;
    isSeeking = true;
    seek(e);
}

function handleDragging(e) {
    if (isDragging) {
        const rect = progressContainer.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        progressPlayed.style.width = (percent * 100) + '%';
        progressScrubber.style.left = (percent * 100) + '%';
        currentTimeEl.textContent = formatTime(percent * video.duration);
    }
}

function stopDragging(e) {
    if (isDragging) {
        isDragging = false;
        isSeeking = false;
        const rect = progressContainer.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        video.currentTime = percent * video.duration;
    }
}

function skipTime(seconds) {
    video.currentTime += seconds;
    showGesture(seconds > 0 ? `⏩ ${seconds}s` : `⏪ ${Math.abs(seconds)}s`);
}

// Volume Functions
function toggleMute() {
    video.muted = !video.muted;
    updateVolumeIcon();
    showGesture(video.muted ? '🔇' : '🔊');
}

function setVolume(e) {
    const rect = volumeSlider.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.volume = Math.max(0, Math.min(1, percent));
    volumeLevel.style.width = (video.volume * 100) + '%';
    updateVolumeIcon();
}

function updateVolumeIcon() {
    if (video.muted || video.volume === 0) {
        volumeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
    } else if (video.volume < 0.5) {
        volumeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>';
    } else {
        volumeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
    }
}

// Speed Control
function toggleSpeedMenu() {
    speedMenu.classList.toggle('active');
    qualityMenu.classList.remove('active');
}

function changeSpeed(e) {
    const speed = parseFloat(e.target.dataset.speed);
    video.playbackRate = speed;
    speedBtn.textContent = speed === 1 ? '1x' : speed + 'x';
    document.querySelectorAll('.speed-option').forEach(o => o.classList.remove('active'));
    e.target.classList.add('active');
    speedMenu.classList.remove('active');
    showNotification(`⚡ Speed: ${speedBtn.textContent}`);
}

// Quality Control
function toggleQualityMenu() {
    qualityMenu.classList.toggle('active');
    speedMenu.classList.remove('active');
}

function changeQuality(e) {
    const quality = e.currentTarget.dataset.quality;
    
    document.querySelectorAll('.quality-option').forEach(o => o.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    // Update button text
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
    
    // Show transition effect
    const transitionEl = document.getElementById('fullscreenTransition');
    transitionEl.classList.add('active');
    setTimeout(() => {
        transitionEl.classList.remove('active');
    }, 300);
    
    showNotification(`📺 Quality changed to ${qualityBtn.textContent}`);
}

// Fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.querySelector('.video-theater-container').requestFullscreen();
        fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>';
    } else {
        document.exitFullscreen();
        fullscreenBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
    }
}

// Picture-in-Picture
async function togglePiP() {
    try {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
            document.querySelector('.pip-indicator').classList.remove('active');
        } else {
            await video.requestPictureInPicture();
            document.querySelector('.pip-indicator').classList.add('active');
        }
    } catch (error) {
        console.error('PiP failed:', error);
        showNotification('⚠️ Picture-in-Picture not supported');
    }
}

// Tab Switching
function switchTab(e) {
    const targetTab = e.target.dataset.tab;
    
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    
    // Update content
    document.getElementById('commentsTab').style.display = targetTab === 'comments' ? 'block' : 'none';
    document.getElementById('descriptionTab').style.display = targetTab === 'description' ? 'block' : 'none';
    document.getElementById('chaptersTab').style.display = targetTab === 'chapters' ? 'block' : 'none';
}

// Engagement Functions
function handleLike() {
    const likeBtn = document.getElementById('likeBtn');
    const dislikeBtn = document.getElementById('dislikeBtn');
    
    likeBtn.classList.toggle('active');
    if (likeBtn.classList.contains('active')) {
        dislikeBtn.classList.remove('active');
        updateCount(likeBtn, 2501);
        showNotification('👍 Liked!');
    } else {
        updateCount(likeBtn, 2500);
    }
}

function handleDislike() {
    const likeBtn = document.getElementById('likeBtn');
    const dislikeBtn = document.getElementById('dislikeBtn');
    
    dislikeBtn.classList.toggle('active');
    if (dislikeBtn.classList.contains('active')) {
        likeBtn.classList.remove('active');
        updateCount(dislikeBtn, 46);
        showNotification('👎 Disliked');
    } else {
        updateCount(dislikeBtn, 45);
    }
}

function handleShare() {
    if (navigator.share) {
        navigator.share({
            title: document.querySelector('.video-title-enhanced').textContent,
            text: 'Check out this amazing video!',
            url: window.location.href
        }).then(() => {
            showNotification('🔗 Shared successfully!');
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(window.location.href).then(() => {
            showNotification('📋 Link copied to clipboard!');
        });
    }
}

function handleSave() {
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.classList.toggle('active');
    if (saveBtn.classList.contains('active')) {
        updateCount(saveBtn, 1201);
        showNotification('🔖 Saved to playlist!');
    } else {
        updateCount(saveBtn, 1200);
        showNotification('🔖 Removed from playlist');
    }
}

function handleFollow() {
    const followBtn = document.getElementById('followBtn');
    if (followBtn.textContent === 'Follow') {
        followBtn.textContent = 'Following';
        followBtn.classList.add('following');
        showNotification('✅ Following');
    } else {
        followBtn.textContent = 'Follow';
        followBtn.classList.remove('following');
        showNotification('Unfollowed');
    }
}

function handleReaction() {
    this.classList.toggle('active');
    if (this.textContent.includes('👍') || this.textContent.includes('❤️')) {
        const countSpan = this.querySelector('span:last-child');
        if (countSpan) {
            let count = parseInt(countSpan.textContent);
            countSpan.textContent = this.classList.contains('active') ? count + 1 : count - 1;
        }
    }
}

function updateCount(button, newCount) {
    const countEl = button.querySelector('.engagement-count-enhanced');
    if (newCount >= 1000) {
        countEl.textContent = (newCount / 1000).toFixed(1) + 'K';
    } else {
        countEl.textContent = newCount;
    }
}

// Chapter Navigation
function handleChapterClick(e) {
    const timeStr = e.currentTarget.querySelector('.chapter-time').textContent;
    const timeParts = timeStr.split(':').map(Number);
    let seconds = 0;
    
    if (timeParts.length === 3) {
        seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
    } else if (timeParts.length === 2) {
        seconds = timeParts[0] * 60 + timeParts[1];
    }
    
    video.currentTime = seconds;
    showNotification(`⏭️ Jumped to: ${e.currentTarget.querySelector('.chapter-title').textContent}`);
}



// Keyboard Shortcuts
function handleKeyboard(e) {
        const modal = document.getElementById('ultimate-video-modal');
    if (!modal || !modal.classList.contains('active')) return;
    switch(e.key) {
                case 'Escape':
            closeUltimateModal();
            break;
        case ' ':
            e.preventDefault();
            togglePlayPause();
            break;
        case 'ArrowLeft':
            if (!e.shiftKey && !e.ctrlKey) {
                skipTime(-10);
            }
            break;
        case 'ArrowRight':
            if (!e.shiftKey && !e.ctrlKey) {
                skipTime(10);
            }
            break;
        case 'j':
        case 'J':
            skipTime(-10);
            break;
        case 'l':
        case 'L':
            skipTime(10);
            break;
        case 'ArrowUp':
            if (e.shiftKey) {
                // Previous video
                if (currentVideoIndex > 0) {
                    loadVideo(currentVideoIndex - 1);
                }
            } else {
                // Volume up
                e.preventDefault();
                video.volume = Math.min(1, video.volume + 0.1);
                volumeLevel.style.width = (video.volume * 100) + '%';
                updateVolumeIcon();
                showGesture('🔊 ' + Math.round(video.volume * 100) + '%');
            }
            break;
        case 'ArrowDown':
            if (e.shiftKey) {
                // Next video
                if (currentVideoIndex < videoPlaylist.length - 1) {
                    loadVideo(currentVideoIndex + 1);
                }
            } else {
                // Volume down
                e.preventDefault();
                video.volume = Math.max(0, video.volume - 0.1);
                volumeLevel.style.width = (video.volume * 100) + '%';
                updateVolumeIcon();
                showGesture('🔉 ' + Math.round(video.volume * 100) + '%');
            }
            break;
        case 'm':
        case 'M':
            toggleMute();
            break;
        case 'f':
        case 'F':
            toggleFullscreen();
            break;
        case '?':
            shortcutsOverlay.classList.toggle('active');
            break;
        case '>':
            video.playbackRate = Math.min(2, video.playbackRate + 0.25);
            speedBtn.textContent = video.playbackRate + 'x';
            showGesture('⏩ ' + video.playbackRate + 'x');
            break;
        case '<':
            video.playbackRate = Math.max(0.25, video.playbackRate - 0.25);
            speedBtn.textContent = video.playbackRate + 'x';
            showGesture('⏪ ' + video.playbackRate + 'x');
            break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
            const percent = parseInt(e.key) * 10;
            video.currentTime = (percent / 100) * video.duration;
            showGesture(percent + '%');
            break;
    }
}

// Add close button on top of video
function addVideoOverlayControls() {
    const videoWrapper = document.querySelector('.video-wrapper-advanced');
    if (!videoWrapper.querySelector('.video-overlay-close')) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'video-overlay-close';
        closeBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
            </svg>
        `;
        closeBtn.onclick = closeUltimateModal;
        videoWrapper.appendChild(closeBtn);
    }
}

// UI Helper Functions
function showControls() {
    videoControls.classList.add('visible');
}

function showLoading() {
    document.querySelector('.video-loading-spinner').classList.add('active');
}

function hideLoading() {
    document.querySelector('.video-loading-spinner').classList.remove('active');
}

function showGesture(icon) {
    gestureIndicator.textContent = icon;
    gestureIndicator.style.animation = 'none';
    setTimeout(() => {
        gestureIndicator.style.animation = 'gestureShow 0.8s ease';
    }, 10);
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 2300);
}

function handleOutsideClick(e) {
    if (!e.target.closest('.speed-selector')) {
        speedMenu.classList.remove('active');
    }
    if (!e.target.closest('.quality-selector')) {
        qualityMenu.classList.remove('active');
    }
    if (!e.target.closest('.shortcuts-overlay') && !e.target.closest('.control-btn')) {
        shortcutsOverlay.classList.remove('active');
    }
}

// Utility Functions
function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
}

// Close Modal Function (for the close button)
function closeModal() {
    document.querySelector('.ultimate-video-modal').classList.remove('active');
    video.pause();
}

// Make closeModal available globally
window.closeModal = closeModal;

// Initialize the player when DOM is ready
document.addEventListener('DOMContentLoaded', initializePlayer);

console.log('🎬 Ultimate Video Player Initialized!');

