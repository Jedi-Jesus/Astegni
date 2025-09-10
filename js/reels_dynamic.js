// ============================================
// DYNAMIC REELS JAVASCRIPT - BACKEND INTEGRATED
// Replace the hardcoded data with API calls
// ============================================

// ============================================
// API CONFIGURATION
// ============================================
const API_BASE_URL = 'http://localhost:8000/api';

// API Helper Functions
const ApiService = {
    // Get auth token from localStorage
// In ApiService object
getToken() {
    // Check both possible storage keys
    return localStorage.getItem('access_token') || localStorage.getItem('token');
},

    // Build headers with auth
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (includeAuth && this.getToken()) {
            headers['Authorization'] = `Bearer ${this.getToken()}`;
        }
        
        return headers;
    },

    // Generic fetch wrapper with error handling
    // Update the ApiService.fetch method:
async fetch(url, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers: this.getHeaders(options.includeAuth !== false),
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired or missing
                const refreshed = await this.refreshToken();
                if (!refreshed) {
                    // Can't refresh, redirect to login
                    window.location.href = '../index.html';
                    return;
                }
                // Retry the request with new token
                return this.fetch(url, options);
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
},

    // Refresh token
    async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
        return false;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Token refresh failed:', error);
        return false;
    }
}
};

