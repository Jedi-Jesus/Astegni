// Add this JavaScript to reels.js or create a new file reels-player-bridge.js

// ============================================
// REELS-VIDEOPLAYER BRIDGE
// ============================================

// Global video playlist for the ultimate player
let ultimateVideoPlaylist = [];
let currentUltimateVideoIndex = 0;

// Replace the existing openVideoModal function with this enhanced version
function openVideoModal(reelId) {
    // Build playlist from current filtered reels
    ultimateVideoPlaylist = filteredReelIds.map(id => {
        const reel = reels[id];
        const tutor = tutors[reel.tutorId];
        
        return {
            id: id,
            title: `${reel.title} ${reel.videoNumber}`,
            src: reel.videoUrl,
            creator: tutor.name,
            views: formatViewCount(Math.floor(Math.random() * 1000000)), // You can track real views
            description: reel.description,
            duration: "0:00", // Will be updated when video loads
            subject: tutor.subject,
            date: reel.date,
            tutorId: reel.tutorId
        };
    });
    
    // Find index of selected video
    currentUltimateVideoIndex = filteredReelIds.indexOf(reelId);
    
    // Initialize the ultimate video player
    initializeUltimatePlayer();
    
    // Load the selected video
    loadUltimateVideo(currentUltimateVideoIndex);
    
    // Show the ultimate modal
    const modal = document.getElementById("ultimate-video-modal");
    if (modal) {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }
    
    // Track history
    if (!history[reelId]) history[reelId] = { reelId, userIds: [] };
    if (!history[reelId].userIds.includes(currentUser.id)) {
        history[reelId].userIds.push(currentUser.id);
        updateFilterCounts();
    }
}

// Initialize Ultimate Player (modified from videoplayer.js)
function initializeUltimatePlayer() {
    if (!window.ultimatePlayerInitialized) {
        // Get all elements
        const video = document.getElementById('enhancedVideo');
        const playPauseBtn = document.getElementById('playPauseBtn');
        const progressContainer = document.getElementById('progressContainer');
        // ... (get all other elements)
        
        // Setup all event listeners (copy from videoplayer.js)
        setupUltimateEventListeners();
        
        // Initialize video dots for playlist
        initializeUltimateVideoDots();
        
        window.ultimatePlayerInitialized = true;
    }
}

// Load video into ultimate player
function loadUltimateVideo(index) {
    if (index < 0 || index >= ultimateVideoPlaylist.length) return;
    
    currentUltimateVideoIndex = index;
    const videoData = ultimateVideoPlaylist[index];
    const reelId = videoData.id;
    const reel = reels[reelId];
    const tutor = tutors[reel.tutorId];
    
    // Get video element
    const video = document.getElementById('enhancedVideo');
    
    // Pause current video
    video.pause();
    
    // Update video source
    video.src = videoData.src;
    video.load();
    
    // Update all UI elements
    document.getElementById('ultimate-video-title').textContent = videoData.title;
    document.getElementById('ultimate-creator-name').textContent = videoData.creator;
    document.getElementById('ultimate-creator-stats').textContent = `${videoData.subject} Teacher`;
    document.getElementById('ultimate-view-count').textContent = videoData.views + ' views';
    document.getElementById('ultimate-upload-date').textContent = formatDate(videoData.date);
    document.getElementById('videoCountText').textContent = 
        `Video ${index + 1} of ${ultimateVideoPlaylist.length}`;
    
    // Update creator avatar
    const creatorAvatar = document.getElementById('ultimate-creator-avatar');
    const initials = videoData.creator.split(' ').map(n => n[0]).join('');
    creatorAvatar.textContent = initials;
    
    // Update engagement bar with reels data
    updateUltimateEngagementBar(reelId);
    
    // Update comments section
    updateUltimateComments(reelId);
    
    // Update description
    updateUltimateDescription(reel, tutor);
    
    // Update navigation buttons
    updateUltimateNavigationButtons();
    
    // Update video dots
    updateUltimateVideoDots();
    
    // Update follow button
    updateUltimateFollowButton(reel.tutorId);
    
    // Auto-play video
    video.play().catch(e => console.log("Autoplay prevented:", e));
    
    // Show notification
    showNotification(`🎬 Now playing: ${videoData.title}`);
}

