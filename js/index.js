// Enhanced index.js - Cleaned and Optimized Version

// ============================================
//   GLOBAL STATE & CONFIGURATION
// ============================================

// Error handler to ensure loading screen is removed
window.addEventListener("error", (e) => {
    // Ignore cross-origin script errors from CDNs (generic "Script error.")
    if (e.message === 'Script error.' && e.filename === '' && e.lineno === 0) {
        return; // Silently ignore cross-origin errors
    }

    // Log real errors
    console.error("Script error:", e);

    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
        loadingScreen.style.display = "none";
    }
});

// API Configuration - Use global config from config.js
// Debug: Log what we're getting from window.API_BASE_URL
console.log('[index.js] window.API_BASE_URL at load:', window.API_BASE_URL);
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
console.log('[index.js] Using API_BASE_URL:', API_BASE_URL);

// Helper function for API calls
async function apiCall(endpoint, method = "GET", body = null, token = null) {
    const headers = {
        "Content-Type": "application/json",
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    return response;
}

// Application State
const APP_STATE = {
    isLoggedIn: false,
    currentUser: null,
    userRole: null,
    theme: localStorage.getItem("theme") || "light",
    notifications: [],
    cart: [],
    favorites: [],
    currentVideo: null,
    videoComments: [],
};

// Profile URL mapping based on user role
const PROFILE_URLS = {
    user: "profile-pages/user-profile.html",
    tutor: "profile-pages/tutor-profile.html",
    student: "profile-pages/student-profile.html",
    parent: "profile-pages/parent-profile.html",
    bookstore: "profile-pages/bookstore-profile.html",
    delivery: "profile-pages/delivery-profile.html",
    advertiser: "profile-pages/advertiser-profile.html",
    author: "profile-pages/author-profile.html",
};

const CONFIG = {
    API_URL: window.API_BASE_URL || 'http://localhost:8000',
    ANIMATION_DURATION: 300,
    SCROLL_THRESHOLD: 100,
    TYPING_SPEED: 100,
    COUNTER_DURATION: 2000,
};

// Comprehensive avatar system
const ROLE_AVATAR_SYSTEM = {
    student: {
        category: "Student",
        defaults: [
            {
                id: "student-boy-young",
                path: "pictures/student-college-boy.jpg",
                label: "Young Student (Boy)",
            },
            {
                id: "student-girl-young",
                path: "pictures/student-college-girl.jpg",
                label: "Young Student (Girl)",
            },
        ],
        fallbackColor: "10b981",
    },
    tutor: {
        category: "Tutor",
        defaults: [
            {
                id: "tutor-male-professional",
                path: "",
                label: "Professional Male Tutor",
            },
            {
                id: "tutor-female-professional",
                path: "pictures/tutor-woman.jpg",
                label: "Professional Female Tutor",
            },
        ],
        fallbackColor: "f59e0b",
    },
    parent: {
        category: "Parent",
        defaults: [
            {
                id: "parent-father-young",
                path: "pictures/Dad-profile.jpg",
                label: "Young Father",
            },
            {
                id: "parent-mother-young",
                path: "pictures/Mom-profile.jpg",
                label: "Young Mother",
            },
        ],
        fallbackColor: "ef4444",
    },
    bookstore: {
        category: "Bookstore",
        defaults: [
            {
                id: "bookstore-modern",
                path: "pictures/bookstore-profile.jpg",
                label: "Modern Bookstore",
            },
        ],
        fallbackColor: "8b5cf6",
    },
    delivery: {
        category: "Delivery Service",
        defaults: [
            {
                id: "delivery-person-male",
                path: "pictures/delivery-man.jpg",
                label: "Male Delivery Person",
            },
        ],
        fallbackColor: "06b6d4",
    },
    advertiser: {
        category: "Advertiser",
        defaults: [
            {
                id: "advertiser-agency",
                path: "pictures/ad-profile-1.jpeg",
                label: "Ad Agency",
            },
        ],
        fallbackColor: "ec4899",
    },
    author: {
        category: "Author",
        defaults: [
            {
                id: "author-male-young",
                path: "pictures/author-boy.jpg",
                label: "Young Male Author",
            },
        ],
        fallbackColor: "6366f1",
    },
    church: {
        category: "Church/Religious Organization",
        defaults: [
            {
                id: "church-cross",
                path: "pictures/jesus-image-butterfly.jpg",
                label: "Church Cross",
            },
        ],
        fallbackColor: "a855f7",
    },
    user: {
        category: "General User",
        defaults: [
            {
                id: "user-avatar-1",
                path: "pictures/boy-user-image.jpg",
                label: "User Avatar 1",
            },
        ],
        fallbackColor: "6366f1",
    },
};

// Sample video data
const VIDEO_DATA = [
    {
        id: 1,
        title: "Introduction to Astegni Platform",
        description: "Learn how to navigate and use all features of Astegni educational platform.",
        duration: "5:23",
        views: "10K",
        category: "intro",
        likes: 523,
        dislikes: 12,
        comments: [],
    },
];






// ============================================
//   UTILITIES
// ============================================
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container") || createToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icons = {
        success: "✔",
        error: "✗",
        warning: "⚠",
        info: "ℹ",
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
    return container;
}

