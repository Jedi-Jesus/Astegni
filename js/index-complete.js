// ============================================
//   COMPLETE ASTEGNI INDEX.JS - ALL FEATURES PRESERVED
//   Consolidated version with 100% feature parity
// ============================================

console.log('🚀 Loading complete Astegni script...');

// Error handler to ensure loading screen is removed
window.addEventListener("error", (e) => {
    console.error("Script error:", e);
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
        loadingScreen.style.display = "none";
    }
});

// API Configuration
const API_BASE_URL = "https://api.astegni.com";

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
    guardian: "profile-pages/parent-profile.html",
    parent: "profile-pages/parent-profile.html",
    bookstore: "profile-pages/bookstore-profile.html",
    delivery: "profile-pages/delivery-profile.html",
    advertiser: "profile-pages/advertiser-profile.html",
    institute: "profile-pages/institute-profile.html",
    church: "profile-pages/church-profile.html",
    author: "profile-pages/author-profile.html",
};

const CONFIG = {
    API_URL: "https://api.astegni.et",
    ANIMATION_DURATION: 300,
    SCROLL_THRESHOLD: 100,
    TYPING_SPEED: 80,
    DELETE_SPEED: 40,
    PAUSE_DURATION: 2000,
    COUNTER_DURATION: 2000,
};

// Make global objects available
window.APP_STATE = APP_STATE;
window.CONFIG = CONFIG;
window.apiCall = apiCall;

// ============================================
//   COUNTER ANIMATION SYSTEM (ORIGINAL LOGIC)
// ============================================

// Counter data with original values (ALL 6 COUNTERS)
const counters = [
    { id: "counter-parents", target: 25000, current: 0, suffix: "+" },
    { id: "counter-students", target: 150000, current: 0, suffix: "+" },
    { id: "counter-tutors", target: 5000, current: 0, suffix: "+" },
    { id: "counter-centers", target: 200, current: 0, suffix: "+" },
    { id: "counter-books", target: 50000, current: 0, suffix: "+" },
    { id: "counter-jobs", target: 1200, current: 0, suffix: "+" },
];

// Enhanced counter animation function
function animateCounter(element, target, suffix = "", duration = 2000) {
    const startTime = performance.now();
    const startValue = 0;

    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function
        const easeProgress = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const currentValue = Math.floor(startValue + (target - startValue) * easeProgress);
        element.textContent = currentValue.toLocaleString() + suffix;

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.textContent = target.toLocaleString() + suffix;
        }
    };

    requestAnimationFrame(animate);
}

// Intersection Observer setup with proper counter reset handling
const observerOptions = {
    threshold: 0.3, // Trigger when 30% visible
    rootMargin: '0px 0px -10% 0px' // Better triggering
};

const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const counter = counters.find(c => c.id === entry.target.id);
        if (counter) {
            if (entry.isIntersecting) {
                // Only animate if not already animated or if we're coming back
                if (counter.current === 0 || entry.target.textContent === '0') {
                    console.log(`🔢 Animating counter: ${counter.id} to ${counter.target}`);
                    counter.current = counter.target;
                    animateCounter(entry.target, counter.target, counter.suffix, CONFIG.COUNTER_DURATION);
                }
            } else {
                // Reset counter when it goes out of view (scroll away)
                if (entry.boundingClientRect.top > window.innerHeight || entry.boundingClientRect.bottom < 0) {
                    counter.current = 0;
                    entry.target.textContent = '0';
                    console.log(`🔄 Reset counter: ${counter.id}`);
                }
            }
        }
    });
}, observerOptions);

// ============================================
//   TYPING ANIMATION SYSTEM
// ============================================

class TypingAnimation {
    constructor(element, texts, options = {}) {
        this.element = element;
        this.texts = texts;
        this.options = {
            speed: CONFIG.TYPING_SPEED,
            deleteSpeed: CONFIG.DELETE_SPEED,
            pauseDuration: CONFIG.PAUSE_DURATION,
            ...options
        };
        this.currentIndex = 0;
        this.currentText = '';
        this.isDeleting = false;
        this.isRunning = false;
        this.timeoutId = null;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.type();
    }

    stop() {
        this.isRunning = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }

