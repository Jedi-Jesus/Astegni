// ============================================
// ENHANCED STORE JAVASCRIPT WITH ANIMATIONS
// Spectacular effects and news-inspired functionality
// ============================================

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializeAnimations();
    initializeBubbles();
    initializeParticles();
    initializeStickyNav();
    initializeHeroAnimations();
    initializeScrollEffects();
    loadBooksGrid();
    loadFeaturedCarousel();
    initializeEventListeners();
    animateHeroStats();
});

// Create Floating Bubbles
function initializeBubbles() {
    const container = document.getElementById('bubbleContainer');
    if (!container) return;
    
    const colors = [
        'rgba(245, 158, 11, 0.6)',
        'rgba(139, 92, 246, 0.6)',
        'rgba(236, 72, 153, 0.6)',
        'rgba(16, 185, 129, 0.6)',
        'rgba(59, 130, 246, 0.6)'
    ];
    
    function createBubble() {
        const bubble = document.createElement('div');
        bubble.className = 'floating-bubble';
        
        // Random properties
        const size = Math.random() * 60 + 20;
        const startX = Math.random() * window.innerWidth;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const duration = Math.random() * 10 + 10;
        const delay = Math.random() * 5;
        
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${startX}px`;
        bubble.style.background = `radial-gradient(circle at 30% 30%, ${color}, transparent)`;
        bubble.style.animationDuration = `${duration}s`;
        bubble.style.animationDelay = `${delay}s`;
        
        container.appendChild(bubble);
        
        // Remove bubble after animation
        setTimeout(() => {
            bubble.remove();
        }, (duration + delay) * 1000);
    }
    
    // Create initial bubbles
    for (let i = 0; i < 5; i++) {
        setTimeout(() => createBubble(), i * 1000);
    }
    
    // Continue creating bubbles
    setInterval(createBubble, 3000);
}

// Initialize Particle Canvas
function initializeParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const particleCount = 50;
    
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 3 + 1;
            this.speedX = Math.random() * 2 - 1;
            this.speedY = Math.random() * 2 - 1;
            this.opacity = Math.random() * 0.5 + 0.2;
        }
        
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            
            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        }
        
        draw() {
            ctx.fillStyle = `rgba(245, 158, 11, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Create particles
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }
    
    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });
        
        // Connect nearby particles
        particles.forEach((p1, i) => {
            particles.slice(i + 1).forEach(p2 => {
                const distance = Math.sqrt(
                    Math.pow(p1.x - p2.x, 2) + 
                    Math.pow(p1.y - p2.y, 2)
                );
                
                if (distance < 100) {
                    ctx.strokeStyle = `rgba(245, 158, 11, ${0.1 * (1 - distance / 100)})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            });
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
    
    // Resize handler
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// Sticky Navigation with Scroll Effects
function initializeStickyNav() {
    const mainNav = document.getElementById('mainNav');
    const categoryNav = document.getElementById('categoryNav');
    let lastScroll = 0;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Add scrolled class to main nav
        if (currentScroll > 50) {
            mainNav.classList.add('scrolled');
        } else {
            mainNav.classList.remove('scrolled');
        }
        
        // Hide/show navigation on scroll
        if (currentScroll > lastScroll && currentScroll > 300) {
            mainNav.style.transform = 'translateY(-100%)';
        } else {
            mainNav.style.transform = 'translateY(0)';
        }
        
        lastScroll = currentScroll;
    });
}

// Hero Section Animations
function initializeHeroAnimations() {
    // Animate title letters
    const titleWords = document.querySelectorAll('.hero-title span');
    titleWords.forEach((word, index) => {
        word.style.animation = `fadeInUp 0.8s ease ${index * 0.2}s both`;
    });
    
    // Parallax effect for hero visual
    window.addEventListener('mousemove', (e) => {
        const heroVisual = document.querySelector('.hero-visual-enhanced');
        if (!heroVisual) return;
        
        const x = (e.clientX - window.innerWidth / 2) / 50;
        const y = (e.clientY - window.innerHeight / 2) / 50;
        
        heroVisual.style.transform = `translateX(${x}px) translateY(${y}px)`;
    });
}

// Scroll-triggered Animations
function initializeScrollEffects() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                
                // Special animation for book cards
                if (entry.target.classList.contains('book-card-modern')) {
                    const delay = Array.from(entry.target.parentElement.children).indexOf(entry.target) * 0.1;
                    entry.target.style.animationDelay = `${delay}s`;
                }
            }
        });
    }, observerOptions);
    
    // Observe elements
    document.querySelectorAll('.book-card-modern, .widget-modern, .stat-item-modern').forEach(el => {
        observer.observe(el);
    });
}

// Animated Hero Stats Counter
function animateHeroStats() {
    const stats = document.querySelectorAll('.stat-number-modern[data-count]');
    
    const countUp = (element) => {
        const target = parseInt(element.getAttribute('data-count'));
        const duration = 2000;
        const increment = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = Math.floor(current).toLocaleString();
        }, 16);
    };
    
    // Trigger animation when in view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                countUp(entry.target);
                entry.target.classList.add('counted');
            }
        });
    });
    
    stats.forEach(stat => observer.observe(stat));
}

// Load Books Grid with Modern Cards
function loadBooksGrid() {
    const grid = document.getElementById('booksGrid');
    if (!grid) return;
    
    const books = [
        {
            id: 1,
            title: "The Dragon's Quest",
            author: "Sarah Johnson",
            price: 24.99,
            rating: 4.5,
            category: "Fantasy",
            image: "https://picsum.photos/seed/book1/280/400",
            badge: "BESTSELLER"
        },
        {
            id: 2,
            title: "Mystery of the Stars",
            author: "Michael Chen",
            price: 19.99,
            rating: 4.8,
            category: "Sci-Fi",
            image: "https://picsum.photos/seed/book2/280/400",
            badge: "NEW"
        },
        {
            id: 3,
            title: "Love & War",
            author: "Emily Davis",
            price: 29.99,
            rating: 4.2,
            category: "Romance",
            image: "https://picsum.photos/seed/book3/280/400",
            badge: "HOT"
        },
        {
            id: 4,
            title: "The Silent Witness",
            author: "Robert Miller",
            price: 22.99,
            rating: 4.6,
            category: "Mystery",
            image: "https://picsum.photos/seed/book4/280/400"
        },
        {
            id: 5,
            title: "Journey Within",
            author: "Lisa Anderson",
            price: 18.99,
            rating: 4.9,
            category: "Self-Help",
            image: "https://picsum.photos/seed/book5/280/400",
            badge: "TRENDING"
        },
        {
            id: 6,
            title: "Ancient Wisdom",
            author: "Dr. James Wilson",
            price: 34.99,
            rating: 4.7,
            category: "History",
            image: "https://picsum.photos/seed/book6/280/400"
        }
    ];
    
    grid.innerHTML = books.map(book => createModernBookCard(book)).join('');
}

// Create Modern Book Card
function createModernBookCard(book) {
    return `
        <div class="book-card-modern" onclick="openBookQuickView(${book.id})">
            <div class="book-cover">
                ${book.badge ? `<div class="book-badge">${book.badge}</div>` : ''}
                <img src="${book.image}" alt="${book.title}">
            </div>
            <div class="book-info">
                <div class="book-category">${book.category}</div>
                <div class="book-title">${book.title}</div>
                <div class="book-author">by ${book.author}</div>
                <div class="book-footer">
                    <div class="book-price">$${book.price}</div>
                    <div class="book-rating">
                        <span>⭐</span> ${book.rating}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Load Featured Carousel
function loadFeaturedCarousel() {
    const carousel = document.getElementById('featuredCarousel');
    if (!carousel) return;
    
    // Use the same books data
    const books = [
        { id: 1, title: "The Dragon's Quest", author: "Sarah Johnson", price: 24.99, rating: 4.5, category: "Fantasy", image: "https://picsum.photos/seed/book1/280/400", badge: "BESTSELLER" },
        { id: 2, title: "Mystery of the Stars", author: "Michael Chen", price: 19.99, rating: 4.8, category: "Sci-Fi", image: "https://picsum.photos/seed/book2/280/400", badge: "NEW" },
        { id: 3, title: "Love & War", author: "Emily Davis", price: 29.99, rating: 4.2, category: "Romance", image: "https://picsum.photos/seed/book3/280/400", badge: "HOT" },
        { id: 4, title: "The Silent Witness", author: "Robert Miller", price: 22.99, rating: 4.6, category: "Mystery", image: "https://picsum.photos/seed/book4/280/400" }
    ];
    
    carousel.innerHTML = books.map(book => createModernBookCard(book)).join('');
}

// Category Filter Function
function filterByGenre(genre) {
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-category') === genre) {
            btn.classList.add('active');
        }
    });
    
    // Add filter animation
    const grid = document.getElementById('booksGrid');
    grid.style.opacity = '0';
    grid.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        // Reload books based on filter
        loadBooksGrid();
        grid.style.opacity = '1';
        grid.style.transform = 'translateY(0)';
    }, 300);
    
    showToast(`Showing ${genre} books`, 'info');
}

