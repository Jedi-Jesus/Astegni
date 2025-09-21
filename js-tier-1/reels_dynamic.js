// ============================================
// DYNAMIC REELS JAVASCRIPT - FULLY FIXED VERSION
// All API calls corrected, error handling added
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
        if (!path) return '';
        
        // If already a full URL, return as is
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
            return path;
        }
        
        // For file protocol, prepend backend server URL
        if (this.isFileProtocol) {
            // Remove leading slash if present
            const cleanPath = path.startsWith('/') ? path : '/' + path;
            return `http://localhost:8000${cleanPath}`;
        }
        
        return path;
    },

    getPageUrl(path) {
        if (this.isFileProtocol) {
            return path;
        }
        return path;
    },

    // New method for profile pictures with better fallback
// New method for profile pictures with better fallback
    getProfilePictureUrl(picture, userFirstName) {
        if (picture) {
            return this.getAssetUrl(picture);
        }
        
        // Create default avatar with first letter
        const letter = (userFirstName || 'U').charAt(0).toUpperCase();
        const colors = [
            '#667eea', // Purple
            '#f56565', // Red
            '#48bb78', // Green
            '#ed8936', // Orange
            '#38b2ac', // Teal
            '#9f7aea', // Purple light
            '#4299e1', // Blue
            '#ed64a6', // Pink
        ];
        
        // Use a consistent color based on the first letter
        const colorIndex = letter.charCodeAt(0) % colors.length;
        const color = colors[colorIndex];
        
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='16' cy='16' r='16' fill='${encodeURIComponent(color)}'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='white' font-size='14' font-family='Arial'%3E${letter}%3C/text%3E%3C/svg%3E`;
    }
};

// ============================================
// API CONFIGURATION
// ============================================
const API_BASE_URL = UrlHelper.getApiBaseUrl();
window.API_BASE_URL = API_BASE_URL;

// API Helper Functions
const ApiService = {
    getToken() {
        return localStorage.getItem('access_token') || 
               localStorage.getItem('token') || 
               null;
    },

    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (includeAuth && this.getToken()) {
            headers['Authorization'] = `Bearer ${this.getToken()}`;
        }

        return headers;
    },

    async fetch(url, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${url}`, {
                ...options,
                headers: this.getHeaders(options.includeAuth !== false),
            });

            if (!response.ok) {
                if (response.status === 401 && options.includeAuth !== false) {
                    // Try to refresh token
                    const refreshed = await this.refreshToken();
                    if (!refreshed) {
                        // Only redirect to login for authenticated endpoints
                        if (options.requireAuth) {
                            window.location.href = '../index.html';
                        }
                        return null;
                    }
                    // Retry with new token
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
                localStorage.setItem('refresh_token', data.refresh_token);
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
    async getReels(filter = 'all', search = '', page = 1, limit = 20, category = null) {
        const params = new URLSearchParams({
            filter,
            page,
            limit
        });

        if (search) params.append('search', search);
        if (category) params.append('category', category);

        try {
            const response = await ApiService.fetch(`/videos/reels?${params}`, {
                includeAuth: filter !== 'all' // Only require auth for user-specific filters
            });
            return response || { videos: [], total: 0 };
        } catch (error) {
            console.error('Error fetching reels:', error);
            return { videos: [], total: 0 };
        }
    },

    async getReel(reelId) {
        return ApiService.fetch(`/videos/reels/${reelId}`, { includeAuth: false });
    },

    async toggleEngagement(reelId, engagementType) {
        return ApiService.fetch(`/videos/${reelId}/engage`, {
            method: 'POST',
            body: JSON.stringify({ engagement_type: engagementType }),
            requireAuth: true
        });
    },

    async getComments(reelId) {
        return ApiService.fetch(`/videos/reels/${reelId}/comments`, { includeAuth: false });
    },

    async addComment(reelId, text, parentCommentId = null) {
        return ApiService.fetch(`/videos/reels/${reelId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ text, parent_comment_id: parentCommentId }),
            requireAuth: true
        });
    },

    async getPlaylists() {
        return ApiService.fetch('/videos/playlists', { requireAuth: true });
    },

    async createPlaylist(name, description = '') {
        return ApiService.fetch('/videos/playlists', {
            method: 'POST',
            body: JSON.stringify({ name, description, is_public: true }),
            requireAuth: true
        });
    },

    async addToPlaylist(playlistId, videoId) {
        return ApiService.fetch(`/videos/playlists/${playlistId}/videos`, {
            method: 'POST',
            body: JSON.stringify({ video_id: videoId }),
            requireAuth: true
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
let currentPage = 1;
let totalVideos = 0;
const videosPerPage = 20;

window.currentReels = [];
window.currentUser = null;
window.currentFilter = "all"; // Make filter globally accessible

// ============================================
// INITIALIZATION
// ============================================
async function initDynamic() {
    await checkAuth();
    updateUserProfile();
    applyTheme();
    setupEventListeners();
    await loadReels();
    await updateFilterCounts();
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
                window.currentUser = await response.json();
                enableAuthFeatures();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }
}

// 3. Fixed profile picture handling in enableAuthFeatures
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

        // Update profile info with null safety
        const profilePic = document.getElementById('profile-pic');
        const profileName = document.getElementById('profile-name');
        
        if (profilePic) {
            profilePic.src = UrlHelper.getProfilePictureUrl(
                window.currentUser.profile_picture,
                window.currentUser.first_name
            );
        }
        
        if (profileName) {
            profileName.textContent = window.currentUser.first_name || 'User';
        }

        // Also update dropdown profile info
        const dropdownPic = document.getElementById('dropdown-profile-pic');
        const dropdownName = document.getElementById('dropdown-user-name');
        const dropdownEmail = document.getElementById('dropdown-user-email');
        const dropdownRole = document.getElementById('dropdown-user-role');
        
        if (dropdownPic) {
            dropdownPic.src = UrlHelper.getProfilePictureUrl(
                window.currentUser.profile_picture,
                window.currentUser.first_name
            );
        }
        
        if (dropdownName) {
            dropdownName.textContent = `${window.currentUser.first_name || ''} ${window.currentUser.last_name || ''}`.trim() || 'User';
        }
        
        if (dropdownEmail) {
            dropdownEmail.textContent = window.currentUser.email || '';
        }
        
        if (dropdownRole) {
            dropdownRole.textContent = window.currentUser.active_role || 'user';
        }
    }
}

// ============================================
// LOAD AND DISPLAY REELS
// ============================================
async function loadReels() {
    showLoadingState();

    try {
        // For reels page, we want Ad category videos
        const response = await VideoAPI.getReels(currentFilter, searchQuery, currentPage, videosPerPage, 'Ad');
        
        if (response && response.videos) {
            window.currentReels = response.videos;
            totalVideos = response.total || response.videos.length;
            displayReels(response.videos);
            
            if (response.videos.length === 0 && currentFilter === 'all') {
                showToast("No Ad videos found. Please check with admin.", "info");
            }
        }
    } catch (error) {
        console.error('Error loading reels:', error);
        showErrorState();
    }
}

window.loadReels = loadReels;

function displayReels(reels) {
    const reelsGrid = document.getElementById("reels-grid");
    if (!reelsGrid) return;

    if (reels.length === 0) {
        reelsGrid.innerHTML = renderEmptyState();
        return;
    }

    reelsGrid.innerHTML = '';

    reels.forEach((reel, index) => {
        // Insert ad placeholder every 25 cards
        if (index > 0 && index % 25 === 24) {
            const adPlaceholder = createAdPlaceholder(Math.floor(index / 25));
            reelsGrid.appendChild(adPlaceholder);
        }

        const reelCard = createReelCard(reel, index);
        reelsGrid.appendChild(reelCard);
    });
}

// ============================================
// FILTER FUNCTIONS
// ============================================
async function filterReels(filter) {
    console.log(`Filtering reels: ${filter}`);
    currentFilter = filter;
    window.currentFilter = filter; // Update global
    currentPage = 1;

    // Update UI buttons
    const buttons = document.querySelectorAll(".filter-btn");
    buttons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
    });

    // Show loading
    showLoadingState();

    try {
        const response = await VideoAPI.getReels(filter, searchQuery, currentPage, videosPerPage);
        
        if (response) {
            window.currentReels = response.videos || [];
            totalVideos = response.total || 0;
            displayReels(window.currentReels);
            await updateFilterCounts();
        } else if (filter !== 'all') {
            // User not authenticated for user-specific filters
            showToast("Please login to view " + filter, "warning");
            currentFilter = 'all';
            window.currentFilter = 'all';
            buttons.forEach(btn => {
                btn.classList.toggle("active", btn.dataset.filter === 'all');
            });
            await filterReels('all');
        }
    } catch (error) {
        console.error('Error filtering reels:', error);
        showErrorState();
    }
}

async function updateFilterCounts() {
    const token = localStorage.getItem('access_token');

    // Update "all" count
    const allCountEl = document.getElementById('all-count');
    if (allCountEl) {
        allCountEl.textContent = totalVideos || window.currentReels?.length || '0';
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
        const response = await fetch(`${API_BASE_URL}/videos/filter-counts`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const counts = await response.json();
            
            // Map backend keys to frontend element IDs
            const countMapping = {
                'all': 'all-count',
                'favorites': 'favorites-count',
                'saved': 'saved-count',
                'liked': 'liked-count',
                'history': 'history-count'
            };

            Object.keys(counts).forEach(key => {
                const elementId = countMapping[key];
                if (elementId) {
                    const el = document.getElementById(elementId);
                    if (el) {
                        el.textContent = counts[key] || '0';
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error fetching filter counts:', error);
    }
}

window.filterReels = filterReels;
window.updateFilterCounts = updateFilterCounts;

// ============================================
// ENGAGEMENT FUNCTIONS
// ============================================
async function toggleEngagement(reelId, type) {
    if (!window.currentUser && type !== 'share') {
        showToast("Please login to interact with videos", "warning");
        return;
    }

    if (type === 'share') {
        shareReel(reelId);
        return;
    }

    try {
        // Correct engagement type mapping
        const engagementMap = {
            'like': 'like',
            'dislike': 'dislike',
            'favorite': 'favorite', // Fixed: was 'favorites'
            'save': 'save'
        };

        const result = await VideoAPI.toggleEngagement(reelId, engagementMap[type]);
        
        if (result) {
            // Show notification
            const messages = {
                'like': result.message.includes('Removed') ? 'Like removed' : '👍 Liked!',
                'dislike': result.message.includes('Removed') ? 'Dislike removed' : '👎 Disliked',
                'favorite': result.message.includes('Removed') ? 'Removed from favorites' : '❤️ Added to favorites!',
                'save': result.message.includes('Removed') ? 'Removed from saved' : '📌 Saved!'
            };

            showToast(messages[type] || result.message);

            // Update local data
            if (window.currentReels) {
                const videoIndex = window.currentReels.findIndex(r => r.id === parseInt(reelId));
                if (videoIndex !== -1) {
                    const video = window.currentReels[videoIndex];
                    const isRemoving = result.message.includes('Removed');

                    if (!video.user_engagement) {
                        video.user_engagement = {};
                    }

                    // Update engagement states and counts
                    switch(type) {
                        case 'like':
                            video.user_engagement.like = !isRemoving;
                            video.likes = Math.max(0, (video.likes || 0) + (isRemoving ? -1 : 1));
                            if (!isRemoving && video.user_engagement.dislike) {
                                video.user_engagement.dislike = false;
                                video.dislikes = Math.max(0, (video.dislikes || 0) - 1);
                            }
                            break;
                        case 'dislike':
                            video.user_engagement.dislike = !isRemoving;
                            video.dislikes = Math.max(0, (video.dislikes || 0) + (isRemoving ? -1 : 1));
                            if (!isRemoving && video.user_engagement.like) {
                                video.user_engagement.like = false;
                                video.likes = Math.max(0, (video.likes || 0) - 1);
                            }
                            break;
                        case 'favorite':
                            video.user_engagement.favorite = !isRemoving;
                            video.favorites = Math.max(0, (video.favorites || 0) + (isRemoving ? -1 : 1));
                            break;
                        case 'save':
                            video.user_engagement.save = !isRemoving;
                            video.saves = Math.max(0, (video.saves || 0) + (isRemoving ? -1 : 1));
                            break;
                    }
                }
            }

            // Update filter counts
            await updateFilterCounts();

            // If viewing filtered list and item removed, refresh
            if (window.currentFilter && window.currentFilter !== 'all') {
                const shouldRefresh = (
                    (window.currentFilter === 'liked' && type === 'like' && result.message.includes('Removed')) ||
                    (window.currentFilter === 'saved' && type === 'save' && result.message.includes('Removed')) ||
                    (window.currentFilter === 'favorites' && type === 'favorite' && result.message.includes('Removed'))
                );

                if (shouldRefresh) {
                    setTimeout(() => {
                        filterReels(window.currentFilter);
                    }, 500);
                }
            }
        }
    } catch (error) {
        console.error('Error toggling engagement:', error);
        showToast("Failed to update", "error");
    }
}

window.toggleEngagement = toggleEngagement;

// ============================================
// VIDEO VIEW TRACKING
// ============================================
// 2. Fixed trackVideoView with proper error handling
async function trackVideoView(videoId) {
    try {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = localStorage.getItem('access_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Fire and forget, but handle errors gracefully
        fetch(`${API_BASE_URL}/videos/${videoId}/view`, {
            method: 'POST',
            headers: headers
        }).then(response => {
            // Only log if there's an actual problem (not 401)
            if (!response.ok && response.status !== 401) {
                console.debug('View tracking error (non-critical):', response.status);
            }
        }).catch(err => {
            // Silently ignore network errors for view tracking
            console.debug('View tracking failed (non-critical):', err.message);
        });

    } catch (error) {
        // Don't show error to user for view tracking
        console.debug('View tracking exception (non-critical):', error.message);
    }
}

// ============================================
// CREATE REEL CARD
// ============================================
// Complete fixed createReelCard function for reels_dynamic.js

function createReelCard(reel, index) {
    const div = document.createElement("div");
    div.className = "reel-card";
    div.style.animationDelay = `${index * 0.1}s`;

    const uploadDate = new Date(reel.upload_date || reel.created_at).toLocaleDateString();
    const videoUrl = UrlHelper.getAssetUrl(reel.video_url);
    const thumbnailUrl = reel.thumbnail_url ? UrlHelper.getAssetUrl(reel.thumbnail_url) : null;
    
    // Fixed profile picture handling with null safety
    const tutorName = reel.tutor_name || 'Unknown';
    const tutorPicture = UrlHelper.getProfilePictureUrl(
        reel.tutor_picture,
        tutorName
    );

    div.innerHTML = `
        <video class="reel-card-video" onclick="openVideoModal(${reel.id})">
            <source src="${videoUrl}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
        <div class="p-4">
            <h3 class="text-lg font-bold mb-1" onclick="openVideoModal(${reel.id})">
                ${reel.title || 'Untitled'} ${reel.video_number || ''}
            </h3>
            <p class="text-sm mb-2 opacity-80 flex items-center gap-2">
                <a href="../view-profile-tier-1/view-tutor.html?tutorId=${reel.tutor_id}" 
                   class="flex items-center gap-2 hover:text-[var(--nav-link-hover)] transition-colors"
                   onclick="event.stopPropagation();">
                    <img src="${tutorPicture}" alt="${tutorName}" 
                         style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">
                    ${tutorName}
                </a> 
                <span>•</span>
                <span>${reel.tutor_subject || reel.subject || ''}</span>
            </p>
            <p class="text-sm mb-3 line-clamp-2">${reel.description || ''}</p>
            <div class="flex justify-between items-center mb-3">
                <p class="text-xs opacity-60">${uploadDate}</p>
                <p class="text-xs opacity-60">${reel.views || 0} views</p>
            </div>
        </div>
    `;
    return div;
}

function createAdPlaceholder(adIndex) {
    const div = document.createElement("div");
    div.className = "reel-card ad-placeholder-card";
    div.style.animationDelay = `${adIndex * 0.1}s`;

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

window.openVideoModal = openVideoModal;

// ============================================
// COMMENT FUNCTIONS
// ============================================
async function openCommentModal(reelId) {
    selectedReelId = reelId;

    try {
        const response = await VideoAPI.getComments(reelId);
        if (response) {
            displayComments(response.comments || []);
        }

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

    if (!comments || comments.length === 0) {
        commentList.innerHTML = `
            <div class="empty-state">
                <p class="text-center opacity-60">No comments yet. Be the first to comment!</p>
            </div>
        `;
        return;
    }

    commentList.innerHTML = comments.map(comment => {
        const userFirstLetter = (comment.user_name || 'U').charAt(0).toUpperCase();
        
        return `
            <div class="comment-item">
                <div class="flex items-start gap-3">
                    ${comment.user_picture ?
                        `<img src="${UrlHelper.getAssetUrl(comment.user_picture)}" alt="${comment.user_name}" 
                             class="w-8 h-8 rounded-full">` :
                        `<div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                            ${userFirstLetter}
                        </div>`
                    }
                    <div class="flex-1">
                        <p class="font-semibold text-sm">${comment.user_name || 'Anonymous'}</p>
                        <p class="text-sm mt-1">${comment.text}</p>
                        <p class="text-xs opacity-60 mt-1">
                            ${new Date(comment.created_at).toLocaleDateString()}
                        </p>
                        ${comment.replies && comment.replies.length > 0 ? `
                            <div class="ml-4 mt-2">
                                ${comment.replies.map(reply => `
                                    <div class="comment-reply mb-2">
                                        <p class="text-sm">
                                            <span class="font-semibold">${reply.user_name || 'Anonymous'}:</span> 
                                            ${reply.text}
                                        </p>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
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
        const response = await VideoAPI.getComments(selectedReelId);
        if (response) {
            displayComments(response.comments || []);
        }
        
        textInput.value = "";
    } catch (error) {
        console.error('Error adding comment:', error);
        showToast("Failed to add comment", "error");
    }
}

window.openCommentModal = openCommentModal;
window.closeCommentModal = () => {
    const modal = document.getElementById("comment-modal");
    if (modal) modal.classList.add("hidden");
    selectedReelId = null;
};
window.addComment = addComment;

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
        displayPlaylists(playlists || []);

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

    if (!playlists || playlists.length === 0) {
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
        if (result) {
            showToast("Playlist created successfully");
            
            // Add video to new playlist if one was selected
            if (selectedReelId && result.id) {
                await VideoAPI.addToPlaylist(result.id, selectedReelId);
            }
            
            // Reload playlists
            const playlists = await VideoAPI.getPlaylists();
            displayPlaylists(playlists || []);
            
            nameInput.value = "";
        }
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
        
        // Update save status
        await updateFilterCounts();
    } catch (error) {
        console.error('Error adding to playlist:', error);
        showToast("Failed to add to playlist", "error");
    }
}

window.openPlaylistModal = openPlaylistModal;
window.closePlaylistModal = () => {
    const modal = document.getElementById("playlist-modal");
    if (modal) modal.classList.add("hidden");
    selectedReelId = null;
};
window.createPlaylist = createPlaylist;
window.addToPlaylist = addToPlaylist;

// ============================================
// UTILITY FUNCTIONS
// ============================================
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
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-up ${
        type === "success" ? "bg-green-500" : 
        type === "warning" ? "bg-yellow-500" : 
        "bg-red-500"
    } text-white`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "slideDown 0.3s ease-out";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function closeNotificationModal() {
    const modal = document.getElementById("notification-modal");
    if (modal) modal.classList.add("hidden");
}

function openNotificationModal() {
    const modal = document.getElementById("notification-modal");
    if (modal) modal.classList.remove("hidden");
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
    // Hide notification dot by default
    const notificationDot = document.getElementById("notification-dot");
    if (notificationDot) {
        notificationDot.classList.add("hidden");
    }
}

function initializeAds() {
    // Initialize ad components
}

function setupEventListeners() {
    // Search handlers
    const navSearch = document.getElementById("nav-search-input");
    const mobileSearch = document.getElementById("mobile-search-input");
    if (navSearch) navSearch.addEventListener("input", handleSearch);
    if (mobileSearch) mobileSearch.addEventListener("input", handleSearch);
}

window.openNotificationModal = openNotificationModal;
window.closeNotificationModal = closeNotificationModal;
window.shareReel = shareReel;

// Auto-initialize
(function() {
    console.log('Reels script loaded, checking DOM state...');
    
    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", async () => {
            console.log('🚀 INITIALIZING REELS PAGE (DOMContentLoaded)');
            await initDynamic();
        });
    } else {
        console.log('🚀 INITIALIZING REELS PAGE (Immediate)');
        setTimeout(() => {
            initDynamic();
        }, 100);
    }
})();