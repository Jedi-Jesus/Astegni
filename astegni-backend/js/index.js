// Enhanced index.js - With improved video player, comments, and share functionality

// ============================================
//   GLOBAL STATE & CONFIGURATION
// ============================================
// Add this to your index.js file - Replace the existing handleRegister function and updateUIForLoggedInUser function

// Update the APP_STATE to include userRole
// Error handler to ensure loading screen is removed
window.addEventListener("error", (e) => {
    console.error("Script error:", e);
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
        loadingScreen.style.display = "none";
    }
});
// API Configuration
const API_BASE_URL = "http://localhost:8000";
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

const APP_STATE = {
    isLoggedIn: false,
    currentUser: null,
    userRole: null, // Add this line
    theme: localStorage.getItem("theme") || "light",
    notifications: [],
    cart: [],
    favorites: [],
    currentVideo: null,
    videoComments: [],
};
// Profile URL mapping based on user role
const PROFILE_URLS = {
    user: "my-profile-tier-1/user-profile.html",
    tutor: "my-profile-tier-1/tutor-profile.html",
    student: "my-profile-tier-1/student-profile.html",
    guardian: "my-profile-tier-1/parent-profile.html",
    bookstore: "my-profile-tier-1/bookstore-profile.html",
    delivery: "my-profile-tier-1/delivery-profile.html",
    advertiser: "my-profile-tier-1/advertiser-profile.html",
    church: "my-profile-tier-1/church-profile.html",
    author: "my-profile-tier-1/author-profile.html",
};

const CONFIG = {
    API_URL: "https://api.astegni.et",
    ANIMATION_DURATION: 300,
    SCROLL_THRESHOLD: 100,
    TYPING_SPEED: 100,
    COUNTER_DURATION: 2000,
};

// Comprehensive avatar system with multiple defaults per role
const ROLE_AVATAR_SYSTEM = {
    student: {
        category: "Student",
        defaults: [
            {
                id: "student-boy-young",
                path: "pictures/student-kid-boy.jpeg",
                label: "Young Student (Boy)",
                gender: "male",
                ageGroup: "child",
            },
            {
                id: "student-girl-young",
                path: "pictures/student-kid-girl.jpeg",
                label: "Young Student (Girl)",
                gender: "female",
                ageGroup: "child",
            },
            {
                id: "student-boy-teen",
                path: "pictures/student-teenage-boy.jpeg",
                label: "Teen Student (Boy)",
                gender: "male",
                ageGroup: "teen",
            },
            {
                id: "student-girl-teen",
                path: "pictures/student-teenage-girl.jpeg",
                label: "Teen Student (Girl)",
                gender: "female",
                ageGroup: "teen",
            },
            {
                id: "student-male-college",
                path: "pictures/student-college-boy.jpeg",
                label: "College Student (Male)",
                gender: "male",
                ageGroup: "adult",
            },
            {
                id: "student-female-college",
                path: "pictures/student-college-girl.jpeg",
                label: "College Student (Female)",
                gender: "female",
                ageGroup: "adult",
            },
        ],
        fallbackColor: "10b981",
    },

    tutor: {
        category: "Tutor",
        defaults: [
            {
                id: "tutor-male-professional",
                path: "pictures/tutor-man.jpg",
                label: "Professional Male Tutor",
                gender: "male",
                specialty: "professional",
            },
            {
                id: "tutor-female-professional",
                path: "pictures/tutor-woman.jpg",
                label: "Professional Female Tutor",
                gender: "female",
                specialty: "professional",
            },
        ],
        fallbackColor: "f59e0b",
    },

    guardian: {
        category: "Parent/Guardian",
        defaults: [
            {
                id: "parent-father-young",
                path: "pictures/Dad-profile.jpg",
                label: "Young Father",
                gender: "male",
                type: "father",
            },
            {
                id: "parent-mother-young",
                path: "pictures/Mom-profile.jpg",
                label: "Young Mother",
                gender: "female",
                type: "mother",
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
                style: "modern",
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
                gender: "male",
            },
            {
                id: "delivery-person-female",
                path: "pictures/delivery-woman.jpg",
                label: "Female Delivery Person",
                gender: "female",
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
                type: "agency",
            },
            {
                id: "advertiser-digital",
                path: "pictures/ad-profile-2.jpeg",
                label: "Digital Marketing",
                type: "digital",
            },
            {
                id: "advertiser-creative",
                path: "pictures/ad-profile-3.jpeg",
                label: "Creative Agency",
                type: "creative",
            },
            {
                id: "advertiser-corporate",
                path: "pictures/ad-profile-4.png",
                label: "Corporate",
                type: "corporate",
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
                gender: "male",
            },
            {
                id: "author-male-young",
                path: "pictures/author-male-young.jpg",
                label: "Young Male Author",
                gender: "male",
            },
            {
                id: "author-female-young",
                path: "pictures/author-female-young.jpg",
                label: "Young Female Author",
                gender: "female",
            },
            {
                id: "author-male-professional",
                path: "pictures/professional-author-male.jpg",
                label: "Professional Author",
                gender: "male",
            },
            {
                id: "author-male-senior",
                path: "pictures/author-male-senior.jpg",
                label: "Senior Male Author",
                gender: "male",
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
                type: "christian",
            },
            {
                id: "church-building",
                path: "pictures/church-building.jpg",
                label: "Church Building",
                type: "building",
            },
            {
                id: "church-dove",
                path: "pictures/jesus-teaching.jpg",
                label: "Jesus teaching",
                type: "symbol",
            },
            {
                id: "church-bible",
                path: "pictures/church-bible.jpg",
                label: "Holy Bible",
                type: "book",
            },
            {
                id: "church-hands",
                path: "pictures/jesus-image.jpg",
                label: "Jesus Image",
                type: "symbol",
            },
            {
                id: "church-hands",
                path: "pictures/bible-stydy.jpg",
                label: "Bible study",
                type: "symbol",
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
                style: "modern",
            },
            {
                id: "user-avatar-2",
                path: "pictures/girl-user-image.jpg",
                label: "User Avatar 2",
                style: "classic",
            },
            {
                id: "user-avatar-3",
                path: "pictures/teenage-boy-user.jpg",
                label: "User Avatar 3",
                style: "minimal",
            },
            {
                id: "user-avatar-1",
                path: "pictures/teenage-girl-user.jpg",
                label: "User Avatar 1",
                style: "modern",
            },
            {
                id: "user-avatar-2",
                path: "pictures/man-user.jpg",
                label: "User Avatar 2",
                style: "classic",
            },
            {
                id: "user-avatar-3",
                path: "pictures/woman-user.jpg",
                label: "User Avatar 3",
                style: "minimal",
            },
        ],
        fallbackColor: "6366f1",
    },
};

