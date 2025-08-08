// Ultimate Enhanced Reels JavaScript

// Theme Toggle
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

// Data Objects
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

// Initialize all data structures
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
comments[1].comments.push({ userId: 1, text: "Great video! Very helpful.", date: "2025-05-20" });

// Video Navigation State
let currentVideoIndex = 0;
let currentFilter = "all";
let filteredReelIds = Object.keys(reels).map(Number);
let searchQuery = "";
let selectedReelId = null;
let currentAdIndex = 0;
let adInterval = null;

// Initialize
function init() {
    updateUserProfile();
    enableCommentFunctionality();
    updateReels("all");
    updateFilterCounts();
    checkNotifications();
    setupEventListeners();
    setupKeyboardNavigation();
    initializeAds();
    applyTheme();
}

// Apply saved theme
function applyTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeToggleIcon(savedTheme);
}

// Update User Profile
function updateUserProfile() {
    const profileName = document.getElementById("profile-name");
    if (profileName) {
        profileName.textContent = currentUser.name;
    }
}

// Enable Comment Functionality
function enableCommentFunctionality() {
    if (currentUser) {
        const commentInput = document.getElementById("new-comment");
        const submitButton = document.getElementById("submit-comment");
        if (commentInput) commentInput.disabled = false;
        if (submitButton) submitButton.disabled = false;
    }
}

// Setup Event Listeners
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
    
    // Close modals on outside click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                const modalId = modal.id;
                if (modalId === 'comment-modal') closeCommentModal();
                else if (modalId === 'notification-modal') closeNotificationModal();
                else if (modalId === 'playlist-modal') closePlaylistModal();
            }
        });
    });
    
    // Video modal outside click
    const videoModal = document.getElementById('video-modal');
    if (videoModal) {
        videoModal.addEventListener('click', (e) => {
            if (e.target === videoModal) {
                closeVideoModal();
            }
        });
    }
}

// Setup Keyboard Navigation
function setupKeyboardNavigation() {
    document.addEventListener("keydown", (e) => {
        const videoModal = document.getElementById("video-modal");
        if (!videoModal || videoModal.classList.contains("hidden")) return;
        
        if (e.key === "ArrowUp") {
            e.preventDefault();
            navigateVideo("prev");
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            navigateVideo("next");
        } else if (e.key === "Escape") {
            closeVideoModal();
        }
    });
}

// Initialize Enhanced Ads
function initializeAds() {
    const ads = document.querySelectorAll('.ad-slide');
    if (ads.length === 0) return;
    
    // Set background gradients
    ads.forEach(ad => {
        const bg = ad.getAttribute('data-bg');
        if (bg) ad.style.background = bg;
    });
    
    // Start ad rotation
    startAdRotation();
}

function startAdRotation() {
    if (adInterval) clearInterval(adInterval);
    
    adInterval = setInterval(() => {
        currentAdIndex = (currentAdIndex + 1) % 3;
        showAd(currentAdIndex);
    }, 7000);
    
    // Start progress animation
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
    
    // Reset progress bar
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

// Search Handler
function handleSearch(e) {
    searchQuery = e.target.value.trim().toLowerCase();
    updateReels(currentFilter);
    
    // Sync search inputs
    const navSearch = document.getElementById("nav-search-input");
    const mobileSearch = document.getElementById("mobile-search-input");
    if (navSearch) navSearch.value = searchQuery;
    if (mobileSearch) mobileSearch.value = searchQuery;
}

// Filter Reels
function filterReels(filter) {
    currentFilter = filter;
    const buttons = document.querySelectorAll(".filter-btn");
    buttons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
    });
    updateReels(filter);
}

// Update Filter Counts
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

