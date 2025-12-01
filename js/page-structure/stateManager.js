// ============================================
// STATE MANAGER
// Global state and configuration management
// ============================================

// Global configuration
const CONFIG = {
    animation: {
        duration: 300,
        easing: "ease-out",
        stagger: 100,
    },
    realtime: {
        updateInterval: 3000,
        chartUpdateInterval: 5000,
    },
};

// Global state management
const STATE = {
    currentTheme: localStorage.getItem("theme") || "light",
    currentMetric: "views",
    scheduledEvents: [],
    analyticsChart: null,
    animationFrame: null,
    notifications: [],
    followers: [],
    following: [],
    videos: [],
    playlists: [],
    blogPosts: [],
    comments: [],
    joinedGroups: new Set(),
    podcastPlaylists: [],
    jobPosts: [],
    books: [],
    clubs: [],
    purchasedProducts: [],
};

// Export globally
window.CONFIG = CONFIG;
window.STATE = STATE;

console.log("✅ State Manager loaded!");
