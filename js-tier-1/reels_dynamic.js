// ============================================
// DYNAMIC REELS JAVASCRIPT - BACKEND INTEGRATED
// Replace the hardcoded data with API calls
// ============================================


// ============================================
// PROTOCOL-AWARE URL CONFIGURATION
// ============================================
// ============================================
// PROTOCOL-AWARE URL CONFIGURATION
// ============================================
const UrlHelper = {
    isFileProtocol: window.location.protocol === 'file:',

    getApiBaseUrl() {
        return this.isFileProtocol
            ? 'http://localhost:8000/api'
            : '/api';
    },

    getAssetUrl(path) {
        // For assets like videos, images, etc.
        if (!path) return '';

        // If already a full URL, return as is
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }

        // For file protocol, prepend backend server URL
        if (this.isFileProtocol) {
            return `http://localhost:8000${path}`;
        }

        // For http protocol, return as is
        return path;
    },

    getPageUrl(path) {
        // For internal page navigation
        if (this.isFileProtocol) {
            // Adjust relative paths for file protocol
            return path;
        }
        return path;
    }
};



// ============================================
// API CONFIGURATION
// ============================================


// Update API_BASE_URL to use the helper
const API_BASE_URL = UrlHelper.getApiBaseUrl();
window.API_BASE_URL = API_BASE_URL;




