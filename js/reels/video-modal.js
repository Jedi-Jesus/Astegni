// ============================================
// VIDEO MODAL
// ============================================
function openVideoModal(reelId) {
    console.log('Opening video modal for reel:', reelId);

    // Track view
    trackVideoView(reelId);

    if (!window.videoPlayerBridge) {
        console.error('Video player bridge not initialized');
        showToast('Video player is loading, please try again...', 'warning');

        // Try again after delay
        setTimeout(() => {
            if (window.videoPlayerBridge) {
                openVideoModal(reelId);
            } else {
                showToast('Video player failed to load. Please refresh the page.', 'error');
            }
        }, 1000);
        return;
    }

    try {
        window.videoPlayerBridge.openVideo(reelId, {
            playlist: window.currentReels,
            context: 'reels'
        });
    } catch (error) {
        console.error('Error opening video:', error);
        showToast('Failed to open video', 'error');
    }
}

// Ultimate Video Modal for Featured Content
function openUltimateVideoModal(reelId) {
    console.log('Opening ultimate video modal for featured reel:', reelId);

    // Track view for featured content
    trackVideoView(reelId);

    const modal = document.getElementById('ultimate-video-modal');
    if (!modal) {
        console.error('Ultimate video modal not found');
        // Fallback to regular video modal
        openVideoModal(reelId);
        return;
    }

    // Get reel data
    const reel = window.currentReels?.find(r => r.id === reelId);
    if (!reel) {
        console.error('Reel not found:', reelId);
        showToast('Video not found', 'error');
        return;
    }

    // Get video URL
    const videoUrl = UrlHelper?.getAssetUrl(reel.video_url) || reel.video_url;

    // Find or create video element in ultimate modal
    let videoElement = modal.querySelector('#ultimateVideo');
    if (!videoElement) {
        // Create video element if it doesn't exist
        const videoContainer = modal.querySelector('.video-container') || modal;
        videoElement = document.createElement('video');
        videoElement.id = 'ultimateVideo';
        videoElement.className = 'ultimate-video';
        videoElement.controls = true;
        videoElement.autoplay = true;
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'contain';
        videoContainer.appendChild(videoElement);
    }

    // Set video source
    videoElement.src = videoUrl;

    // Show modal
    modal.classList.add('active');
    modal.style.display = 'flex';

    // Play video
    videoElement.play().catch(err => {
        console.error('Error playing video:', err);
        showToast('Failed to play video', 'error');
    });

    // Add close handler
    const closeModal = () => {
        modal.classList.remove('active');
        modal.style.display = 'none';
        videoElement.pause();
        videoElement.src = '';
    };

    // Close on overlay click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };

    // Close on escape key
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escapeHandler);
        }
    });

    // Try to use video player bridge for enhanced features
    if (window.videoPlayerBridge) {
        try {
            window.videoPlayerBridge.enhanceVideo(videoElement, {
                reelId: reelId,
                playlist: window.currentReels,
                context: 'featured-reels'
            });
        } catch (error) {
            console.log('Video player bridge enhancement not available');
        }
    }
}

window.openVideoModal = openVideoModal;
window.openUltimateVideoModal = openUltimateVideoModal;
