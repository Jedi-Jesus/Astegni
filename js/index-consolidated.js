// ============================================
//   CONSOLIDATED INDEX.JS - NON-MODULE VERSION
//   All functionality in one file for compatibility
// ============================================

console.log('🚀 Loading consolidated script...');

// Global Configuration
const CONFIG = {
    API_URL: "https://api.astegni.com",
    API_BASE_URL: "https://api.astegni.com",
    ANIMATION_DURATION: 300,
    SCROLL_THRESHOLD: 100,
    TYPING_SPEED: 80,
    DELETE_SPEED: 40,
    PAUSE_DURATION: 2000,
    COUNTER_DURATION: 2000,
};

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

// Make APP_STATE globally available
window.APP_STATE = APP_STATE;

// ============================================
//   TYPING ANIMATION CLASS
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
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.type();
    }

    stop() {
        this.isRunning = false;
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
        typeSpeed += Math.random() * 50;

        if (!this.isDeleting && this.currentText === fullText) {
            typeSpeed = this.options.pauseDuration;
            this.isDeleting = true;
        } else if (this.isDeleting && this.currentText === '') {
            this.isDeleting = false;
            this.currentIndex = (this.currentIndex + 1) % this.texts.length;
            typeSpeed = this.options.speed;
        }

        setTimeout(() => this.type(), typeSpeed);
    }
}

// ============================================
//   COUNTER ANIMATION CLASS
// ============================================
class CounterAnimation {
    constructor(element, targetValue, options = {}) {
        this.element = element;
        this.targetValue = parseInt(targetValue) || 0;
        this.options = { duration: CONFIG.COUNTER_DURATION, ...options };
        this.currentValue = 0;
        this.hasAnimated = false;
    }

    animate() {
        if (this.hasAnimated) return;
        this.hasAnimated = true;

        const startTime = performance.now();
        const startValue = 0;
        const change = this.targetValue - startValue;

        const animateStep = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / this.options.duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            this.currentValue = Math.round(startValue + (change * easeProgress));
            this.element.textContent = this.currentValue.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(animateStep);
            } else {
                this.element.textContent = this.targetValue.toLocaleString();
            }
        };

        requestAnimationFrame(animateStep);
    }
}

// ============================================
//   SCROLL ANIMATIONS
// ============================================
class ScrollAnimations {
    constructor() {
        this.setupIntersectionObserver();
    }

    setupIntersectionObserver() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const animationType = element.dataset.animate;

                    if (element.classList.contains('counter-number')) {
                        this.animateCounter(element);
                    } else {
                        element.classList.add('animate-in');
                    }

                    this.observer.unobserve(element);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
    }

    observe(element, animationType = 'fade-in') {
        element.dataset.animate = animationType;
        this.observer.observe(element);
    }

    animateCounter(element) {
        const targetValue = element.dataset.target || element.textContent;
        const counter = new CounterAnimation(element, targetValue);
        counter.animate();
    }
}