    type() {
        if (!this.isRunning) return;

        const fullText = this.texts[this.currentIndex];

        if (this.isDeleting) {
            this.currentText = fullText.substring(0, this.currentText.length - 1);
        } else {
            this.currentText = fullText.substring(0, this.currentText.length + 1);
        }

        this.element.textContent = this.currentText;

        let typeSpeed = this.isDeleting ? this.options.deleteSpeed : this.options.speed;

        // Add natural variance
        typeSpeed += Math.random() * 50 - 25;

        if (!this.isDeleting && this.currentText === fullText) {
            typeSpeed = this.options.pauseDuration;
            this.isDeleting = true;
        } else if (this.isDeleting && this.currentText === '') {
            this.isDeleting = false;
            this.currentIndex = (this.currentIndex + 1) % this.texts.length;
            typeSpeed = this.options.speed;
        }

        this.timeoutId = setTimeout(() => this.type(), typeSpeed);
    }
}

// ============================================
//   MOBILE MENU SYSTEM (COMPLETE ORIGINAL)
// ============================================

window.toggleMobileMenu = function() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');

    console.log('📱 Toggling mobile menu');

    if (mobileMenu && mobileMenuToggle) {
        // Toggle classes
        mobileMenu.classList.toggle('open');
        mobileMenu.classList.toggle('hidden');
        mobileMenuToggle.classList.toggle('active');

        // Handle body scroll
        if (mobileMenu.classList.contains('open')) {
            document.body.style.overflow = 'hidden';
            console.log('📱 Mobile menu opened');
        } else {
            document.body.style.overflow = '';
            console.log('📱 Mobile menu closed');
        }
    }
};

// Close mobile menu function
window.closeMobileMenu = function() {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');

    console.log('📱 Closing mobile menu');

    if (mobileMenu?.classList.contains('open')) {
        mobileMenu.classList.remove('open');
        mobileMenu.classList.add('hidden');
        mobileMenuToggle?.classList.remove('active');
        document.body.style.overflow = '';
    }
};

// Close menu on outside click
document.addEventListener('click', function(event) {
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');

    if (mobileMenu?.classList.contains('open') &&
        !mobileMenuToggle?.contains(event.target) &&
        !mobileMenu.contains(event.target)) {
        closeMobileMenu();
    }
});

// ============================================
//   MODAL SYSTEM (ENHANCED)
// ============================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal with ID "${modalId}" not found`);
        return;
    }

    console.log(`🎭 Opening modal: ${modalId}`);
    modal.style.display = 'flex';
    modal.classList.add('active', 'show');
    document.body.style.overflow = 'hidden';

    // Add escape key handler
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal(modalId);
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    console.log(`🎭 Closing modal: ${modalId}`);
    modal.classList.remove('active', 'show');

    setTimeout(() => {
        modal.style.display = 'none';
    }, CONFIG.ANIMATION_DURATION);

    document.body.style.overflow = '';
}

// ============================================
//   TOAST NOTIFICATION SYSTEM
// ============================================

