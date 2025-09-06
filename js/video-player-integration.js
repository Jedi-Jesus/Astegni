// ============================================
// ULTIMATE VIDEO PLAYER INTEGRATION FOR REELS
// Properly connects the video player system
// ============================================

// Wait for DOM and all scripts to be ready
window.addEventListener('DOMContentLoaded', function() {
    // Give other scripts time to initialize
    setTimeout(() => {
        console.log('Initializing video player integration...');
        setupVideoPlayerIntegration();
    }, 100);
});

function setupVideoPlayerIntegration() {
    // Check if required classes exist
    if (typeof VideoPlayerBridge === 'undefined') {
        console.error('VideoPlayerBridge class not found. Make sure player-bridge.js is loaded.');
        return;
    }
    
    if (typeof UltimateVideoPlayer === 'undefined') {
        console.error('UltimateVideoPlayer class not found. Make sure videoplayer.js is loaded.');
        return;
    }
    
    // Initialize bridge if not already done
    if (!window.videoPlayerBridge) {
        console.log('Creating Video Player Bridge...');
        window.videoPlayerBridge = new VideoPlayerBridge('reels');
    }
    
    // Get reference to the player
    window.player = window.videoPlayerBridge.player;
    
    // Verify modal exists
    const modal = document.getElementById('ultimate-video-modal');
    if (!modal) {
        console.error('Video modal element not found in DOM!');
        return;
    }
    
    console.log('Video Player Integration Ready');
}

// Override the openVideoModal function to use the new player
window.openVideoModal = function(reelId) {
    console.log('Opening video modal for reel:', reelId);
    
    // Ensure bridge is ready
    if (!window.videoPlayerBridge) {
        console.error('Video Player Bridge not initialized. Attempting to initialize...');
        setupVideoPlayerIntegration();
        
        if (!window.videoPlayerBridge) {
            console.error('Failed to initialize Video Player Bridge');
            return;
        }
    }
    
    // Convert reelId to string if needed
    const videoId = String(reelId);
    
    // Use the bridge's openVideo method
    try {
        window.videoPlayerBridge.openVideo(videoId);
    } catch (error) {
        console.error('Error opening video:', error);
    }
    
    // Track history
    trackVideoView(videoId);
};

// Track video view for history
function trackVideoView(videoId) {
    const reelId = parseInt(videoId);
    if (!window.history) window.history = {};
    if (!window.history[reelId]) {
        window.history[reelId] = { reelId: reelId, userIds: [] };
    }
    if (window.currentUser && !window.history[reelId].userIds.includes(window.currentUser.id)) {
        window.history[reelId].userIds.push(window.currentUser.id);
        if (typeof window.updateFilterCounts === 'function') {
            window.updateFilterCounts();
        }
    }
}

// Close the ultimate modal
window.closeUltimateModal = function() {
    if (window.videoPlayerBridge && window.videoPlayerBridge.player) {
        window.videoPlayerBridge.player.close();
    }
};

// All the other handler functions remain the same as in your original file
// (handleVideoLike, handleVideoDislike, etc.)

console.log('Video Player Integration Script Loaded');