// API Helper Functions
const ApiService = {
    // Get auth token from localStorage
    getToken() {
        // Check all possible storage keys
        return localStorage.getItem('access_token') ||
            localStorage.getItem('token') ||
            null;
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
    async getReels(filter = 'all', search = '', limit = 20, offset = 0) {
        const params = new URLSearchParams({
            filter,
            limit,
            offset
        });

        if (search) params.append('search', search);

        try {
            const response = await ApiService.fetch(`/videos/reels?${params}`);
            return response;
        } catch (error) {
            console.error('Error fetching reels:', error);
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
        return ApiService.fetch(`/tutor/${tutorId}/follow`, {
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
window.currentReels = []; // CHANGED: Made global for player bridge
window.currentUser = null; // CHANGED: Made global

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
                window.currentUser = await response.json(); // CHANGED: Made global
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
    if (profileContainer && window.currentUser) {
        profileContainer.classList.remove('hidden');

        // Update profile info
        const profilePic = document.getElementById('profile-pic');
        const profileName = document.getElementById('profile-name');
        if (profilePic && window.currentUser.profile_picture) {
            profilePic.src = window.currentUser.profile_picture;
        }
        if (profileName) {
            profileName.textContent = window.currentUser.first_name;
        }
    }
}

// ============================================
// LOAD AND DISPLAY REELS
// ============================================
// In reels_dynamic.js, update the loadReels function:
async function loadReels() {
    showLoadingState();

    try {
        const response = await VideoAPI.getReels(currentFilter, searchQuery);
        console.log("API Response:", response);

        // Handle the response structure - it returns {videos: [...]}
        const reels = response.videos || [];

        window.currentReels = reels;
        displayReels(reels);
        updateFilterCounts();
    } catch (error) {
        console.error('Error loading reels:', error);
        showErrorState();
    }
}
window.loadReels = loadReels; // CHANGED: Make globally accessible

// Replace the existing displayReels function with this:
function displayReels(reels) {
    const reelsGrid = document.getElementById("reels-grid");
    if (!reelsGrid) return;

    if (reels.length === 0) {
        reelsGrid.innerHTML = renderEmptyState();
        return;
    }

    reelsGrid.innerHTML = '';

    reels.forEach((reel, index) => {
        // Insert ad placeholder every 25 cards (at positions 24, 49, 74, etc.)
        if (index > 0 && index % 25 === 24) {
            const adPlaceholder = createAdPlaceholder(Math.floor(index / 25));
            reelsGrid.appendChild(adPlaceholder);
        }

        const reelCard = createReelCard(reel, index);
        reelsGrid.appendChild(reelCard);
    });
}


// Update these functions in reels_dynamic.js

// ============================================
// FILTER AND SEARCH - DATABASE INTEGRATED
// ============================================
// ============================================
// FIXED FILTER FUNCTION - Replace the duplicate filterReels in reels_dynamic.js
// ============================================


// Global variables for pagination
let currentPage = 1;
let videosPerPage = 20;
let totalVideos = 0;

async function filterReels(filter) {
    console.log(`Filtering reels: ${filter}`);
    currentFilter = filter;
    currentPage = 1;

    // Update UI buttons
    const buttons = document.querySelectorAll(".filter-btn");
    buttons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
    });

    // Show loading state
    showLoadingState();

    try {
        const token = localStorage.getItem('access_token');
        const headers = {
            'Content-Type': 'application/json'
        };

        // Add auth header if available
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Build URL with proper filter parameter
        let url = `${API_BASE_URL}/videos/reels?page=${currentPage}&limit=${videosPerPage}`;
        
        // IMPORTANT: Pass filter correctly
        if (filter && filter !== 'all') {
            url += `&filter=${filter}`;
        }
        
        // Add search query if present
        if (searchQuery) {
            url += `&search=${encodeURIComponent(searchQuery)}`;
        }

        console.log(`Fetching from: ${url}`);

        const response = await fetch(url, { headers });

        if (!response.ok) {
            // Handle authentication required for user-specific filters
            if (response.status === 401 && filter !== 'all') {
                showToast("Please login to view " + filter, "warning");
                
                // Reset to 'all' filter
                currentFilter = 'all';
                buttons.forEach(btn => {
                    btn.classList.toggle("active", btn.dataset.filter === 'all');
                });
                
                // Retry with 'all' filter
                await filterReels('all');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Received ${data.videos?.length || 0} videos for filter: ${filter}`);

        // Update global reels data
        window.currentReels = data.videos || [];
        totalVideos = data.total || 0;

        // Display the filtered results
        displayReels(window.currentReels);

        // Update filter counts after displaying
        await updateFilterCounts();

    } catch (error) {
        console.error('Error filtering reels:', error);
        showErrorState();
        showToast("Failed to load videos", "error");
    }
}

// Fixed updateFilterCounts function
async function updateFilterCounts() {
    const token = localStorage.getItem('access_token');

    // Always update the "all" count based on current data
    const allCountEl = document.getElementById('all-count');
    if (allCountEl) {
        // For "all", get the total from the API response or current data
        if (currentFilter === 'all') {
            allCountEl.textContent = totalVideos || window.currentReels?.length || '0';
        } else {
            // Fetch the actual all count
            try {
                const response = await fetch(`${API_BASE_URL}/videos/reels?page=1&limit=1`);
                if (response.ok) {
                    const data = await response.json();
                    allCountEl.textContent = data.total || '0';
                }
            } catch (error) {
                console.error('Error fetching all count:', error);
            }
        }
    }

    if (!token) {
        // Not logged in, set user-specific counts to 0
        ['favorites', 'saved', 'liked', 'history'].forEach(type => {
            const el = document.getElementById(`${type}-count`);
            if (el) el.textContent = '0';
        });
        return;
    }

    try {
        // Fetch actual counts from API
        const response = await fetch(`${API_BASE_URL}/videos/filter-counts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const counts = await response.json();
            
            // Update each count in the UI
            Object.keys(counts).forEach(key => {
                const el = document.getElementById(`${key}-count`);
                if (el) {
                    el.textContent = counts[key] || '0';
                }
            });
            
            console.log('Filter counts updated:', counts);
        }
    } catch (error) {
        console.error('Error fetching filter counts:', error);
    }
}


// Add this new function to create ad placeholders
function createAdPlaceholder(adIndex) {
    const div = document.createElement("div");
    div.className = "reel-card ad-placeholder-card";
    div.style.animationDelay = `${adIndex * 0.1}s`;

    // Different ad variations based on index
    const adVariations = [
        {
            title: "Boost Your Learning",
            text: "Premium tutors available",
            color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        },
        {
            title: "Advertise Here",
            text: "Reach thousands of students",
            color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
        },
        {
            title: "Special Offer",
            text: "Get 30% off this month",
            color: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
        },
        {
            title: "Join as Tutor",
            text: "Start earning today",
            color: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)"
        }
    ];

    const ad = adVariations[adIndex % adVariations.length];

    div.innerHTML = `
        <div class="inline-ad-container" style="background: ${ad.color};" onclick="openAdAnalyticsModal()">
            <div class="inline-ad-content">
                <span class="inline-ad-label">Ad</span>
                <h3 class="inline-ad-title">${ad.title}</h3>
                <p class="inline-ad-text">${ad.text}</p>
                <button class="inline-ad-cta">Learn More</button>
            </div>
            <div class="inline-ad-visual">
                <div class="ad-pattern"></div>
            </div>
        </div>
    `;

    return div;
}

function createReelCard(reel, index) {
    const div = document.createElement("div");
    div.className = "reel-card";
    div.style.animationDelay = `${index * 0.1}s`;

    const uploadDate = new Date(reel.upload_date).toLocaleDateString();
    const videoUrl = typeof UrlHelper !== 'undefined'
        ? UrlHelper.getAssetUrl(reel.video_url)
        : reel.video_url;
    const thumbnailUrl = reel.thumbnail_url && typeof UrlHelper !== 'undefined'
        ? UrlHelper.getAssetUrl(reel.thumbnail_url)
        : reel.thumbnail_url;
    const tutorPicture = reel.tutor_picture && typeof UrlHelper !== 'undefined'
        ? UrlHelper.getAssetUrl(reel.tutor_picture)
        : reel.tutor_picture;

    div.innerHTML = `
        <video class="reel-card-video" onclick="openVideoModal(${reel.id})">
            <source src="${videoUrl}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
        <div class="p-4">
            <h3 class="text-lg font-bold mb-1" onclick="openVideoModal(${reel.id})">
                ${reel.title} ${reel.video_number || ''}
            </h3>
            <p class="text-sm mb-2 opacity-80 flex items-center gap-2">
                <a href="../view-profile-tier-1/view-tutor.html?tutorId=${reel.tutor_id}" 
                   class="flex items-center gap-2 hover:text-[var(--nav-link-hover)] transition-colors">
                    ${tutorPicture ? 
                        `<img src="${tutorPicture}" alt="${reel.tutor_name}" 
                              style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">` :
                        `<span style="width: 24px; height: 24px; border-radius: 50%; 
                                     background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                     color: white; display: flex; align-items: center; 
                                     justify-content: center; font-size: 11px; font-weight: 600;">
                            ${reel.tutor_name ? reel.tutor_name.charAt(0).toUpperCase() : 'T'}
                        </span>`
                    }
                    ${reel.tutor_name}
                </a> 
                <span>•</span>
                <span>${reel.tutor_subject || reel.subject || ''}</span>
            </p>
            <p class="text-sm mb-3 line-clamp-2">${reel.description || ''}</p>
            <div class="flex justify-between items-center mb-3">
                <p class="text-xs opacity-60">${uploadDate}</p>
                <p class="text-xs opacity-60">${reel.views} views</p>
            </div>
        </div>
    `;
    return div;
}


// ============================================
// ENGAGEMENT FUNCTIONS
// Fixed toggleEngagement function to update filter counts
async function toggleEngagement(reelId, type) {
    if (!window.currentUser && type !== 'share') {
        showToast("Please login to interact with videos", "warning");
        return;
    }

    // Handle share separately
    if (type === 'share') {
        shareReel(reelId);
        return;
    }

    try {
        // Map engagement types to match backend
        const engagementMap = {
            'like': 'like',
            'dislike': 'dislike',
            'favorite': 'favorite',
            'save': 'save'
        };

        const engagement_type = engagementMap[type] || type;

        // Call API to toggle engagement
        const response = await fetch(`${API_BASE_URL}/videos/${reelId}/engage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({ engagement_type })
        });

        if (!response.ok) {
            throw new Error('Failed to update engagement');
        }

        const result = await response.json();
        console.log('Engagement result:', result);

        // Show notification
        const messages = {
            'like': result.message.includes('Removed') ? 'Like removed' : '👍 Liked!',
            'dislike': result.message.includes('Removed') ? 'Dislike removed' : '👎 Disliked',
            'favorite': result.message.includes('Removed') ? 'Removed from favorites' : '❤️ Added to favorites!',
            'save': result.message.includes('Removed') ? 'Removed from saved' : '📌 Saved!'
        };

        showToast(messages[type] || result.message);

        // Update the video in currentReels array
        if (window.currentReels) {
            const videoIndex = window.currentReels.findIndex(r => r.id === parseInt(reelId));
            if (videoIndex !== -1) {
                const video = window.currentReels[videoIndex];
                
                // Update engagement counts locally
                if (type === 'like') {
                    if (result.message.includes('Removed')) {
                        video.likes = Math.max(0, (video.likes || 0) - 1);
                        if (video.user_engagement) video.user_engagement.like = false;
                    } else {
                        video.likes = (video.likes || 0) + 1;
                        if (video.user_engagement) video.user_engagement.like = true;
                    }
                } else if (type === 'save') {
                    if (result.message.includes('Removed')) {
                        video.saves = Math.max(0, (video.saves || 0) - 1);
                        if (video.user_engagement) video.user_engagement.save = false;
                    } else {
                        video.saves = (video.saves || 0) + 1;
                        if (video.user_engagement) video.user_engagement.save = true;
                    }
                } else if (type === 'favorite') {
                    if (result.message.includes('Removed')) {
                        video.favorites = Math.max(0, (video.favorites || 0) - 1);
                        if (video.user_engagement) video.user_engagement.favorite = false;
                    } else {
                        video.favorites = (video.favorites || 0) + 1;
                        if (video.user_engagement) video.user_engagement.favorite = true;
                    }
                }
            }
        }

        // IMPORTANT: Update filter counts after engagement change
        await updateFilterCounts();

        // If we're viewing a filtered list, refresh it
        if (currentFilter !== 'all') {
            // Small delay to allow backend to update
            setTimeout(async () => {
                await filterReels(currentFilter);
            }, 500);
        }

    } catch (error) {
        console.error('Error toggling engagement:', error);
        showToast("Failed to update", "error");
    }
}