// Update Reels Grid
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
        reelsGrid.innerHTML = `
            <div class="col-span-full empty-state">
                <svg class="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M5 12h14M3 16h4m10 0h4M8 4h8a1 1 0 011 1v14a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1z"></path>
                </svg>
                <p class="text-center text-lg opacity-70">No videos found</p>
                <p class="text-center text-sm opacity-50 mt-2">Try adjusting your filters or search query</p>
            </div>
        `;
        return;
    }
    
    filteredReels.forEach((reel, index) => {
        const tutor = tutors[reel.tutorId];
        const likeCount = likes[reel.id]?.userIds?.length || 0;
        const dislikeCount = dislikes[reel.id]?.userIds?.length || 0;
        const commentCount = comments[reel.id]?.comments?.length || 0;
        const isLiked = likes[reel.id]?.userIds?.includes(currentUser?.id);
        const isDisliked = dislikes[reel.id]?.userIds?.includes(currentUser?.id);
        const isFavorite = favorites[reel.id]?.userIds?.includes(currentUser?.id);
        const isSaved = savedVideos[reel.id]?.userIds?.includes(currentUser?.id);
        const isFollowed = follows[reel.tutorId]?.userIds?.includes(currentUser?.id);
        
        const div = document.createElement("div");
        div.className = "reel-card";
        div.style.animationDelay = `${index * 0.1}s`;
        div.innerHTML = `
            <video class="reel-card-video" onclick="openVideoModal(${reel.id})">
                <source src="${reel.videoUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
            <div class="p-4">
                <h3 class="text-lg font-bold mb-1">${reel.title} ${reel.videoNumber}</h3>
                <p class="text-sm mb-2 opacity-80">
                    <a href="view-tutor.html?tutorId=${tutor.id}" class="hover:text-[var(--nav-link-hover)] transition-colors">
                        ${tutor.name}
                    </a> • ${tutor.subject}
                </p>
                <p class="text-sm mb-3 line-clamp-2">${reel.description}</p>
                <p class="text-xs mb-3 opacity-60">${reel.date}</p>
                <div class="reel-actions">
                    <button class="action-btn favorite-btn ${isFavorite ? "active" : ""}" 
                        onclick="toggleFavorite(${reel.id})" ${!currentUser ? "disabled" : ""}>
                        <svg class="w-4 h-4" fill="${isFavorite ? "currentColor" : "none"}" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                        </svg>
                        <span>Favorite</span>
                    </button>
                    <button class="action-btn ${isLiked ? "active" : ""}" 
                        onclick="toggleLike(${reel.id})" ${!currentUser ? "disabled" : ""}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                        </svg>
                        <span>${likeCount}</span>
                    </button>
                    <button class="action-btn ${isDisliked ? "active" : ""}" 
                        onclick="toggleDislike(${reel.id})" ${!currentUser ? "disabled" : ""}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                        <span>${dislikeCount}</span>
                    </button>
                    <button class="action-btn" onclick="openCommentModal(${reel.id})">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.05M12 10h.05M16 10h.05M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                        </svg>
                        <span>${commentCount}</span>
                    </button>
                    <button class="action-btn" onclick="shareReel(${reel.id})">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                        </svg>
                    </button>
                    <button class="action-btn ${isSaved ? "active" : ""}" 
                        onclick="openPlaylistModal(${reel.id})" ${!currentUser ? "disabled" : ""}>
                        <svg class="w-4 h-4" fill="${isSaved ? "currentColor" : "none"}" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                        </svg>
                    </button>
                    <button class="action-btn ${isFollowed ? "active" : ""}" 
                        onclick="toggleFollow(${reel.tutorId})" ${!currentUser ? "disabled" : ""}>
                        <span>${isFollowed ? "Following" : "Follow"}</span>
                    </button>
                </div>
            </div>
        `;
        reelsGrid.appendChild(div);
    });
    
    updateFilterCounts();
}

// Toggle Favorite
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
    updateVideoModalIfOpen();
}

// Toggle Like
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
    updateVideoModalIfOpen();
}

// Toggle Dislike
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
    updateVideoModalIfOpen();
}

// Toggle Follow
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
    updateVideoModalIfOpen();
}

// Open Video Modal
function openVideoModal(reelId) {
    currentVideoIndex = filteredReelIds.indexOf(reelId);
    updateVideoModal(reelId);
    
    const modal = document.getElementById("video-modal");
    if (modal) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }
    
    // Track history
    if (!history[reelId]) history[reelId] = { reelId, userIds: [] };
    if (!history[reelId].userIds.includes(currentUser.id)) {
        history[reelId].userIds.push(currentUser.id);
        logAction(`Viewed reel ${reelId}`);
        updateFilterCounts();
    }
}

