// Enhanced index.js - With improved video player, comments, and share functionality

// ============================================
//   GLOBAL STATE & CONFIGURATION
// ============================================
// Add this to your index.js file - Replace the existing handleRegister function and updateUIForLoggedInUser function

// Update the APP_STATE to include userRole
const APP_STATE = {
    isLoggedIn: false,
    currentUser: null,
    userRole: null, // Add this line
    theme: localStorage.getItem('theme') || 'light',
    notifications: [],
    cart: [],
    favorites: [],
    currentVideo: null,
    videoComments: []
};
// Profile URL mapping based on user role
const PROFILE_URLS = {
    'tutor': 'My Profile/tutor-profile.html',
    'student': 'My Profile/student-profile.html',
    'guardian': 'My Profile/guardian-profile.html',
    'institute': 'My Profile/institute-profile.html',
    'bookstore': 'My Profile/bookStore-profile.html',
    'delivery': 'My Profile/delivery-profile.html',
    'advertiser': 'My Profile/advertiser-profile.html',
    'employer': 'My Profile/employer-profile.html',
    'church': 'My Profile/church-profile.html',
    'author': 'My Profile/author-profile.html'

};


const CONFIG = {
    API_URL: 'https://api.astegni.et',
    ANIMATION_DURATION: 300,
    SCROLL_THRESHOLD: 100,
    TYPING_SPEED: 100,
    COUNTER_DURATION: 2000
};

// Sample video data with comments
const VIDEO_DATA = [
    { 
        id: 1,
        title: 'Introduction to Astegni Platform', 
        description: 'Learn how to navigate and use all features of Astegni educational platform. This comprehensive guide covers everything from finding tutors to enrolling in courses.',
        duration: '5:23', 
        views: '10K', 
        category: 'intro',
        likes: 523,
        dislikes: 12,
        comments: [
            { id: 1, author: 'Abebe Tadesse', avatar: 'https://picsum.photos/40?random=1', text: 'This is exactly what I needed to get started!', time: '2 days ago', likes: 45 },
            { id: 2, author: 'Sara Bekele', avatar: 'https://picsum.photos/40?random=2', text: 'Great introduction! Very clear and helpful.', time: '1 week ago', likes: 23 },
            { id: 3, author: 'Daniel Girma', avatar: 'https://picsum.photos/40?random=3', text: 'Can you make a video about advanced features?', time: '2 weeks ago', likes: 15 }
        ]
    },
    { 
        id: 2,
        title: 'How to Find Perfect Tutors', 
        description: 'Step-by-step guide on finding and connecting with the best tutors for your learning needs. Tips on evaluating tutor profiles and scheduling sessions.',
        duration: '8:15', 
        views: '8.5K', 
        category: 'tutorials',
        likes: 412,
        dislikes: 8,
        comments: [
            { id: 4, author: 'Marta Alemu', avatar: 'https://picsum.photos/40?random=4', text: 'Found my math tutor using these tips!', time: '3 days ago', likes: 67 },
            { id: 5, author: 'Yohannes Haile', avatar: 'https://picsum.photos/40?random=5', text: 'Very informative tutorial', time: '5 days ago', likes: 34 }
        ]
    },
    { 
        id: 3,
        title: 'Student Success Story - Sara', 
        description: 'Sara shares her inspiring journey of improving grades from C to A+ with the help of Astegni tutors. Learn about her study strategies and tips.',
        duration: '6:30', 
        views: '15K', 
        category: 'success',
        likes: 892,
        dislikes: 5,
        comments: [
            { id: 6, author: 'Tigist Mengistu', avatar: 'https://picsum.photos/40?random=6', text: 'So inspiring! Congratulations Sara!', time: '1 day ago', likes: 123 },
            { id: 7, author: 'Kebede Wolde', avatar: 'https://picsum.photos/40?random=7', text: 'This motivated me to work harder', time: '4 days ago', likes: 89 },
            { id: 8, author: 'Helen Tesfaye', avatar: 'https://picsum.photos/40?random=8', text: 'Which tutor did you use for math?', time: '1 week ago', likes: 45 }
        ]
    },
    { 
        id: 4,
        title: 'Advanced Math Techniques', 
        description: 'Master advanced mathematical concepts with proven problem-solving techniques. Perfect for high school and university students.',
        duration: '12:45', 
        views: '5K', 
        category: 'courses',
        likes: 234,
        dislikes: 15,
        comments: [
            { id: 9, author: 'Solomon Assefa', avatar: 'https://picsum.photos/40?random=9', text: 'Best math tutorial on the platform!', time: '6 hours ago', likes: 78 }
        ]
    },
    { 
        id: 5,
        title: 'Study Tips for Exams', 
        description: 'Effective study strategies and time management tips to ace your exams. Learn how to prepare efficiently and reduce exam anxiety.',
        duration: '7:20', 
        views: '20K', 
        category: 'tips',
        likes: 1523,
        dislikes: 23,
        comments: [
            { id: 10, author: 'Bethlehem Kassa', avatar: 'https://picsum.photos/40?random=10', text: 'These tips helped me pass my finals!', time: '2 days ago', likes: 234 },
            { id: 11, author: 'Dawit Lemma', avatar: 'https://picsum.photos/40?random=11', text: 'Please make more videos like this', time: '3 days ago', likes: 112 }
        ]
    },
    { 
        id: 6,
        title: 'Online Learning Best Practices', 
        description: 'Get the most out of online learning with these proven strategies. Tips for staying focused and engaged during virtual classes.',
        duration: '9:10', 
        views: '12K', 
        category: 'tutorials',
        likes: 678,
        dislikes: 19,
        comments: []
    },
    { 
        id: 7,
        title: 'Fun Learning Games', 
        description: 'Make learning enjoyable with these educational games and activities. Perfect for young learners and interactive study sessions.',
        duration: '10:15', 
        views: '25K', 
        category: 'entertainment',
        likes: 2134,
        dislikes: 45,
        comments: []
    },
    { 
        id: 8,
        title: 'Educational Comedy Sketches', 
        description: 'Learn while you laugh! Educational content presented in fun and memorable comedy sketches.',
        duration: '15:30', 
        views: '30K', 
        category: 'entertainment',
        likes: 3456,
        dislikes: 67,
        comments: []
    }
];