// Avatar management functions
function getCurrentUserAvatar() {
    // Priority chain for avatar selection
    if (APP_STATE.currentUser?.profile_picture) {
        return APP_STATE.currentUser.profile_picture;
    }

    const selectedDefault = localStorage.getItem(
        `${APP_STATE.userRole}_selected_default`
    );
    if (selectedDefault) {
        return selectedDefault;
    }

    const roleConfig = ROLE_AVATAR_SYSTEM[APP_STATE.userRole];
    if (roleConfig?.defaults?.[0]) {
        return roleConfig.defaults[0].path;
    }

    // Fallback to UI Avatar API
    const name = APP_STATE.currentUser?.name || "User";
    const color = roleConfig?.fallbackColor || "6366f1";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name
    )}&background=${color}&color=fff&size=200`;
}

// Sample video data with comments
const VIDEO_DATA = [
    {
        id: 1,
        title: "Introduction to Astegni Platform",
        description:
            "Learn how to navigate and use all features of Astegni educational platform. This comprehensive guide covers everything from finding tutors to enrolling in courses.",
        duration: "5:23",
        views: "10K",
        category: "intro",
        likes: 523,
        dislikes: 12,
        comments: [
            {
                id: 1,
                author: "Abebe Tadesse",
                avatar: "https://picsum.photos/40?random=1",
                text: "This is exactly what I needed to get started!",
                time: "2 days ago",
                likes: 45,
            },
            {
                id: 2,
                author: "Sara Bekele",
                avatar: "https://picsum.photos/40?random=2",
                text: "Great introduction! Very clear and helpful.",
                time: "1 week ago",
                likes: 23,
            },
            {
                id: 3,
                author: "Daniel Girma",
                avatar: "https://picsum.photos/40?random=3",
                text: "Can you make a video about advanced features?",
                time: "2 weeks ago",
                likes: 15,
            },
        ],
    },
    {
        id: 2,
        title: "How to Find Perfect Tutors",
        description:
            "Step-by-step guide on finding and connecting with the best tutors for your learning needs. Tips on evaluating tutor profiles and scheduling sessions.",
        duration: "8:15",
        views: "8.5K",
        category: "tutorials",
        likes: 412,
        dislikes: 8,
        comments: [
            {
                id: 4,
                author: "Marta Alemu",
                avatar: "https://picsum.photos/40?random=4",
                text: "Found my math tutor using these tips!",
                time: "3 days ago",
                likes: 67,
            },
            {
                id: 5,
                author: "Yohannes Haile",
                avatar: "https://picsum.photos/40?random=5",
                text: "Very informative tutorial",
                time: "5 days ago",
                likes: 34,
            },
        ],
    },
    {
        id: 3,
        title: "Student Success Story - Sara",
        description:
            "Sara shares her inspiring journey of improving grades from C to A+ with the help of Astegni tutors. Learn about her study strategies and tips.",
        duration: "6:30",
        views: "15K",
        category: "success",
        likes: 892,
        dislikes: 5,
        comments: [
            {
                id: 6,
                author: "Tigist Mengistu",
                avatar: "https://picsum.photos/40?random=6",
                text: "So inspiring! Congratulations Sara!",
                time: "1 day ago",
                likes: 123,
            },
            {
                id: 7,
                author: "Kebede Wolde",
                avatar: "https://picsum.photos/40?random=7",
                text: "This motivated me to work harder",
                time: "4 days ago",
                likes: 89,
            },
            {
                id: 8,
                author: "Helen Tesfaye",
                avatar: "https://picsum.photos/40?random=8",
                text: "Which tutor did you use for math?",
                time: "1 week ago",
                likes: 45,
            },
        ],
    },
    {
        id: 4,
        title: "Advanced Math Techniques",
        description:
            "Master advanced mathematical concepts with proven problem-solving techniques. Perfect for high school and university students.",
        duration: "12:45",
        views: "5K",
        category: "courses",
        likes: 234,
        dislikes: 15,
        comments: [
            {
                id: 9,
                author: "Solomon Assefa",
                avatar: "https://picsum.photos/40?random=9",
                text: "Best math tutorial on the platform!",
                time: "6 hours ago",
                likes: 78,
            },
        ],
    },
    {
        id: 5,
        title: "Study Tips for Exams",
        description:
            "Effective study strategies and time management tips to ace your exams. Learn how to prepare efficiently and reduce exam anxiety.",
        duration: "7:20",
        views: "20K",
        category: "tips",
        likes: 1523,
        dislikes: 23,
        comments: [
            {
                id: 10,
                author: "Bethlehem Kassa",
                avatar: "https://picsum.photos/40?random=10",
                text: "These tips helped me pass my finals!",
                time: "2 days ago",
                likes: 234,
            },
            {
                id: 11,
                author: "Dawit Lemma",
                avatar: "https://picsum.photos/40?random=11",
                text: "Please make more videos like this",
                time: "3 days ago",
                likes: 112,
            },
        ],
    },
    {
        id: 6,
        title: "Online Learning Best Practices",
        description:
            "Get the most out of online learning with these proven strategies. Tips for staying focused and engaged during virtual classes.",
        duration: "9:10",
        views: "12K",
        category: "tutorials",
        likes: 678,
        dislikes: 19,
        comments: [],
    },
    {
        id: 7,
        title: "Fun Learning Games",
        description:
            "Make learning enjoyable with these educational games and activities. Perfect for young learners and interactive study sessions.",
        duration: "10:15",
        views: "25K",
        category: "entertainment",
        likes: 2134,
        dislikes: 45,
        comments: [],
    },
    {
        id: 8,
        title: "Educational Comedy Sketches",
        description:
            "Learn while you laugh! Educational content presented in fun and memorable comedy sketches.",
        duration: "15:30",
        views: "30K",
        category: "entertainment",
        likes: 3456,
        dislikes: 67,
        comments: [],
    },
];

// ============================================
//   INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Check for saved user session first
        const savedUser = localStorage.getItem("currentUser");
        const savedRole = localStorage.getItem("userRole");
        const savedToken = localStorage.getItem("token");

        if (savedUser && savedRole && savedToken) {
            try {
                APP_STATE.currentUser = JSON.parse(savedUser);
                APP_STATE.userRole = savedRole;
                APP_STATE.isLoggedIn = true;

                // Verify token is still valid
                const isValid = await window.AuthManager.verifyToken();
                if (isValid) {
                    updateUIForLoggedInUser();
                    updateProfileLink(savedRole);
                } else {
                    // Token invalid, clear session
                    window.AuthManager.clearAuth();
                }
            } catch (error) {
                console.error("Session restoration error:", error);
                window.AuthManager.clearAuth();
            }
        }

        // Initialize navigation authentication checks
        initializeNavigationAuth();

        // Rest of your initialization code...
        initializeTheme();
        initializeNavigation();
        initializeHeroSection();
        initializeCounters();
        initializeNewsSection();
        initializeVideoCarousel();
        initializeCourses();
        initializeTestimonials();
        initializePartners();
        initializeModals();
        initializeScrollEffects();
        initializeFormValidation();
        initializeSearch();
        initializeNotifications();
        initializeTooltips();
        initializeLazyLoading();

        // Load real data
        await loadRealData();

        // Hide loading screen
        // Replace the existing loading screen timeout with this:
        setTimeout(() => {
            const loadingScreen = document.getElementById("loading-screen");
            if (loadingScreen) {
                loadingScreen.classList.add("fade-out");

                // Add staggered animations to main content
                document.body.style.overflow = "hidden";

                setTimeout(() => {
                    loadingScreen.style.display = "none";
                    document.body.style.overflow = "";

                    // Animate content sections in sequence
                    const sections = document.querySelectorAll(
                        ".hero-section, .features-section, .news-section"
                    );
                    sections.forEach((section, index) => {
                        section.style.opacity = "0";
                        section.style.transform = "translateY(30px)";
                        setTimeout(() => {
                            section.style.transition =
                                "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
                            section.style.opacity = "1";
                            section.style.transform = "translateY(0)";
                        }, index * 150);
                    });
                }, 600);
            }
        }, 3000);
    } catch (error) {
        console.error("Initialization error:", error);
    }
});

// ============================================
//   LOAD REAL DATA FROM YOUR BACKEND
// ============================================

async function loadRealData() {
    try {
        // Load counters
        const countersResponse = await apiCall("/api/counters");
        if (countersResponse.ok) {
            const counters = await countersResponse.json();
            counters.forEach((counter) => {
                const element = document.getElementById(
                    `counter-${counter.counter_type}`
                );
                if (element) {
                    // Use the animation function from your existing code
                    animateCounter(element, counter.count, "+");
                }
            });
        }

        // Load news
        const newsResponse = await apiCall("/api/news");
        if (newsResponse.ok) {
            const newsItems = await newsResponse.json();
            // Update your news section with real data
            if (newsItems.length > 0 && window.updateNewsWithRealData) {
                window.updateNewsWithRealData(newsItems);
            }
        }

        // Load videos
        const videosResponse = await apiCall("/api/videos");
        if (videosResponse.ok) {
            const videos = await videosResponse.json();
            // Update your video carousel with real data
            if (videos.length > 0 && window.updateVideosWithRealData) {
                window.updateVideosWithRealData(videos);
            }
        }

        // Load partners
        const partnersResponse = await apiCall("/api/partners");
        if (partnersResponse.ok) {
            const partners = await partnersResponse.json();
            // Update partners section
            if (partners.length > 0 && window.updatePartnersWithRealData) {
                window.updatePartnersWithRealData(partners);
            }
        }

        // Load courses
        const coursesResponse = await apiCall("/api/courses");
        if (coursesResponse.ok) {
            const courses = await coursesResponse.json();
            // Update courses section
            if (courses.length > 0 && window.updateCoursesWithRealData) {
                window.updateCoursesWithRealData(courses);
            }
        }

        // Load testimonials
        const testimonialsResponse = await apiCall("/api/testimonials");
        if (testimonialsResponse.ok) {
            const testimonials = await testimonialsResponse.json();
            // Update testimonials section
            if (testimonials.length > 0 && window.updateTestimonialsWithRealData) {
                window.updateTestimonialsWithRealData(testimonials);
            }
        }
    } catch (error) {
        console.error("Failed to load data:", error);
    }
}

function showRoleSwitcher() {
    if (APP_STATE.currentUser?.roles?.length > 1) {
        // Show role switcher in UI
        const switcher = `
            <select onchange="switchRole(this.value)">
                ${APP_STATE.currentUser.roles
                .map(
                    (role) =>
                        `<option value="${role}" ${role === APP_STATE.userRole ? "selected" : ""
                        }>${role}</option>`
                )
                .join("")}
            </select>
        `;
        // Add to navigation or profile dropdown
    }
}

async function switchRole(newRole) {
    const response = await fetch("http://localhost:8000/api/switch-role", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ new_role: newRole }),
    });

    if (response.ok) {
        APP_STATE.userRole = newRole;
        updateProfileLink(newRole);
        showToast(`Switched to ${newRole} role`, "success");
    }
}

// Initialize on page load - check if user is already logged in
document.addEventListener("DOMContentLoaded", () => {
    // Check for saved user session
    const savedUser = localStorage.getItem("currentUser");
    const savedRole = localStorage.getItem("userRole");

    if (savedUser && savedRole) {
        APP_STATE.currentUser = JSON.parse(savedUser);
        APP_STATE.userRole = savedRole;
        APP_STATE.isLoggedIn = true;

        updateUIForLoggedInUser();
        updateProfileLink(savedRole);
    }
});

// Authentication Manager
// Replace the AuthManager section in index.js (around lines 370-385) with this:

// Authentication Manager - Fixed version
const AuthManager = {
    async verifyAndRestoreAuth() {
        // Call the actual AuthManager from auth.js
        if (window.AuthManager && window.AuthManager.restoreSession) {
            return await window.AuthManager.restoreSession();
        }
        return false;
    },

    clearAuth() {
        // Call the actual AuthManager from auth.js WITHOUT reassigning
        if (window.AuthManager && window.AuthManager.clearAuth) {
            // Call the original clearAuth from auth.js
            window.AuthManager.clearAuth();
        }
    },
};

// ============================================
//   THEME MANAGEMENT
// ============================================
function initializeTheme() {
    const theme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);
    updateThemeIcons(theme);

    // Attach theme toggle to buttons
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    const mobileThemeToggleBtn = document.getElementById(
        "mobile-theme-toggle-btn"
    );

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", toggleTheme);
    }
    if (mobileThemeToggleBtn) {
        mobileThemeToggleBtn.addEventListener("click", toggleTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";

    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    APP_STATE.theme = newTheme;

    updateThemeIcons(newTheme);
    showToast("Theme changed to " + newTheme + " mode", "info");
}

function updateThemeIcons(theme) {
    const iconPath =
        theme === "light"
            ? "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            : "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z";

    const themeIcon = document.querySelector("#theme-icon path");
    const mobileThemeIcon = document.querySelector("#mobile-theme-icon path");

    if (themeIcon) themeIcon.setAttribute("d", iconPath);
    if (mobileThemeIcon) mobileThemeIcon.setAttribute("d", iconPath);
}

// ============================================
//   NAVIGATION
// ============================================
function initializeNavigation() {
    const navbar = document.querySelector(".navbar");
    const menuBtn = document.getElementById("menu-btn");
    const mobileMenu = document.getElementById("mobile-menu");

    // Navbar scroll effect
    window.addEventListener("scroll", () => {
        if (window.scrollY > CONFIG.SCROLL_THRESHOLD) {
            navbar?.classList.add("scrolled");
        } else {
            navbar?.classList.remove("scrolled");
        }
    });

    // Mobile menu toggle
    if (menuBtn) {
        menuBtn.addEventListener("click", () => {
            menuBtn.classList.toggle("active");
            mobileMenu?.classList.toggle("hidden");
            document.body.style.overflow = mobileMenu?.classList.contains("hidden")
                ? ""
                : "hidden";
        });
    }

    // Close mobile menu on link click
    document.querySelectorAll(".mobile-menu-item").forEach((item) => {
        item.addEventListener("click", () => {
            menuBtn?.classList.remove("active");
            mobileMenu?.classList.add("hidden");
            document.body.style.overflow = "";
        });
    });
}

// ============================================
//   HERO SECTION
// ============================================
function initializeHeroSection() {
    // Hero text typing animation with original texts
    const heroTexts = [
        "Discover Expert Tutors with Astegni",
        "Are you a tutor?",
        "Join us and connect with millions of students worldwide!",
        "Astegni",
        "Pride of Black Lion",
        "Advertise with us",
        "and",
        "reach highly targeted audiences",
        "Astegni - Ethiopia's first social media platform!",
        "Contributing in realizing Digital Ethiopia!",
        "Learn with us",
        "Connect with tutors and training centers!",
        "Want to become a tutor?",
        "Join, learn and earn!",
        "Looking for a job?",
        "Same!",
        "Expert tutors?",
        "Just one click away!",
        "Learn Anytime, Anywhere",
        "Top Educators, books and jobs!",
        "Astegni - Your Learning Partner",
        "Empowering Education in Ethiopia",
    ];

    let textIndex = 0;
    const textElement = document.getElementById("hero-text-content");

    if (textElement) {
        typeWriterEffect(textElement, heroTexts, textIndex);
    }

    // Particle animation
    createParticles();

    // Hero slideshow background
    initializeHeroSlideshow();

    // Initialize counter reduction on scroll
    initializeCounterScrollEffect();

    // Hero button event listeners
    const heroLoginBtn = document.getElementById("hero-login-btn");
    const heroRegisterBtn = document.getElementById("hero-register-btn");

    if (heroLoginBtn) {
        heroLoginBtn.addEventListener("click", () => openModal("login-modal"));
    }
    if (heroRegisterBtn) {
        heroRegisterBtn.addEventListener("click", () =>
            openModal("register-modal")
        );
    }
}

function typeWriterEffect(element, texts, index) {
    if (!element || !texts || texts.length === 0) return;

    const text = texts[index];
    let charIndex = 0;
    element.textContent = "";

    const typeInterval = setInterval(() => {
        if (charIndex < text.length) {
            element.textContent += text[charIndex];
            charIndex++;
        } else {
            clearInterval(typeInterval);
            setTimeout(() => {
                deleteText(element, texts, index);
            }, 3000);
        }
    }, CONFIG.TYPING_SPEED);
}

function deleteText(element, texts, index) {
    if (!element) return;

    const deleteInterval = setInterval(() => {
        if (element.textContent.length > 0) {
            element.textContent = element.textContent.slice(0, -1);
        } else {
            clearInterval(deleteInterval);
            const nextIndex = (index + 1) % texts.length;
            typeWriterEffect(element, texts, nextIndex);
        }
    }, 50);
}

function createParticles() {
    const container = document.getElementById("hero-particles");
    if (!container) return;

    for (let i = 0; i < 20; i++) {
        const particle = document.createElement("div");
        particle.className = "particle";
        particle.style.left = Math.random() * 100 + "%";
        particle.style.width = Math.random() * 10 + 5 + "px";
        particle.style.height = particle.style.width;
        particle.style.animationDelay = Math.random() * 20 + "s";
        particle.style.animationDuration = Math.random() * 20 + 20 + "s";
        container.appendChild(particle);
    }
}

function initializeHeroSlideshow() {
    const images = [
        "https://picsum.photos/1920/1080?random=1",
        "https://picsum.photos/1920/1080?random=2",
        "https://picsum.photos/1920/1080?random=3",
    ];

    let currentImage = 0;
    const heroSection = document.querySelector(".hero-slideshow");

    if (heroSection) {
        setInterval(() => {
            currentImage = (currentImage + 1) % images.length;
            heroSection.style.backgroundImage = `url(${images[currentImage]})`;
        }, 7000);
    }
}

// ============================================
//   COUNTERS WITH SCROLL EFFECT
// ============================================
function initializeCounters() {
    const counters = [
        { id: "counter-parents", target: 1000, current: 0, suffix: "+" },
        { id: "counter-students", target: 5000, current: 0, suffix: "+" },
        { id: "counter-tutors", target: 300, current: 0, suffix: "+" },
        { id: "counter-centers", target: 50, current: 0, suffix: "+" },
        { id: "counter-books", target: 100, current: 0, suffix: "+" },
        { id: "counter-jobs", target: 10, current: 0, suffix: "+" },
    ];

    const observerOptions = {
        threshold: 0.5,
        rootMargin: "0px",
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const counter = counters.find((c) => c.id === entry.target.id);
                if (counter && counter.current === 0) {
                    animateCounter(entry.target, counter.target, counter.suffix);
                    counter.current = counter.target;
                }
            }
        });
    }, observerOptions);

    counters.forEach((counter) => {
        const element = document.getElementById(counter.id);
        if (element) observer.observe(element);
    });

    // Store counters globally for scroll effect
    window.countersData = counters;
}

function initializeCounterScrollEffect() {
    const heroSection = document.querySelector(".hero-section");
    let hasScrolledOut = false;
    let isResetting = false;

    window.addEventListener("scroll", () => {
        if (!heroSection || !window.countersData) return;

        const rect = heroSection.getBoundingClientRect();
        const isVisible = rect.bottom > 0;

        // When hero section scrolls out of view
        if (!isVisible && !hasScrolledOut) {
            hasScrolledOut = true;
            // Reduce counters to half
            window.countersData.forEach((counter) => {
                const element = document.getElementById(counter.id);
                if (element) {
                    const halfValue = Math.floor(counter.target / 2);
                    element.textContent = halfValue.toLocaleString() + counter.suffix;
                    counter.current = halfValue;
                }
            });
        }

        // When hero section comes back into view
        if (isVisible && hasScrolledOut && !isResetting) {
            hasScrolledOut = false;
            isResetting = true;
            // Animate counters from half to full
            window.countersData.forEach((counter) => {
                const element = document.getElementById(counter.id);
                if (element) {
                    animateCounterFromValue(
                        element,
                        counter.current,
                        counter.target,
                        counter.suffix
                    );
                    counter.current = counter.target;
                }
            });
            setTimeout(() => {
                isResetting = false;
            }, 2000);
        }
    });
}

function animateCounter(element, target, suffix) {
    if (!element) return;

    let current = 0;
    const increment = target / (CONFIG.COUNTER_DURATION / 16);

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString() + suffix;
    }, 16);
}

function animateCounterFromValue(element, start, target, suffix) {
    if (!element) return;

    let current = start;
    const increment = (target - start) / (CONFIG.COUNTER_DURATION / 16);

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString() + suffix;
    }, 16);
}

// ============================================
//   NEWS SECTION WITH TYPING ANIMATION
// ============================================
function initializeNewsSection() {
    const newsItems = [
        {
            title: "New AI-Powered Learning Features Launched",
            content:
                "Experience personalized learning with our new AI tutor assistant, helping you learn 3x faster with customized study plans.",
            category: "Technology",
            date: "Today",
        },
        {
            title: "Partnership with Top Universities",
            content:
                "We've partnered with 10 leading universities to bring you certified courses and direct admission opportunities.",
            category: "Partnership",
            date: "Yesterday",
        },
        {
            title: "Student Success Rate Hits 95%",
            content:
                "Our latest report shows that 95% of students improved their grades within 3 months of joining Astegni.",
            category: "Achievement",
            date: "2 days ago",
        },
    ];

    let currentNewsIndex = 0;
    const titleElement = document.getElementById("news-title-content");
    const contentElement = document.getElementById("news-content-text");

    if (titleElement && contentElement) {
        typeNewsItem(
            newsItems[currentNewsIndex],
            titleElement,
            contentElement,
            () => {
                setInterval(() => {
                    currentNewsIndex = (currentNewsIndex + 1) % newsItems.length;
                    deleteNewsItem(titleElement, contentElement, () => {
                        typeNewsItem(
                            newsItems[currentNewsIndex],
                            titleElement,
                            contentElement
                        );
                    });
                }, 8000);
            }
        );
    }
}

function typeNewsItem(news, titleEl, contentEl, callback) {
    if (!titleEl || !contentEl) return;

    let titleIndex = 0;
    let contentIndex = 0;

    // Type title
    const typeTitle = setInterval(() => {
        if (titleIndex < news.title.length) {
            titleEl.textContent = news.title.substring(0, titleIndex + 1);
            titleIndex++;
        } else {
            clearInterval(typeTitle);
            // Start typing content
            const typeContent = setInterval(() => {
                if (contentIndex < news.content.length) {
                    contentEl.textContent = news.content.substring(0, contentIndex + 1);
                    contentIndex++;
                } else {
                    clearInterval(typeContent);
                    if (callback) callback();
                }
            }, 50);
        }
    }, 80);
}

function deleteNewsItem(titleEl, contentEl, callback) {
    if (!titleEl || !contentEl) return;

    // Delete content first
    const deleteContent = setInterval(() => {
        if (contentEl.textContent.length > 0) {
            contentEl.textContent = contentEl.textContent.slice(0, -1);
        } else {
            clearInterval(deleteContent);
            // Delete title
            const deleteTitle = setInterval(() => {
                if (titleEl.textContent.length > 0) {
                    titleEl.textContent = titleEl.textContent.slice(0, -1);
                } else {
                    clearInterval(deleteTitle);
                    if (callback) callback();
                }
            }, 30);
        }
    }, 20);
}

// ============================================
//   ENHANCED VIDEO CAROUSEL WITH COMMENTS
// ============================================
function initializeVideoCarousel() {
    const carousel = document.getElementById("video-carousel");
    if (!carousel) return;

    // Clear existing content
    carousel.innerHTML = "";

    // Generate video cards
    VIDEO_DATA.forEach((video, index) => {
        const card = createVideoCard(video, index);
        carousel.appendChild(card);
    });

    // Duplicate for seamless loop
    VIDEO_DATA.forEach((video, index) => {
        const card = createVideoCard(video, index);
        carousel.appendChild(card);
    });

    // Set up carousel navigation
    let currentPosition = 0;
    const cardWidth = 320 + 24; // card width + gap
    const totalCards = VIDEO_DATA.length;

    // Make navigateCarousel available globally
    window.navigateCarousel = function (direction) {
        if (!carousel) return;

        if (direction === "left") {
            currentPosition = Math.max(0, currentPosition - 1);
        } else {
            currentPosition = Math.min(totalCards - 1, currentPosition + 1);
        }

        const scrollAmount = currentPosition * cardWidth;
        carousel.style.transform = `translateX(-${scrollAmount}px)`;
    };

    // Auto-scroll
    setInterval(() => {
        currentPosition = (currentPosition + 1) % totalCards;
        if (currentPosition === 0) {
            // Reset without animation
            carousel.style.transition = "none";
            carousel.style.transform = "translateX(0)";
            setTimeout(() => {
                carousel.style.transition = "transform 0.5s ease";
            }, 50);
        } else {
            carousel.style.transform = `translateX(-${currentPosition * cardWidth
                }px)`;
        }
    }, 5000);

    // Category filters
    document.querySelectorAll(".category-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            document
                .querySelector(".category-btn.active")
                ?.classList.remove("active");
            e.target.classList.add("active");
            filterVideos(e.target.dataset.category);
        });
    });
}

function createVideoCard(video, index) {
    const card = document.createElement("div");
    card.className = "video-card";
    card.dataset.category = video.category;
    card.innerHTML = `
        <div class="video-thumbnail">
            <div class="video-play-btn">
                <svg width="20" height="20" fill="var(--button-bg)" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </div>
        </div>
        <div class="video-info">
            <h4 class="video-title">${video.title}</h4>
            <p class="video-description">${video.description.substring(
        0,
        100
    )}...</p>
            <div class="video-meta">
                <span class="video-views">${video.views} views</span>
                <span class="video-duration">${video.duration}</span>
            </div>
        </div>
    `;

    card.addEventListener("click", () => openVideoPlayer(video));
    return card;
}

function filterVideos(category) {
    const cards = document.querySelectorAll(".video-card");
    cards.forEach((card) => {
        if (category === "all" || card.dataset.category === category) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

// ============================================
//   ENHANCED VIDEO PLAYER WITH COMMENTS
// ============================================
function openVideoPlayer(video) {
    APP_STATE.currentVideo = video;

    // Update video title and description
    const titleEl = document.getElementById("video-title");
    const descEl = document.getElementById("video-description");

    if (titleEl) titleEl.textContent = video.title;
    if (descEl) descEl.textContent = video.description;

    // Load comments
    loadVideoComments(video);

    // Open modal
    openModal("video-player-modal");

    showToast("Loading video...", "info");
}

function loadVideoComments(video) {
    const commentsList = document.getElementById("comments-list");
    if (!commentsList) return;

    commentsList.innerHTML = "";

    if (video.comments && video.comments.length > 0) {
        video.comments.forEach((comment) => {
            const commentEl = createCommentElement(comment);
            commentsList.appendChild(commentEl);
        });
    } else {
        commentsList.innerHTML =
            '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No comments yet. Be the first to comment!</p>';
    }
}

function createCommentElement(comment) {
    const div = document.createElement("div");
    div.className = "comment-item";
    div.innerHTML = `
        <img src="${comment.avatar}" alt="${comment.author
        }" class="comment-avatar">
        <div class="comment-content">
            <div class="comment-header">
                <span class="comment-author">${comment.author}</span>
                <span class="comment-time">${comment.time}</span>
            </div>
            <p class="comment-text">${comment.text}</p>
            <div class="comment-footer">
                <button class="comment-like">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
                    </svg>
                    ${comment.likes || 0}
                </button>
                <button class="comment-dislike">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"></path>
                    </svg>
                </button>
                <button class="comment-reply">Reply</button>
            </div>
        </div>
    `;
    return div;
}

// YouTube-style comment box expansion
function expandCommentBox() {
    const input = document.getElementById("comment-input");
    const actions = document.getElementById("comment-actions");

    if (input) {
        input.classList.add("expanded");
        input.style.minHeight = "80px";
    }
    if (actions) {
        actions.classList.remove("hidden");
    }
}

function collapseCommentBox() {
    const input = document.getElementById("comment-input");
    const actions = document.getElementById("comment-actions");

    if (input) {
        input.classList.remove("expanded");
        input.style.minHeight = "";
        input.value = "";
    }
    if (actions) {
        actions.classList.add("hidden");
    }
}

function submitComment() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to comment", "warning");
        openModal("login-modal");
        // Make login modal appear in front
        const loginModal = document.getElementById("login-modal");
        if (loginModal) loginModal.classList.add("front");
        return;
    }

    const input = document.getElementById("comment-input");
    if (!input || !input.value.trim()) {
        showToast("Please write a comment", "warning");
        return;
    }

    // Create new comment
    const newComment = {
        id: Date.now(),
        author: APP_STATE.currentUser?.name || "You",
        avatar: "https://picsum.photos/40?random=" + Date.now(),
        text: input.value.trim(),
        time: "Just now",
        likes: 0,
    };

    // Add to current video's comments
    if (APP_STATE.currentVideo) {
        if (!APP_STATE.currentVideo.comments) {
            APP_STATE.currentVideo.comments = [];
        }
        APP_STATE.currentVideo.comments.unshift(newComment);

        // Refresh comments display
        loadVideoComments(APP_STATE.currentVideo);
    }

    // Clear input
    collapseCommentBox();
    showToast("Comment posted!", "success");
}

function likeVideo() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to like videos", "warning");
        openModal("login-modal");
        const loginModal = document.getElementById("login-modal");
        if (loginModal) loginModal.classList.add("front");
        return;
    }
    showToast("Video liked!", "success");
}

function dislikeVideo() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to rate videos", "warning");
        openModal("login-modal");
        const loginModal = document.getElementById("login-modal");
        if (loginModal) loginModal.classList.add("front");
        return;
    }
    showToast("Feedback recorded", "info");
}

function shareVideo() {
    // Open share modal instead of just showing toast
    openModal("share-modal");
}

function toggleSaveMenu() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to save videos", "warning");
        // Make sure login modal appears in front of video modal
        const videoModal = document.getElementById("video-player-modal");
        const loginModal = document.getElementById("login-modal");

        if (loginModal) {
            loginModal.classList.add("front");
            openModal("login-modal");
        }
        return;
    }

    const menu = document.getElementById("save-menu");
    if (menu) {
        menu.classList.toggle("hidden");
    }
}

function saveToFavorites() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to save to favorites", "warning");
        openModal("login-modal");
        const loginModal = document.getElementById("login-modal");
        if (loginModal) loginModal.classList.add("front");
        return;
    }

    showToast("Video saved to favorites!", "success");
    const menu = document.getElementById("save-menu");
    if (menu) menu.classList.add("hidden");
}

function createPlaylist() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to create playlists", "warning");
        openModal("login-modal");
        const loginModal = document.getElementById("login-modal");
        if (loginModal) loginModal.classList.add("front");
        return;
    }

    const playlistName = prompt("Enter playlist name:");
    if (playlistName) {
        showToast(`Playlist "${playlistName}" created!`, "success");
    }
    const menu = document.getElementById("save-menu");
    if (menu) menu.classList.add("hidden");
}

function addToPlaylist() {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to add to playlist", "warning");
        openModal("login-modal");
        const loginModal = document.getElementById("login-modal");
        if (loginModal) loginModal.classList.add("front");
        return;
    }

    showToast("Select a playlist to add this video", "info");
    const menu = document.getElementById("save-menu");
    if (menu) menu.classList.add("hidden");
}

function navigateVideo(direction) {
    showToast(`Loading ${direction} video...`, "info");
}

// Share functionality
function copyShareLink() {
    const input = document.getElementById("share-link");
    if (input) {
        input.select();
        document.execCommand("copy");
        showToast("Link copied to clipboard!", "success");
    }
}

function shareToSocial(platform) {
    const shareUrl =
        document.getElementById("share-link")?.value ||
        "https://astegni.et/video/12345";
    const shareText =
        APP_STATE.currentVideo?.title || "Check out this amazing video on Astegni!";

    let url = "";
    switch (platform) {
        case "facebook":
            url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                shareUrl
            )}`;
            break;
        case "twitter":
            url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
                shareUrl
            )}&text=${encodeURIComponent(shareText)}`;
            break;
        case "whatsapp":
            url = `https://wa.me/?text=${encodeURIComponent(
                shareText + " " + shareUrl
            )}`;
            break;
        case "telegram":
            url = `https://t.me/share/url?url=${encodeURIComponent(
                shareUrl
            )}&text=${encodeURIComponent(shareText)}`;
            break;
        case "linkedin":
            url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
                shareUrl
            )}`;
            break;
        case "email":
            url = `mailto:?subject=${encodeURIComponent(
                shareText
            )}&body=${encodeURIComponent("Check out this video: " + shareUrl)}`;
            break;
    }

    if (url) {
        window.open(url, "_blank");
        showToast(`Sharing to ${platform}...`, "info");
    }
}