// Update Video Modal
function updateVideoModal(reelId) {
    const reel = reels[reelId];
    if (!reel) return;
    
    const tutor = tutors[reel.tutorId];
    const likeCount = likes[reelId]?.userIds?.length || 0;
    const dislikeCount = dislikes[reelId]?.userIds?.length || 0;
    const commentCount = comments[reelId]?.comments?.length || 0;
    const isLiked = likes[reelId]?.userIds?.includes(currentUser?.id);
    const isDisliked = dislikes[reelId]?.userIds?.includes(currentUser?.id);
    const isFavorite = favorites[reelId]?.userIds?.includes(currentUser?.id);
    const isSaved = savedVideos[reelId]?.userIds?.includes(currentUser?.id);
    const isFollowed = follows[reel.tutorId]?.userIds?.includes(currentUser?.id);
    
    // Update video source
    const modalVideo = document.getElementById("modal-video");
    if (modalVideo) {
        modalVideo.src = reel.videoUrl;
        modalVideo.load();
        modalVideo.play().catch(e => console.log("Autoplay prevented:", e));
    }
    
    // Update sidebar content
    const sidebarContent = document.getElementById("video-sidebar-content");
    if (sidebarContent) {
        sidebarContent.innerHTML = `
            <div class="mb-4">
                <h2 class="text-2xl font-bold mb-2">${reel.title} ${reel.videoNumber}</h2>
                <div class="flex items-center justify-between mb-3">
                    <div>
                        <a href="view-tutor.html?tutorId=${tutor.id}" class="text-sm hover:text-[var(--nav-link-hover)] transition-colors">
                            ${tutor.name}
                        </a>
                        <span class="text-sm opacity-70"> • ${tutor.subject}</span>
                    </div>
                    <button class="follow-icon-btn ${isFollowed ? "following" : ""}" 
                        onclick="toggleFollow(${reel.tutorId})" ${!currentUser ? "disabled" : ""}>
                        <svg class="w-5 h-5" fill="${isFollowed ? "currentColor" : "none"}" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9m-3 3a3 3 0 01-3-3V4a3 3 0 116 0v5a3 3 0 01-3 3zm-3 10v-8a3 3 0 00-3-3H8a3 3 0 00-3 3v8m11 0H5"></path>
                        </svg>
                    </button>
                </div>
                <p class="text-sm opacity-60 mb-3">${reel.date}</p>
                <p class="mb-4">${reel.description}</p>
            </div>
            
            <div class="video-engagement-bar">
                <button class="engagement-btn like-btn ${isLiked ? "active" : ""}" 
                    onclick="toggleLike(${reelId})" ${!currentUser ? "disabled" : ""}>
                    <svg class="engagement-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                    </svg>
                    <span class="engagement-count">${likeCount}</span>
                </button>
                <button class="engagement-btn dislike-btn ${isDisliked ? "active" : ""}" 
                    onclick="toggleDislike(${reelId})" ${!currentUser ? "disabled" : ""}>
                    <svg class="engagement-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                    <span class="engagement-count">${dislikeCount}</span>
                </button>
                <button class="engagement-btn favorite-btn ${isFavorite ? "active" : ""}" 
                    onclick="toggleFavorite(${reelId})" ${!currentUser ? "disabled" : ""}>
                    <svg class="engagement-icon" fill="${isFavorite ? "currentColor" : "none"}" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                    </svg>
                    <span class="engagement-count">Fav</span>
                </button>
                <button class="engagement-btn" onclick="openCommentModal(${reelId})">
                    <svg class="engagement-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.05M12 10h.05M16 10h.05M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                    </svg>
                    <span class="engagement-count">${commentCount}</span>
                </button>
                <button class="engagement-btn" onclick="shareReel(${reelId})">
                    <svg class="engagement-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                    </svg>
                    <span class="engagement-count">Share</span>
                </button>
                <button class="engagement-btn ${isSaved ? "active" : ""}" 
                    onclick="openPlaylistModal(${reelId})" ${!currentUser ? "disabled" : ""}>
                    <svg class="engagement-icon" fill="${isSaved ? "currentColor" : "none"}" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                    </svg>
                    <span class="engagement-count">Save</span>
                </button>
            </div>
            
            <div class="comment-section">
                <h3 class="font-semibold mb-3">Comments</h3>
                <div class="comment-list">
                    ${getCommentsHTML(reelId)}
                </div>
                <button onclick="openCommentModal(${reelId})" class="text-sm text-[var(--button-bg)] hover:underline mt-2">
                    View all comments
                </button>
            </div>
        `;
    }
    
    updateVideoNavigation();
}