// ============================================
//   INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Initialize theme
        initializeTheme();
        
        // Initialize UI components
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
        
        // Initialize interactive features
        initializeSearch();
        initializeNotifications();
        initializeTooltips();
        initializeLazyLoading();
        
        // Hide loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('loaded');
                setTimeout(() => loadingScreen.style.display = 'none', 500);
            }
        }, 1000);
    } catch (error) {
        console.error('Initialization error:', error);
    }
});
// Initialize on page load - check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved user session
    const savedUser = localStorage.getItem('currentUser');
    const savedRole = localStorage.getItem('userRole');
    
    if (savedUser && savedRole) {
        APP_STATE.currentUser = JSON.parse(savedUser);
        APP_STATE.userRole = savedRole;
        APP_STATE.isLoggedIn = true;
        
        updateUIForLoggedInUser();
        updateProfileLink(savedRole);
    }
});


// ============================================
//   THEME MANAGEMENT
// ============================================
function initializeTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcons(theme);
    
    // Attach theme toggle to buttons
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const mobileThemeToggleBtn = document.getElementById('mobile-theme-toggle-btn');
    
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    if (mobileThemeToggleBtn) {
        mobileThemeToggleBtn.addEventListener('click', toggleTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    APP_STATE.theme = newTheme;
    
    updateThemeIcons(newTheme);
    showToast('Theme changed to ' + newTheme + ' mode', 'info');
}

function updateThemeIcons(theme) {
    const iconPath = theme === 'light' 
        ? 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'
        : 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z';
    
    const themeIcon = document.querySelector('#theme-icon path');
    const mobileThemeIcon = document.querySelector('#mobile-theme-icon path');
    
    if (themeIcon) themeIcon.setAttribute('d', iconPath);
    if (mobileThemeIcon) mobileThemeIcon.setAttribute('d', iconPath);
}

// ============================================
//   NAVIGATION
// ============================================
function initializeNavigation() {
    const navbar = document.querySelector('.navbar');
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > CONFIG.SCROLL_THRESHOLD) {
            navbar?.classList.add('scrolled');
        } else {
            navbar?.classList.remove('scrolled');
        }
    });
    
    // Mobile menu toggle
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            menuBtn.classList.toggle('active');
            mobileMenu?.classList.toggle('hidden');
            document.body.style.overflow = mobileMenu?.classList.contains('hidden') ? '' : 'hidden';
        });
    }
    
    // Close mobile menu on link click
    document.querySelectorAll('.mobile-menu-item').forEach(item => {
        item.addEventListener('click', () => {
            menuBtn?.classList.remove('active');
            mobileMenu?.classList.add('hidden');
            document.body.style.overflow = '';
        });
    });
}

// ============================================
//   HERO SECTION
// ============================================
function initializeHeroSection() {
    // Hero text typing animation with original texts
    const heroTexts = [
        'Discover Expert Tutors with Astegni',
        'Are you a tutor?',
        'Join us and connect with millions of students worldwide!',
        'Astegni',
        'Pride of Black Lion',
        'Advertise with us',
        'and',
        'reach highly targeted audiences',
        'Astegni - Ethiopia\'s first social media platform!',
        'Contributing in realizing Digital Ethiopia!',
        'Learn with us',
        'Connect with tutors and training centers!',
        'Want to become a tutor?',
        'Join, learn and earn!',
        'Looking for a job?',
        'Same!',
        'Expert tutors?',
        'Just one click away!',
        'Learn Anytime, Anywhere',
        'Top Educators, books and jobs!',
        'Astegni - Your Learning Partner',
        'Empowering Education in Ethiopia'
    ];
    
    let textIndex = 0;
    const textElement = document.getElementById('hero-text-content');
    
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
    const heroLoginBtn = document.getElementById('hero-login-btn');
    const heroRegisterBtn = document.getElementById('hero-register-btn');
    
    if (heroLoginBtn) {
        heroLoginBtn.addEventListener('click', () => openModal('login-modal'));
    }
    if (heroRegisterBtn) {
        heroRegisterBtn.addEventListener('click', () => openModal('register-modal'));
    }
}