// Toggle mobile profile dropdown
function toggleMobileProfileDropdown() {
    const dropdown = document.querySelector('.mobile-profile-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('open');
    }
}

// Make it globally available
window.toggleMobileProfileDropdown = toggleMobileProfileDropdown;

// Mobile profile options - populates the mobile profile section in the hamburger menu
function addMobileProfileOptions() {
    if (!APP_STATE.isLoggedIn || !APP_STATE.currentUser) {
        // Hide mobile profile section, show login/register buttons
        const mobileProfileSection = document.getElementById("mobile-profile-section");
        const mobileLoginBtn = document.getElementById("mobile-login-btn");
        const mobileRegisterBtn = document.getElementById("mobile-register-btn");

        if (mobileProfileSection) {
            mobileProfileSection.classList.add("hidden");
        }
        if (mobileLoginBtn) {
            mobileLoginBtn.style.display = "";
            mobileLoginBtn.classList.remove("hidden");
        }
        if (mobileRegisterBtn) {
            mobileRegisterBtn.style.display = "";
            mobileRegisterBtn.classList.remove("hidden");
        }
        return;
    }

    // Get profile URL based on role
    const profileUrl = PROFILE_URLS[APP_STATE.userRole] || PROFILE_URLS[APP_STATE.currentUser.active_role] || "profile-pages/student-profile.html";

    // Get user info
    const defaultAvatar = 'uploads/system_images/system_profile_pictures/man-user.png';
    const profilePicUrl = APP_STATE.currentUser.profile_picture || APP_STATE.currentUser.avatar || defaultAvatar;
    const userName = APP_STATE.currentUser.name ||
        `${APP_STATE.currentUser.first_name || ''} ${APP_STATE.currentUser.father_name || ''}`.trim() ||
        "User";
    const userEmail = APP_STATE.currentUser.email || APP_STATE.currentUser.phone || "";
    const userRole = APP_STATE.currentUser.active_role || APP_STATE.userRole || "user";

    // Update mobile profile header elements
    const mobileProfileSection = document.getElementById("mobile-profile-section");
    const mobileProfilePic = document.getElementById("mobile-profile-pic");
    const mobileProfileName = document.getElementById("mobile-profile-name");
    const mobileProfileRole = document.getElementById("mobile-profile-role");

    // Update mobile dropdown elements
    const mobileProfileLink = document.getElementById("mobile-profile-link");
    const mobileDropdownPic = document.getElementById("mobile-dropdown-pic");
    const mobileDropdownName = document.getElementById("mobile-dropdown-name");
    const mobileDropdownEmail = document.getElementById("mobile-dropdown-email");

    // Update header profile picture
    if (mobileProfilePic) {
        mobileProfilePic.src = profilePicUrl;
        mobileProfilePic.alt = userName;
    }

    // Update header profile name
    if (mobileProfileName) {
        mobileProfileName.textContent = userName;
    }

    // Update header profile role
    if (mobileProfileRole) {
        mobileProfileRole.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
    }

    // Update dropdown profile picture
    if (mobileDropdownPic) {
        mobileDropdownPic.src = profilePicUrl;
        mobileDropdownPic.alt = userName;
    }

    // Update dropdown name
    if (mobileDropdownName) {
        mobileDropdownName.textContent = userName;
    }

    // Update dropdown email
    if (mobileDropdownEmail) {
        mobileDropdownEmail.textContent = userEmail;
    }

    // Update profile link
    if (mobileProfileLink) {
        mobileProfileLink.href = profileUrl;
    }

    // Show mobile profile section, hide login/register buttons
    if (mobileProfileSection) {
        mobileProfileSection.classList.remove("hidden");
    }

    const mobileLoginBtn = document.getElementById("mobile-login-btn");
    const mobileRegisterBtn = document.getElementById("mobile-register-btn");

    if (mobileLoginBtn) {
        mobileLoginBtn.style.display = "none";
        mobileLoginBtn.classList.add("hidden");
    }
    if (mobileRegisterBtn) {
        mobileRegisterBtn.style.display = "none";
        mobileRegisterBtn.classList.add("hidden");
    }

    // Update mobile role switcher after showing mobile profile section
    if (typeof updateRoleSwitcher === 'function') {
        updateRoleSwitcher();
    }
}

