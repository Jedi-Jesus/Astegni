// ============================================
// OPTIMIZED REELS JAVASCRIPT
// Clean version with Ultimate Video Player Integration
// ============================================

// ============================================
// THEME MANAGEMENT
// ============================================
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    html.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeToggleIcon(newTheme);
}




function updateThemeToggleIcon(theme) {
    const icon = theme === "light"
        ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>`
        : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>`;
    
    const themeToggle = document.getElementById("theme-toggle-btn");
    const mobileThemeToggle = document.getElementById("mobile-theme-toggle-btn");
    
    if (themeToggle) {
        themeToggle.querySelector("svg").innerHTML = icon;
    }
    if (mobileThemeToggle) {
        mobileThemeToggle.querySelector("svg").innerHTML = icon;
    }
}

function applyTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeToggleIcon(savedTheme);
}

// ============================================
// DATA OBJECTS
// ============================================
const currentUser = {
    id: 1,
    name: "John Doe",
    email: "user@astegni.et",
    role: "User"
};

const tutors = {
    1: {
        id: 1,
        name: "Abebe Kebede",
        email: "abebe@tutor.et",
        subject: "Mathematics",
    },
    2: {
        id: 2,
        name: "Mulu Alem",
        email: "mulu@tutor.et",
        subject: "Science",
    },
    3: {
        id: 3,
        name: "Sara Tadesse",
        email: "sara@tutor.et",
        subject: "Physics",
    },
    4: {
        id: 4,
        name: "Daniel Bekele",
        email: "daniel@tutor.et",
        subject: "Chemistry",
    }
};

const reels = {
    1: {
        id: 1,
        tutorId: 1,
        videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
        title: "Math Tricks",
        videoNumber: "#001",
        description: "Fun math tricks to improve your calculation speed! Learn amazing shortcuts.",
        date: "2025-05-20",
    },
    2: {
        id: 2,
        tutorId: 2,
        videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
        title: "Science Experiments",
        videoNumber: "#002",
        description: "Amazing science experiments you can do at home with simple materials!",
        date: "2025-05-21",
    },
    3: {
        id: 3,
        tutorId: 3,
        videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
        title: "Physics Fundamentals",
        videoNumber: "#003",
        description: "Understanding the basics of physics through real-world examples.",
        date: "2025-05-22",
    },
    4: {
        id: 4,
        tutorId: 4,
        videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
        title: "Chemistry Reactions",
        videoNumber: "#004",
        description: "Explore fascinating chemical reactions and their applications.",
        date: "2025-05-23",
    }
};

// Initialize engagement data structures
const likes = {};
const dislikes = {};
const favorites = {};
const comments = {};
const follows = {};
const savedVideos = {};
const history = {};
const playlists = {};
const notifications = {};
const logs = {};

// Initialize data for each reel
Object.keys(reels).forEach(id => {
    likes[id] = { reelId: id, userIds: [] };
    dislikes[id] = { reelId: id, userIds: [] };
    favorites[id] = { reelId: id, userIds: [] };
    comments[id] = { reelId: id, comments: [] };
    savedVideos[id] = { reelId: id, userIds: [], playlists: {} };
    history[id] = { reelId: id, userIds: [] };
});

// Add sample comment
comments[1].comments.push({ 
    userId: 1, 
    text: "Great video! Very helpful.", 
    date: "2025-05-20" 
});

// ============================================
// STATE MANAGEMENT
// ============================================
let currentVideoIndex = 0;
let currentFilter = "all";
let filteredReelIds = Object.keys(reels).map(Number);
let searchQuery = "";
let selectedReelId = null;
let currentAdIndex = 0;
let adInterval = null;

// ============================================
// INITIALIZATION
// ============================================
function init() {
    // Hide all modals initially
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.add('hidden');
    });
    
    // Initialize core features
    updateUserProfile();
    enableCommentFunctionality();
    updateReels("all");
    updateFilterCounts();
    checkNotifications();
    setupEventListeners();
    initializeAds();
    applyTheme();
    
    // Initialize Ultimate Video Player
    initializeVideoPlayer();
}