// Update engagement bar with reels interaction data
function updateUltimateEngagementBar(reelId) {
    const likeCount = likes[reelId]?.userIds?.length || 0;
    const dislikeCount = dislikes[reelId]?.userIds?.length || 0;
    const commentCount = comments[reelId]?.comments?.length || 0;
    const isLiked = likes[reelId]?.userIds?.includes(currentUser?.id);
    const isDisliked = dislikes[reelId]?.userIds?.includes(currentUser?.id);
    const isSaved = savedVideos[reelId]?.userIds?.includes(currentUser?.id);
    
    const engagementBar = document.getElementById('ultimate-engagement-bar');
    if (engagementBar) {
        engagementBar.innerHTML = `
            <button class="engagement-btn-enhanced hover-lift ${isLiked ? 'active' : ''}" 
                    onclick="handleUltimateLike(${reelId})">
                <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M7 22V11L12 2L13.09 3.09C13.31 3.31 13.44 3.61 13.47 3.92L13 7H20C20.55 7 21.05 7.22 21.41 7.59C21.77 7.95 22 8.45 22 9V11C22 11.26 21.95 11.52 21.86 11.76L18.84 19.76C18.54 20.54 17.77 21 16.91 21H9C7.9 21 7 20.1 7 19V11Z"/>
                </svg>
                <span class="engagement-count-enhanced">${formatCount(likeCount)}</span>
                <span class="engagement-label">Like</span>
            </button>
            
            <button class="engagement-btn-enhanced hover-lift ${isDisliked ? 'active' : ''}" 
                    onclick="handleUltimateDislike(${reelId})">
                <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 2V13L12 22L10.91 20.91C10.69 20.69 10.56 20.39 10.53 20.08L11 17H4C3.45 17 2.95 16.78 2.59 16.41C2.23 16.05 2 15.55 2 15V13C2 12.74 2.05 12.48 2.14 12.24L5.16 4.24C5.46 3.46 6.23 3 7.09 3H15C16.1 3 17 3.9 17 5V13Z"/>
                </svg>
                <span class="engagement-count-enhanced">${formatCount(dislikeCount)}</span>
                <span class="engagement-label">Dislike</span>
            </button>
            
            <button class="engagement-btn-enhanced hover-lift" onclick="handleUltimateShare(${reelId})">
                <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/>
                </svg>
                <span class="engagement-count-enhanced">${formatCount(commentCount)}</span>
                <span class="engagement-label">Share</span>
            </button>
            
            <button class="engagement-btn-enhanced hover-lift ${isSaved ? 'active' : ''}" 
                    onclick="handleUltimateSave(${reelId})">
                <svg class="engagement-icon-enhanced" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
                </svg>
                <span class="engagement-count-enhanced">${isSaved ? 'Saved' : 'Save'}</span>
                <span class="engagement-label">Save</span>
            </button>
        `;
    }
}

// Update comments section
function updateUltimateComments(reelId) {
    const reelComments = comments[reelId]?.comments || [];
    const commentsTab = document.getElementById('commentsTab');
    
    if (commentsTab) {
        commentsTab.innerHTML = `
            <div class="comment-input-enhanced enhanced-card">
                <div class="comment-avatar">${currentUser ? currentUser.name[0] : 'U'}</div>
                <textarea class="comment-field" placeholder="Add a comment..." 
                          id="ultimate-comment-field"></textarea>
                <button class="btn btn-primary" onclick="addUltimateComment(${reelId})">Post</button>
            </div>
            
            ${reelComments.map(comment => `
                <div class="comment-item-enhanced hover-lift">
                    <div class="comment-avatar">U</div>
                    <div class="comment-content-enhanced">
                        <div class="comment-header">
                            <span class="comment-author">User ${comment.userId}</span>
                            <span class="comment-time">${formatTimeAgo(comment.date)}</span>
                        </div>
                        <p class="comment-text">${comment.text}</p>
                        <div class="comment-reactions">
                            <button class="reaction-btn">
                                <span>👍</span>
                                <span>0</span>
                            </button>
                            <button class="reaction-btn">Reply</button>
                        </div>
                    </div>
                </div>
            `).join('') || '<p class="text-center opacity-60">No comments yet. Be the first!</p>'}
        `;
    }
}