// ============================================
//   COURSES WITH FLIP CARDS AND DETAILS (8 CARDS)
// ============================================
function initializeCourses() {
    const coursesData = [
        {
            title: "Mathematics",
            icon: "📐",
            category: "tech",
            level: "Beginner",
            students: "2.5K",
            rating: "4.8",
            backTitle: "Religious Studies",
            backIcon: "⛪",
            backLevel: "All Levels",
            backStudents: "1.2K",
            backRating: "4.9",
        },
        {
            title: "Physics",
            icon: "⚛️",
            category: "tech",
            level: "Intermediate",
            students: "1.8K",
            rating: "4.9",
            backTitle: "Programming",
            backIcon: "💻",
            backLevel: "Beginner",
            backStudents: "5K",
            backRating: "5.0",
        },
        {
            title: "Chemistry",
            icon: "🧪",
            category: "tech",
            level: "Advanced",
            students: "1.2K",
            rating: "4.7",
            backTitle: "Sports Training",
            backIcon: "🏃",
            backLevel: "All Levels",
            backStudents: "800",
            backRating: "4.6",
        },
        {
            title: "Music",
            icon: "🎵",
            category: "arts",
            level: "Beginner",
            students: "3K",
            rating: "4.8",
            backTitle: "Culinary Arts",
            backIcon: "🍳",
            backLevel: "Intermediate",
            backStudents: "600",
            backRating: "4.7",
        },
        {
            title: "English",
            icon: "🇬🇧",
            category: "language",
            level: "All Levels",
            students: "4K",
            rating: "4.9",
            backTitle: "Chinese",
            backIcon: "🇨🇳",
            backLevel: "Beginner",
            backStudents: "1.5K",
            backRating: "4.8",
        },
        {
            title: "Business",
            icon: "📊",
            category: "business",
            level: "Intermediate",
            students: "2K",
            rating: "4.8",
            backTitle: "Marketing",
            backIcon: "🎯",
            backLevel: "Advanced",
            backStudents: "1.8K",
            backRating: "4.9",
        },
        {
            title: "Photography",
            icon: "📸",
            category: "arts",
            level: "All Levels",
            students: "1.5K",
            rating: "4.7",
            backTitle: "Graphic Design",
            backIcon: "🎨",
            backLevel: "Intermediate",
            backStudents: "2.2K",
            backRating: "4.8",
        },
        {
            title: "History",
            icon: "🏛️",
            category: "arts",
            level: "Beginner",
            students: "900",
            rating: "4.6",
            backTitle: "Geography",
            backIcon: "🌍",
            backLevel: "All Levels",
            backStudents: "1.1K",
            backRating: "4.7",
        },
    ];

    const container = document.getElementById("courses-container");
    if (!container) return;

    container.innerHTML = "";

    coursesData.forEach((course, index) => {
        const card = document.createElement("div");
        card.className = "course-flip-card";
        card.dataset.category = course.category;
        card.innerHTML = `
            <div class="course-flip-inner">
                <div class="course-flip-front">
                    <div class="course-flip-icon">${course.icon}</div>
                    <h3 class="course-flip-title">${course.title}</h3>
                    <div class="course-flip-details">
                        <p class="course-flip-level">${course.level}</p>
                        <div class="course-flip-stats">
                            <span class="course-flip-stat">
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                                ${course.students}
                            </span>
                            <span class="course-flip-stat course-rating">
                                ⭐ ${course.rating}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="course-flip-back">
                    <div class="course-flip-icon">${course.backIcon}</div>
                    <h3 class="course-flip-title">${course.backTitle}</h3>
                    <div class="course-flip-details">
                        <p class="course-flip-level">${course.backLevel}</p>
                        <div class="course-flip-stats">
                            <span class="course-flip-stat">
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                                ${course.backStudents}
                            </span>
                            <span class="course-flip-stat">
                                ⭐ ${course.backRating}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        card.addEventListener("click", () => handleCourseClick(course));
        container.appendChild(card);
    });

    // Course filters
    document.querySelectorAll(".filter-chip").forEach((chip) => {
        chip.addEventListener("click", (e) => {
            document.querySelector(".filter-chip.active")?.classList.remove("active");
            e.target.classList.add("active");
            filterCourses(e.target.dataset.filter);
        });
    });
}

function filterCourses(filter) {
    const cards = document.querySelectorAll(".course-flip-card");
    cards.forEach((card) => {
        if (filter === "all" || card.dataset.category === filter) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

function handleCourseClick(course) {
    if (!APP_STATE.isLoggedIn) {
        showToast("Please login to access this course", "warning");
        openModal("login-modal");
    } else {
        showToast(`Opening ${course.title} course...`, "info");
    }
}

function handleViewMoreCourses() {
    if (!APP_STATE.isLoggedIn) {
        openModal("login-modal");
    } else {
        window.location.href = "/courses";
    }
}

// ============================================
//   TESTIMONIALS WITH ZOOM ANIMATION
// ============================================
function initializeTestimonials() {
    const testimonialData = [
        {
            text: "Astegni helped me find the perfect math tutor. My grades improved from C to A in just 3 months!",
            author: "Sara Tadesse",
            role: "Grade 12 Student",
            avatar: "https://picsum.photos/60",
        },
        {
            text: "As a tutor, Astegni gave me the platform to reach students nationwide. I now teach over 50 students online!",
            author: "Daniel Bekele",
            role: "Physics Tutor",
            avatar: "https://picsum.photos/61",
        },
        {
            text: "The variety of courses and quality of instructors on Astegni is unmatched. Best investment in my child's education!",
            author: "Marta Alemu",
            role: "Parent",
            avatar: "https://picsum.photos/62",
        },
        {
            text: "I found my dream job through Astegni's job portal. The platform is truly life-changing!",
            author: "Yohannes Girma",
            role: "Software Developer",
            avatar: "https://picsum.photos/63",
        },
        {
            text: "Our training center reached 10x more students after joining Astegni. Highly recommended!",
            author: "Tigist Haile",
            role: "Training Center Director",
            avatar: "https://picsum.photos/64",
        },
        {
            text: "The online learning tools and resources are amazing. I can learn at my own pace!",
            author: "Abebe Mengistu",
            role: "University Student",
            avatar: "https://picsum.photos/65",
        },
    ];

    let currentSet = 0;
    const slider = document.getElementById("testimonials-slider");

    if (!slider) return;

    function updateTestimonials() {
        slider.innerHTML = "";
        const startIndex = currentSet * 3;

        for (let i = 0; i < 3; i++) {
            const testimonial =
                testimonialData[(startIndex + i) % testimonialData.length];
            const card = document.createElement("div");
            card.className = "testimonial-card active";
            card.innerHTML = `
                <div class="testimonial-content">
                    <div class="quote-icon">"</div>
                    <p class="testimonial-text">${testimonial.text}</p>
                    <div class="testimonial-author">
                        <img src="${testimonial.avatar}" alt="${testimonial.author}" class="author-avatar">
                        <div class="author-info">
                            <h4>${testimonial.author}</h4>
                            <p>${testimonial.role}</p>
                            <div class="rating">⭐⭐⭐⭐⭐</div>
                        </div>
                    </div>
                </div>
            `;
            slider.appendChild(card);
        }

        // Restart animation
        setTimeout(() => {
            document.querySelectorAll(".testimonial-card").forEach((card, index) => {
                card.style.animationDelay = `${index * 0.3}s`;
            });
        }, 100);
    }

    updateTestimonials();

    // Change testimonials every 9 seconds
    setInterval(() => {
        currentSet = (currentSet + 1) % Math.ceil(testimonialData.length / 3);
        updateTestimonials();
    }, 9000);
}

// ============================================
//   PARTNERS
// ============================================
function initializePartners() {
    const partners = [
        "telebirr",
        "Google",
        "Microsoft",
        "Coursera",
        "Addis Ababa University",
        "Amazon",
        "Meta",
        "LinkedIn Learning",
    ];

    const track = document.getElementById("partners-track");
    if (!track) return;

    track.innerHTML = "";

    // Create partner logos
    partners.forEach((partner) => {
        const logo = document.createElement("div");
        logo.className = "partner-logo";
        logo.textContent = partner;
        track.appendChild(logo);
    });

    // Duplicate for seamless scroll
    partners.forEach((partner) => {
        const logo = document.createElement("div");
        logo.className = "partner-logo";
        logo.textContent = partner;
        track.appendChild(logo);
    });
}

// ============================================
//   MODALS
// ============================================
function initializeModals() {
    // Close modal on overlay click
    document.querySelectorAll(".modal").forEach((modal) => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // Initialize form submissions
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

    if (registerForm) {
        registerForm.addEventListener("submit", handleRegister);
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
        setTimeout(() => modal.classList.add("active"), 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("active");
        modal.classList.remove("front");
        setTimeout(() => {
            modal.style.display = "none";
            document.body.style.overflow = "";
        }, 300);
    }
}

function switchModal(fromModal, toModal) {
    closeModal(fromModal);
    setTimeout(() => openModal(toModal), 300);
}

// ============================================
//   UPDATED HANDLERS FOR YOUR FORMS
// ============================================
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("login-email")?.value;
    const password = document.getElementById("login-password")?.value;

    const result = await window.AuthManager.login(email, password);

    if (result.success) {
        // Update UI
        updateUIForLoggedInUser();
        updateProfileLink(result.user.role);
        closeModal("login-modal");
        showToast("Welcome back!", "success");

        // Check if there was an intended destination
        const intendedDestination = localStorage.getItem("intendedDestination");
        if (intendedDestination) {
            localStorage.removeItem("intendedDestination");
            // Navigate to intended page after short delay
            setTimeout(() => {
                window.location.href = intendedDestination;
            }, 500);
        }
    } else {
        showToast(result.error || "Invalid credentials", "error");
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    const userData = {
        first_name: formData.get("register-firstname"),
        last_name: formData.get("register-lastname"),
        email: formData.get("register-email"),
        phone: document.getElementById("register-phone")?.value,
        password: document.getElementById("register-password")?.value,
        role: document.getElementById("register-as")?.value,
    };

    const result = await window.AuthManager.register(userData);

    if (result.success) {
        // Update UI
        updateUIForLoggedInUser();
        updateProfileLink(result.user.role);
        closeModal("register-modal");
        showToast("Registration successful!", "success");
    } else {
        showToast(result.error || "Registration failed", "error");
    }
}

function logout() {
    window.AuthManager.logout();
}

// Replace the initializeNavigationAuth function in index.js with this fixed version:

function initializeNavigationAuth() {
    // Add authentication check to ALL navigation links
    const navLinks = document.querySelectorAll(".nav-link, .mobile-menu a");

    navLinks.forEach((link) => {
        // Check if link has href attribute
        if (!link.href || !link.getAttribute("href")) return;

        // Skip if it's the News link (always accessible)
        if (link.href.includes("news.html")) return;

        // Protected pages
        const protectedPages = ["find-tutors", "store", "find-jobs", "reels"];
        const isProtected = protectedPages.some((page) => link.href.includes(page));

        if (isProtected) {
            link.addEventListener("click", (e) => {
                if (!APP_STATE.isLoggedIn) {
                    e.preventDefault();
                    showToast("Please login to access this feature", "warning");
                    localStorage.setItem("intendedDestination", link.href);
                    openModal("login-modal");
                }
            });
        }
    });
}

// New function to update profile links
function updateProfileLink(role) {
    // Get all profile links (desktop and mobile)
    const profileLinks = document.querySelectorAll('a[href*="profile.html"]');

    // Get the appropriate profile URL based on role
    const profileUrl = PROFILE_URLS[role] || "index.html"; // Default fallback

    // Update all profile links
    profileLinks.forEach((link) => {
        // Check if it's the main profile link in the dropdown
        if (link.textContent.includes("My Profile")) {
            link.href = profileUrl; // Adjust path as needed
        }
    });

    // Also update mobile menu if it exists
    const mobileProfileLink = document.querySelector(
        '.mobile-menu a[href*="profile.html"]'
    );
    if (mobileProfileLink) {
        mobileProfileLink.href = "branch/" + profileUrl;
    }
}


// Enhanced updateUIForLoggedInUser function
function updateUIForLoggedInUser() {
    if (!APP_STATE.currentUser) return;
    
    // Hide ALL login/register buttons (desktop and mobile)
    const loginButtons = document.querySelectorAll(
        '#login-btn, #register-btn, #hero-login-btn, #hero-register-btn, ' +
        '#mobile-login-btn, #mobile-register-btn'
    );
    loginButtons.forEach(btn => {
        if (btn) {
            btn.style.display = 'none';
            btn.classList.add('hidden');
        }
    });
    
    // Show profile container and notifications
    const profileContainer = document.getElementById('profile-container');
    const notificationBell = document.getElementById('notification-bell');
    
    if (profileContainer) {
        profileContainer.classList.remove('hidden');
        profileContainer.style.display = 'flex';
    }
    
    if (notificationBell) {
        notificationBell.classList.remove('hidden');
        notificationBell.style.display = 'flex';
    }
    
    // Update profile name
    const profileName = document.getElementById('profile-name');
    if (profileName) {
        const userName = APP_STATE.currentUser.name || 
            `${APP_STATE.currentUser.first_name} ${APP_STATE.currentUser.last_name}`;
        profileName.textContent = userName;
    }
    
    // Update profile picture
    const profilePic = document.getElementById('profile-pic');
    if (profilePic) {
        if (APP_STATE.currentUser.profile_picture) {
            profilePic.src = APP_STATE.currentUser.profile_picture;
        } else {
            const userAvatar = getUserAvatar(APP_STATE.userRole);
            profilePic.src = userAvatar;
        }
        
        profilePic.alt = `${APP_STATE.userRole || 'User'} avatar`;
        
        profilePic.onerror = () => {
            const name = APP_STATE.currentUser.name || 'User';
            profilePic.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
        };
    }
    
    // Update mobile menu
    addMobileProfileOptions();
    
    // Update notification count
    const notificationCount = document.getElementById('notification-count');
    if (notificationCount) {
        notificationCount.textContent = '3';
    }
    
    // Update dropdown immediately
    updateProfileDropdown();
}

// Multiple avatars for each role
const ROLE_AVATAR_COLLECTIONS = {
    user: [
        "👤",
        "https://ui-avatars.com/api/?name=User&background=6366f1&color=fff",
        "https://picsum.photos/200?random=1",
    ],
    student: [
        "pictures/student-profile-kid.jpg", // Fixed path (no ../)
        "pictures/student-profile-kid-girl.jpg",
        "pictures/student-profile-kid-boy.jpg",
        "pictures/student-profile-boy.jpg",
        "pictures/student-profile-girl.jpg",
        "pictures/Young-girl-studing-online.jpg",
        // Fallback URLs if local images don't exist
        "https://ui-avatars.com/api/?name=Student&background=10b981&color=fff",
        "https://picsum.photos/200?random=2",
    ],
    tutor: [
        "pictures/tutor-man.jpg",
        "pictures/tutor-woman.jpg",
        "https://ui-avatars.com/api/?name=Tutor&background=f59e0b&color=fff",
        "https://picsum.photos/200?random=3",
    ],
    guardian: [
        "pictures/Dad-profile.jpg",
        "pictures/Mom-profile.jpg",
        "https://ui-avatars.com/api/?name=Parent&background=ef4444&color=fff",
        "https://picsum.photos/200?random=4",
    ],
    bookstore: [
        "https://ui-avatars.com/api/?name=Bookstore&background=8b5cf6&color=fff",
    ],
    delivery: [
        "https://ui-avatars.com/api/?name=Delivery&background=06b6d4&color=fff",
    ],
    advertiser: [
        "https://ui-avatars.com/api/?name=Advertiser&background=ec4899&color=fff",
    ],
    author: [
        "https://ui-avatars.com/api/?name=Author&background=6366f1&color=fff",
    ],
    church: [
        "https://ui-avatars.com/api/?name=Church&background=a855f7&color=fff",
    ],
};

// Get random avatar for role
function getRandomRoleAvatar(role) {
    const avatars = ROLE_AVATAR_COLLECTIONS[role];
    if (avatars && avatars.length > 0) {
        const randomIndex = Math.floor(Math.random() * avatars.length);
        return avatars[randomIndex];
    }
    return "👤"; // Fallback
}

// Get specific avatar by index (for user selection)
function getRoleAvatarByIndex(role, index) {
    const avatars = ROLE_AVATAR_COLLECTIONS[role];
    if (avatars && avatars[index]) {
        return avatars[index];
    }
    return getRandomRoleAvatar(role);
}

// Save user's avatar choice
function saveUserAvatar(avatarUrl) {
    localStorage.setItem("userAvatar", avatarUrl);
}

// Replace the old getUserAvatar function (around line 3850)
function getUserAvatar(role) {
    return getCurrentUserAvatar();
}

// Keep your existing getRandomRoleAvatar but modify it
function getRandomRoleAvatar(role) {
    const roleConfig = ROLE_AVATAR_SYSTEM[role];
    if (roleConfig?.defaults && roleConfig.defaults.length > 0) {
        const randomIndex = Math.floor(Math.random() * roleConfig.defaults.length);
        return roleConfig.defaults[randomIndex].path;
    }
    return getCurrentUserAvatar();
}

// Create mobile profile section with enhanced styling
const profileSection = document.createElement("div");
profileSection.id = "mobile-profile-section";
profileSection.innerHTML = `
    <div class="mobile-menu-divider"></div>
    <div class="mobile-profile-header">
        <img src="${APP_STATE.currentUser?.avatar || "https://picsum.photos/32"
    }" alt="Profile" class="mobile-profile-pic">
        <div class="mobile-profile-info">
            <span class="mobile-profile-name">${APP_STATE.currentUser?.name || "User"
    }</span>
            <span class="mobile-profile-role">${APP_STATE.userRole || "Member"
    }</span>
        </div>
    </div>
    <a class="mobile-menu-item" href="branch/${PROFILE_URLS[APP_STATE.userRole] || "profile.html"
    }">
        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        My Profile
    </a>
    <a class="mobile-menu-item" href="branch/dashboard.html">
        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
        </svg>
        Dashboard
    </a>
    <a class="mobile-menu-item" href="branch/settings.html">
        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        Settings
    </a>
    <div class="mobile-menu-divider"></div>
    <button class="mobile-menu-item text-red-500" onclick="logout()">
        <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
        </svg>
        Logout
    </button>
`;

function addMobileProfileOptions() {
    const mobileMenu = document.getElementById("mobile-menu");
    if (!mobileMenu || !APP_STATE.isLoggedIn) return;

    // Remove existing profile section if any
    const existingSection = document.getElementById("mobile-profile-section");
    if (existingSection) existingSection.remove();

    // Create mobile profile section with correct profile URL
    const profileUrl =
        PROFILE_URLS[APP_STATE.userRole] || "myProfile/student-profile.html";

    const profileSection = document.createElement("div");
    profileSection.id = "mobile-profile-section";
    profileSection.innerHTML = `
        <div class="mobile-menu-divider"></div>
        <div class="mobile-profile-header">
            <img src="${APP_STATE.currentUser?.avatar || "https://picsum.photos/32"
        }" alt="Profile" class="mobile-profile-pic">
            <div class="mobile-profile-info">
                <span class="mobile-profile-name">${APP_STATE.currentUser?.name || "User"
        }</span>
                <span class="mobile-profile-role">${APP_STATE.userRole || "Member"
        }</span>
            </div>
        </div>
        <a class="mobile-menu-item" href="${profileUrl}">
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
            My Profile
        </a>
        <a class="mobile-menu-item" href="branch/dashboard.html">
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
            Dashboard
        </a>
        <a class="mobile-menu-item" href="branch/settings.html">
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
        Settings
        </a>
        <div class="mobile-menu-divider"></div>
        <button class="mobile-menu-item text-red-500" onclick="logout()">
            <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
            Logout
        </button>
    `;

    // Insert after the main menu items
    const menuContent = mobileMenu.querySelector(".mobile-menu-content");
    if (menuContent) {
        menuContent.appendChild(profileSection);
    }
}

// Update the logout function to clear role data

// Enhanced logout function
function logout() {
    // Clear state
    APP_STATE.isLoggedIn = false;
    APP_STATE.currentUser = null;
    APP_STATE.userRole = null;
    
    // Clear localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    localStorage.removeItem('token');
    
    // Reset ALL UI elements
    const loginButtons = document.querySelectorAll(
        '#login-btn, #register-btn, #hero-login-btn, #hero-register-btn, ' +
        '#mobile-login-btn, #mobile-register-btn'
    );
    loginButtons.forEach(btn => {
        if (btn) {
            btn.classList.remove('hidden');
            btn.style.display = '';
        }
    });
    
    // Hide profile elements
    const profileContainer = document.getElementById('profile-container');
    const notificationBell = document.getElementById('notification-bell');
    
    if (profileContainer) {
        profileContainer.classList.add('hidden');
        profileContainer.style.display = 'none';
    }
    
    if (notificationBell) {
        notificationBell.classList.add('hidden');
        notificationBell.style.display = 'none';
    }
    
    // Remove mobile profile section
    const mobileProfileSection = document.getElementById('mobile-profile-section');
    if (mobileProfileSection) {
        mobileProfileSection.remove();
    }
    
    // Call backend logout endpoint
    if (localStorage.getItem('token')) {
        fetch('http://localhost:8000/api/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
    }
    
    showToast('Logged out successfully', 'info');
    
    // Redirect to home after a short delay
    setTimeout(() => {
        window.location.href = '/';
    }, 500);
}

// Update social login to assign a default role
function socialLogin(platform) {
    showToast(`Logging in with ${platform}...`, "info");
    setTimeout(() => {
        // For social login, you might want to prompt for role or default to student
        const defaultRole = "student"; // Or show a modal to select role

        APP_STATE.isLoggedIn = true;
        APP_STATE.userRole = defaultRole;
        APP_STATE.currentUser = {
            name: "Social User",
            email: "user@" + platform + ".com",
            role: defaultRole,
        };

        // Save to localStorage
        localStorage.setItem("userRole", defaultRole);
        localStorage.setItem("currentUser", JSON.stringify(APP_STATE.currentUser));

        updateUIForLoggedInUser();
        updateProfileLink(defaultRole);
        closeModal("login-modal");
        showToast("Login successful!", "success");
    }, 1500);
}

// ============================================
//   SCROLL EFFECTS
// ============================================
function initializeScrollEffects() {
    // Scroll progress bar
    window.addEventListener("scroll", () => {
        const scrollProgress = document.getElementById("scroll-progress");
        if (scrollProgress) {
            const scrollPercent =
                (window.scrollY /
                    (document.documentElement.scrollHeight - window.innerHeight)) *
                100;
            scrollProgress.style.width = scrollPercent + "%";
        }
    });

    // Back to top button
    const backToTop = document.getElementById("back-to-top");
    window.addEventListener("scroll", () => {
        if (backToTop) {
            if (window.scrollY > 500) {
                backToTop.classList.add("visible");
            } else {
                backToTop.classList.remove("visible");
            }
        }
    });

    if (backToTop) {
        backToTop.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    // Parallax effects
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px",
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("animate-in");
            }
        });
    }, observerOptions);

    document
        .querySelectorAll(".feature-card, .course-flip-card, .testimonial-card")
        .forEach((el) => {
            observer.observe(el);
        });
}

// Update profile links based on user role
function updateProfileLink(role) {
    const profileUrl =
        PROFILE_URLS[role] || "my-profile-tier-1/user-profile.html";

    // Update desktop profile link
    const profileLink = document.getElementById("profile-link");
    if (profileLink) {
        // The profile link should be a proper anchor tag
        profileLink.href = profileUrl;
        profileLink.onclick = (e) => {
            if (!APP_STATE.isLoggedIn) {
                e.preventDefault();
                showToast("Please login to access your profile", "warning");
                openModal("login-modal");
            }
        };
    }

    // Update mobile profile link
    const mobileProfileLink = document.querySelector(
        '#mobile-profile-section a[href*="profile"]'
    );
    if (mobileProfileLink) {
        mobileProfileLink.href = profileUrl;
    }
}

// ============================================
//   REMAINING HELPER FUNCTIONS
// ============================================
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

function openSearchModal() {
    const modal = document.getElementById("search-modal");
    if (modal) {
        modal.style.display = "flex";
        setTimeout(() => {
            const searchInput = document.getElementById("global-search");
            if (searchInput) searchInput.focus();
        }, 100);
    }
}

function showSearchSuggestions(query, container) {
    if (!container) return;

    const suggestions = [
        "Mathematics Tutors",
        "Physics Course",
        "English Language",
        "Programming Basics",
        "Study Tips",
        "Exam Preparation",
    ].filter((s) => s.toLowerCase().includes(query));

    container.innerHTML = suggestions
        .map(
            (s) => `
        <div class="suggestion-item" onclick="selectSuggestion('${s}')">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            ${s}
        </div>
    `
        )
        .join("");
}

function selectSuggestion(suggestion) {
    const searchInput = document.getElementById("global-search");
    if (searchInput) {
        searchInput.value = suggestion;
    }

    const suggestions = document.getElementById("search-suggestions");
    if (suggestions) {
        suggestions.innerHTML = "";
    }

    showToast(`Searching for "${suggestion}"...`, "info");
}

function initializeNotifications() {
    // Simulate new notifications
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

function initializeFormValidation() {
    // Password strength indicator
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

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === "password" ? "text" : "password";
    }
}

function toggleRegisterFields() {
    const select = document.getElementById("register-as");
    if (select) {
        const role = select.value;
        showToast(`Registering as ${role}`, "info");
    }
}

// ============================================
//   UTILITIES
// ============================================
function showToast(message, type = "info") {
    const container =
        document.getElementById("toast-container") || createToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icons = {
        success: "✓",
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
    tooltip.style.left =
        rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + "px";
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

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function handleNavLinkClick(e, link) {
    // Don't interfere if user is logged in
    if (APP_STATE.isLoggedIn) {
        return true; // Allow normal navigation
    }

    // Pages that require authentication
    const protectedPages = ["find-tutors", "store", "find-jobs", "reels"];

    if (protectedPages.includes(link)) {
        e.preventDefault();
        e.stopPropagation();

        showToast(`Please login to access ${link.replace("-", " ")}`, "warning");

        // Store intended destination
        localStorage.setItem("intendedDestination", e.target.href);

        openModal("login-modal");
        return false;
    }

    return true; // Allow navigation for unprotected pages
}

// Dummy function for showTestimonial (if needed for legacy code)
function showTestimonial(index) {
    // This function is handled by initializeTestimonials now
    console.log("Testimonial index:", index);
}

let selectedAvatarUrl = null;

function openAvatarSelection() {
    const modal = document.getElementById("avatar-modal");
    if (!modal) return;

    const roleConfig =
        ROLE_AVATAR_SYSTEM[APP_STATE.userRole] || ROLE_AVATAR_SYSTEM["user"];
    const currentAvatar = getCurrentUserAvatar();

    // Create modal content
    const modalContent = modal.querySelector(".modal-content");
    modalContent.innerHTML = `
        <button class="modal-close-enhanced" onclick="closeModal('avatar-modal')">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        </button>
        <h3 class="modal-title">Choose Your Avatar</h3>
        
        <div class="avatar-selection-container">
            <!-- Upload Section -->
            <div class="avatar-upload-section">
                <button class="upload-btn" onclick="triggerAvatarUpload()">
                    Upload Custom Picture
                </button>
            </div>
            
            <!-- Default Avatars Grid -->
            <div class="avatar-grid" id="avatar-grid">
                <!-- Will be populated -->
            </div>
            
            <button class="submit-btn" onclick="saveAvatarChoice()">Save Avatar</button>
        </div>
    `;

    // Populate avatar grid
    const grid = document.getElementById("avatar-grid");
    roleConfig.defaults.forEach((avatar) => {
        const card = document.createElement("div");
        card.className = "avatar-option";
        if (currentAvatar === avatar.path) {
            card.classList.add("selected");
        }

        card.innerHTML = `
            <img src="${avatar.path}" alt="${avatar.label}" 
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(
            avatar.label
        )}&background=${roleConfig.fallbackColor}&color=fff'">
            <span class="avatar-label">${avatar.label}</span>
        `;

        card.onclick = () => selectAvatar(avatar.path, card);
        grid.appendChild(card);
    });

    openModal("avatar-modal");
    initializeAvatarUpload();
}

function selectAvatar(avatarUrl, element) {
    // Remove previous selection
    document.querySelectorAll(".avatar-option").forEach((opt) => {
        opt.classList.remove("selected");
    });

    // Mark new selection
    element.classList.add("selected");
    selectedAvatarUrl = avatarUrl;
}

function saveAvatarChoice() {
    if (selectedAvatarUrl) {
        // Save selected default for this role
        localStorage.setItem(
            `${APP_STATE.userRole}_selected_default`,
            selectedAvatarUrl
        );

        // Update profile picture in state
        if (APP_STATE.currentUser) {
            APP_STATE.currentUser.profile_picture = selectedAvatarUrl;
            localStorage.setItem(
                "currentUser",
                JSON.stringify(APP_STATE.currentUser)
            );
        }

        // Update all avatar elements
        updateAllAvatarElements(selectedAvatarUrl);

        showToast("Avatar updated!", "success");
        closeModal("avatar-modal");
    } else {
        showToast("Please select an avatar", "warning");
    }
}

// Add this after your selectAvatar function (around line 4300)
function initializeAvatarUpload() {
    let fileInput = document.getElementById("avatar-file-input");
    if (!fileInput) {
        fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.id = "avatar-file-input";
        fileInput.accept = "image/*";
        fileInput.style.display = "none";
        document.body.appendChild(fileInput);

        fileInput.addEventListener("change", handleAvatarUpload);
    }
}

function triggerAvatarUpload() {
    document.getElementById("avatar-file-input")?.click();
}

async function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("Please select an image file", "error");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast("Image size should be less than 5MB", "error");
        return;
    }

    try {
        const base64 = await fileToBase64(file);

        const response = await fetch(
            "http://localhost:8000/api/update-profile-picture",
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ profile_picture: base64 }),
            }
        );

        if (response.ok) {
            const data = await response.json();

            if (APP_STATE.currentUser) {
                APP_STATE.currentUser.profile_picture = data.profile_picture;
                localStorage.setItem(
                    "currentUser",
                    JSON.stringify(APP_STATE.currentUser)
                );
            }

            updateAllAvatarElements(data.profile_picture);
            showToast("Profile picture uploaded!", "success");
            closeModal("avatar-modal");
        }
    } catch (error) {
        console.error("Upload error:", error);
        showToast("Failed to upload image", "error");
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
}

function updateAllAvatarElements(avatarUrl) {
    const elements = [
        document.getElementById("profile-pic"),
        document.getElementById("dropdown-profile-pic"),
        document.querySelector(".mobile-profile-pic"),
    ];

    elements.forEach((el) => {
        if (el) {
            el.src = avatarUrl;
        }
    });
}

// ============================================
//   EXPORT GLOBAL FUNCTIONS
// ============================================
window.toggleTheme = toggleTheme;
window.openModal = openModal;
window.closeModal = closeModal;
window.switchModal = switchModal;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.socialLogin = socialLogin;
window.openSearchModal = openSearchModal;
window.selectSuggestion = selectSuggestion;
window.showToast = showToast;
window.handleNavLinkClick = handleNavLinkClick;
window.handleCourseClick = handleCourseClick;
window.handleViewMoreCourses = handleViewMoreCourses;
window.openVideoPlayer = openVideoPlayer;
window.likeVideo = likeVideo;
window.dislikeVideo = dislikeVideo;
window.shareVideo = shareVideo;
window.toggleSaveMenu = toggleSaveMenu;
window.saveToFavorites = saveToFavorites;
window.createPlaylist = createPlaylist;
window.addToPlaylist = addToPlaylist;
window.navigateVideo = navigateVideo;
window.showTestimonial = showTestimonial;
window.scrollToSection = scrollToSection;
window.togglePassword = togglePassword;
window.toggleRegisterFields = toggleRegisterFields;
window.expandCommentBox = expandCommentBox;
window.collapseCommentBox = collapseCommentBox;
window.submitComment = submitComment;
window.copyShareLink = copyShareLink;
window.shareToSocial = shareToSocial;
// Add these to your existing exports (around line 4400+)
window.getCurrentUserAvatar = getCurrentUserAvatar;
window.initializeAvatarUpload = initializeAvatarUpload;
window.triggerAvatarUpload = triggerAvatarUpload;
window.handleAvatarUpload = handleAvatarUpload;
window.updateAllAvatarElements = updateAllAvatarElements;