function initializeVideoPlayer() {
    // This will be handled by the video-player-integration.js
    console.log('Video player initialization will be handled by integration script');
}

// ============================================
// USER INTERFACE FUNCTIONS
// ============================================
function updateUserProfile() {
    const profileName = document.getElementById("profile-name");
    if (profileName) {
        profileName.textContent = currentUser.name;
    }
}

function enableCommentFunctionality() {
    if (currentUser) {
        const commentInput = document.getElementById("new-comment");
        const submitButton = document.getElementById("submit-comment");
        if (commentInput) commentInput.disabled = false;
        if (submitButton) submitButton.disabled = false;
    }
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================
function setupEventListeners() {
    // Search handlers
    const navSearch = document.getElementById("nav-search-input");
    const mobileSearch = document.getElementById("mobile-search-input");
    if (navSearch) navSearch.addEventListener("input", handleSearch);
    if (mobileSearch) mobileSearch.addEventListener("input", handleSearch);
    
    // Mobile menu toggle
    const menuBtn = document.getElementById("menu-btn");
    if (menuBtn) {
        menuBtn.addEventListener("click", () => {
            const mobileMenu = document.getElementById("mobile-menu");
            const isOpen = mobileMenu.classList.contains("open");
            mobileMenu.classList.toggle("open");
            menuBtn.setAttribute("aria-expanded", !isOpen);
        });
    }
    
    // Theme toggle
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    const mobileThemeToggleBtn = document.getElementById("mobile-theme-toggle-btn");
    if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);
    if (mobileThemeToggleBtn) mobileThemeToggleBtn.addEventListener("click", toggleTheme);
    
    // Modal close handlers
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal && !modal.classList.contains('hidden')) {
                const modalId = modal.id;
                if (modalId === 'comment-modal') closeCommentModal();
                else if (modalId === 'notification-modal') closeNotificationModal();
                else if (modalId === 'playlist-modal') closePlaylistModal();
            }
        });
    });
}

// ============================================
// ADVERTISEMENT FUNCTIONS
// ============================================
function initializeAds() {
    const ads = document.querySelectorAll('.ad-slide');
    if (ads.length === 0) return;
    
    ads.forEach(ad => {
        const bg = ad.getAttribute('data-bg');
        if (bg) {
            ad.style.background = bg;
        }
    });
    
    showAd(0);
    startAdRotation();
}

function startAdRotation() {
    if (adInterval) clearInterval(adInterval);
    
    adInterval = setInterval(() => {
        currentAdIndex = (currentAdIndex + 1) % 3;
        showAd(currentAdIndex);
    }, 7000);
    
    const progress = document.querySelector('.ad-progress');
    if (progress) {
        progress.style.width = '0';
        setTimeout(() => {
            progress.style.transition = 'width 7s linear';
            progress.style.width = '100%';
        }, 100);
    }
}

function showAd(index) {
    const ads = document.querySelectorAll('.ad-slide');
    const indicators = document.querySelectorAll('.indicator');
    
    ads.forEach((ad, i) => {
        ad.classList.toggle('active', i === index);
    });
    
    indicators.forEach((indicator, i) => {
        indicator.classList.toggle('active', i === index);
    });
    
    const progress = document.querySelector('.ad-progress');
    if (progress) {
        progress.style.transition = 'none';
        progress.style.width = '0';
        setTimeout(() => {
            progress.style.transition = 'width 7s linear';
            progress.style.width = '100%';
        }, 100);
    }
    
    currentAdIndex = index;
}

// ============================================
// SEARCH AND FILTER FUNCTIONS
// ============================================
function handleSearch(e) {
    searchQuery = e.target.value.trim().toLowerCase();
    updateReels(currentFilter);
    
    // Sync search inputs
    const navSearch = document.getElementById("nav-search-input");
    const mobileSearch = document.getElementById("mobile-search-input");
    if (navSearch) navSearch.value = searchQuery;
    if (mobileSearch) mobileSearch.value = searchQuery;
}