// Update description tab
function updateUltimateDescription(reel, tutor) {
    const descriptionTab = document.getElementById('descriptionTab');
    if (descriptionTab) {
        descriptionTab.innerHTML = `
            <div class="enhanced-card">
                <p style="line-height: 1.6; margin-bottom: 1rem;">
                    ${reel.description}
                </p>
                <div class="video-details">
                    <div class="detail-item">
                        <span class="detail-icon">👨‍🏫</span>
                        <span>Teacher: ${tutor.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">📚</span>
                        <span>Subject: ${tutor.subject}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">📅</span>
                        <span>Posted: ${reel.date}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">🏷️</span>
                        <span>Video: ${reel.videoNumber}</span>
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize video dots
function initializeUltimateVideoDots() {
    const dotsContainer = document.getElementById('videoDots');
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        
        for (let i = 0; i < Math.min(ultimateVideoPlaylist.length, 10); i++) {
            const dot = document.createElement('div');
            dot.className = 'video-dot';
            if (i === currentUltimateVideoIndex) dot.classList.add('active');
            dot.addEventListener('click', () => loadUltimateVideo(i));
            dotsContainer.appendChild(dot);
        }
    }
}

// Update video dots
function updateUltimateVideoDots() {
    document.querySelectorAll('.video-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === currentUltimateVideoIndex);
    });
}

// Update navigation buttons
function updateUltimateNavigationButtons() {
    const prevBtn = document.getElementById('prevVideoBtn');
    const nextBtn = document.getElementById('nextVideoBtn');
    const prevTitle = document.getElementById('prevVideoTitle');
    const nextTitle = document.getElementById('nextVideoTitle');
    
    const hasPrev = currentUltimateVideoIndex > 0;
    const hasNext = currentUltimateVideoIndex < ultimateVideoPlaylist.length - 1;
    
    if (prevBtn) prevBtn.disabled = !hasPrev;
    if (nextBtn) nextBtn.disabled = !hasNext;
    
    if (prevTitle) {
        prevTitle.textContent = hasPrev 
            ? ultimateVideoPlaylist[currentUltimateVideoIndex - 1].title 
            : 'No previous video';
    }
    
    if (nextTitle) {
        nextTitle.textContent = hasNext 
            ? ultimateVideoPlaylist[currentUltimateVideoIndex + 1].title 
            : 'No more videos';
    }
    
    // Setup navigation event listeners
    if (prevBtn && !prevBtn.hasListener) {
        prevBtn.addEventListener('click', () => {
            if (currentUltimateVideoIndex > 0) {
                loadUltimateVideo(currentUltimateVideoIndex - 1);
            }
        });
        prevBtn.hasListener = true;
    }
    
    if (nextBtn && !nextBtn.hasListener) {
        nextBtn.addEventListener('click', () => {
            if (currentUltimateVideoIndex < ultimateVideoPlaylist.length - 1) {
                loadUltimateVideo(currentUltimateVideoIndex + 1);
            }
        });
        nextBtn.hasListener = true;
    }
}

// Update follow button
function updateUltimateFollowButton(tutorId) {
    const followBtn = document.getElementById('followBtn');
    const isFollowed = follows[tutorId]?.userIds?.includes(currentUser?.id);
    
    if (followBtn) {
        followBtn.textContent = isFollowed ? 'Following' : 'Follow';
        followBtn.classList.toggle('following', isFollowed);
        
        followBtn.onclick = () => {
            toggleFollow(tutorId);
            updateUltimateFollowButton(tutorId);
            updateReels(currentFilter);
        };
    }
}

// Handle engagement actions
function handleUltimateLike(reelId) {
    toggleLike(reelId);
    updateUltimateEngagementBar(reelId);
    updateReels(currentFilter);
}

function handleUltimateDislike(reelId) {
    toggleDislike(reelId);
    updateUltimateEngagementBar(reelId);
    updateReels(currentFilter);
}

function handleUltimateShare(reelId) {
    shareReel(reelId);
}

function handleUltimateSave(reelId) {
    openPlaylistModal(reelId);
}

function addUltimateComment(reelId) {
    const commentField = document.getElementById('ultimate-comment-field');
    if (!commentField) return;
    
    const text = commentField.value.trim();
    if (!text) {
        showToast("Please enter a comment", "error");
        return;
    }
    
    if (!comments[reelId]) {
        comments[reelId] = { reelId, comments: [] };
    }
    
    comments[reelId].comments.push({
        userId: currentUser.id,
        text: text,
        date: new Date().toISOString().split("T")[0],
    });
    
    commentField.value = "";
    updateUltimateComments(reelId);
    updateReels(currentFilter);
    showToast("Comment added!");
}

// Close ultimate modal
function closeUltimateModal() {
    const modal = document.getElementById("ultimate-video-modal");
    if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }
    
    const video = document.getElementById('enhancedVideo');
    if (video) {
        video.pause();
    }
}

// Setup event listeners for ultimate player
function setupUltimateEventListeners() {
    // Copy all event listeners from videoplayer.js
    // This includes play/pause, progress bar, volume, speed, quality, etc.
    // You can copy the entire setupEventListeners function from videoplayer.js
    
    // Add keyboard shortcuts for navigation
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('ultimate-video-modal');
        if (!modal || !modal.classList.contains('active')) return;
        
        if (e.shiftKey && e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentUltimateVideoIndex > 0) {
                loadUltimateVideo(currentUltimateVideoIndex - 1);
            }
        } else if (e.shiftKey && e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentUltimateVideoIndex < ultimateVideoPlaylist.length - 1) {
                loadUltimateVideo(currentUltimateVideoIndex + 1);
            }
        }
    });
}

// Helper functions
function formatViewCount(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatCount(num) {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
}

function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return formatDate(dateStr);
}

// Show notification (if not already defined)
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--button-bg);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add CSS animation for notification
if (!document.querySelector('#notification-animation-style')) {
    const style = document.createElement('style');
    style.id = 'notification-animation-style';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .notification-toast {
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
    `;
    document.head.appendChild(style);
}