// Get Comments HTML
function getCommentsHTML(reelId) {
    const reelComments = comments[reelId]?.comments || [];
    if (reelComments.length === 0) {
        return '<p class="text-sm opacity-60">No comments yet. Be the first!</p>';
    }
    
    return reelComments.slice(0, 3).map(comment => `
        <div class="comment-item">
            <p class="text-sm">${comment.text}</p>
            <p class="text-xs opacity-60 mt-1">User ${comment.userId} • ${comment.date}</p>
        </div>
    `).join('');
}

// Update Video Modal If Open
function updateVideoModalIfOpen() {
    const videoModal = document.getElementById("video-modal");
    if (videoModal && !videoModal.classList.contains("hidden")) {
        updateVideoModal(filteredReelIds[currentVideoIndex]);
    }
}

// Close Video Modal
function closeVideoModal() {
    const modal = document.getElementById("video-modal");
    if (modal) {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
    }
    
    const modalVideo = document.getElementById("modal-video");
    if (modalVideo) {
        modalVideo.pause();
    }
}

// Update Video Navigation
function updateVideoNavigation() {
    const prevBtn = document.getElementById("prev-video-btn");
    const nextBtn = document.getElementById("next-video-btn");
    if (prevBtn) prevBtn.disabled = currentVideoIndex === 0;
    if (nextBtn) nextBtn.disabled = currentVideoIndex === filteredReelIds.length - 1;
}

// Navigate Video
function navigateVideo(direction) {
    if (direction === "prev" && currentVideoIndex > 0) {
        currentVideoIndex--;
    } else if (direction === "next" && currentVideoIndex < filteredReelIds.length - 1) {
        currentVideoIndex++;
    }
    
    const newReelId = filteredReelIds[currentVideoIndex];
    updateVideoModal(newReelId);
    
    // Track history
    if (!history[newReelId]) history[newReelId] = { reelId: newReelId, userIds: [] };
    if (!history[newReelId].userIds.includes(currentUser?.id)) {
        history[newReelId].userIds.push(currentUser?.id);
        logAction(`Viewed reel ${newReelId}`);
        updateFilterCounts();
    }
}

// Open Comment Modal
function openCommentModal(reelId) {
    selectedReelId = reelId;
    updateCommentList();
    const modal = document.getElementById("comment-modal");
    if (modal) modal.classList.remove("hidden");
}

// Close Comment Modal
function closeCommentModal() {
    const modal = document.getElementById("comment-modal");
    if (modal) modal.classList.add("hidden");
    selectedReelId = null;
}

// Update Comment List
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

// Add Comment
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
    updateVideoModalIfOpen();
}

// Share Reel
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

// Show Toast Notification
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

// Open Playlist Modal
function openPlaylistModal(reelId) {
    selectedReelId = reelId;
    updatePlaylistList();
    const modal = document.getElementById("playlist-modal");
    if (modal) modal.classList.remove("hidden");
}

// Close Playlist Modal
function closePlaylistModal() {
    const modal = document.getElementById("playlist-modal");
    if (modal) modal.classList.add("hidden");
    selectedReelId = null;
}

// Create Playlist
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
    updateVideoModalIfOpen();
}

// Update Playlist List
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

// Toggle Playlist
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
    updateVideoModalIfOpen();
}

// Notification Functions
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
    if (modal) modal.classList.remove("hidden");
}

function closeNotificationModal() {
    const modal = document.getElementById("notification-modal");
    if (modal) modal.classList.add("hidden");
}

// Footer Functions
function openLoginRegisterModal() {
    showToast("Login/Register feature coming soon!");
    logAction("Opened login/register modal");
}

function openAdvertiseModal() {
    showToast("Advertise feature coming soon!");
    logAction("Opened advertise modal");
}

// Logging
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

// Initialize on DOM Load
document.addEventListener("DOMContentLoaded", init);