function filterReels(filter) {
    currentFilter = filter;
    const buttons = document.querySelectorAll(".filter-btn");
    buttons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
    });
    updateReels(filter);
}

function updateFilterCounts() {
    const allCount = Object.keys(reels).length;
    const favoritesCount = Object.values(favorites).filter(f => f.userIds.includes(currentUser?.id)).length;
    const savedCount = Object.values(savedVideos).filter(s => s.userIds.includes(currentUser?.id)).length;
    const likedCount = Object.values(likes).filter(l => l.userIds.includes(currentUser?.id)).length;
    const historyCount = Object.values(history).filter(h => h.userIds.includes(currentUser?.id)).length;
    
    const updateCount = (id, count) => {
        const element = document.getElementById(id);
        if (element) element.textContent = count;
    };
    
    updateCount('all-count', allCount);
    updateCount('favorites-count', favoritesCount);
    updateCount('saved-count', savedCount);
    updateCount('liked-count', likedCount);
    updateCount('history-count', historyCount);
}

// ============================================
// REELS DISPLAY
// ============================================
function updateReels(filter) {
    const reelsGrid = document.getElementById("reels-grid");
    if (!reelsGrid) return;
    
    reelsGrid.innerHTML = "";
    let filteredReels = Object.values(reels);
    filteredReelIds = Object.keys(reels).map(Number);
    
    // Apply filters
    if (filter === "favorites") {
        filteredReels = filteredReels.filter(reel =>
            favorites[reel.id]?.userIds?.includes(currentUser?.id)
        );
        filteredReelIds = filteredReels.map(reel => reel.id);
    } else if (filter === "saved") {
        filteredReels = filteredReels.filter(reel =>
            savedVideos[reel.id]?.userIds?.includes(currentUser?.id)
        );
        filteredReelIds = filteredReels.map(reel => reel.id);
    } else if (filter === "liked") {
        filteredReels = filteredReels.filter(reel =>
            likes[reel.id]?.userIds?.includes(currentUser?.id)
        );
        filteredReelIds = filteredReels.map(reel => reel.id);
    } else if (filter === "history") {
        filteredReels = filteredReels.filter(reel =>
            history[reel.id]?.userIds?.includes(currentUser?.id)
        );
        filteredReelIds = filteredReels.map(reel => reel.id);
    }
    
    // Apply search
    if (searchQuery) {
        filteredReels = filteredReels.filter(reel => {
            const tutor = tutors[reel.tutorId];
            return (
                tutor?.name?.toLowerCase().includes(searchQuery) ||
                reel?.title?.toLowerCase().includes(searchQuery) ||
                reel?.description?.toLowerCase().includes(searchQuery) ||
                tutor?.subject?.toLowerCase().includes(searchQuery)
            );
        });
        filteredReelIds = filteredReels.map(reel => reel.id);
    }
    
    if (filteredReels.length === 0) {
        reelsGrid.innerHTML = renderEmptyState();
        return;
    }
    
    filteredReels.forEach((reel, index) => {
        const reelCard = createReelCard(reel, index);
        reelsGrid.appendChild(reelCard);
    });
    
    updateFilterCounts();
}

function renderEmptyState() {
    return `
        <div class="col-span-full empty-state">
            <svg class="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M5 12h14M3 16h4m10 0h4M8 4h8a1 1 0 011 1v14a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1z"></path>
            </svg>
            <p class="text-center text-lg opacity-70">No videos found</p>
            <p class="text-center text-sm opacity-50 mt-2">Try adjusting your filters or search query</p>
        </div>
    `;
}