async function toggleFollow(tutorId) {
    if (!window.currentUser) {
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
    if (!window.currentUser) {
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
    if (!window.currentUser) {
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

// Add this function to track video views properly
async function trackVideoView(videoId) {
    try {
        const token = localStorage.getItem('access_token');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${API_BASE_URL}/videos/${videoId}/view`, {
            method: 'POST',
            headers: headers
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('View tracked:', data);
        }
    } catch (error) {
        console.error('Error tracking view:', error);
    }
}

// ============================================
// FIXED openVideoModal FUNCTION
// ============================================

// Update the openVideoModal function to track views
function openVideoModal(reelId) {
    console.log('Opening video modal for reel:', reelId);
    
    // Track the view
    trackVideoView(reelId);
    
    if (!window.videoPlayerBridge) {
        console.error('Video player bridge not initialized');
        showToast('Video player is loading, please try again...', 'warning');
        
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
        console.log('Video opened successfully');
    } catch (error) {
        console.error('Error opening video:', error);
        showToast('Failed to open video', 'error');
    }
}

// Make it globally accessible
window.openVideoModal = openVideoModal;


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
    const allCount = window.currentReels.length;

    document.getElementById('all-count').textContent = allCount;
    // Other counts would need API calls with specific filters
}

// Keep existing UI functions from original reels.js
function applyTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
}

function updateUserProfile() {
    if (window.currentUser) {
        const profileName = document.getElementById("profile-name");
        if (profileName) {
            profileName.textContent = window.currentUser.first_name || window.currentUser.name || "User";
        }
    }
}

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up ${type === "success" ? "bg-green-500" : type === "warning" ? "bg-yellow-500" : "bg-red-500"
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



// ============================================
// COMPLETE INITIALIZATION CODE
// Add this at the BOTTOM of reels_dynamic.js (replace the existing DOMContentLoaded at the very end)
// ============================================

// ============================================
// EXPORT GLOBAL FUNCTIONS (Keep these as they are)
// ============================================
window.filterReels = filterReels;
window.toggleEngagement = toggleEngagement;
window.updateFilterCounts = updateFilterCounts;
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
window.loadReels = loadReels;


// At the VERY BOTTOM of reels_dynamic.js, replace the last few lines with:

// Auto-initialize when script loads
(function() {
    console.log('Reels script loaded, checking DOM state...');
    
    if (document.readyState === 'loading') {
        // DOM still loading, wait for it
        document.addEventListener("DOMContentLoaded", async () => {
            console.log('🚀 INITIALIZING REELS PAGE (DOMContentLoaded)');
            await initDynamic();
        });
    } else {
        // DOM already loaded, initialize immediately
        console.log('🚀 INITIALIZING REELS PAGE (Immediate)');
        // Small delay to ensure other scripts are loaded
        setTimeout(() => {
            initDynamic();
        }, 100);
    }
})();