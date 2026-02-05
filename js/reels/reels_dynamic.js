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
        // Use window.API_BASE_URL from config.js and add /api suffix for API calls
        const baseUrl = window.API_BASE_URL || 'http://localhost:8000';
        return `${baseUrl}/api`;
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
            return `${window.API_BASE_URL || 'http://localhost:8000'}${cleanPath}`;
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
// Use local constant for reels API calls with unique name to avoid conflicts
// (window.API_BASE_URL is set by config.js and used by other modules)
const REELS_API_BASE_URL = UrlHelper.getApiBaseUrl();

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
            const response = await fetch(`${REELS_API_BASE_URL}${url}`, {
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
            const response = await fetch(`${REELS_API_BASE_URL}/refresh`, {
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

// ============================================
// MISSING CORE FUNCTIONS
// ============================================
async function checkAuth() {
    try {
        const token = localStorage.getItem('access_token');
        if (!token) {
            window.currentUser = null;
            return;
        }

        const response = await ApiService.fetch('/me', { requireAuth: true });
        if (response) {
            window.currentUser = response;
        }
    } catch (error) {
        console.log('Auth check failed:', error);
        window.currentUser = null;
    }
}

async function loadReels() {
    try {
        showLoadingState();

        const reelsData = await VideoAPI.getReels(
            currentFilter,
            searchQuery,
            currentPage,
            videosPerPage
        );

        window.currentReels = reelsData.videos || [];
        totalVideos = reelsData.total || 0;

        renderReels(window.currentReels);
        renderPagination();

    } catch (error) {
        console.error('Failed to load reels:', error);
        showErrorState();
    }
}

function renderReels(videos) {
    const reelsGrid = document.getElementById("reels-grid");
    if (!reelsGrid) return;

    if (videos.length === 0) {
        reelsGrid.innerHTML = renderEmptyState();
        return;
    }

    const videosHTML = videos.map(video => createVideoCard(video)).join('');
    reelsGrid.innerHTML = videosHTML;
}

function createVideoCard(video) {
    const tutorName = video.tutor?.name || `${video.tutor?.user?.first_name || ''} ${video.tutor?.user?.father_name || ''}`.trim();
    const profilePicture = UrlHelper.getProfilePictureUrl(
        video.tutor?.user?.profile_picture,
        video.tutor?.user?.first_name
    );

    return `
        <div class="video-card bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700">
            <div class="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-t-xl overflow-hidden">
                <img src="${video.thumbnail_url || '/placeholder-video.jpg'}"
                     alt="${video.title}"
                     class="w-full h-full object-cover"
                     loading="lazy">
                <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity duration-300 flex items-center justify-center">
                    <button onclick="playVideo(${video.id})"
                            class="play-button opacity-0 hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-90 rounded-full p-3 shadow-lg">
                        <svg class="w-6 h-6 text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    </button>
                </div>
                ${video.duration ? `<div class="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">${video.duration}</div>` : ''}
            </div>

            <div class="p-4">
                <!-- Video Info -->
                <h3 class="font-semibold text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
                    ${video.title}
                </h3>

                <!-- Tutor Info -->
                <div class="flex items-center mb-3">
                    <img src="${profilePicture}"
                         alt="${tutorName}"
                         class="w-8 h-8 rounded-full mr-2">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${tutorName}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${video.subject || 'Educational'}</p>
                    </div>
                </div>

                <!-- Stats -->
                <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>${video.views || 0} views</span>
                    <span>${video.likes || 0} likes</span>
                    <span class="text-gray-400">•</span>
                    <span>${formatDate(video.created_at)}</span>
                </div>
            </div>
        </div>
    `;
}

function renderPagination() {
    const paginationContainer = document.getElementById("pagination");
    if (!paginationContainer || totalVideos <= videosPerPage) return;

    const totalPages = Math.ceil(totalVideos / videosPerPage);
    let paginationHTML = '';

    // Previous button
    if (currentPage > 1) {
        paginationHTML += `
            <button onclick="changePage(${currentPage - 1})"
                    class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100">
                Previous
            </button>
        `;
    }

    // Page numbers (show max 5 pages)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        paginationHTML += `
            <button onclick="changePage(${i})"
                    class="px-3 py-2 text-sm font-medium ${isActive
                        ? 'text-blue-600 bg-blue-50 border border-blue-300'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-100'}">
                ${i}
            </button>
        `;
    }

    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `
            <button onclick="changePage(${currentPage + 1})"
                    class="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100">
                Next
            </button>
        `;
    }

    paginationContainer.innerHTML = `
        <div class="flex justify-center mt-8">
            <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm">
                ${paginationHTML}
            </nav>
        </div>
    `;
}

async function updateFilterCounts() {
    // Placeholder for filter count updates
    console.log('Updating filter counts...');
}

function formatDate(dateString) {
    if (!dateString) return 'Recently';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return 'Today';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
}

// Global functions for video interaction
window.playVideo = function(videoId) {
    console.log('Playing video:', videoId);
    // Implement video player logic
};

window.changePage = function(page) {
    if (page !== currentPage && page > 0) {
        currentPage = page;
        loadReels();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.shareReel = function(reelId) {
    const shareUrl = `${window.location.origin}/branch/reels.html?video=${reelId}`;
    copyToClipboard(shareUrl);
};





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
    // Return empty string since the Coming Soon card is already displayed in the HTML
    return '';
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