function createReelCard(reel, index) {
    const tutor = tutors[reel.tutorId];
    const engagementStats = getEngagementStats(reel.id);
    
    const div = document.createElement("div");
    div.className = "reel-card";
    div.style.animationDelay = `${index * 0.1}s`;
    div.innerHTML = `
        <video class="reel-card-video" onclick="console.log('Click detected'); openVideoModal(${reel.id})">
            <source src="${reel.videoUrl}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
        <div class="p-4">
            <h3 class="text-lg font-bold mb-1" onclick="console.log('Click detected'); openVideoModal(${reel.id})">${reel.title} ${reel.videoNumber}</h3>
            <p class="text-sm mb-2 opacity-80">
                <a href="../view-profile-tier-1/view-tutor.html?tutorId=${tutor.id}" class="hover:text-[var(--nav-link-hover)] transition-colors">
                    ${tutor.name}
                </a> • ${tutor.subject}
            </p>
            <p class="text-sm mb-3 line-clamp-2">${reel.description}</p>
            <p class="text-xs mb-3 opacity-60">${reel.date}</p>
            ${renderReelActions(reel.id, engagementStats)}
        </div>
    `;
    return div;
}

function getEngagementStats(reelId) {
    return {
        likeCount: likes[reelId]?.userIds?.length || 0,
        dislikeCount: dislikes[reelId]?.userIds?.length || 0,
        commentCount: comments[reelId]?.comments?.length || 0,
        isLiked: likes[reelId]?.userIds?.includes(currentUser?.id),
        isDisliked: dislikes[reelId]?.userIds?.includes(currentUser?.id),
        isFavorite: favorites[reelId]?.userIds?.includes(currentUser?.id),
        isSaved: savedVideos[reelId]?.userIds?.includes(currentUser?.id),
        isFollowed: follows[reels[reelId].tutorId]?.userIds?.includes(currentUser?.id)
    };
}

function renderReelActions(reelId, stats) {
    return `
        <div class="reel-actions">
            <button class="action-btn favorite-btn ${stats.isFavorite ? "active" : ""}" 
                onclick="toggleFavorite(${reelId})" ${!currentUser ? "disabled" : ""}>
                <svg class="w-4 h-4" fill="${stats.isFavorite ? "currentColor" : "none"}" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                </svg>
                <span>Favorite</span>
            </button>
            <button class="action-btn ${stats.isLiked ? "active" : ""}" 
                onclick="toggleLike(${reelId})" ${!currentUser ? "disabled" : ""}>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                </svg>
                <span>${stats.likeCount}</span>
            </button>
            <button class="action-btn ${stats.isDisliked ? "active" : ""}" 
                onclick="toggleDislike(${reelId})" ${!currentUser ? "disabled" : ""}>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
                <span>${stats.dislikeCount}</span>
            </button>
            <button class="action-btn" onclick="openCommentModal(${reelId})">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.05M12 10h.05M16 10h.05M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                </svg>
                <span>${stats.commentCount}</span>
            </button>
            <button class="action-btn" onclick="shareReel(${reelId})">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                </svg>
            </button>
            <button class="action-btn ${stats.isSaved ? "active" : ""}" 
                onclick="openPlaylistModal(${reelId})" ${!currentUser ? "disabled" : ""}>
                <svg class="w-4 h-4" fill="${stats.isSaved ? "currentColor" : "none"}" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                </svg>
            </button>
            <button class="action-btn ${stats.isFollowed ? "active" : ""}" 
                onclick="toggleFollow(${reels[reelId].tutorId})" ${!currentUser ? "disabled" : ""}>
                <span>${stats.isFollowed ? "Following" : "Follow"}</span>
            </button>
        </div>
    `;
}


// Improved handleNavLinkClick function for coming soon features
window.handleNavLinkClick = function(e, link) {
    // Define coming soon features
    const comingSoonFeatures = ['news', 'store', 'find-jobs'];
    
    // Check if it's a coming soon feature
    if (comingSoonFeatures.includes(link)) {
        e.preventDefault();
        e.stopPropagation();
        openComingSoonModal(link);
        return false;
    }
    
    // Existing protected pages logic
    if (APP_STATE.isLoggedIn) return true;
    
    const protectedPages = ['find-tutors', 'reels'];
    if (protectedPages.includes(link)) {
        e.preventDefault();
        e.stopPropagation();
        showToast(`Please login to access ${link.replace("-", " ")}`, "warning");
        openModal("login-modal");
        return false;
    }
    
    return true;
};