// Remaining initialization functions
function initializeFormValidation() {
    const passwordInput = document.getElementById("register-password");
    if (passwordInput) {
        passwordInput.addEventListener("input", (e) => {
            const strength = calculatePasswordStrength(e.target.value);
            const indicator = document.getElementById("password-strength");
            if (indicator) {
                indicator.style.setProperty("--strength", strength + "%");
            }
        });
    }
}

function calculatePasswordStrength(password) {
    let strength = 0;
    if (password.length > 6) strength += 25;
    if (password.length > 10) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    return strength;
}

function initializeSearch() {
    const searchInput = document.getElementById("global-search");
    const suggestions = document.getElementById("search-suggestions");

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length > 2) {
                showSearchSuggestions(query, suggestions);
            } else if (suggestions) {
                suggestions.innerHTML = "";
            }
        });
    }
}

function showSearchSuggestions(query, container) {
    if (!container) return;

    const suggestions = [
        "Mathematics Tutors",
        "Physics Course",
        "English Language",
    ].filter((s) => s.toLowerCase().includes(query));

    container.innerHTML = suggestions.map((s) => `
        <div class="suggestion-item" onclick="selectSuggestion('${s}')">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            ${s}
        </div>
    `).join("");
}

function initializeNotifications() {
    setInterval(() => {
        if (APP_STATE.isLoggedIn && Math.random() > 0.8) {
            addNotification({
                title: "New Message",
                content: "You have a new message from your tutor",
                type: "info",
            });
        }
    }, 30000);
}

function addNotification(notification) {
    APP_STATE.notifications.push(notification);
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const badge = document.getElementById("notification-count");
    if (badge) {
        badge.textContent = APP_STATE.notifications.length.toString();
        badge.style.display = APP_STATE.notifications.length > 0 ? "flex" : "none";
    }
}

function initializeTooltips() {
    document.querySelectorAll("[data-tooltip]").forEach((el) => {
        el.addEventListener("mouseenter", showTooltip);
        el.addEventListener("mouseleave", hideTooltip);
    });
}

function showTooltip(e) {
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.textContent = e.target.dataset.tooltip;
    document.body.appendChild(tooltip);

    const rect = e.target.getBoundingClientRect();
    tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + "px";
    tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + "px";
}

function hideTooltip() {
    const tooltip = document.querySelector(".tooltip");
    if (tooltip) tooltip.remove();
}

function initializeLazyLoading() {
    const images = document.querySelectorAll("img[data-src]");
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute("data-src");
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach((img) => imageObserver.observe(img));
}

// Add CSS for navbar hide/show animation
const navbarStyles = document.createElement('style');
navbarStyles.textContent = `
    .navbar {
        transition: transform 0.3s ease-in-out, padding 0.3s ease;
    }
    
    .navbar.navbar-hidden {
        transform: translateY(-100%);
    }
    
    .navbar.compact {
        padding: 0.5rem 0;
    }
    
    .navbar.compact .logo-main {
        font-size: 1.125rem;
    }
    
    .navbar.compact .nav-link {
        padding: 0.375rem 0.75rem !important;
    }
`;
document.head.appendChild(navbarStyles);

// Export all necessary functions defined in this file
window.toggleTheme = toggleTheme;
window.showToast = showToast;

// Note: Profile-related functions are exported from js/root/profile-system.js
// Note: Authentication functions are exported from js/index/profile-and-authentication.js
// Note: handleCourseClick and handleViewMoreCourses are exported from js/index/course-flip.js

// Additional video player functions
window.likeVideo = function() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to like videos", "warning");
        openModal("login-modal");
        return;
    }
    showToast("Video liked!", "success");
};

window.dislikeVideo = function() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to rate videos", "warning");
        openModal("login-modal");
        return;
    }
    showToast("Feedback recorded", "info");
};

window.shareVideo = function() {
    openModal("share-modal");
};

window.toggleSaveMenu = function() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to save videos", "warning");
        openModal("login-modal");
        return;
    }
    const menu = document.getElementById("save-menu");
    if (menu) menu.classList.toggle("hidden");
};