// ============================================
// VIDEO API CALLS
// ============================================
const VideoAPI = {
    // In VideoAPI object, update the getReels function:
async getReels(filter = 'all', search = '', limit = 20, offset = 0) {
    const params = new URLSearchParams({
        filter,
        limit,
        offset
    });
    
    if (search) params.append('search', search);
    
    try {
        // CHANGED: Use ApiService.fetch instead of direct fetch to include auth
        const response = await ApiService.fetch(`/videos/reels?${params}`);
        return response;
    } catch (error) {
        console.error('Error fetching reels:', error);
        // If auth fails, return empty array instead of crashing
        return [];
    }
},

    // Get single reel details
    async getReel(reelId) {
        return ApiService.fetch(`/videos/reels/${reelId}`, { includeAuth: false });
    },

    // Toggle engagement (like, dislike, favorite, save)
    async toggleEngagement(reelId, engagementType) {
        return ApiService.fetch(`/videos/reels/${reelId}/engage`, {
            method: 'POST',
            body: JSON.stringify({ engagement_type: engagementType })
        });
    },

    // Get comments
    async getComments(reelId) {
        return ApiService.fetch(`/videos/reels/${reelId}/comments`, { includeAuth: false });
    },

    // Add comment
    async addComment(reelId, text, parentCommentId = null) {
        return ApiService.fetch(`/videos/reels/${reelId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ text, parent_comment_id: parentCommentId })
        });
    },

    // Follow/unfollow tutor
    async toggleFollow(tutorId) {
        return ApiService.fetch(`/videos/tutors/${tutorId}/follow`, {
            method: 'POST'
        });
    },

    // Get user playlists
    async getPlaylists() {
        return ApiService.fetch('/videos/playlists');
    },

    // Create playlist
    async createPlaylist(name, description = '') {
        return ApiService.fetch('/videos/playlists', {
            method: 'POST',
            body: JSON.stringify({ name, description, is_public: true })
        });
    },

    // Add to playlist
    async addToPlaylist(playlistId, videoId) {
        return ApiService.fetch(`/videos/playlists/${playlistId}/videos`, {
            method: 'POST',
            body: JSON.stringify({ video_id: videoId })
        });
    }
};

// ============================================
// STATE MANAGEMENT
// ============================================
let currentVideoIndex = 0;
let currentFilter = "all";
let searchQuery = "";
let selectedReelId = null;
let currentReels = [];
let currentUser = null;

// ============================================
// INITIALIZATION
// ============================================
async function initDynamic() {
    // Check authentication
    await checkAuth();
    
    // Initialize UI
    updateUserProfile();
    applyTheme();
    setupEventListeners();
    
    // Load initial reels
    await loadReels();
    
    // Initialize other features
    checkNotifications();
    initializeAds();
}

async function checkAuth() {
    const token = localStorage.getItem('access_token');
    if (token) {
        try {
            const response = await fetch(`${API_BASE_URL}/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                currentUser = await response.json();
                enableAuthFeatures();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }
}

function enableAuthFeatures() {
    // Enable comment input
    const commentInput = document.getElementById("new-comment");
    const submitButton = document.getElementById("submit-comment");
    if (commentInput) commentInput.disabled = false;
    if (submitButton) submitButton.disabled = false;
    
    // Show profile
    const profileContainer = document.getElementById('profile-container');
    if (profileContainer && currentUser) {
        profileContainer.classList.remove('hidden');
        
        // Update profile info
        const profilePic = document.getElementById('profile-pic');
        const profileName = document.getElementById('profile-name');
        if (profilePic && currentUser.profile_picture) {
            profilePic.src = currentUser.profile_picture;
        }
        if (profileName) {
            profileName.textContent = currentUser.first_name;
        }
    }
}

// ============================================
// LOAD AND DISPLAY REELS
// ============================================
async function loadReels() {
    showLoadingState();
    
    try {
        const reels = await VideoAPI.getReels(currentFilter, searchQuery);
        currentReels = reels;
        displayReels(reels);
        updateFilterCounts();
    } catch (error) {
        console.error('Error loading reels:', error);
        showErrorState();
    }
}

function displayReels(reels) {
    const reelsGrid = document.getElementById("reels-grid");
    if (!reelsGrid) return;
    
    if (reels.length === 0) {
        reelsGrid.innerHTML = renderEmptyState();
        return;
    }
    
    reelsGrid.innerHTML = '';
    reels.forEach((reel, index) => {
        const reelCard = createReelCard(reel, index);
        reelsGrid.appendChild(reelCard);
    });
}

function createReelCard(reel, index) {
    const div = document.createElement("div");
    div.className = "reel-card";
    div.style.animationDelay = `${index * 0.1}s`;
    
    const uploadDate = new Date(reel.upload_date).toLocaleDateString();
    
    div.innerHTML = `
        <video class="reel-card-video" onclick="openVideoModal(${reel.id})">
            <source src="${reel.video_url}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
        <div class="p-4">
            <h3 class="text-lg font-bold mb-1" onclick="openVideoModal(${reel.id})">
                ${reel.title} ${reel.video_number || ''}
            </h3>
            <p class="text-sm mb-2 opacity-80">
                <a href="../view-profile-tier-1/view-tutor.html?tutorId=${reel.tutor_id}" 
                   class="hover:text-[var(--nav-link-hover)] transition-colors">
                    ${reel.tutor_name}
                </a> • ${reel.tutor_subject || reel.subject || ''}
            </p>
            <p class="text-sm mb-3 line-clamp-2">${reel.description || ''}</p>
            <div class="flex justify-between items-center mb-3">
                <p class="text-xs opacity-60">${uploadDate}</p>
                <p class="text-xs opacity-60">${reel.views} views</p>
            </div>
            ${renderReelActions(reel)}
        </div>
    `;
    return div;
}

function renderReelActions(reel) {
    const stats = reel.engagement_stats || {};
    const isAuthenticated = !!currentUser;
    
    return `
        <div class="reel-actions">
            <button class="action-btn favorite-btn ${stats.user_favorited ? "active" : ""}" 
                onclick="toggleEngagement(${reel.id}, 'favorite')" 
                ${!isAuthenticated ? "disabled" : ""}>
                <svg class="w-4 h-4" fill="${stats.user_favorited ? "currentColor" : "none"}" 
                     stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z">
                    </path>
                </svg>
                <span>${stats.favorites || 0}</span>
            </button>
            <button class="action-btn ${stats.user_liked ? "active" : ""}" 
                onclick="toggleEngagement(${reel.id}, 'like')" 
                ${!isAuthenticated ? "disabled" : ""}>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M5 15l7-7 7 7"></path>
                </svg>
                <span>${stats.likes || 0}</span>
            </button>
            <button class="action-btn ${stats.user_disliked ? "active" : ""}" 
                onclick="toggleEngagement(${reel.id}, 'dislike')" 
                ${!isAuthenticated ? "disabled" : ""}>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M19 9l-7 7-7-7"></path>
                </svg>
                <span>${stats.dislikes || 0}</span>
            </button>
            <button class="action-btn" onclick="openCommentModal(${reel.id})">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M8 10h.05M12 10h.05M16 10h.05M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z">
                    </path>
                </svg>
                <span>${stats.comments || 0}</span>
            </button>
            <button class="action-btn" onclick="shareReel(${reel.id})">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M8.684 13.342C8.886 12.938 9 12 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z">
                    </path>
                </svg>
            </button>
            <button class="action-btn ${stats.user_saved ? "active" : ""}" 
                onclick="openPlaylistModal(${reel.id})" 
                ${!isAuthenticated ? "disabled" : ""}>
                <svg class="w-4 h-4" fill="${stats.user_saved ? "currentColor" : "none"}" 
                     stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                </svg>
            </button>
            <button class="action-btn ${reel.is_following ? "active" : ""}" 
                onclick="toggleFollow(${reel.tutor_id})" 
                ${!isAuthenticated ? "disabled" : ""}>
                <span>${reel.is_following ? "Following" : "Follow"}</span>
            </button>
        </div>
    `;
}

// ============================================
// ENGAGEMENT FUNCTIONS
// ============================================
async function toggleEngagement(reelId, type) {
    if (!currentUser) {
        showToast("Please login to engage with videos", "warning");
        return;
    }
    
    try {
        const result = await VideoAPI.toggleEngagement(reelId, type);
        showToast(result.message);
        
        // Reload reels to update stats
        await loadReels();
    } catch (error) {
        console.error('Error toggling engagement:', error);
        showToast("Failed to update engagement", "error");
    }
}

async function toggleFollow(tutorId) {
    if (!currentUser) {
        showToast("Please login to follow tutors", "warning");
        return;
    }
    
    try {
        const result = await VideoAPI.toggleFollow(tutorId);
        showToast(result.message);
        
        // Reload reels to update follow status
        await loadReels();
    } catch (error) {
        console.error('Error toggling follow:', error);
        showToast("Failed to update follow status", "error");
    }
}

// ============================================
// COMMENT FUNCTIONS
// ============================================
async function openCommentModal(reelId) {
    selectedReelId = reelId;
    
    try {
        const comments = await VideoAPI.getComments(reelId);
        displayComments(comments);
        
        const modal = document.getElementById("comment-modal");
        if (modal) {
            modal.classList.remove("hidden");
        }
    } catch (error) {
        console.error('Error loading comments:', error);
        showToast("Failed to load comments", "error");
    }
}

function displayComments(comments) {
    const commentList = document.getElementById("comment-list");
    if (!commentList) return;
    
    if (comments.length === 0) {
        commentList.innerHTML = `
            <div class="empty-state">
                <p class="text-center opacity-60">No comments yet. Be the first to comment!</p>
            </div>
        `;
        return;
    }
    
    commentList.innerHTML = comments.map(comment => `
        <div class="comment-item">
            <div class="flex items-start gap-3">
                ${comment.user_picture ? 
                    `<img src="${comment.user_picture}" alt="${comment.user_name}" 
                         class="w-8 h-8 rounded-full">` :
                    `<div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                        ${comment.user_name.charAt(0)}
                    </div>`
                }
                <div class="flex-1">
                    <p class="font-semibold text-sm">${comment.user_name}</p>
                    <p class="text-sm mt-1">${comment.text}</p>
                    <p class="text-xs opacity-60 mt-1">
                        ${new Date(comment.created_at).toLocaleDateString()}
                    </p>
                    ${comment.replies && comment.replies.length > 0 ? `
                        <div class="ml-4 mt-2">
                            ${comment.replies.map(reply => `
                                <div class="comment-reply mb-2">
                                    <p class="text-sm">
                                        <span class="font-semibold">${reply.user_name}:</span> 
                                        ${reply.text}
                                    </p>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

async function addComment() {
    if (!currentUser) {
        showToast("Please login to comment", "warning");
        return;
    }
    
    const textInput = document.getElementById("new-comment");
    if (!textInput) return;
    
    const text = textInput.value.trim();
    if (!text) {
        showToast("Please enter a comment", "error");
        return;
    }
    
    try {
        await VideoAPI.addComment(selectedReelId, text);
        showToast("Comment added successfully");
        
        // Reload comments
        const comments = await VideoAPI.getComments(selectedReelId);
        displayComments(comments);
        
        // Clear input
        textInput.value = "";
        
        // Update comment count
        await loadReels();
    } catch (error) {
        console.error('Error adding comment:', error);
        showToast("Failed to add comment", "error");
    }
}

// ============================================
// FILTER AND SEARCH
// ============================================
async function filterReels(filter) {
    currentFilter = filter;
    
    // Update UI
    const buttons = document.querySelectorAll(".filter-btn");
    buttons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
    });
    
    // Load filtered reels
    await loadReels();
}

async function handleSearch(e) {
    searchQuery = e.target.value.trim();
    
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(async () => {
        await loadReels();
    }, 300);
    
    // Sync search inputs
    const navSearch = document.getElementById("nav-search-input");
    const mobileSearch = document.getElementById("mobile-search-input");
    if (navSearch && e.target !== navSearch) navSearch.value = searchQuery;
    if (mobileSearch && e.target !== mobileSearch) mobileSearch.value = searchQuery;
}

// ============================================
// PLAYLIST FUNCTIONS
// ============================================
async function openPlaylistModal(reelId) {
    if (!currentUser) {
        showToast("Please login to save videos", "warning");
        return;
    }
    
    selectedReelId = reelId;
    
    try {
        const playlists = await VideoAPI.getPlaylists();
        displayPlaylists(playlists);
        
        const modal = document.getElementById("playlist-modal");
        if (modal) {
            modal.classList.remove("hidden");
        }
    } catch (error) {
        console.error('Error loading playlists:', error);
        showToast("Failed to load playlists", "error");
    }
}

function displayPlaylists(playlists) {
    const playlistList = document.getElementById("existing-playlists");
    if (!playlistList) return;
    
    if (playlists.length === 0) {
        playlistList.innerHTML = `
            <div class="empty-state">
                <p class="text-center opacity-60">No playlists yet. Create your first playlist above!</p>
            </div>
        `;
        return;
    }
    
    playlistList.innerHTML = playlists.map(playlist => `
        <div class="playlist-item">
            <button class="flex-1 text-left" onclick="addToPlaylist(${playlist.id})">
                ${playlist.name}
            </button>
            <span class="text-xs opacity-60">${playlist.video_count || 0} videos</span>
        </div>
    `).join('');
}

async function createPlaylist() {
    const nameInput = document.getElementById("new-playlist-name");
    if (!nameInput) return;
    
    const name = nameInput.value.trim();
    if (!name) {
        showToast("Please enter a playlist name", "error");
        return;
    }
    
    try {
        const result = await VideoAPI.createPlaylist(name);
        showToast(result.message);
        
        // Add video to new playlist
        if (selectedReelId) {
            await VideoAPI.addToPlaylist(result.id, selectedReelId);
        }
        
        // Reload playlists
        const playlists = await VideoAPI.getPlaylists();
        displayPlaylists(playlists);
        
        // Clear input
        nameInput.value = "";
    } catch (error) {
        console.error('Error creating playlist:', error);
        showToast("Failed to create playlist", "error");
    }
}

async function addToPlaylist(playlistId) {
    try {
        await VideoAPI.addToPlaylist(playlistId, selectedReelId);
        showToast("Added to playlist");
        closePlaylistModal();
        
        // Reload reels to update save status
        await loadReels();
    } catch (error) {
        console.error('Error adding to playlist:', error);
        showToast(error.message || "Failed to add to playlist", "error");
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showLoadingState() {
    const reelsGrid = document.getElementById("reels-grid");
    if (reelsGrid) {
        reelsGrid.innerHTML = `
            <div class="col-span-full text-center py-8">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p class="mt-2">Loading videos...</p>
            </div>
        `;
    }
}

function showErrorState() {
    const reelsGrid = document.getElementById("reels-grid");
    if (reelsGrid) {
        reelsGrid.innerHTML = `
            <div class="col-span-full text-center py-8">
                <p class="text-red-500">Failed to load videos. Please try again later.</p>
            </div>
        `;
    }
}

function renderEmptyState() {
    return `
        <div class="col-span-full empty-state">
            <svg class="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M7 4v16M17 4v16M3 8h4m10 0h4M5 12h14M3 16h4m10 0h4M8 4h8a1 1 0 011 1v14a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1z">
                </path>
            </svg>
            <p class="text-center text-lg opacity-70">No videos found</p>
            <p class="text-center text-sm opacity-50 mt-2">Try adjusting your filters or search query</p>
        </div>
    `;
}

async function updateFilterCounts() {
    // This would need separate API calls for each filter type
    // For now, just update based on current loaded data
    const allCount = currentReels.length;
    
    document.getElementById('all-count').textContent = allCount;
    // Other counts would need API calls with specific filters
}

// Keep existing UI functions from original reels.js
function applyTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
}

function updateUserProfile() {
    if (currentUser) {
        const profileName = document.getElementById("profile-name");
        if (profileName) {
            profileName.textContent = currentUser.first_name || currentUser.name || "User";
        }
    }
}

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up ${
        type === "success" ? "bg-green-500" : type === "warning" ? "bg-yellow-500" : "bg-red-500"
    } text-white`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = "slideDown 0.3s ease-out";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// MODAL FUNCTIONS
// ============================================
function closeCommentModal() {
    const modal = document.getElementById("comment-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
    selectedReelId = null;
}

function closePlaylistModal() {
    const modal = document.getElementById("playlist-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
    selectedReelId = null;
}

function closeNotificationModal() {
    const modal = document.getElementById("notification-modal");
    if (modal) {
        modal.classList.add("hidden");
    }
}

function openNotificationModal() {
    const modal = document.getElementById("notification-modal");
    if (modal) {
        modal.classList.remove("hidden");
    }
}

function shareReel(reelId) {
    const url = `${window.location.origin}/reel/${reelId}`;
    
    if (navigator.share) {
        navigator.share({
            title: "Check out this video on Astegni",
            url: url
        }).catch(() => {
            copyToClipboard(url);
        });
    } else {
        copyToClipboard(url);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("Link copied to clipboard!");
    }).catch(() => {
        showToast("Failed to copy link", "error");
    });
}

function checkNotifications() {
    // This would need an API call to check for notifications
    // For now, just hide the notification dot
    const notificationDot = document.getElementById("notification-dot");
    if (notificationDot) {
        notificationDot.classList.add("hidden");
    }
}

function initializeAds() {
    // Keep existing ad initialization code
}

function setupEventListeners() {
    // Search handlers
    const navSearch = document.getElementById("nav-search-input");
    const mobileSearch = document.getElementById("mobile-search-input");
    if (navSearch) navSearch.addEventListener("input", handleSearch);
    if (mobileSearch) mobileSearch.addEventListener("input", handleSearch);
    
    // Other event listeners from original code...
}

// ============================================
// EXPORT GLOBAL FUNCTIONS
// ============================================
window.filterReels = filterReels;
window.toggleEngagement = toggleEngagement;
window.toggleFollow = toggleFollow;
window.openCommentModal = openCommentModal;
window.closeCommentModal = closeCommentModal;
window.addComment = addComment;
window.openPlaylistModal = openPlaylistModal;
window.closePlaylistModal = closePlaylistModal;
window.createPlaylist = createPlaylist;
window.addToPlaylist = addToPlaylist;
window.openNotificationModal = openNotificationModal;
window.closeNotificationModal = closeNotificationModal;
window.shareReel = shareReel;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", initDynamic);