// ============================================
// ENGAGEMENT ACTIONS
// ============================================
function toggleFavorite(reelId) {
    if (!favorites[reelId]) favorites[reelId] = { reelId, userIds: [] };
    const userId = currentUser.id;
    const isFavorite = favorites[reelId].userIds.includes(userId);
    
    if (isFavorite) {
        favorites[reelId].userIds = favorites[reelId].userIds.filter(id => id !== userId);
    } else {
        favorites[reelId].userIds.push(userId);
    }
    
    logAction(`${isFavorite ? "Unfavorited" : "Favorited"} reel ${reelId}`);
    updateReels(currentFilter);
}

function toggleLike(reelId) {
    if (!likes[reelId]) likes[reelId] = { reelId, userIds: [] };
    const userId = currentUser.id;
    const isLiked = likes[reelId].userIds.includes(userId);
    
    if (isLiked) {
        likes[reelId].userIds = likes[reelId].userIds.filter(id => id !== userId);
    } else {
        likes[reelId].userIds.push(userId);
        // Remove dislike if exists
        if (dislikes[reelId]?.userIds.includes(userId)) {
            dislikes[reelId].userIds = dislikes[reelId].userIds.filter(id => id !== userId);
        }
    }
    
    logAction(`${isLiked ? "Unliked" : "Liked"} reel ${reelId}`);
    updateReels(currentFilter);
}

function toggleDislike(reelId) {
    if (!dislikes[reelId]) dislikes[reelId] = { reelId, userIds: [] };
    const userId = currentUser.id;
    const isDisliked = dislikes[reelId].userIds.includes(userId);
    
    if (isDisliked) {
        dislikes[reelId].userIds = dislikes[reelId].userIds.filter(id => id !== userId);
    } else {
        dislikes[reelId].userIds.push(userId);
        // Remove like if exists
        if (likes[reelId]?.userIds.includes(userId)) {
            likes[reelId].userIds = likes[reelId].userIds.filter(id => id !== userId);
        }
    }
    
    logAction(`${isDisliked ? "Undisliked" : "Disliked"} reel ${reelId}`);
    updateReels(currentFilter);
}

function toggleFollow(tutorId) {
    if (!follows[tutorId]) follows[tutorId] = { tutorId, userIds: [] };
    const userId = currentUser.id;
    const isFollowed = follows[tutorId].userIds.includes(userId);
    
    if (isFollowed) {
        follows[tutorId].userIds = follows[tutorId].userIds.filter(id => id !== userId);
    } else {
        follows[tutorId].userIds.push(userId);
    }
    
    logAction(`${isFollowed ? "Unfollowed" : "Followed"} tutor ${tutorId}`);
    updateReels(currentFilter);
}

function shareReel(reelId) {
    const reel = reels[reelId];
    const url = `https://astegni.netlify.app/reel/${reelId}`;
    
    if (navigator.share) {
        navigator.share({
            title: reel.title,
            text: reel.description,
            url: url
        }).catch(() => {
            copyToClipboard(url);
        });
    } else {
        copyToClipboard(url);
    }
    
    logAction(`Shared reel ${reelId}`);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("Link copied to clipboard!");
    }).catch(() => {
        showToast("Failed to copy link", "error");
    });
}

// ============================================
// COMMENT MANAGEMENT
// ============================================
function openCommentModal(reelId) {
    selectedReelId = reelId;
    updateCommentList();
    const modal = document.getElementById("comment-modal");
    if (modal) {
        modal.classList.remove("hidden");
    }
}