// Carousel Controls
function carouselPrev() {
    const carousel = document.getElementById('featuredCarousel');
    carousel.scrollBy({ left: -300, behavior: 'smooth' });
}

function carouselNext() {
    const carousel = document.getElementById('featuredCarousel');
    carousel.scrollBy({ left: 300, behavior: 'smooth' });
}

// Initialize Additional Animations
function initializeAnimations() {
    // Add hover tilt effect to book cards
    document.addEventListener('mousemove', (e) => {
        const cards = document.querySelectorAll('.book-card-modern');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            
            if (e.clientX > rect.left && e.clientX < rect.right && 
                e.clientY > rect.top && e.clientY < rect.bottom) {
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
            } else {
                card.style.transform = '';
            }
        });
    });
}

// Toast Notification
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Animate in
    toast.style.animation = 'slideInRight 0.3s ease';
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize Event Listeners
function initializeEventListeners() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    
    // View toggle for books grid
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const view = this.getAttribute('data-view');
            const grid = document.getElementById('booksGrid');
            
            if (view === 'list') {
                grid.classList.add('list-view');
            } else {
                grid.classList.remove('list-view');
            }
        });
    });
}

// Utility Functions
function scrollToBooks() {
    const booksSection = document.getElementById('booksSection');
    booksSection.scrollIntoView({ behavior: 'smooth' });
}

function loadMoreBooks() {
    const btn = document.querySelector('.load-more-btn-modern');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    
    btnText.style.display = 'none';
    btnLoader.classList.remove('hidden');
    
    setTimeout(() => {
        loadBooksGrid();
        btnText.style.display = 'inline';
        btnLoader.classList.add('hidden');
        showToast('More books loaded!', 'success');
    }, 1500);
}

function subscribeNewsletter(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="email"]').value;
    showToast(`Subscribed with ${email}!`, 'success');
    event.target.reset();
}

// Theme Toggle
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggle();
}

function updateThemeToggle() {
    const theme = document.documentElement.getAttribute('data-theme');
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    
    if (theme === 'dark') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

// Initialize theme on load
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeToggle();

// Export functions for global use
window.filterByGenre = filterByGenre;
window.carouselPrev = carouselPrev;
window.carouselNext = carouselNext;
window.scrollToBooks = scrollToBooks;
window.loadMoreBooks = loadMoreBooks;
window.subscribeNewsletter = subscribeNewsletter;
window.toggleTheme = toggleTheme;
window.showToast = showToast;