// ============================================
//   TOAST NOTIFICATION SYSTEM
// ============================================
function showToast(message, type = 'info', duration = 5000) {
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

    // Add styles
    if (!document.getElementById('toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast-notification {
                position: fixed; top: 20px; right: 20px; z-index: 10000;
                max-width: 400px; background: #fff; border: 1px solid #ddd;
                border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                transform: translateX(100%); transition: transform 0.3s ease;
            }
            .toast-notification.show { transform: translateX(0); }
            .toast-content { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; }
            .toast-close { background: none; border: none; cursor: pointer; }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Make showToast globally available
window.showToast = showToast;

// ============================================
//   MODAL MANAGEMENT
// ============================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal with ID "${modalId}" not found`);
        return;
    }

    modal.style.display = 'flex';
    modal.classList.add('active', 'show');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('active', 'show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
    document.body.style.overflow = '';
}

// Make modal functions globally available
window.openModal = openModal;
window.closeModal = closeModal;

// ============================================
//   MAIN INITIALIZATION
// ============================================
function initializeApp() {
    console.log('🚀 Initializing Astegni App...');

    // Initialize typing animation
    const typingElement = document.querySelector('.typing-text');
    if (typingElement) {
        console.log('📝 Initializing typing animation...');
        const texts = [
            "Connect with Expert Tutors",
            "Learn at Your Own Pace",
            "Build Your Future Today",
            "Join Ethiopia's Learning Revolution"
        ];
        const typingAnim = new TypingAnimation(typingElement, texts);
        typingAnim.start();
        console.log('✅ Typing animation started');
    } else {
        console.log('❌ Typing element not found');
    }

    // Initialize scroll animations
    const scrollAnimations = new ScrollAnimations();

    // Initialize counter animations
    const counterElements = document.querySelectorAll('.counter-number');
    console.log(`🔢 Found ${counterElements.length} counter elements`);

    counterElements.forEach(element => {
        const targetValue = element.dataset.target || element.textContent;
        element.dataset.target = targetValue;
        element.textContent = '0';
        scrollAnimations.observe(element, 'counter');
    });

    // Initialize professional reviews
    initializeProfessionalReviews();

    // Initialize mobile menu
    initializeMobileMenu();

    // Add CSS animations
    addAnimationStyles();

    console.log('✅ App initialized successfully');

    // Show success toast
    setTimeout(() => {
        showToast('Astegni platform loaded successfully!', 'success');
    }, 1000);
}

function initializeProfessionalReviews() {
    const container = document.getElementById('professionalReviewsContainer');
    const statsContainer = document.getElementById('reviewStats');

    if (!container || !statsContainer) {
        console.log('❌ Professional reviews containers not found');
        return;
    }

    console.log('📊 Initializing professional reviews...');

    // Render reviews
    container.innerHTML = professionalReviewsData.map(review => `
        <div class="professional-review-card">
            <div class="review-header">
                <div class="reviewer-info">
                    <img src="${review.image}" alt="${review.name}" class="reviewer-avatar">
                    <div class="reviewer-details">
                        <h4 class="reviewer-name">
                            ${review.name}
                            ${review.verified ? '<span class="verified-badge">✓</span>' : ''}
                        </h4>
                        <p class="reviewer-title">${review.title}</p>
                        <p class="reviewer-institution">${review.institution}</p>
                        <span class="expertise-badge">${review.expertise}</span>
                    </div>
                </div>
                <div class="review-rating">${'★'.repeat(review.rating)}</div>
            </div>
            <blockquote class="review-content">"${review.review}"</blockquote>
        </div>
    `).join('');

    // Render stats
    statsContainer.innerHTML = `
        <h3 class="stats-title">Professional Recognition</h3>
        <div class="stats-grid">
            ${recognitionStats.map(stat => `
                <div class="stat-item">
                    <div class="stat-icon">${stat.icon}</div>
                    <div class="stat-value">${stat.value}</div>
                    <div class="stat-label">${stat.label}</div>
                </div>
            `).join('')}
        </div>
    `;

    console.log('✅ Professional reviews loaded');
}

function initializeMobileMenu() {
    const hamburgerBtn = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (!hamburgerBtn || !mobileMenu) {
        console.log('❌ Mobile menu elements not found');
        return;
    }

    console.log('📱 Initializing mobile menu...');

    hamburgerBtn.addEventListener('click', function() {
        hamburgerBtn.classList.toggle('active');
        mobileMenu.classList.toggle('open');
        mobileMenu.classList.toggle('hidden');
    });

    console.log('✅ Mobile menu initialized');
}

function addAnimationStyles() {
    if (document.getElementById('animation-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'animation-styles';
    styles.textContent = `
        .typing-cursor {
            display: inline-block;
            background-color: #3b82f6;
            width: 2px;
            height: 1.2em;
            margin-left: 2px;
            animation: blink 1s infinite;
        }

        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }

        .counter-number {
            font-variant-numeric: tabular-nums;
            transition: all 0.3s ease;
        }

        .animate-in {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(styles);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('📁 Consolidated script loaded');