function closeCommentModal() {
    const modal = document.getElementById("comment-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
    selectedReelId = null;
}

function updateCommentList() {
    const commentList = document.getElementById("comment-list");
    if (!commentList) return;
    
    const reelComments = comments[selectedReelId]?.comments || [];
    
    if (reelComments.length === 0) {
        commentList.innerHTML = `
            <div class="empty-state">
                <p class="text-center opacity-60">No comments yet. Be the first to comment!</p>
            </div>
        `;
        return;
    }
    
    commentList.innerHTML = reelComments.map(comment => `
        <div class="comment-item">
            <p>${comment.text}</p>
            <p class="text-xs opacity-60 mt-1">User ${comment.userId} • ${comment.date}</p>
        </div>
    `).join('');
}

function addComment() {
    const textInput = document.getElementById("new-comment");
    if (!textInput) return;
    
    const text = textInput.value.trim();
    if (!text) {
        alert("Please enter a comment");
        return;
    }
    
    if (!comments[selectedReelId]) {
        comments[selectedReelId] = { reelId: selectedReelId, comments: [] };
    }
    
    comments[selectedReelId].comments.push({
        userId: currentUser.id,
        text: text,
        date: new Date().toISOString().split("T")[0],
    });
    
    logAction(`Commented on reel ${selectedReelId}: ${text}`);
    updateCommentList();
    textInput.value = "";
    updateReels(currentFilter);
}

// ============================================
// PLAYLIST MANAGEMENT
// ============================================
function openPlaylistModal(reelId) {
    selectedReelId = reelId;
    updatePlaylistList();
    const modal = document.getElementById("playlist-modal");
    if (modal) {
        modal.classList.remove("hidden");
    }
}

function closePlaylistModal() {
    const modal = document.getElementById("playlist-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
    selectedReelId = null;
}

function createPlaylist() {
    const nameInput = document.getElementById("new-playlist-name");
    if (!nameInput) return;
    
    const playlistName = nameInput.value.trim();
    if (!playlistName) {
        showToast("Please enter a playlist name", "error");
        return;
    }
    
    const playlistId = Object.keys(playlists).length + 1;
    playlists[playlistId] = {
        id: playlistId,
        name: playlistName,
        reelIds: [selectedReelId],
    };
    
    if (!savedVideos[selectedReelId]) {
        savedVideos[selectedReelId] = { reelId: selectedReelId, userIds: [], playlists: {} };
    }
    
    savedVideos[selectedReelId].playlists[playlistId] = true;
    if (!savedVideos[selectedReelId].userIds.includes(currentUser.id)) {
        savedVideos[selectedReelId].userIds.push(currentUser.id);
    }
    
    logAction(`Created playlist ${playlistName} with reel ${selectedReelId}`);
    showToast(`Playlist "${playlistName}" created!`);
    updatePlaylistList();
    nameInput.value = "";
    updateReels(currentFilter);
}

function updatePlaylistList() {
    const playlistList = document.getElementById("existing-playlists");
    if (!playlistList) return;
    
    if (Object.keys(playlists).length === 0) {
        playlistList.innerHTML = `
            <div class="empty-state">
                <p class="text-center opacity-60">No playlists yet. Create your first playlist above!</p>
            </div>
        `;
        return;
    }
    
    playlistList.innerHTML = Object.values(playlists).map(playlist => {
        const isInPlaylist = playlist.reelIds.includes(selectedReelId);
        return `
            <div class="playlist-item">
                <input type="checkbox" id="playlist-${playlist.id}" ${isInPlaylist ? "checked" : ""} 
                    class="mr-3" onchange="togglePlaylist(${playlist.id}, ${selectedReelId})">
                <label for="playlist-${playlist.id}" class="flex-1 cursor-pointer">${playlist.name}</label>
                <span class="text-xs opacity-60">${playlist.reelIds.length} videos</span>
            </div>
        `;
    }).join('');
}

function togglePlaylist(playlistId, reelId) {
    const playlist = playlists[playlistId];
    if (!playlist) return;
    
    const isInPlaylist = playlist.reelIds.includes(reelId);
    
    if (isInPlaylist) {
        playlist.reelIds = playlist.reelIds.filter(id => id !== reelId);
        delete savedVideos[reelId].playlists[playlistId];
        
        if (Object.keys(savedVideos[reelId].playlists).length === 0) {
            savedVideos[reelId].userIds = savedVideos[reelId].userIds.filter(id => id !== currentUser.id);
        }
        showToast(`Removed from "${playlist.name}"`);
    } else {
        playlist.reelIds.push(reelId);
        
        if (!savedVideos[reelId]) {
            savedVideos[reelId] = { reelId, userIds: [], playlists: {} };
        }
        
        savedVideos[reelId].playlists[playlistId] = true;
        
        if (!savedVideos[reelId].userIds.includes(currentUser.id)) {
            savedVideos[reelId].userIds.push(currentUser.id);
        }
        showToast(`Added to "${playlist.name}"`);
    }
    
    logAction(`${isInPlaylist ? "Removed" : "Added"} reel ${reelId} ${isInPlaylist ? "from" : "to"} playlist ${playlist.name}`);
    updateReels(currentFilter);
}

// ============================================
// NOTIFICATION MANAGEMENT
// ============================================
function checkNotifications() {
    const hasNotifications = Object.values(notifications).length > 0;
    const notificationDot = document.getElementById("notification-dot");
    const mobileNotificationDot = document.getElementById("mobile-notification-dot");
    
    if (notificationDot) notificationDot.classList.toggle("hidden", !hasNotifications);
    if (mobileNotificationDot) mobileNotificationDot.classList.toggle("hidden", !hasNotifications);
}

function openNotificationModal() {
    const notificationContent = document.getElementById("notification-content");
    const notificationList = Object.values(notifications);
    
    if (notificationContent) {
        if (notificationList.length === 0) {
            notificationContent.innerHTML = `
                <div class="empty-state">
                    <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9"></path>
                    </svg>
                    <p class="text-center opacity-70">No new notifications</p>
                </div>
            `;
        } else {
            notificationContent.innerHTML = notificationList.map(n => `
                <div class="notification-item">
                    <p>${n.message}</p>
                    <p class="text-xs opacity-60 mt-1">${n.date}</p>
                </div>
            `).join("");
        }
    }
    
    const modal = document.getElementById("notification-modal");
    if (modal) {
        modal.classList.remove("hidden");
    }
}

function closeNotificationModal() {
    const modal = document.getElementById("notification-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up ${
        type === "success" ? "bg-green-500" : "bg-red-500"
    } text-white`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = "slideDown 0.3s ease-out";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function logAction(action) {
    const logId = Object.keys(logs).length + 1;
    logs[logId] = {
        id: logId,
        action,
        userId: currentUser.id,
        user: currentUser.email,
        timestamp: new Date().toISOString(),
    };
    console.log(`[LOG] ${action}`);
}

// ============================================
// FOOTER FUNCTIONS (Placeholder)
// ============================================
function openLoginRegisterModal() {
    showToast("Login/Register feature coming soon!");
    logAction("Opened login/register modal");
}

function openAdvertiseModal() {
    showToast("Advertise feature coming soon!");
    logAction("Opened advertise modal");
}

// ============================================
// INITIALIZE ON DOM LOAD
// ============================================
document.addEventListener("DOMContentLoaded", init);

// ============================================
// EXPORT GLOBAL FUNCTIONS FOR INTEGRATION
// ============================================
window.toggleTheme = toggleTheme;
window.filterReels = filterReels;
window.toggleFavorite = toggleFavorite;
window.toggleLike = toggleLike;
window.toggleDislike = toggleDislike;
window.toggleFollow = toggleFollow;
window.shareReel = shareReel;
window.openCommentModal = openCommentModal;
window.closeCommentModal = closeCommentModal;
window.addComment = addComment;
window.openPlaylistModal = openPlaylistModal;
window.closePlaylistModal = closePlaylistModal;
window.createPlaylist = createPlaylist;
window.togglePlaylist = togglePlaylist;
window.openNotificationModal = openNotificationModal;
window.closeNotificationModal = closeNotificationModal;
window.updateReels = updateReels;
window.updateFilterCounts = updateFilterCounts;

// These will be overridden by the video-player-integration.js
window.openVideoModal = function(reelId) {
    console.log('openVideoModal will be handled by video player integration');
};