window.expandCommentBox = function() {
    const input = document.getElementById("comment-input");
    const actions = document.getElementById("comment-actions");
    if (input) {
        input.classList.add("expanded");
        input.style.minHeight = "80px";
    }
    if (actions) actions.classList.remove("hidden");
};

window.collapseCommentBox = function() {
    const input = document.getElementById("comment-input");
    const actions = document.getElementById("comment-actions");
    if (input) {
        input.classList.remove("expanded");
        input.style.minHeight = "";
        input.value = "";
    }
    if (actions) actions.classList.add("hidden");
};

window.submitComment = function() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to comment", "warning");
        openModal("login-modal");
        return;
    }
    const input = document.getElementById("comment-input");
    if (!input || !input.value.trim()) {
        showToast("Please write a comment", "warning");
        return;
    }
    const newComment = {
        id: Date.now(),
        author: APP_STATE.currentUser?.name || "You",
        avatar: "https://picsum.photos/40?random=" + Date.now(),
        text: input.value.trim(),
        time: "Just now",
        likes: 0,
    };
    if (APP_STATE.currentVideo) {
        if (!APP_STATE.currentVideo.comments) {
            APP_STATE.currentVideo.comments = [];
        }
        APP_STATE.currentVideo.comments.unshift(newComment);
        loadVideoComments(APP_STATE.currentVideo);
    }
    collapseCommentBox();
    showToast("Comment posted!", "success");
};

// openVideoPlayer is exported from video-carousel.js
window.navigateVideo = function(direction) {
    showToast(`Loading ${direction} video...`, "info");
};

window.saveToFavorites = function() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to save to favorites", "warning");
        openModal("login-modal");
        return;
    }
    showToast("Video saved to favorites!", "success");
    const menu = document.getElementById("save-menu");
    if (menu) menu.classList.add("hidden");
};

window.createPlaylist = function() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to create playlists", "warning");
        openModal("login-modal");
        return;
    }
    const playlistName = prompt("Enter playlist name:");
    if (playlistName) {
        showToast(`Playlist "${playlistName}" created!`, "success");
    }
    const menu = document.getElementById("save-menu");
    if (menu) menu.classList.add("hidden");
};

window.addToPlaylist = function() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to add to playlist", "warning");
        openModal("login-modal");
        return;
    }
    showToast("Select a playlist to add this video", "info");
    const menu = document.getElementById("save-menu");
    if (menu) menu.classList.add("hidden");
};

window.copyShareLink = function() {
    const input = document.getElementById("share-link");
    if (input) {
        input.select();
        document.execCommand("copy");
        showToast("Link copied to clipboard!", "success");
    }
};

window.shareToSocial = function(platform) {
    const shareUrl = document.getElementById("share-link")?.value || "https://astegni.et/video/12345";
    const shareText = APP_STATE.currentVideo?.title || "Check out this amazing video on Astegni!";
    let url = "";
    
    switch(platform) {
        case "facebook":
            url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
            break;
        case "twitter":
            url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
            break;
        case "whatsapp":
            url = `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`;
            break;
        case "telegram":
            url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
            break;
        case "linkedin":
            url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
            break;
        case "email":
            url = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent("Check out this video: " + shareUrl)}`;
            break;
    }
    
    if (url) {
        window.open(url, "_blank");
        showToast(`Sharing to ${platform}...`, "info");
    }
};

window.scrollToSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
};


window.openSearchModal = function() {
    const modal = document.getElementById("search-modal");
    if (modal) {
        modal.style.display = "flex";
        setTimeout(() => {
            const searchInput = document.getElementById("global-search");
            if (searchInput) searchInput.focus();
        }, 100);
    }
};

window.showTestimonial = function(index) {
    console.log("Testimonial index:", index);
};

// Add styles for the new features
const styleElement = document.createElement('style');
styleElement.textContent = `
    .add-role-option {
        border-top: 1px solid var(--border-color);
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    .add-role-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--primary-color);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: bold;
    }
    
    .role-option.disabled {
        opacity: 0.7;
        cursor: default;
    }
    
    .dropdown-header {
        transition: background-color 0.3s ease;
    }
    
    .dropdown-header:hover {
        background-color: var(--hover-bg);
        border-radius: 8px;
    }
`;

if (!document.getElementById('add-role-styles')) {
    styleElement.id = 'add-role-styles';
    document.head.appendChild(styleElement);
}


    