function typeWriterEffect(element, texts, index) {
    if (!element || !texts || texts.length === 0) return;
    
    const text = texts[index];
    let charIndex = 0;
    element.textContent = '';
    
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
    const container = document.getElementById('hero-particles');
    if (!container) return;
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.width = Math.random() * 10 + 5 + 'px';
        particle.style.height = particle.style.width;
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = Math.random() * 20 + 20 + 's';
        container.appendChild(particle);
    }
}

function initializeHeroSlideshow() {
    const images = [
        'https://picsum.photos/1920/1080?random=1',
        'https://picsum.photos/1920/1080?random=2',
        'https://picsum.photos/1920/1080?random=3'
    ];
    
    let currentImage = 0;
    const heroSection = document.querySelector('.hero-slideshow');
    
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
        { id: 'counter-parents', target: 1000, current: 0, suffix: '+' },
        { id: 'counter-students', target: 5000, current: 0, suffix: '+' },
        { id: 'counter-tutors', target: 300, current: 0, suffix: '+' },
        { id: 'counter-centers', target: 50, current: 0, suffix: '+' },
        { id: 'counter-books', target: 100, current: 0, suffix: '+' },
        { id: 'counter-jobs', target: 10, current: 0, suffix: '+' }
    ];
    
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = counters.find(c => c.id === entry.target.id);
                if (counter && counter.current === 0) {
                    animateCounter(entry.target, counter.target, counter.suffix);
                    counter.current = counter.target;
                }
            }
        });
    }, observerOptions);
    
    counters.forEach(counter => {
        const element = document.getElementById(counter.id);
        if (element) observer.observe(element);
    });
    
    // Store counters globally for scroll effect
    window.countersData = counters;
}

function initializeCounterScrollEffect() {
    const heroSection = document.querySelector('.hero-section');
    let hasScrolledOut = false;
    let isResetting = false;
    
    window.addEventListener('scroll', () => {
        if (!heroSection || !window.countersData) return;
        
        const rect = heroSection.getBoundingClientRect();
        const isVisible = rect.bottom > 0;
        
        // When hero section scrolls out of view
        if (!isVisible && !hasScrolledOut) {
            hasScrolledOut = true;
            // Reduce counters to half
            window.countersData.forEach(counter => {
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
            window.countersData.forEach(counter => {
                const element = document.getElementById(counter.id);
                if (element) {
                    animateCounterFromValue(element, counter.current, counter.target, counter.suffix);
                    counter.current = counter.target;
                }
            });
            setTimeout(() => { isResetting = false; }, 2000);
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
            title: 'New AI-Powered Learning Features Launched',
            content: 'Experience personalized learning with our new AI tutor assistant, helping you learn 3x faster with customized study plans.',
            category: 'Technology',
            date: 'Today'
        },
        {
            title: 'Partnership with Top Universities',
            content: 'We\'ve partnered with 10 leading universities to bring you certified courses and direct admission opportunities.',
            category: 'Partnership',
            date: 'Yesterday'
        },
        {
            title: 'Student Success Rate Hits 95%',
            content: 'Our latest report shows that 95% of students improved their grades within 3 months of joining Astegni.',
            category: 'Achievement',
            date: '2 days ago'
        }
    ];
    
    let currentNewsIndex = 0;
    const titleElement = document.getElementById('news-title-content');
    const contentElement = document.getElementById('news-content-text');
    
    if (titleElement && contentElement) {
        typeNewsItem(newsItems[currentNewsIndex], titleElement, contentElement, () => {
            setInterval(() => {
                currentNewsIndex = (currentNewsIndex + 1) % newsItems.length;
                deleteNewsItem(titleElement, contentElement, () => {
                    typeNewsItem(newsItems[currentNewsIndex], titleElement, contentElement);
                });
            }, 8000);
        });
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
    const carousel = document.getElementById('video-carousel');
    if (!carousel) return;
    
    // Clear existing content
    carousel.innerHTML = '';
    
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
    window.navigateCarousel = function(direction) {
        if (!carousel) return;
        
        if (direction === 'left') {
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
            carousel.style.transition = 'none';
            carousel.style.transform = 'translateX(0)';
            setTimeout(() => {
                carousel.style.transition = 'transform 0.5s ease';
            }, 50);
        } else {
            carousel.style.transform = `translateX(-${currentPosition * cardWidth}px)`;
        }
    }, 5000);
    
    // Category filters
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.category-btn.active')?.classList.remove('active');
            e.target.classList.add('active');
            filterVideos(e.target.dataset.category);
        });
    });
}

function createVideoCard(video, index) {
    const card = document.createElement('div');
    card.className = 'video-card';
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
            <p class="video-description">${video.description.substring(0, 100)}...</p>
            <div class="video-meta">
                <span class="video-views">${video.views} views</span>
                <span class="video-duration">${video.duration}</span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => openVideoPlayer(video));
    return card;
}