function showToast(message, type = 'info', duration = 5000) {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;

    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    // Add enhanced styles
    if (!document.getElementById('toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast-notification {
                position: fixed; top: 20px; right: 20px; z-index: 10000;
                max-width: 400px; background: var(--card-bg, #fff);
                border: 1px solid var(--border-color, #ddd);
                border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backdrop-filter: blur(10px);
            }
            .toast-notification.show { transform: translateX(0); }
            .toast-content {
                display: flex; align-items: center; gap: 0.75rem; padding: 1rem;
            }
            .toast-close {
                background: none; border: none; cursor: pointer; font-size: 1.25rem;
                color: var(--text-muted, #666); transition: color 0.2s ease;
            }
            .toast-close:hover { color: var(--text, #000); }
            .toast-success { border-left: 4px solid #10b981; }
            .toast-error { border-left: 4px solid #ef4444; }
            .toast-warning { border-left: 4px solid #f59e0b; }
            .toast-info { border-left: 4px solid #3b82f6; }

            @media (max-width: 768px) {
                .toast-notification { top: 10px; right: 10px; left: 10px; max-width: none; }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(toast);

    // Show with animation
    setTimeout(() => toast.classList.add('show'), 100);

    // Auto hide
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);

    console.log(`🍞 Toast: ${message} (${type})`);
}

// ============================================
//   COURSES DATA & MANAGEMENT
// ============================================

const coursesData = [
    {
        id: 1,
        title: "Advanced Mathematics",
        instructor: "Dr. Alemayehu Bekele",
        category: "tech",
        level: "Advanced",
        duration: "3 months",
        students: 450,
        rating: 4.9,
        price: "2,500 ETB",
        image: "https://picsum.photos/300/200?random=10",
        description: "Master calculus, algebra, and advanced mathematical concepts with Ethiopia's leading math educator."
    },
    {
        id: 2,
        title: "English Communication",
        instructor: "Sarah Johnson",
        category: "language",
        level: "Intermediate",
        duration: "2 months",
        students: 680,
        rating: 4.8,
        price: "1,800 ETB",
        image: "https://picsum.photos/300/200?random=11",
        description: "Improve your English speaking, writing, and comprehension skills for academic and professional success."
    },
    {
        id: 3,
        title: "Computer Science Fundamentals",
        instructor: "Engineer Dawit Mekuria",
        category: "tech",
        level: "Beginner",
        duration: "4 months",
        students: 320,
        rating: 4.9,
        price: "3,200 ETB",
        image: "https://picsum.photos/300/200?random=12",
        description: "Learn programming basics, data structures, and algorithms from industry professionals."
    },
    {
        id: 4,
        title: "Digital Art & Design",
        instructor: "Hanan Ahmed",
        category: "arts",
        level: "Intermediate",
        duration: "2.5 months",
        students: 280,
        rating: 4.7,
        price: "2,200 ETB",
        image: "https://picsum.photos/300/200?random=13",
        description: "Create stunning digital artwork using modern tools and techniques."
    },
    {
        id: 5,
        title: "Business Leadership",
        instructor: "Prof. Michael Tadesse",
        category: "business",
        level: "Advanced",
        duration: "3.5 months",
        students: 190,
        rating: 4.8,
        price: "2,800 ETB",
        image: "https://picsum.photos/300/200?random=14",
        description: "Develop leadership skills and business acumen for entrepreneurial success."
    },
    {
        id: 6,
        title: "Chemistry Excellence",
        instructor: "Dr. Almaz Desta",
        category: "tech",
        level: "Advanced",
        duration: "3 months",
        students: 380,
        rating: 4.9,
        price: "2,600 ETB",
        image: "https://picsum.photos/300/200?random=15",
        description: "Master organic, inorganic, and physical chemistry concepts with practical applications."
    }
];

// ============================================
//   SUCCESS STORIES / TESTIMONIALS DATA
// ============================================

const successStoriesData = [
    {
        id: 1,
        name: "Sara Tadesse",
        role: "Grade 12 Student",
        story: "Astegni helped me find the perfect math tutor. My grades improved from C to A in just 3 months! The personalized learning approach made all the difference.",
        image: "https://picsum.photos/80/80?random=20",
        rating: 5,
        achievement: "Grade improvement: C → A"
    },
    {
        id: 2,
        name: "Daniel Bekele",
        role: "Physics Tutor",
        story: "As a tutor, Astegni gave me the platform to reach students nationwide. I now teach over 50 students online and have built a successful teaching career!",
        image: "https://picsum.photos/80/80?random=21",
        rating: 5,
        achievement: "50+ students taught"
    },
    {
        id: 3,
        name: "Marta Alemu",
        role: "Parent",
        story: "The variety of courses and quality of instructors on Astegni is unmatched. Best investment in my child's education! My daughter now excels in all subjects.",
        image: "https://picsum.photos/80/80?random=22",
        rating: 5,
        achievement: "Child's academic success"
    },
    {
        id: 4,
        name: "Yohannes Haile",
        role: "University Student",
        story: "Astegni's advanced courses helped me prepare for university entrance exams. I scored in the top 5% and got accepted to my dream program!",
        image: "https://picsum.photos/80/80?random=23",
        rating: 5,
        achievement: "Top 5% entrance exam score"
    },
    {
        id: 5,
        name: "Almaz Girma",
        role: "Language Learner",
        story: "The English communication course transformed my confidence. I can now participate in international conferences and have advanced in my career.",
        image: "https://picsum.photos/80/80?random=24",
        rating: 5,
        achievement: "Career advancement"
    },
    {
        id: 6,
        name: "Dawit Solomon",
        role: "Entrepreneur",
        story: "The business leadership course gave me the skills to start my own company. We now have 15 employees and are expanding across Ethiopia!",
        image: "https://picsum.photos/80/80?random=25",
        rating: 5,
        achievement: "Founded successful company"
    }
];

// ============================================
//   PARTNERS DATA
// ============================================

const partnersData = [
    {
        id: 1,
        name: "Addis Ababa University",
        logo: "https://via.placeholder.com/120x60?text=AAU",
        category: "University",
        description: "Ethiopia's premier university and research institution"
    },
    {
        id: 2,
        name: "Ministry of Education",
        logo: "https://via.placeholder.com/120x60?text=MOE",
        category: "Government",
        description: "Official government education ministry partner"
    },
    {
        id: 3,
        name: "Ethiopian Institute of Technology",
        logo: "https://via.placeholder.com/120x60?text=EiT",
        category: "Institute",
        description: "Leading technology and engineering education"
    },
    {
        id: 4,
        name: "Haramaya University",
        logo: "https://via.placeholder.com/120x60?text=HU",
        category: "University",
        description: "Agricultural and rural development education"
    },
    {
        id: 5,
        name: "Jimma University",
        logo: "https://via.placeholder.com/120x60?text=JU",
        category: "University",
        description: "Health sciences and medical education leader"
    },
    {
        id: 6,
        name: "Ethiopian Education Research Institute",
        logo: "https://via.placeholder.com/120x60?text=EERI",
        category: "Research",
        description: "Educational research and development"
    }
];


// ============================================
//   COURSES INITIALIZATION
// ============================================

function initializeCourses() {
    const container = document.getElementById('courses-container');
    if (!container) {
        console.log('❌ Courses container not found');
        return;
    }

    console.log('📚 Initializing courses...');

    // Render course cards
    container.innerHTML = coursesData.map(course => `
        <div class="course-card fade-in-up" data-category="${course.category}">
            <div class="course-image">
                <img src="${course.image}" alt="${course.title}" loading="lazy">
                <div class="course-level">${course.level}</div>
            </div>
            <div class="course-content">
                <div class="course-header">
                    <h3 class="course-title">${course.title}</h3>
                    <div class="course-rating">
                        <span class="stars">${'★'.repeat(Math.floor(course.rating))}</span>
                        <span class="rating-number">${course.rating}</span>
                    </div>
                </div>
                <p class="course-instructor">by ${course.instructor}</p>
                <p class="course-description">${course.description}</p>
                <div class="course-meta">
                    <span class="course-duration">⏱️ ${course.duration}</span>
                    <span class="course-students">👥 ${course.students} students</span>
                </div>
                <div class="course-footer">
                    <div class="course-price">${course.price}</div>
                    <button class="enroll-btn" onclick="handleCourseEnroll(${course.id})">
                        Enroll Now
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Initialize course filters
    initializeCourseFilters();

    console.log('✅ Courses loaded');
}

function initializeCourseFilters() {
    const filterChips = document.querySelectorAll('.filter-chip');
    const courseCards = document.querySelectorAll('.course-card');

    filterChips.forEach(chip => {
        chip.addEventListener('click', function() {
            // Remove active from all chips
            filterChips.forEach(c => c.classList.remove('active'));
            // Add active to clicked chip
            this.classList.add('active');

            const filter = this.getAttribute('data-filter');

            // Filter courses
            courseCards.forEach(card => {
                if (filter === 'all' || card.getAttribute('data-category') === filter) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

window.handleCourseEnroll = function(courseId) {
    const course = coursesData.find(c => c.id === courseId);
    if (course) {
        showToast(`Enrolling in ${course.title}... Please login to continue.`, 'info');
        // Here you would typically redirect to enrollment page or open login modal
    }
};

window.handleViewMoreCourses = function() {
    showToast('Redirecting to all courses...', 'info');
    // Here you would typically redirect to courses page
};

// ============================================
//   SUCCESS STORIES INITIALIZATION
// ============================================

function initializeSuccessStories() {
    const slider = document.getElementById('testimonials-slider');
    if (!slider) {
        console.log('❌ Success stories slider not found');
        return;
    }

    console.log('🏆 Initializing success stories...');

    // Replace existing testimonials with dynamic ones
    slider.innerHTML = successStoriesData.map((story, index) => `
        <div class="testimonial-card ${index < 3 ? 'active' : ''} fade-in-up" style="animation-delay: ${index * 0.1}s">
            <div class="testimonial-content">
                <div class="quote-icon">"</div>
                <p class="testimonial-text">${story.story}</p>
                <div class="testimonial-author">
                    <img src="${story.image}" alt="${story.name}" class="author-avatar">
                    <div class="author-info">
                        <h4>${story.name}</h4>
                        <p>${story.role}</p>
                        <div class="rating">${'⭐'.repeat(story.rating)}</div>
                        <div class="achievement">${story.achievement}</div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    console.log('✅ Success stories loaded');
}

// ============================================
//   PARTNERS INITIALIZATION
// ============================================

function initializePartners() {
    // Check if partners section exists and has a container
    const partnersContainer = document.querySelector('.partners-grid') ||
                            document.querySelector('.partners-container') ||
                            document.querySelector('#partners-container');

    if (!partnersContainer) {
        console.log('❌ Partners container not found');
        return;
    }

    console.log('🤝 Initializing partners...');

    // Render partner cards
    partnersContainer.innerHTML = partnersData.map((partner, index) => `
        <div class="partner-card fade-in-up" style="animation-delay: ${index * 0.1}s">
            <div class="partner-logo">
                <img src="${partner.logo}" alt="${partner.name}" loading="lazy">
            </div>
            <div class="partner-info">
                <h4 class="partner-name">${partner.name}</h4>
                <p class="partner-category">${partner.category}</p>
                <p class="partner-description">${partner.description}</p>
            </div>
        </div>
    `).join('');

    console.log('✅ Partners loaded');
}

function initializeComingSoonModal() {
    const comingSoonForm = document.getElementById('comingSoonForm');
    if (!comingSoonForm) {
        console.log('❌ Coming soon form not found');
        return;
    }

    console.log('📧 Initializing coming soon modal form...');

    comingSoonForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('comingSoonEmail').value;
        const feature = document.getElementById('selectedFeature').value;

        if (!email || !feature) {
            showToast('Please fill in all fields', 'warning');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/coming-soon/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, feature })
            });

            if (response.ok) {
                showToast('Thank you! We\'ll notify you when this feature is ready.', 'success');
                closeModal('comingSoonModal');
                comingSoonForm.reset();
            } else {
                showToast('Something went wrong. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Coming soon subscription error:', error);
            showToast('Network error. Please check your connection.', 'error');
        }
    });

    console.log('✅ Coming soon modal form initialized');
}

// ============================================
//   SCROLL BEHAVIOR & NAVBAR
// ============================================

function initializeScrollBehavior() {
    const navbar = document.querySelector('.global-navbar');
    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateNavbar() {
        const currentScrollY = window.scrollY;

        if (navbar) {
            if (currentScrollY > CONFIG.SCROLL_THRESHOLD) {
                navbar.classList.add('scrolled', 'compact');

                // Hide/show navbar based on scroll direction
                if (currentScrollY > lastScrollY && currentScrollY > 200) {
                    navbar.classList.add('hidden');
                } else {
                    navbar.classList.remove('hidden');
                }
            } else {
                navbar.classList.remove('scrolled', 'compact', 'hidden');
            }
        }

        lastScrollY = currentScrollY;
        ticking = false;
    }

    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateNavbar);
            ticking = true;
        }
    }

    window.addEventListener('scroll', requestTick);
    console.log('📜 Scroll behavior initialized');
}

// ============================================
//   NAVIGATION LINK HANDLING
// ============================================

// ============================================
//   COMING SOON MODAL SYSTEM (ORIGINAL)
// ============================================

window.openComingSoonModal = function(feature) {
    const modal = document.getElementById('coming-soon-modal');
    const message = document.getElementById('coming-soon-message');

    if (!modal || !message) {
        console.error('Coming soon modal elements not found');
        return;
    }

    // Customize message based on feature
    const messages = {
        'news': 'Our news section is being crafted to bring you the latest updates in education and technology!',
        'store': 'Our bookstore is being stocked with amazing educational resources. Get ready to explore!',
        'find-jobs': 'Our job portal is being designed to connect talented individuals with great opportunities!'
    };

    message.textContent = messages[feature] || "We're working hard to bring you this feature. Stay tuned!";

    // Update content based on authentication status
    updateComingSoonModalContent();

    // Open the modal
    openModal('coming-soon-modal');
};

function updateComingSoonModalContent() {
    const form = document.getElementById('coming-soon-form');
    const authFooter = document.querySelector('.auth-footer');
    const featuresSection = document.querySelector('.coming-soon-features');

    if (!form) {
        console.error('Coming soon form element not found');
        return;
    }

    // Check if user is authenticated using APP_STATE
    if (APP_STATE.isLoggedIn && APP_STATE.currentUser) {
        console.log('User is logged in, hiding form and features...');

        // Hide form and features
        form.style.display = 'none';

        if (featuresSection) {
            featuresSection.style.display = 'none';
        }

        // Remove any existing logged-in message first
        let existingMessage = document.getElementById('coming-soon-logged-in-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new logged-in message
        let loggedInMessage = document.createElement('div');
        loggedInMessage.id = 'coming-soon-logged-in-message';
        loggedInMessage.className = 'logged-in-message';
        loggedInMessage.style.display = 'block';

        // Get user's name and email
        const userName = APP_STATE.currentUser.first_name ||
            APP_STATE.currentUser.name?.split(' ')[0] ||
            'there';
        const userEmail = APP_STATE.currentUser.email || 'your registered email';

        // Set the HTML content
        loggedInMessage.innerHTML = `
            <div class="success-check">
                <svg class="check-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z">
                    </path>
                </svg>
            </div>
            <h3 class="logged-in-title">You're all set, ${userName}!</h3>
            <p class="logged-in-text">
                We'll notify you at <strong>${userEmail}</strong> when this feature launches.
            </p>
            <div class="logged-in-benefits">
                <div class="benefit-item">
                    <span class="benefit-icon">✨</span>
                    <span>Early access guaranteed</span>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">🎯</span>
                    <span>Priority notifications</span>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">🎁</span>
                    <span>Exclusive launch offers</span>
                </div>
            </div>
            <p class="auth-footer">
                Expected launch: <strong>Q2 2025</strong>
            </p>
        `;

        // Insert the message
        if (featuresSection && featuresSection.parentNode) {
            featuresSection.parentNode.insertBefore(loggedInMessage, featuresSection.nextSibling);
        } else if (form && form.parentNode) {
            form.parentNode.insertBefore(loggedInMessage, form);
        } else {
            const modalContent = document.querySelector('.coming-soon-content');
            if (modalContent) {
                modalContent.appendChild(loggedInMessage);
            }
        }

    } else {
        console.log('User is not logged in, showing form and features...');

        // User is not logged in - show BOTH features and form
        form.style.display = 'block';

        // Show the features section
        if (featuresSection) {
            featuresSection.style.display = 'flex';
        }

        // Remove logged-in message if it exists
        const loggedInMessage = document.getElementById('coming-soon-logged-in-message');
        if (loggedInMessage) {
            loggedInMessage.remove();
        }
    }
}

window.handleComingSoonNotification = function(e) {
    e.preventDefault();

    // This should only run if user is not logged in (form is visible)
    if (APP_STATE.isLoggedIn) {
        showToast('You are already on the notification list!', 'info');
        return;
    }

    const email = document.getElementById('notify-email')?.value;

    if (!email) {
        showToast('Please enter your email address', 'warning');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'warning');
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Subscribing...';

    // Simulate API call
    setTimeout(() => {
        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;

        // Show success message
        showToast('You will be notified when this feature launches!', 'success');

        // Clear form
        document.getElementById('notify-email').value = '';

        // Close modal after delay
        setTimeout(() => {
            closeModal('coming-soon-modal');
        }, 2000);
    }, 1500);
};

window.handleNavLinkClick = function(e, link) {
    console.log(`🔗 Nav link clicked: ${link}`);

    // Define coming soon features
    const comingSoonFeatures = ['news', 'store', 'find-jobs'];

    // Check if it's a coming soon feature
    if (comingSoonFeatures.includes(link)) {
        e.preventDefault();
        e.stopPropagation();
        openComingSoonModal(link); // Use the original coming soon modal
        return false;
    }

    // Handle protected pages
    if (!APP_STATE.isLoggedIn) {
        const protectedPages = ['find-tutors', 'reels'];
        if (protectedPages.includes(link)) {
            e.preventDefault();
            e.stopPropagation();
            showToast(`Please login to access ${link.replace("-", " ")}`, "warning");
            openModal("login-modal");
            return false;
        }
    }

    // Close mobile menu if open
    closeMobileMenu();
    return true;
};

// ============================================
//   ENHANCED CSS ANIMATIONS
// ============================================

function addEnhancedStyles() {
    if (document.getElementById('enhanced-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'enhanced-styles';
    styles.textContent = `
        /* Typing Animation */
        .typing-cursor {
            display: inline-block;
            background-color: var(--primary-color, #3b82f6);
            width: 2px;
            height: 1.2em;
            margin-left: 2px;
            animation: blink 1s infinite;
        }

        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }

        /* Counter Animations */
        .counter-number {
            font-variant-numeric: tabular-nums;
            transition: all 0.3s ease;
            font-weight: 700;
        }

        /* Fade In Up Animation */
        .fade-in-up {
            opacity: 0;
            transform: translateY(30px);
            animation: fadeInUp 0.6s ease forwards;
        }

        @keyframes fadeInUp {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Enhanced Card Hover Effects */
        .counter-card-enhanced,
        .professional-review-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .counter-card-enhanced:hover,
        .professional-review-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        /* ENHANCED PROFESSIONAL REVIEWS STYLING */
        .professional-reviews-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 2rem;
            margin: 2rem 0;
        }

        .professional-review-card {
            background: var(--card-bg, #ffffff);
            border: 2px solid var(--border-color, #e5e7eb);
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
            position: relative;
            overflow: hidden;
        }

        .professional-review-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6, #ef4444);
        }

        .review-header {
            display: flex;
            align-items: flex-start;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .reviewer-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid var(--primary-color, #3b82f6);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .reviewer-details {
            flex: 1;
        }

        .reviewer-name {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--heading, #1f2937);
            margin-bottom: 0.25rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .verified-badge {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 50px;
            font-size: 0.75rem;
            font-weight: 600;
        }

        .reviewer-title {
            color: var(--text, #374151);
            font-weight: 600;
            margin-bottom: 0.25rem;
        }

        .reviewer-institution {
            color: var(--text-muted, #6b7280);
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
        }

        .expertise-badge {
            background: linear-gradient(135deg, var(--primary-color, #3b82f6), var(--primary-hover, #2563eb));
            color: white;
            padding: 0.25rem 1rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            display: inline-block;
        }

        .review-rating {
            color: #fbbf24;
            font-size: 1.5rem;
            margin-left: auto;
        }

        .review-content {
            font-style: italic;
            color: var(--text, #374151);
            line-height: 1.7;
            padding: 1.5rem;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.05));
            border-left: 4px solid var(--primary-color, #3b82f6);
            border-radius: 0 16px 16px 0;
            position: relative;
        }

        .review-content::before {
            content: '"';
            font-size: 4rem;
            color: var(--primary-color, #3b82f6);
            position: absolute;
            top: -1rem;
            left: 0.5rem;
            font-family: Georgia, serif;
            opacity: 0.3;
        }

        /* ENHANCED RECOGNITION STATS */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }

        .stat-item {
            text-align: center;
            padding: 2rem;
            background: linear-gradient(135deg, var(--card-bg, #ffffff), rgba(59, 130, 246, 0.02));
            border: 2px solid var(--border-color, #e5e7eb);
            border-radius: 20px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .stat-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            transform: scaleX(0);
            transition: transform 0.3s ease;
        }

        .stat-item:hover::before {
            transform: scaleX(1);
        }

        .stat-item:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(59, 130, 246, 0.15);
            border-color: var(--primary-color, #3b82f6);
        }

        .stat-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            display: block;
        }

        .stat-value {
            font-size: 2.5rem;
            font-weight: 800;
            color: var(--primary-color, #3b82f6);
            margin-bottom: 0.5rem;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .stat-label {
            color: var(--text-muted, #6b7280);
            font-size: 1rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* AD-MODAL ENHANCED STYLING FOR BIG SCREENS */
        @media (min-width: 1024px) {
            .ad-modal .modal-content {
                max-width: 900px;
                width: 90vw;
                max-height: 90vh;
                border-radius: 24px;
                padding: 3rem;
                background: linear-gradient(135deg, #ffffff, #f8fafc);
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            }

            .ad-modal .modal-header {
                text-align: center;
                margin-bottom: 3rem;
            }

            .ad-modal .modal-title {
                font-size: 2.5rem;
                font-weight: 800;
                background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 1rem;
            }

            .ad-modal .modal-subtitle {
                font-size: 1.2rem;
                color: var(--text-muted, #6b7280);
                max-width: 600px;
                margin: 0 auto;
            }

            .ad-modal .ad-packages {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 2rem;
                margin: 2rem 0;
            }

            .ad-modal .package-card {
                padding: 2rem;
                border-radius: 20px;
                border: 2px solid var(--border-color, #e5e7eb);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                background: white;
                position: relative;
                overflow: hidden;
            }

            .ad-modal .package-card::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #3b82f6, #8b5cf6);
                transform: scaleX(0);
                transition: transform 0.3s ease;
            }

            .ad-modal .package-card:hover::before {
                transform: scaleX(1);
            }

            .ad-modal .package-card:hover {
                transform: translateY(-8px);
                box-shadow: 0 20px 40px rgba(59, 130, 246, 0.15);
                border-color: var(--primary-color, #3b82f6);
            }
        }

        /* Mobile Menu Enhanced Transitions */
        .mobile-menu {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .mobile-menu.open {
            transform: translateX(0);
            opacity: 1;
        }

        .mobile-menu.hidden {
            transform: translateX(-100%);
            opacity: 0;
        }

        /* Hamburger Animation */
        .mobile-menu-toggle {
            transition: all 0.3s ease;
        }

        .mobile-menu-toggle.active {
            transform: rotate(90deg);
        }

        /* Scroll Progress Indicator */
        .scroll-progress {
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: linear-gradient(90deg, var(--primary-color, #3b82f6), var(--primary-hover, #2563eb));
            z-index: 9999;
            transition: width 0.1s ease;
        }

        /* Navbar Scroll Behavior */
        .global-navbar {
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .global-navbar.hidden {
            transform: translateY(-100%);
        }

        .global-navbar.scrolled {
            backdrop-filter: blur(20px);
            background: rgba(var(--nav-bg-rgb, 255, 255, 255), 0.9);
        }

        /* Enhanced Accessibility */
        @media (prefers-reduced-motion: reduce) {
            *, ::before, ::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }

        /* Loading States */
        .loading {
            pointer-events: none;
            opacity: 0.7;
        }

        .loading::after {
            content: "";
            position: absolute;
            width: 16px;
            height: 16px;
            margin: auto;
            border: 2px solid transparent;
            border-top-color: var(--primary-color, #3b82f6);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;

    document.head.appendChild(styles);
}

// ============================================
//   SCROLL PROGRESS INDICATOR
// ============================================

function initializeScrollProgress() {
    const progressBar = document.getElementById('scroll-progress');
    if (!progressBar) return;

    function updateProgress() {
        const scrollTop = document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / scrollHeight) * 100;

        progressBar.style.width = scrollPercent + '%';
    }

    window.addEventListener('scroll', updateProgress);
    console.log('📊 Scroll progress initialized');
}

// ============================================
//   MAIN INITIALIZATION
// ============================================

async function initializeApp() {
    console.log('🚀 Initializing complete Astegni application...');

    try {
        // Remove loading screen
        const loadingScreen = document.getElementById("loading-screen");
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => loadingScreen.style.display = 'none', 300);
            }, 500);
        }

        // Add enhanced styles first
        addEnhancedStyles();

        // Initialize typing animation - FIXED FOR CORRECT ELEMENT
        const typingElement = document.querySelector('.typing-text') || document.getElementById('hero-text-content');
        if (typingElement) {
            console.log('📝 Starting typing animation...');
            const texts = [
                "Transform Your Education Journey",
                "Connect with Expert Tutors Across Ethiopia",
                "Learn at Your Own Pace, Anytime, Anywhere",
                "Build Your Future with Astegni Today",
                "Join Ethiopia's Educational Revolution"
            ];
            const typingAnim = new TypingAnimation(typingElement, texts);
            typingAnim.start();
        }

        // Initialize counters with intersection observer
        console.log('🔢 Setting up counter observers...');
        counters.forEach(counter => {
            const element = document.getElementById(counter.id);
            if (element) {
                element.textContent = '0'; // Start at 0
                counterObserver.observe(element);
                console.log(`✅ Counter observer set for: ${counter.id}`);
            } else {
                console.warn(`⚠️ Counter element not found: ${counter.id}`);
            }
        });

        // Initialize all other systems
        initializeProfessionalReviews();
        initializeCourses();
        initializeSuccessStories();
        initializePartners();
        initializeComingSoonModal();
        initializeScrollBehavior();
        initializeScrollProgress();

        // Try to load data from API
        try {
            await loadDataFromAPI();
        } catch (error) {
            console.log('📡 API unavailable, using fallback data');
        }

        // Setup auth state
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('currentUser');
        if (token && user) {
            APP_STATE.isLoggedIn = true;
            APP_STATE.currentUser = JSON.parse(user);
            console.log('👤 User authenticated');
        }

        console.log('✅ Application fully initialized!');

        // Show success notification
        setTimeout(() => {
            showToast('Welcome to Astegni! Platform loaded successfully.', 'success', 3000);
        }, 1000);

    } catch (error) {
        console.error('❌ Initialization error:', error);
        showToast('Some features may not work properly. Please refresh the page.', 'warning');
    }
}

// ============================================
//   API DATA LOADING
// ============================================

async function loadDataFromAPI() {
    console.log('📡 Attempting to load data from API...');

    try {
        // Try to load counter data
        const countersResponse = await apiCall("/api/counters");
        if (countersResponse.ok) {
            const apiCounters = await countersResponse.json();
            apiCounters.forEach((apiCounter) => {
                const counter = counters.find(c => c.id === `counter-${apiCounter.counter_type}`);
                if (counter) {
                    counter.target = apiCounter.count;
                    console.log(`📊 Updated ${counter.id} target to ${counter.target}`);
                }
            });
        }
    } catch (error) {
        console.log('📡 Counter API unavailable, using defaults');
    }

    // Load other API data as needed...
}

// ============================================
//   GLOBAL EXPORTS
// ============================================

// Make functions globally available
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.handleNavLinkClick = handleNavLinkClick;

// ============================================
//   AUTO INITIALIZATION
// ============================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already ready
    setTimeout(initializeApp, 100);
}

console.log('📦 Complete Astegni script loaded and ready!');