function filterVideos(category) {
    const cards = document.querySelectorAll('.video-card');
    cards.forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ============================================
//   ENHANCED VIDEO PLAYER WITH COMMENTS
// ============================================
function openVideoPlayer(video) {
    APP_STATE.currentVideo = video;
    
    // Update video title and description
    const titleEl = document.getElementById('video-title');
    const descEl = document.getElementById('video-description');
    
    if (titleEl) titleEl.textContent = video.title;
    if (descEl) descEl.textContent = video.description;
    
    // Load comments
    loadVideoComments(video);
    
    // Open modal
    openModal('video-player-modal');
    
    showToast('Loading video...', 'info');
}

function loadVideoComments(video) {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;
    
    commentsList.innerHTML = '';
    
    if (video.comments && video.comments.length > 0) {
        video.comments.forEach(comment => {
            const commentEl = createCommentElement(comment);
            commentsList.appendChild(commentEl);
        });
    } else {
        commentsList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No comments yet. Be the first to comment!</p>';
    }
}

function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.innerHTML = `
        <img src="${comment.avatar}" alt="${comment.author}" class="comment-avatar">
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
    const input = document.getElementById('comment-input');
    const actions = document.getElementById('comment-actions');
    
    if (input) {
        input.classList.add('expanded');
        input.style.minHeight = '80px';
    }
    if (actions) {
        actions.classList.remove('hidden');
    }
}

function collapseCommentBox() {
    const input = document.getElementById('comment-input');
    const actions = document.getElementById('comment-actions');
    
    if (input) {
        input.classList.remove('expanded');
        input.style.minHeight = '';
        input.value = '';
    }
    if (actions) {
        actions.classList.add('hidden');
    }
}

function submitComment() {
    if (!APP_STATE.isLoggedIn) {
        showToast('Please login to comment', 'warning');
        openModal('login-modal');
        // Make login modal appear in front
        const loginModal = document.getElementById('login-modal');
        if (loginModal) loginModal.classList.add('front');
        return;
    }
    
    const input = document.getElementById('comment-input');
    if (!input || !input.value.trim()) {
        showToast('Please write a comment', 'warning');
        return;
    }
    
    // Create new comment
    const newComment = {
        id: Date.now(),
        author: APP_STATE.currentUser?.name || 'You',
        avatar: 'https://picsum.photos/40?random=' + Date.now(),
        text: input.value.trim(),
        time: 'Just now',
        likes: 0
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
    showToast('Comment posted!', 'success');
}

function likeVideo() {
    if (!APP_STATE.isLoggedIn) {
        showToast('Please login to like videos', 'warning');
        openModal('login-modal');
        const loginModal = document.getElementById('login-modal');
        if (loginModal) loginModal.classList.add('front');
        return;
    }
    showToast('Video liked!', 'success');
}

function dislikeVideo() {
    if (!APP_STATE.isLoggedIn) {
        showToast('Please login to rate videos', 'warning');
        openModal('login-modal');
        const loginModal = document.getElementById('login-modal');
        if (loginModal) loginModal.classList.add('front');
        return;
    }
    showToast('Feedback recorded', 'info');
}

function shareVideo() {
    // Open share modal instead of just showing toast
    openModal('share-modal');
}

function toggleSaveMenu() {
    if (!APP_STATE.isLoggedIn) {
        showToast('Please login to save videos', 'warning');
        // Make sure login modal appears in front of video modal
        const videoModal = document.getElementById('video-player-modal');
        const loginModal = document.getElementById('login-modal');
        
        if (loginModal) {
            loginModal.classList.add('front');
            openModal('login-modal');
        }
        return;
    }
    
    const menu = document.getElementById('save-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function saveToFavorites() {
    if (!APP_STATE.isLoggedIn) {
        showToast('Please login to save to favorites', 'warning');
        openModal('login-modal');
        const loginModal = document.getElementById('login-modal');
        if (loginModal) loginModal.classList.add('front');
        return;
    }
    
    showToast('Video saved to favorites!', 'success');
    const menu = document.getElementById('save-menu');
    if (menu) menu.classList.add('hidden');
}

function createPlaylist() {
    if (!APP_STATE.isLoggedIn) {
        showToast('Please login to create playlists', 'warning');
        openModal('login-modal');
        const loginModal = document.getElementById('login-modal');
        if (loginModal) loginModal.classList.add('front');
        return;
    }
    
    const playlistName = prompt('Enter playlist name:');
    if (playlistName) {
        showToast(`Playlist "${playlistName}" created!`, 'success');
    }
    const menu = document.getElementById('save-menu');
    if (menu) menu.classList.add('hidden');
}

function addToPlaylist() {
    if (!APP_STATE.isLoggedIn) {
        showToast('Please login to add to playlist', 'warning');
        openModal('login-modal');
        const loginModal = document.getElementById('login-modal');
        if (loginModal) loginModal.classList.add('front');
        return;
    }
    
    showToast('Select a playlist to add this video', 'info');
    const menu = document.getElementById('save-menu');
    if (menu) menu.classList.add('hidden');
}

function navigateVideo(direction) {
    showToast(`Loading ${direction} video...`, 'info');
}

// Share functionality
function copyShareLink() {
    const input = document.getElementById('share-link');
    if (input) {
        input.select();
        document.execCommand('copy');
        showToast('Link copied to clipboard!', 'success');
    }
}

function shareToSocial(platform) {
    const shareUrl = document.getElementById('share-link')?.value || 'https://astegni.et/video/12345';
    const shareText = APP_STATE.currentVideo?.title || 'Check out this amazing video on Astegni!';
    
    let url = '';
    switch(platform) {
        case 'facebook':
            url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
            break;
        case 'twitter':
            url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
            break;
        case 'whatsapp':
            url = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
            break;
        case 'telegram':
            url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
            break;
        case 'linkedin':
            url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
            break;
        case 'email':
            url = `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent('Check out this video: ' + shareUrl)}`;
            break;
    }
    
    if (url) {
        window.open(url, '_blank');
        showToast(`Sharing to ${platform}...`, 'info');
    }
}

// ============================================
//   COURSES WITH FLIP CARDS AND DETAILS (8 CARDS)
// ============================================
function initializeCourses() {
    const coursesData = [
        { 
            title: 'Mathematics', 
            icon: '📐', 
            category: 'tech', 
            level: 'Beginner',
            students: '2.5K',
            rating: '4.8',
            backTitle: 'Religious Studies', 
            backIcon: '⛪',
            backLevel: 'All Levels',
            backStudents: '1.2K',
            backRating: '4.9'
        },
        { 
            title: 'Physics', 
            icon: '⚛️', 
            category: 'tech',
            level: 'Intermediate',
            students: '1.8K',
            rating: '4.9',
            backTitle: 'Programming', 
            backIcon: '💻',
            backLevel: 'Beginner',
            backStudents: '5K',
            backRating: '5.0'
        },
        { 
            title: 'Chemistry', 
            icon: '🧪', 
            category: 'tech',
            level: 'Advanced',
            students: '1.2K',
            rating: '4.7',
            backTitle: 'Sports Training', 
            backIcon: '🏃',
            backLevel: 'All Levels',
            backStudents: '800',
            backRating: '4.6'
        },
        { 
            title: 'Music', 
            icon: '🎵', 
            category: 'arts',
            level: 'Beginner',
            students: '3K',
            rating: '4.8',
            backTitle: 'Culinary Arts', 
            backIcon: '🍳',
            backLevel: 'Intermediate',
            backStudents: '600',
            backRating: '4.7'
        },
        { 
            title: 'English', 
            icon: '🇬🇧', 
            category: 'language',
            level: 'All Levels',
            students: '4K',
            rating: '4.9',
            backTitle: 'Chinese', 
            backIcon: '🇨🇳',
            backLevel: 'Beginner',
            backStudents: '1.5K',
            backRating: '4.8'
        },
        { 
            title: 'Business', 
            icon: '📊', 
            category: 'business',
            level: 'Intermediate',
            students: '2K',
            rating: '4.8',
            backTitle: 'Marketing', 
            backIcon: '🎯',
            backLevel: 'Advanced',
            backStudents: '1.8K',
            backRating: '4.9'
        },
        { 
            title: 'Photography', 
            icon: '📸', 
            category: 'arts',
            level: 'All Levels',
            students: '1.5K',
            rating: '4.7',
            backTitle: 'Graphic Design', 
            backIcon: '🎨',
            backLevel: 'Intermediate',
            backStudents: '2.2K',
            backRating: '4.8'
        },
        { 
            title: 'History', 
            icon: '🏛️', 
            category: 'arts',
            level: 'Beginner',
            students: '900',
            rating: '4.6',
            backTitle: 'Geography', 
            backIcon: '🌍',
            backLevel: 'All Levels',
            backStudents: '1.1K',
            backRating: '4.7'
        }
    ];
    
    const container = document.getElementById('courses-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    coursesData.forEach((course, index) => {
        const card = document.createElement('div');
        card.className = 'course-flip-card';
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
        
        card.addEventListener('click', () => handleCourseClick(course));
        container.appendChild(card);
    });
    
    // Course filters
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            document.querySelector('.filter-chip.active')?.classList.remove('active');
            e.target.classList.add('active');
            filterCourses(e.target.dataset.filter);
        });
    });
}

function filterCourses(filter) {
    const cards = document.querySelectorAll('.course-flip-card');
    cards.forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function handleCourseClick(course) {
    if (!APP_STATE.isLoggedIn) {
        showToast('Please login to access this course', 'warning');
        openModal('login-modal');
    } else {
        showToast(`Opening ${course.title} course...`, 'info');
    }
}

function handleViewMoreCourses() {
    if (!APP_STATE.isLoggedIn) {
        openModal('login-modal');
    } else {
        window.location.href = '/courses';
    }
}

// ============================================
//   TESTIMONIALS WITH ZOOM ANIMATION
// ============================================
function initializeTestimonials() {
    const testimonialData = [
        {
            text: 'Astegni helped me find the perfect math tutor. My grades improved from C to A in just 3 months!',
            author: 'Sara Tadesse',
            role: 'Grade 12 Student',
            avatar: 'https://picsum.photos/60'
        },
        {
            text: 'As a tutor, Astegni gave me the platform to reach students nationwide. I now teach over 50 students online!',
            author: 'Daniel Bekele',
            role: 'Physics Tutor',
            avatar: 'https://picsum.photos/61'
        },
        {
            text: 'The variety of courses and quality of instructors on Astegni is unmatched. Best investment in my child\'s education!',
            author: 'Marta Alemu',
            role: 'Parent',
            avatar: 'https://picsum.photos/62'
        },
        {
            text: 'I found my dream job through Astegni\'s job portal. The platform is truly life-changing!',
            author: 'Yohannes Girma',
            role: 'Software Developer',
            avatar: 'https://picsum.photos/63'
        },
        {
            text: 'Our training center reached 10x more students after joining Astegni. Highly recommended!',
            author: 'Tigist Haile',
            role: 'Training Center Director',
            avatar: 'https://picsum.photos/64'
        },
        {
            text: 'The online learning tools and resources are amazing. I can learn at my own pace!',
            author: 'Abebe Mengistu',
            role: 'University Student',
            avatar: 'https://picsum.photos/65'
        }
    ];
    
    let currentSet = 0;
    const slider = document.getElementById('testimonials-slider');
    
    if (!slider) return;
    
    function updateTestimonials() {
        slider.innerHTML = '';
        const startIndex = currentSet * 3;
        
        for (let i = 0; i < 3; i++) {
            const testimonial = testimonialData[(startIndex + i) % testimonialData.length];
            const card = document.createElement('div');
            card.className = 'testimonial-card active';
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
            document.querySelectorAll('.testimonial-card').forEach((card, index) => {
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
        'telebirr', 'Google', 'Microsoft', 'Coursera', 
        'Addis Ababa University', 'Amazon', 'Meta', 'LinkedIn Learning'
    ];
    
    const track = document.getElementById('partners-track');
    if (!track) return;
    
    track.innerHTML = '';
    
    // Create partner logos
    partners.forEach(partner => {
        const logo = document.createElement('div');
        logo.className = 'partner-logo';
        logo.textContent = partner;
        track.appendChild(logo);
    });
    
    // Duplicate for seamless scroll
    partners.forEach(partner => {
        const logo = document.createElement('div');
        logo.className = 'partner-logo';
        logo.textContent = partner;
        track.appendChild(logo);
    });
}

// ============================================
//   MODALS
// ============================================
function initializeModals() {
    // Close modal on overlay click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Initialize form submissions
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        setTimeout(() => modal.classList.add('active'), 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.classList.remove('front');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
}

function switchModal(fromModal, toModal) {
    closeModal(fromModal);
    setTimeout(() => openModal(toModal), 300);
}

// Replace the existing handleLogin function to also update profile link
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value;
    const password = document.getElementById('login-password')?.value;
    
    // Simulate login - in real app, you'd fetch user data including role from server
    if (email && password) {
        // Check if user data exists in localStorage (for demo purposes)
        const savedUser = localStorage.getItem('currentUser');
        const savedRole = localStorage.getItem('userRole');
        
        if (savedUser && savedRole) {
            APP_STATE.currentUser = JSON.parse(savedUser);
            APP_STATE.userRole = savedRole;
        } else {
            // Default to student if no role is saved (for demo)
            APP_STATE.userRole = 'student';
            APP_STATE.currentUser = { 
                name: 'John Doe', 
                email: email,
                role: 'student'
            };
        }
        
        APP_STATE.isLoggedIn = true;
        
        updateUIForLoggedInUser();
        updateProfileLink(APP_STATE.userRole); // Update profile link
        closeModal('login-modal');
        showToast('Welcome back!', 'success');
    }
}


// Replace the existing handleRegister function
function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const firstName = formData.get('register-firstname');
    const lastName = formData.get('register-lastname');
    const email = formData.get('register-email');
    const role = document.getElementById('register-as')?.value; // Get the selected role
    
    // Simulate registration
    if (firstName && lastName && email && role) {
        APP_STATE.isLoggedIn = true;
        APP_STATE.userRole = role; // Store the user's role
        APP_STATE.currentUser = {
            name: firstName + ' ' + lastName,
            email: email,
            role: role // Also store in currentUser object
        };
        
        // Save to localStorage for persistence
        localStorage.setItem('userRole', role);
        localStorage.setItem('currentUser', JSON.stringify(APP_STATE.currentUser));
        
        updateUIForLoggedInUser();
        updateProfileLink(role); // Update the profile link based on role
        closeModal('register-modal');
        showToast(`Registration successful! Welcome to Astegni as a ${role}!`, 'success');
    } else {
        showToast('Please fill all required fields', 'warning');
    }
}

// New function to update profile links
function updateProfileLink(role) {
    // Get all profile links (desktop and mobile)
    const profileLinks = document.querySelectorAll('a[href*="profile.html"]');
    
    // Get the appropriate profile URL based on role
    const profileUrl = PROFILE_URLS[role] || 'index.html'; // Default fallback
    
    // Update all profile links
    profileLinks.forEach(link => {
        // Check if it's the main profile link in the dropdown
        if (link.textContent.includes('My Profile')) {
            link.href = profileUrl; // Adjust path as needed
        }
    });
    
    // Also update mobile menu if it exists
    const mobileProfileLink = document.querySelector('.mobile-menu a[href*="profile.html"]');
    if (mobileProfileLink) {
        mobileProfileLink.href = 'branch/' + profileUrl;
    }
}
// Update the existing updateUIForLoggedInUser function
function updateUIForLoggedInUser() {
    // Hide login/register buttons
    const loginButtons = document.querySelectorAll('#login-btn, #register-btn, #hero-login-btn, #hero-register-btn, #mobile-login-btn, #mobile-register-btn');
    loginButtons.forEach(btn => {
        if (btn) btn.classList.add('hidden');
    });
    
    // Show profile and notifications
    const profileElements = document.querySelectorAll('#profile-container, #notification-bell');
    profileElements.forEach(el => {
        if (el) el.classList.remove('hidden');
    });
    
    // Update profile info
    const profileName = document.getElementById('profile-name');
    if (profileName && APP_STATE.currentUser) {
        profileName.textContent = APP_STATE.currentUser.name;
    }
    
    const notificationCount = document.getElementById('notification-count');
    if (notificationCount) {
        notificationCount.textContent = '3';
    }
    
    // Update mobile menu to show profile options
    addMobileProfileOptions();
}

// Create mobile profile section with enhanced styling
const profileSection = document.createElement('div');
profileSection.id = 'mobile-profile-section';
profileSection.innerHTML = `
    <div class="mobile-menu-divider"></div>
    <div class="mobile-profile-header">
        <img src="${APP_STATE.currentUser?.avatar || 'https://picsum.photos/32'}" alt="Profile" class="mobile-profile-pic">
        <div class="mobile-profile-info">
            <span class="mobile-profile-name">${APP_STATE.currentUser?.name || 'User'}</span>
            <span class="mobile-profile-role">${APP_STATE.userRole || 'Member'}</span>
        </div>
    </div>
    <a class="mobile-menu-item" href="branch/${PROFILE_URLS[APP_STATE.userRole] || 'profile.html'}">
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
    const mobileMenu = document.getElementById('mobile-menu');
    if (!mobileMenu || !APP_STATE.isLoggedIn) return;
    
    // Remove existing profile section if any
    const existingSection = document.getElementById('mobile-profile-section');
    if (existingSection) existingSection.remove();
    
    // Create mobile profile section with correct profile URL
    const profileUrl = PROFILE_URLS[APP_STATE.userRole] || 'myProfile/student-profile.html';
    
    const profileSection = document.createElement('div');
    profileSection.id = 'mobile-profile-section';
    profileSection.innerHTML = `
        <div class="mobile-menu-divider"></div>
        <div class="mobile-profile-header">
            <img src="${APP_STATE.currentUser?.avatar || 'https://picsum.photos/32'}" alt="Profile" class="mobile-profile-pic">
            <div class="mobile-profile-info">
                <span class="mobile-profile-name">${APP_STATE.currentUser?.name || 'User'}</span>
                <span class="mobile-profile-role">${APP_STATE.userRole || 'Member'}</span>
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
    const menuContent = mobileMenu.querySelector('.mobile-menu-content');
    if (menuContent) {
        menuContent.appendChild(profileSection);
    }
}


// Update the logout function to clear role data
function logout() {
    APP_STATE.isLoggedIn = false;
    APP_STATE.currentUser = null;
    APP_STATE.userRole = null;
    
    // Clear from localStorage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    
    // Reset UI
    const loginButtons = document.querySelectorAll('#login-btn, #register-btn, #hero-login-btn, #hero-register-btn, #mobile-login-btn, #mobile-register-btn');
    loginButtons.forEach(btn => {
        if (btn) {
            btn.classList.remove('hidden');
            btn.style.display = '';
        }
    });
    
    const profileElements = document.querySelectorAll('#profile-container, #notification-bell');
    profileElements.forEach(el => {
        if (el) el.classList.add('hidden');
    });
    
    // Remove mobile profile section
    const mobileProfileSection = document.getElementById('mobile-profile-section');
    if (mobileProfileSection) {
        mobileProfileSection.remove();
    }
    
    // Reset profile link to default (you can remove this if not needed)
    const profileLink = document.getElementById('profile-link');
    if (profileLink) {
        profileLink.href = '#';
    }
    
    showToast('Logged out successfully', 'info');
}

// Update social login to assign a default role
function socialLogin(platform) {
    showToast(`Logging in with ${platform}...`, 'info');
    setTimeout(() => {
        // For social login, you might want to prompt for role or default to student
        const defaultRole = 'student'; // Or show a modal to select role
        
        APP_STATE.isLoggedIn = true;
        APP_STATE.userRole = defaultRole;
        APP_STATE.currentUser = { 
            name: 'Social User', 
            email: 'user@' + platform + '.com',
            role: defaultRole
        };
        
        // Save to localStorage
        localStorage.setItem('userRole', defaultRole);
        localStorage.setItem('currentUser', JSON.stringify(APP_STATE.currentUser));
        
        updateUIForLoggedInUser();
        updateProfileLink(defaultRole);
        closeModal('login-modal');
        showToast('Login successful!', 'success');
    }, 1500);
}

// ============================================
//   SCROLL EFFECTS
// ============================================
function initializeScrollEffects() {
    // Scroll progress bar
    window.addEventListener('scroll', () => {
        const scrollProgress = document.getElementById('scroll-progress');
        if (scrollProgress) {
            const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            scrollProgress.style.width = scrollPercent + '%';
        }
    });
    
    // Back to top button
    const backToTop = document.getElementById('back-to-top');
    window.addEventListener('scroll', () => {
        if (backToTop) {
            if (window.scrollY > 500) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        }
    });
    
    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // Parallax effects
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.feature-card, .course-flip-card, .testimonial-card').forEach(el => {
        observer.observe(el);
    });
}

// Update profile links based on user role
function updateProfileLink(role) {
    // Get the main profile link in the desktop navigation
    const profileLink = document.getElementById('profile-link');
    
    // Get the appropriate profile URL based on role
    const profileUrl = PROFILE_URLS[role] || 'myProfile/student-profile.html'; // Default to student
    
    // Update the main profile link
    if (profileLink) {
        profileLink.href = profileUrl;
    }
    
    // Update mobile menu profile link if user is logged in
    const mobileProfileLink = document.querySelector('#mobile-profile-section a[href*="profile"]');
    if (mobileProfileLink) {
        mobileProfileLink.href = profileUrl;
    }
}

// ============================================
//   REMAINING HELPER FUNCTIONS
// ============================================
function initializeSearch() {
    const searchInput = document.getElementById('global-search');
    const suggestions = document.getElementById('search-suggestions');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length > 2) {
                showSearchSuggestions(query, suggestions);
            } else if (suggestions) {
                suggestions.innerHTML = '';
            }
        });
    }
}

function openSearchModal() {
    const modal = document.getElementById('search-modal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            const searchInput = document.getElementById('global-search');
            if (searchInput) searchInput.focus();
        }, 100);
    }
}

function showSearchSuggestions(query, container) {
    if (!container) return;
    
    const suggestions = [
        'Mathematics Tutors',
        'Physics Course',
        'English Language',
        'Programming Basics',
        'Study Tips',
        'Exam Preparation'
    ].filter(s => s.toLowerCase().includes(query));
    
    container.innerHTML = suggestions.map(s => `
        <div class="suggestion-item" onclick="selectSuggestion('${s}')">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            ${s}
        </div>
    `).join('');
}

function selectSuggestion(suggestion) {
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.value = suggestion;
    }
    
    const suggestions = document.getElementById('search-suggestions');
    if (suggestions) {
        suggestions.innerHTML = '';
    }
    
    showToast(`Searching for "${suggestion}"...`, 'info');
}

function initializeNotifications() {
    // Simulate new notifications
    setInterval(() => {
        if (APP_STATE.isLoggedIn && Math.random() > 0.8) {
            addNotification({
                title: 'New Message',
                content: 'You have a new message from your tutor',
                type: 'info'
            });
        }
    }, 30000);
}

function addNotification(notification) {
    APP_STATE.notifications.push(notification);
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const badge = document.getElementById('notification-count');
    if (badge) {
        badge.textContent = APP_STATE.notifications.length.toString();
        badge.style.display = APP_STATE.notifications.length > 0 ? 'flex' : 'none';
    }
}

function initializeFormValidation() {
    // Password strength indicator
    const passwordInput = document.getElementById('register-password');
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            const strength = calculatePasswordStrength(e.target.value);
            const indicator = document.getElementById('password-strength');
            if (indicator) {
                indicator.style.setProperty('--strength', strength + '%');
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
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

function toggleRegisterFields() {
    const select = document.getElementById('register-as');
    if (select) {
        const role = select.value;
        showToast(`Registering as ${role}`, 'info');
    }
}

// ============================================
//   UTILITIES
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function initializeTooltips() {
    document.querySelectorAll('[data-tooltip]').forEach(el => {
        el.addEventListener('mouseenter', showTooltip);
        el.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(e) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = e.target.dataset.tooltip;
    document.body.appendChild(tooltip);
    
    const rect = e.target.getBoundingClientRect();
    tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
    tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
}

function hideTooltip() {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) tooltip.remove();
}

function initializeLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function handleNavLinkClick(e, link) {
    if (!APP_STATE.isLoggedIn && link !== 'store') {
        e.preventDefault();
        showToast('Please login to access this feature', 'warning');
        openModal('login-modal');
    }
}

// Dummy function for showTestimonial (if needed for legacy code)
function showTestimonial(index) {
    // This function is handled by initializeTestimonials now
    console.log('Testimonial index:', index);
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