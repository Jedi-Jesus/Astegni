// ============================================
// ENHANCED STORE JAVASCRIPT
// Complete functionality for Astegni Bookstore
// ============================================

// ============================================
// GLOBAL STATE MANAGEMENT
// ============================================
const StoreState = {
    cart: [],
    wishlist: [],
    currentUser: null,
    darkMode: localStorage.getItem('darkMode') === 'true',
    searchHistory: JSON.parse(localStorage.getItem('searchHistory') || '[]'),
    filters: {
        category: 'all',
        priceRange: { min: 0, max: 1000 },
        rating: 0,
        sortBy: 'relevance'
    },
    books: [],
    bookstores: [],
    currentPage: 1,
    itemsPerPage: 12,
    isLoading: false,
    currentBook: null,
    viewMode: 'grid'
};

// ============================================
// SAMPLE DATA GENERATORS
// ============================================
const sampleBookstores = [
    { id: 1, name: 'Mega Books Ethiopia', location: 'Bole, Addis Ababa', rating: 4.8, reviews: 523, books: 1250, logo: 'https://picsum.photos/seed/store1/60/60' },
    { id: 2, name: 'Academic Hub', location: '4 Kilo, Addis Ababa', rating: 4.6, reviews: 312, books: 890, logo: 'https://picsum.photos/seed/store2/60/60' },
    { id: 3, name: 'Fiction Paradise', location: 'Piassa, Addis Ababa', rating: 4.9, reviews: 678, books: 2100, logo: 'https://picsum.photos/seed/store3/60/60' },
    { id: 4, name: 'Knowledge Center', location: 'Kazanchis, Addis Ababa', rating: 4.7, reviews: 445, books: 1560, logo: 'https://picsum.photos/seed/store4/60/60' },
    { id: 5, name: 'Book World Ethiopia', location: 'Megenagna, Addis Ababa', rating: 4.5, reviews: 289, books: 980, logo: 'https://picsum.photos/seed/store5/60/60' }
];

const sampleAuthors = [
    { id: 1, name: 'Sarah Johnson', books: 245, followers: '15K', avatar: 'https://picsum.photos/seed/author1/48/48' },
    { id: 2, name: 'Michael Chen', books: 189, followers: '12K', avatar: 'https://picsum.photos/seed/author2/48/48' },
    { id: 3, name: 'Emily Davis', books: 312, followers: '18K', avatar: 'https://picsum.photos/seed/author3/48/48' },
    { id: 4, name: 'Robert Martinez', books: 156, followers: '8K', avatar: 'https://picsum.photos/seed/author4/48/48' },
    { id: 5, name: 'Jessica Taylor', books: 234, followers: '22K', avatar: 'https://picsum.photos/seed/author5/48/48' }
];

const categories = [
    {
        id: 'fiction',
        name: 'Fiction',
        icon: '📚',
        subcategories: [
            { id: 'fantasy', name: 'Fantasy', icon: '🐉', count: 245 },
            { id: 'scifi', name: 'Sci-Fi', icon: '🚀', count: 189 },
            { id: 'romance', name: 'Romance', icon: '💕', count: 312 },
            { id: 'mystery', name: 'Mystery', icon: '🔍', count: 156 },
            { id: 'thriller', name: 'Thriller', icon: '😱', count: 198 }
        ]
    },
    {
        id: 'nonfiction',
        name: 'Non-Fiction',
        icon: '📖',
        subcategories: [
            { id: 'academics', name: 'Academics', icon: '🎓', count: 423 },
            { id: 'theology', name: 'Theology', icon: '🙏', count: 87 },
            { id: 'biography', name: 'Biography', icon: '👤', count: 234 },
            { id: 'selfhelp', name: 'Self-Help', icon: '💪', count: 178 },
            { id: 'history', name: 'History', icon: '📜', count: 267 }
        ]
    },
    {
        id: 'special',
        name: 'Special Collections',
        icon: '✨',
        subcategories: [
            { id: 'bestsellers', name: 'Bestsellers', icon: '🏆', badge: 'NEW' },
            { id: 'deals', name: "Today's Deals", icon: '🎯', badge: 'HOT' },
            { id: 'toprated', name: 'Top Rated', icon: '⭐', count: 89 },
            { id: 'featured', name: 'Featured This Week', icon: '🌟', count: 34 },
            { id: 'rare', name: 'Rare Books', icon: '💎', count: 45 },
            { id: 'limited', name: 'Limited Edition', icon: '🔒', count: 28 }
        ]
    },
    {
        id: 'kids',
        name: 'Kids & Young Adults',
        icon: '🧸',
        subcategories: [
            { id: 'picture', name: 'Picture Books', icon: '🎨', count: 156 },
            { id: 'youngadult', name: 'Young Adult', icon: '🎭', count: 289 }
        ]
    }
];

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initializeStore();
    initializeAnimations();
    initializeEnhancements();
    initializeEventListeners();
    loadInitialData();
    applyTheme();
    animateHeroStats();
    startDealTimer();
    loadCategories();
    loadBookstores();
    loadAuthors();
});

function initializeStore() {
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        StoreState.cart = JSON.parse(savedCart);
        updateCartUI();
    }

    // Load wishlist from localStorage
    const savedWishlist = localStorage.getItem('wishlist');
    if (savedWishlist) {
        StoreState.wishlist = JSON.parse(savedWishlist);
        updateWishlistUI();
    }

    // Initialize particles
    initializeParticles();

    // Initialize floating bubbles
    initializeBubbles();

    // Check scroll position for nav
    handleNavScroll();
}

// ============================================
// ENHANCED INITIALIZATION
// ============================================
function initializeEnhancements() {
    // Initialize search suggestions
    enhanceSearchSuggestions();
    
    // Initialize typing animation
    initTypingAnimation();
    
    // Create hero bubbles
    createHeroBubbles();
    
    // Update sub nav categories
    updateSubNavCategories();
    
    // Create sub nav carousel
    createSubNavCarousel();
    
    // Add special deals widget
    addSpecialDealsWidget();
    
    // Enhance modals
    enhanceAuthorModal();
    enhanceBookstoreSocials();
}

// ============================================
// PARTICLE ANIMATION SYSTEM
// ============================================
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
            this.speedX = Math.random() * 3 - 1.5;
            this.speedY = Math.random() * 3 - 1.5;
            this.opacity = Math.random() * 0.5 + 0.2;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.x > canvas.width) this.x = 0;
            if (this.x < 0) this.x = canvas.width;
            if (this.y > canvas.height) this.y = 0;
            if (this.y < 0) this.y = canvas.height;
        }

        draw() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            } else {
                ctx.fillStyle = `rgba(245, 158, 11, ${this.opacity})`;
            }
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
        requestAnimationFrame(animate);
    }

    animate();

    // Handle resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// ============================================
// FLOATING BUBBLES ANIMATION
// ============================================
function initializeBubbles() {
    const container = document.getElementById('bubbleContainer');
    if (!container) return;

    function createBubble() {
        const bubble = document.createElement('div');
        bubble.className = 'floating-bubble';
        
        const size = Math.random() * 60 + 20;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${Math.random() * 100}%`;
        bubble.style.animationDuration = `${Math.random() * 10 + 15}s`;
        bubble.style.animationDelay = `${Math.random() * 5}s`;
        
        container.appendChild(bubble);

        // Remove bubble after animation
        setTimeout(() => {
            bubble.remove();
        }, 25000);
    }

    // Create initial bubbles
    for (let i = 0; i < 5; i++) {
        setTimeout(() => createBubble(), i * 1000);
    }

    // Create new bubbles periodically
    setInterval(createBubble, 3000);
}

// ============================================
// HERO SECTION ENHANCEMENTS
// ============================================
function initTypingAnimation() {
    const heroTitle = document.querySelector('.hero-title');
    if (!heroTitle) return;
    
    const texts = ['Amazing', 'Favorite', 'Perfect', 'Next'];
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    
    const typeText = () => {
        const currentText = texts[textIndex];
        const animatedSpan = document.querySelector('.animated-gradient');
        
        if (!animatedSpan) return;
        
        if (isDeleting) {
            animatedSpan.textContent = currentText.substring(0, charIndex - 1);
            charIndex--;
            
            if (charIndex === 0) {
                isDeleting = false;
                textIndex = (textIndex + 1) % texts.length;
            }
        } else {
            animatedSpan.textContent = currentText.substring(0, charIndex + 1);
            charIndex++;
            
            if (charIndex === currentText.length) {
                setTimeout(() => {
                    isDeleting = true;
                }, 2000);
                return;
            }
        }
        
        setTimeout(typeText, isDeleting ? 50 : 150);
    };
    
    // Add typing cursor
    const animatedSpan = document.querySelector('.animated-gradient');
    if (animatedSpan) {
        animatedSpan.classList.add('typing-text');
        setTimeout(typeText, 1000);
    }
}

function createHeroBubbles() {
    const heroSection = document.querySelector('.hero-section-enhanced');
    if (!heroSection) return;
    
    const bubblesContainer = document.createElement('div');
    bubblesContainer.className = 'hero-bubbles';
    heroSection.appendChild(bubblesContainer);
    
    const createBubble = () => {
        const bubble = document.createElement('div');
        bubble.className = 'hero-bubble';
        
        // Randomly choose between orange and golden
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (!isDark) {
            bubble.classList.add(Math.random() > 0.5 ? 'orange' : 'golden');
        }
        
        const size = Math.random() * 60 + 20;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${Math.random() * 100}%`;
        bubble.style.animationDuration = `${Math.random() * 5 + 8}s`;
        bubble.style.animationDelay = `${Math.random() * 3}s`;
        
        bubblesContainer.appendChild(bubble);
        
        // Remove bubble after animation
        setTimeout(() => {
            bubble.remove();
        }, 13000);
    };
    
    // Create initial bubbles
    for (let i = 0; i < 5; i++) {
        setTimeout(() => createBubble(), i * 500);
    }
    
    // Create new bubbles periodically
    setInterval(createBubble, 2000);
}

// ============================================
// NAVIGATION FUNCTIONALITY
// ============================================
function handleNavScroll() {
    const nav = document.getElementById('mainNav');
    const scrollHandler = () => {
        if (window.scrollY > 50) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    };

    window.addEventListener('scroll', scrollHandler);
    scrollHandler(); // Check initial state
}

function sidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const trigger = document.querySelector('.menu-trigger');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    trigger.classList.toggle('active');
    
    // Prevent body scroll when sidebar is open
    document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
}

function toggleCategory(categoryId) {
    const categoryGroup = document.querySelector(`#${categoryId}-items`).parentElement;
    categoryGroup.classList.toggle('active');
}

function searchCategories(query) {
    const items = document.querySelectorAll('.category-item');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(query.toLowerCase())) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// ============================================
// ENHANCED SUB NAV CATEGORIES
// ============================================
function updateSubNavCategories() {
    const categoryScroll = document.querySelector('.category-scroll');
    if (!categoryScroll) return;
    
    const newCategories = `
        <button class="category-btn active" data-category="all" onclick="filterByGenre('all')">All Books</button>
        <button class="category-btn" data-category="trending" onclick="filterByGenre('trending')">
            <span class="category-icon">🔥</span>
            Trending
        </button>
        <button class="category-btn" data-category="new" onclick="filterByGenre('new')">
            <span class="category-icon">✨</span>
            New Arrivals
        </button>
        <button class="category-btn" data-category="bestseller" onclick="filterByGenre('bestseller')">
            <span class="category-icon">🏆</span>
            Bestsellers
        </button>
        <button class="category-btn" data-category="toprated" onclick="filterByGenre('toprated')">
            <span class="category-icon">⭐</span>
            Top Rated
        </button>
        <button class="category-btn" data-category="featured" onclick="filterByGenre('featured')">
            <span class="category-icon">🌟</span>
            Featured This Week
        </button>
        <button class="category-btn" data-category="rare" onclick="filterByGenre('rare')">
            <span class="category-icon">💎</span>
            Rare Books
        </button>
        <button class="category-btn" data-category="deals" onclick="filterByGenre('deals')">
            <span class="category-icon">🎯</span>
            Special Deals
        </button>
        <button class="category-btn" data-category="local" onclick="filterByGenre('local')">
            <span class="category-icon">🇪🇹</span>
            Local Authors
        </button>
        <button class="category-btn" data-category="fiction" onclick="filterByGenre('fiction')">Fiction</button>
        <button class="category-btn" data-category="nonfiction" onclick="filterByGenre('nonfiction')">Non-Fiction</button>
        <button class="category-btn" data-category="academics" onclick="filterByGenre('academics')">Academics</button>
    `;
    
    categoryScroll.innerHTML = newCategories;
}

function createSubNavCarousel() {
    const carouselWrapper = document.getElementById('categoryCarousel');
    if (!carouselWrapper) return;
    
    // Sample books for carousel
    const carouselBooks = [
        { title: 'Trending Now', cover: 'https://picsum.photos/seed/trend1/150/200' },
        { title: 'New Arrival', cover: 'https://picsum.photos/seed/new1/150/200' },
        { title: 'Bestseller', cover: 'https://picsum.photos/seed/best1/150/200' },
        { title: 'Top Rated', cover: 'https://picsum.photos/seed/top1/150/200' },
        { title: 'Featured', cover: 'https://picsum.photos/seed/feat1/150/200' },
        { title: 'Rare Find', cover: 'https://picsum.photos/seed/rare1/150/200' },
        // ... rest of books
    ];
    
    const track = document.createElement('div');
    track.className = 'carousel-track';
    track.id = 'carouselTrack';
    
    let html = '';
    // Create two sets for infinite scroll
    for (let i = 0; i < 2; i++) {
        carouselBooks.forEach(book => {
            html += `
                <div class="carousel-book-item" onclick="openQuickView(${Date.now()})">
                    <img src="${book.cover}" alt="${book.title}" class="carousel-book-cover">
                    <div class="carousel-book-title">${book.title}</div>
                </div>
            `;
        });
    }
    
    track.innerHTML = html;
    carouselWrapper.appendChild(track);
}

// ============================================
// SPECIAL DEALS WIDGET
// ============================================
function addSpecialDealsWidget() {
    const sidebar = document.querySelector('.sidebar-modern');
    if (!sidebar) return;
    
    const dealsWidget = `
        <div class="widget-modern special-deals-widget">
            <div class="deals-widget-header">
                <div class="deals-widget-title">
                    <span>🎯</span>
                    <span>Weekend Deals</span>
                </div>
                <div class="deals-widget-timer">
                    <div class="timer-unit">
                        <span class="timer-number" id="widgetHours">24</span>
                        <span class="timer-text">hrs</span>
                    </div>
                    <div class="timer-unit">
                        <span class="timer-number" id="widgetMinutes">00</span>
                        <span class="timer-text">min</span>
                    </div>
                    <div class="timer-unit">
                        <span class="timer-number" id="widgetSeconds">00</span>
                        <span class="timer-text">sec</span>
                    </div>
                </div>
            </div>
            <div class="deals-widget-content">
                <p style="color: white; margin-bottom: 1rem;">Get up to 70% OFF on selected titles!</p>
                <button onclick="filterByGenre('deals')" style="width: 100%; padding: 0.75rem; background: white; color: #F59E0B; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">
                    Shop Now
                </button>
            </div>
        </div>
    `;
    
    // Insert before Popular Authors widget
    const authorsWidget = sidebar.querySelector('.authors-widget');
    if (authorsWidget) {
        authorsWidget.insertAdjacentHTML('beforebegin', dealsWidget);
    }
}

// ============================================
// CATEGORIES SIDEBAR
// ============================================
function loadCategories() {
    const sidebarContent = document.getElementById('sidebarContent');
    if (!sidebarContent) return;

    let html = '';
    categories.forEach(category => {
        html += `
            <div class="category-group">
                <button class="category-header" onclick="toggleCategory('${category.id}')">
                    <span class="category-icon">${category.icon}</span>
                    <span>${category.name}</span>
                    <svg class="category-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
                <div class="category-items" id="${category.id}-items">
                    ${category.subcategories.map(sub => `
                        <a href="#" onclick="showCategory('${sub.id}')" class="category-item">
                            <span class="item-icon">${sub.icon}</span>
                            <span>${sub.name}</span>
                            ${sub.badge ? `<span class="item-badge ${sub.badge.toLowerCase()}">${sub.badge}</span>` : ''}
                            ${sub.count ? `<span class="item-count">${sub.count}</span>` : ''}
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    });
    sidebarContent.innerHTML = html;
}

function showCategory(categoryId) {
    filterByGenre(categoryId);
    sidebarToggle(); // Close sidebar after selection
}

// ============================================
// AUTHORS WIDGET
// ============================================
function loadAuthors() {
    const container = document.getElementById('popularAuthors');
    if (!container) return;
    
    let html = '';
    sampleAuthors.slice(0, 3).forEach(author => {
        html += `
            <div class="author-item-modern" onclick="openAuthorModal(event)" data-author-name="${author.name}">
                <img src="${author.avatar}" alt="${author.name}" class="author-avatar-modern">
                <div class="author-info-modern">
                    <div class="author-name-modern">${author.name}</div>
                    <div class="author-meta-modern">${author.books} Books • ${author.followers} Followers</div>
                </div>
                <button class="follow-btn-small" onclick="event.stopPropagation(); followAuthor(${author.id})">
                    Follow
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function followAuthor(authorId) {
    const author = sampleAuthors.find(a => a.id === authorId);
    if (author) {
        showToast(`Following ${author.name}`, 'success');
        // Update button text
        event.target.textContent = 'Following';
        event.target.style.background = '#10B981';
    }
}

// ============================================
// BOOKSTORES WIDGET
// ============================================
function loadBookstores() {
    const container = document.getElementById('popularBookstores');
    if (!container) return;

    StoreState.bookstores = sampleBookstores;
    
    let html = '';
    sampleBookstores.slice(0, 3).forEach(store => {
        html += `
            <div class="bookstore-item-modern" onclick="openBookstoreModal(event)" data-store-name="${store.name}">
                <img src="${store.logo}" alt="${store.name}" class="bookstore-logo">
                <div class="bookstore-info-modern">
                    <div class="bookstore-name-modern">${store.name}</div>
                    <div class="bookstore-meta-modern">
                        <div class="bookstore-rating">
                            <span>⭐ ${store.rating}</span>
                            <span>(${store.reviews})</span>
                        </div>
                        <span>• ${store.books} books</span>
                    </div>
                </div>
                <button class="view-store-btn-small" onclick="event.stopPropagation(); viewBookstore(${store.id})">
                    View
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function viewBookstore(storeId) {
    const store = StoreState.bookstores.find(s => s.id === storeId);
    if (store) {
        // Load books from this specific bookstore
        filterByBookstore(storeId);
    }
}

function filterByBookstore(storeId) {
    const store = StoreState.bookstores.find(s => s.id === storeId);
    if (!store) return;
    
    showToast(`Showing books from ${store.name}`, 'success');
    
    // Clear and load books from this bookstore
    const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
    grids.forEach(gridId => {
        const grid = document.getElementById(gridId);
        if (grid) {
            const books = generateSampleBooks(6);
            books.forEach(book => {
                book.bookstore = store;
                book.badge = '🏪 ' + store.name.toUpperCase();
            });
            let html = '';
            books.forEach(book => {
                html += createBookCard(book);
            });
            grid.innerHTML = html;
            StoreState.books = [...StoreState.books, ...books];
        }
    });
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================
function enhanceSearchSuggestions() {
    const searchInput = document.getElementById('search-input');
    const suggestionsContainer = document.getElementById('searchSuggestions');
    
    if (!searchInput || !suggestionsContainer) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        performLiveSearch(query);
    });
}

function performLiveSearch(query) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    
    if (query.length < 2) {
        suggestionsContainer.classList.remove('active');
        return;
    }

    // Build enhanced suggestions
    let html = '';
    
    // Recent searches
    if (StoreState.searchHistory.length > 0) {
        html += '<div class="suggestion-header">Recent Searches</div>';
        StoreState.searchHistory.slice(0, 3).forEach(item => {
            html += `
                <div class="suggestion-item" onclick="searchFromHistory('${item}')">
                    <div class="suggestion-icon">🕐</div>
                    <div class="suggestion-content">
                        <div class="suggestion-title">${item}</div>
                    </div>
                </div>
            `;
        });
    }
    
    // Book suggestions
    html += '<div class="suggestion-header">Books</div>';
    html += `
        <div class="suggestion-item" onclick="searchBook('The Shadow of the Wind')">
            <div class="suggestion-icon">📚</div>
            <div class="suggestion-content">
                <div class="suggestion-title">The Shadow of the Wind</div>
                <div class="suggestion-meta">by Carlos Ruiz Zafón</div>
            </div>
            <div class="suggestion-badge">Bestseller</div>
        </div>
    `;
    
    // Author suggestions
    html += '<div class="suggestion-header">Authors</div>';
    html += `
        <div class="suggestion-item" onclick="openAuthorModal(event)" data-author-name="Sarah Johnson">
            <div class="suggestion-icon">✍️</div>
            <div class="suggestion-content">
                <div class="suggestion-title">Sarah Johnson</div>
                <div class="suggestion-meta">245 Books • 15K Followers</div>
            </div>
        </div>
    `;
    
    // Bookstore suggestions
    html += '<div class="suggestion-header">Bookstores</div>';
    html += `
        <div class="suggestion-item" onclick="openBookstoreModal(event)" data-store-name="Mega Books Ethiopia">
            <div class="suggestion-icon">🏪</div>
            <div class="suggestion-content">
                <div class="suggestion-title">Mega Books Ethiopia</div>
                <div class="suggestion-meta">Bole, Addis Ababa • ⭐ 4.8</div>
            </div>
        </div>
    `;
    
    suggestionsContainer.innerHTML = html;
    suggestionsContainer.classList.add('active');

    // Save to search history
    if (!StoreState.searchHistory.includes(query)) {
        StoreState.searchHistory.unshift(query);
        StoreState.searchHistory = StoreState.searchHistory.slice(0, 10);
        localStorage.setItem('searchHistory', JSON.stringify(StoreState.searchHistory));
    }
}

function searchFromHistory(query) {
    document.getElementById('search-input').value = query;
    executeSearch();
}

function executeSearch() {
    const query = document.getElementById('search-input').value;
    if (query.trim()) {
        showToast(`Searching for: ${query}`, 'info');
        performSearch(query);
    }
}

function performSearch(query) {
    // Filter books based on search query
    const filteredBooks = StoreState.books.filter(book => 
        book.title.toLowerCase().includes(query.toLowerCase()) ||
        book.author.toLowerCase().includes(query.toLowerCase())
    );
    
    // Update the display
    displaySearchResults(filteredBooks);
}

function displaySearchResults(books) {
    const grid = document.getElementById('booksGrid');
    if (!grid) return;
    
    if (books.length === 0) {
        grid.innerHTML = '<div class="no-results">No books found. Try a different search.</div>';
        return;
    }
    
    let html = '';
    books.forEach(book => {
        html += createBookCard(book);
    });
    grid.innerHTML = html;
}

function searchBook(title) {
    document.getElementById('search-input').value = title;
    executeSearch();
    document.getElementById('searchSuggestions').classList.remove('active');
}

function searchAuthor(name) {
    document.getElementById('search-input').value = name;
    executeSearch();
    document.getElementById('searchSuggestions').classList.remove('active');
}

// Close search suggestions when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container-enhanced')) {
        const suggestions = document.getElementById('searchSuggestions');
        if (suggestions) suggestions.classList.remove('active');
    }
});

// ============================================
// THEME MANAGEMENT
// ============================================
function toggleTheme() {
    StoreState.darkMode = !StoreState.darkMode;
    applyTheme();
    localStorage.setItem('darkMode', StoreState.darkMode);
    showToast(StoreState.darkMode ? 'Dark mode enabled' : 'Light mode enabled', 'info');
}

function toggleDarkMode() {
    toggleTheme();
}

function applyTheme() {
    if (StoreState.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        const sunIcon = document.querySelector('.sun-icon');
        const moonIcon = document.querySelector('.moon-icon');
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        const sunIcon = document.querySelector('.sun-icon');
        const moonIcon = document.querySelector('.moon-icon');
        if (sunIcon) sunIcon.style.display = 'block';
        if (moonIcon) moonIcon.style.display = 'none';
    }
}

// ============================================
// PROFILE MENU
// ============================================
function toggleProfileMenu() {
    const dropdown = document.getElementById('profileDropdown');
    const button = document.querySelector('.profile-btn');
    
    dropdown.classList.toggle('active');
    button.classList.toggle('active');
    
    // Close on outside click
    if (dropdown.classList.contains('active')) {
        setTimeout(() => {
            document.addEventListener('click', closeProfileMenu);
        }, 100);
    }
}

function closeProfileMenu(e) {
    if (!e.target.closest('.profile-menu-container')) {
        document.getElementById('profileDropdown').classList.remove('active');
        document.querySelector('.profile-btn').classList.remove('active');
        document.removeEventListener('click', closeProfileMenu);
    }
}

// ============================================
// HERO SECTION ANIMATIONS
// ============================================
function animateHeroStats() {
    const stats = document.querySelectorAll('.stat-number-modern');
    
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px'
    };
    
    const animateNumber = (element, target) => {
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const interval = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(interval);
            }
            element.textContent = Math.floor(current).toLocaleString();
            if (element.dataset.count == 98 && current === target) {
                element.textContent = current + '%';
            }
        }, 16);
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.dataset.count);
                animateNumber(entry.target, target);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    stats.forEach(stat => observer.observe(stat));
}

function scrollToBooks() {
    document.getElementById('booksSection').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

function openAIModal() {
    showToast('AI Recommendations feature coming soon!', 'info');
    // TODO: Implement AI recommendations modal
}

function openAIChat() {
    showToast('AI Assistant coming soon!', 'info');
}

// ============================================
// CATEGORY NAVIGATION
// ============================================
function filterByGenre(genre) {
    // Update active state
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === genre) {
            btn.classList.add('active');
        }
    });
    
    // Update filter state
    StoreState.filters.category = genre;
    
    // Clear all grids first
    const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
    grids.forEach(gridId => {
        const grid = document.getElementById(gridId);
        if (grid) {
            grid.innerHTML = '<div class="loading-spinner">Loading books...</div>';
        }
    });
    
    // Load books based on category
    setTimeout(() => {
        if (genre === 'trending') {
            loadTrendingBooksInMain();
        } else if (genre === 'new') {
            loadNewArrivalsInMain();
        } else if (genre === 'bestseller') {
            loadBestsellersInMain();
        } else if (genre === 'toprated') {
            loadTopRatedBooks();
        } else if (genre === 'featured') {
            loadFeaturedBooks();
        } else if (genre === 'rare') {
            loadRareBooks();
        } else if (genre === 'deals') {
            loadDealsInMain();
        } else if (genre === 'local') {
            loadLocalAuthorsBooks();
        } else if (genre === 'fiction') {
            loadFictionBooks();
        } else if (genre === 'nonfiction') {
            loadNonFictionBooks();
        } else if (genre === 'academics') {
            loadAcademicBooks();
        } else {
            loadBooks();
        }
        
        showToast(`Showing ${genre} books`, 'success');
    }, 300);
}

// Load specific category books in main grid
function loadTrendingBooksInMain() {
    const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
    grids.forEach((gridId, index) => {
        const grid = document.getElementById(gridId);
        if (grid) {
            const books = generateSampleBooks(6, 'trending');
            let html = '';
            books.forEach(book => {
                html += createBookCard(book);
            });
            grid.innerHTML = html;
            StoreState.books = [...StoreState.books, ...books];
        }
    });
}

function loadNewArrivalsInMain() {
    const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
    grids.forEach((gridId, index) => {
        const grid = document.getElementById(gridId);
        if (grid) {
            const books = generateSampleBooks(6, 'new');
            let html = '';
            books.forEach(book => {
                html += createBookCard(book);
            });
            grid.innerHTML = html;
            StoreState.books = [...StoreState.books, ...books];
        }
    });
}

function loadBestsellersInMain() {
    const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
    grids.forEach((gridId, index) => {
        const grid = document.getElementById(gridId);
        if (grid) {
            const books = generateSampleBooks(6, 'bestseller');
            let html = '';
            books.forEach(book => {
                html += createBookCard(book);
            });
            grid.innerHTML = html;
            StoreState.books = [...StoreState.books, ...books];
        }
    });
}

function loadTopRatedBooks() {
    const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
    grids.forEach((gridId, index) => {
        const grid = document.getElementById(gridId);
        if (grid) {
            const books = generateSampleBooks(6, 'toprated');
            books.forEach(book => {
                book.rating = (Math.random() * 0.5 + 4.5).toFixed(1); // High ratings
                book.badge = '⭐ TOP RATED';
            });
            let html = '';
            books.forEach(book => {
                html += createBookCard(book);
            });
            grid.innerHTML = html;
            StoreState.books = [...StoreState.books, ...books];
        }
    });
}

function loadFeaturedBooks() {
    const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
    grids.forEach((gridId, index) => {
        const grid = document.getElementById(gridId);
        if (grid) {
            const books = generateSampleBooks(6, 'featured');
            books.forEach(book => {
                book.badge = '🌟 FEATURED';
            });
            let html = '';
            books.forEach(book => {
                html += createBookCard(book);
            });
            grid.innerHTML = html;
            StoreState.books = [...StoreState.books, ...books];
        }
    });
}

function loadRareBooks() {
    const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
    const rareTitles = ['First Edition Collection', 'Signed Copy', 'Out of Print Classic', 'Limited Edition', 'Collector\'s Item'];
    
    grids.forEach((gridId, index) => {
        const grid = document.getElementById(gridId);
        if (grid) {
            const books = [];
            for (let i = 0; i < 6; i++) {
                books.push({
                    id: Date.now() + i,
                    title: rareTitles[Math.floor(Math.random() * rareTitles.length)] + ' #' + Math.floor(Math.random() * 1000),
                    author: sampleAuthors[Math.floor(Math.random() * sampleAuthors.length)].name,
                    price: (Math.random() * 200 + 100).toFixed(2),
                    originalPrice: (Math.random() * 300 + 200).toFixed(2),
                    cover: `https://picsum.photos/seed/rare${Date.now() + i}/280/400`,
                    rating: (Math.random() * 0.5 + 4.5).toFixed(1),
                    category: 'Rare Books',
                    badge: '💎 RARE',
                    bookstore: sampleBookstores[Math.floor(Math.random() * sampleBookstores.length)]
                });
            }
            let html = '';
            books.forEach(book => {
                html += createBookCard(book);
            });
            grid.innerHTML = html;
            StoreState.books = [...StoreState.books, ...books];
        }
    });
}

function loadDealsInMain() {
    const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
    grids.forEach((gridId, index) => {
        const grid = document.getElementById(gridId);
        if (grid) {
            const books = generateSampleBooks(6, 'deals');
            books.forEach(book => {
                // Add discount to deals
                book.originalPrice = (parseFloat(book.price) * 1.7).toFixed(2);
                book.badge = '🎯 ' + Math.floor(Math.random() * 40 + 30) + '% OFF';
            });
            let html = '';
            books.forEach(book => {
                html += createBookCard(book);
            });
            grid.innerHTML = html;
            StoreState.books = [...StoreState.books, ...books];
        }
    });
}

function loadLocalAuthorsBooks() {
    const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
    const ethiopianAuthors = ['Haddis Alemayehu', 'Bealu Girma', 'Sebhat Gebre-Egziabher', 'Mammo Wudneh', 'Sahle Sellassie'];
    const ethiopianTitles = ['Fikir Eske Mekabir', 'Oromay', 'Tewodros', 'Weym Yälämmm', 'The Afersata'];
    
    grids.forEach((gridId, index) => {
        const grid = document.getElementById(gridId);
        if (grid) {
            const books = [];
            for (let i = 0; i < 6; i++) {
                books.push({
                    id: Date.now() + i,
                    title: ethiopianTitles[Math.floor(Math.random() * ethiopianTitles.length)],
                    author: ethiopianAuthors[Math.floor(Math.random() * ethiopianAuthors.length)],
                    price: (Math.random() * 20 + 5).toFixed(2),
                    originalPrice: (Math.random() * 30 + 10).toFixed(2),
                    cover: `https://picsum.photos/seed/ethiopian${Date.now() + i}/280/400`,
                    rating: (Math.random() * 2 + 3).toFixed(1),
                    category: 'Ethiopian Literature',
                    badge: '🇪🇹 LOCAL',
                    bookstore: sampleBookstores[Math.floor(Math.random() * sampleBookstores.length)]
                });
            }
            let html = '';
            books.forEach(book => {
                html += createBookCard(book);
            });
            grid.innerHTML = html;
            StoreState.books = [...StoreState.books, ...books];
        }
    });
}

function loadFictionBooks() {
    const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
    const fictionCategories = ['Fantasy', 'Sci-Fi', 'Romance', 'Mystery', 'Thriller'];
    
    grids.forEach((gridId, index) => {
        const grid = document.getElementById(gridId);
        if (grid) {
            const books = generateSampleBooks(6);
            books.forEach(book => {
                book.category = fictionCategories[Math.floor(Math.random() * fictionCategories.length)];
                book.badge = '📚 FICTION';
            });
            let html = '';
            books.forEach(book => {
                html += createBookCard(book);
            });
            grid.innerHTML = html;
            StoreState.books = [...StoreState.books, ...books];
        }
    });
}

function loadNonFictionBooks() {
    const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
    const nonFictionCategories = ['Biography', 'Self-Help', 'History', 'Science', 'Philosophy'];
    const nonFictionTitles = ['Sapiens', 'Atomic Habits', 'Thinking Fast and Slow', 'The Power of Now', 'Educated'];
    const nonFictionAuthors = ['Yuval Noah Harari', 'James Clear', 'Daniel Kahneman', 'Eckhart Tolle', 'Tara Westover'];
    
    grids.forEach((gridId, index) => {
        const grid = document.getElementById(gridId);
        if (grid) {
            const books = [];
            for (let i = 0; i < 6; i++) {
                books.push({
                    id: Date.now() + i,
                    title: nonFictionTitles[Math.floor(Math.random() * nonFictionTitles.length)],
                    author: nonFictionAuthors[Math.floor(Math.random() * nonFictionAuthors.length)],
                    price: (Math.random() * 30 + 15).toFixed(2),
                    originalPrice: (Math.random() * 40 + 20).toFixed(2),
                    cover: `https://picsum.photos/seed/nonfiction${Date.now() + i}/280/400`,
                    rating: (Math.random() * 1.5 + 3.5).toFixed(1),
                    category: nonFictionCategories[Math.floor(Math.random() * nonFictionCategories.length)],
                    badge: '📖 NON-FICTION',
                    bookstore: sampleBookstores[Math.floor(Math.random() * sampleBookstores.length)]
                });
            }
            let html = '';
            books.forEach(book => {
                html += createBookCard(book);
            });
            grid.innerHTML = html;
            StoreState.books = [...StoreState.books, ...books];
        }
    });
}

function loadAcademicBooks() {
    const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
    const academicCategories = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Engineering'];
    const academicTitles = ['Advanced Calculus', 'Quantum Mechanics', 'Organic Chemistry', 'Molecular Biology', 'Data Structures', 'Digital Systems'];
    
    grids.forEach((gridId, index) => {
        const grid = document.getElementById(gridId);
        if (grid) {
            const books = [];
            for (let i = 0; i < 6; i++) {
                books.push({
                    id: Date.now() + i,
                    title: academicTitles[Math.floor(Math.random() * academicTitles.length)] + ' - ' + (Math.floor(Math.random() * 3) + 1) + 'st Edition',
                    author: 'Dr. ' + sampleAuthors[Math.floor(Math.random() * sampleAuthors.length)].name,
                    price: (Math.random() * 50 + 30).toFixed(2),
                    originalPrice: (Math.random() * 70 + 40).toFixed(2),
                    cover: `https://picsum.photos/seed/academic${Date.now() + i}/280/400`,
                    rating: (Math.random() * 1 + 4).toFixed(1),
                    category: academicCategories[Math.floor(Math.random() * academicCategories.length)],
                    badge: '🎓 ACADEMIC',
                    bookstore: sampleBookstores[Math.floor(Math.random() * sampleBookstores.length)]
                });
            }
            let html = '';
            books.forEach(book => {
                html += createBookCard(book);
            });
            grid.innerHTML = html;
            StoreState.books = [...StoreState.books, ...books];
        }
    });
}

// ============================================
// DEAL TIMER
// ============================================
function startDealTimer() {
    // Set end time to midnight
    const endTime = new Date();
    endTime.setHours(24, 0, 0, 0);
    
    function updateTimer() {
        const now = new Date();
        const timeLeft = endTime - now;
        
        if (timeLeft <= 0) {
            // Reset timer for next day
            endTime.setDate(endTime.getDate() + 1);
            return;
        }
        
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        // Update main deal timer
        const hoursEl = document.getElementById('dealHours');
        const minutesEl = document.getElementById('dealMinutes');
        const secondsEl = document.getElementById('dealSeconds');
        
        if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
        if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
        if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
        
        // Update widget timer
        const widgetHoursEl = document.getElementById('widgetHours');
        const widgetMinutesEl = document.getElementById('widgetMinutes');
        const widgetSecondsEl = document.getElementById('widgetSeconds');
        
        if (widgetHoursEl) widgetHoursEl.textContent = hours.toString().padStart(2, '0');
        if (widgetMinutesEl) widgetMinutesEl.textContent = minutes.toString().padStart(2, '0');
        if (widgetSecondsEl) widgetSecondsEl.textContent = seconds.toString().padStart(2, '0');
    }
    
    updateTimer();
    setInterval(updateTimer, 1000);
}

// ============================================
// VIEW MODE TOGGLE
// ============================================
function changeView(mode) {
    StoreState.viewMode = mode;
    
    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === mode) {
            btn.classList.add('active');
        }
    });
    
    // Update grid class
    const grids = document.querySelectorAll('.books-grid-modern');
    grids.forEach(grid => {
        if (mode === 'list') {
            grid.classList.add('list-view');
        } else {
            grid.classList.remove('list-view');
        }
    });
}

// ============================================
// BOOK DATA GENERATION
// ============================================
function generateSampleBooks(count, type = 'regular') {
    const books = [];
    const titles = [
        'The Shadow of the Wind', 'Where the Crawdads Sing', 'Educated', 
        'The Alchemist', 'The Girl on the Train', 'The Book Thief',
        'The Fault in Our Stars', 'Gone Girl', 'The Hunger Games',
        'The Da Vinci Code', 'Life of Pi', 'The Kite Runner'
    ];
    const authors = [
        'Carlos Ruiz Zafón', 'Delia Owens', 'Tara Westover',
        'Paulo Coelho', 'Paula Hawkins', 'Markus Zusak',
        'John Green', 'Gillian Flynn', 'Suzanne Collins',
        'Dan Brown', 'Yann Martel', 'Khaled Hosseini'
    ];
    
    const badges = {
        trending: '🔥 TRENDING',
        new: '✨ NEW',
        bestseller: '🏆 BESTSELLER',
        toprated: '⭐ TOP RATED',
        featured: '🌟 FEATURED',
        deals: '🎯 DEAL'
    };
    
    for (let i = 0; i < count; i++) {
        const index = Math.floor(Math.random() * titles.length);
        books.push({
            id: Date.now() + i,
            title: titles[index],
            author: authors[index],
            price: (Math.random() * 30 + 10).toFixed(2),
            originalPrice: (Math.random() * 40 + 20).toFixed(2),
            cover: `https://picsum.photos/seed/book${Date.now() + i}/280/400`,
            rating: (Math.random() * 2 + 3).toFixed(1),
            category: ['Fiction', 'Non-Fiction', 'Academic'][Math.floor(Math.random() * 3)],
            badge: badges[type] || null,
            bookstore: sampleBookstores[Math.floor(Math.random() * sampleBookstores.length)]
        });
    }
    
    return books;
}

function createBookCard(book) {
    return `
        <div class="book-card-modern" data-book-id="${book.id}" onclick="openQuickView(${book.id})">
            <div class="book-cover">
                <img src="${book.cover}" alt="${book.title}" loading="lazy">
                ${book.badge ? `<div class="book-badge">${book.badge}</div>` : ''}
                <div class="book-actions-quick">
                    <button onclick="event.stopPropagation(); quickAddToCart(${book.id})" class="btn-quick-add">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                    </button>
                    <button onclick="event.stopPropagation(); quickAddToWishlist(${book.id})" class="btn-quick-wishlist">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                        </svg>
                    </button>
                    <button onclick="event.stopPropagation(); openQuickView(${book.id})" class="btn-quick-view">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="book-info">
                <div class="book-category">${book.category}</div>
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">by ${book.author}</p>
                <div class="book-footer">
                    <div class="book-price">$${book.price}</div>
                    <div class="book-rating">
                        ⭐ ${book.rating}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createFeaturedBookCard(book) {
    const discount = Math.round(((book.originalPrice - book.price) / book.originalPrice) * 100);
    return `
        <div class="book-card-modern">
            <div class="book-cover">
                <img src="${book.cover}" alt="${book.title}">
                <div class="book-badge">${book.badge}</div>
            </div>
            <div class="book-info">
                <div class="book-category">Fiction</div>
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">by ${book.author}</p>
                <div class="book-footer">
                    <div class="book-price">$${book.price}</div>
                    <div class="book-rating">
                        ${'⭐'.repeat(Math.floor(book.rating))} ${book.rating}
                    </div>
                </div>
                <div class="book-actions-quick">
                    <button onclick="quickAddToCart(${book.id})" class="btn-quick-add">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                    </button>
                    <button onclick="addToWishlist(${book.id})" class="btn-quick-wishlist">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                        </svg>
                    </button>
                    <button onclick="openQuickView(${book.id})" class="btn-quick-view">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// ENHANCED BOOK LOADING
// ============================================
function loadInitialData() {
    loadFeaturedBooksCarousel();
    loadBooks();
    loadTrendingBooks();
    loadNewArrivals();
    loadBestsellers();
}

function loadFeaturedBooksCarousel() {
    const carousel = document.getElementById('featuredCarousel');
    if (!carousel) return;
    
    const featuredBooks = [
        {
            id: 1,
            title: 'The Midnight Library',
            author: 'Matt Haig',
            price: 24.99,
            originalPrice: 34.99,
            cover: 'https://picsum.photos/seed/book1/300/450',
            rating: 4.5,
            badge: 'BESTSELLER'
        },
        {
            id: 2,
            title: 'Atomic Habits',
            author: 'James Clear',
            price: 22.99,
            originalPrice: 29.99,
            cover: 'https://picsum.photos/seed/book2/300/450',
            rating: 4.8,
            badge: 'TOP RATED'
        },
        {
            id: 3,
            title: 'Project Hail Mary',
            author: 'Andy Weir',
            price: 27.99,
            originalPrice: 35.99,
            cover: 'https://picsum.photos/seed/book3/300/450',
            rating: 4.7,
            badge: 'NEW'
        },
        {
            id: 4,
            title: 'The Silent Patient',
            author: 'Alex Michaelides',
            price: 19.99,
            originalPrice: 28.99,
            cover: 'https://picsum.photos/seed/book4/300/450',
            rating: 4.3,
            badge: 'TRENDING'
        }
    ];
    
    let html = '';
    featuredBooks.forEach(book => {
        html += createFeaturedBookCard(book);
    });
    
    carousel.innerHTML = html;
}

function loadTrendingBooks() {
    const grid = document.getElementById('trendingBooksGrid');
    if (!grid) return;
    
    const trendingBooks = generateSampleBooks(4, 'trending');
    let html = '';
    trendingBooks.forEach(book => {
        html += createBookCard(book);
    });
    grid.innerHTML = html;
}

function loadNewArrivals() {
    const grid = document.getElementById('newArrivalsGrid');
    if (!grid) return;
    
    const newBooks = generateSampleBooks(4, 'new');
    let html = '';
    newBooks.forEach(book => {
        html += createBookCard(book);
    });
    grid.innerHTML = html;
}

function loadBestsellers() {
    const grid = document.getElementById('bestsellersGrid');
    if (!grid) return;
    
    const bestsellers = generateSampleBooks(4, 'bestseller');
    let html = '';
    bestsellers.forEach(book => {
        html += createBookCard(book);
    });
    grid.innerHTML = html;
}

function loadBooks() {
    const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
    
    grids.forEach((gridId, index) => {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        
        // Show loading state for first grid only
        if (index === 0 && StoreState.currentPage === 1) {
            grid.innerHTML = '<div class="loading-spinner">Loading books...</div>';
        }
        
        // Simulate API call
        setTimeout(() => {
            const books = generateSampleBooks(3);
            
            let html = '';
            books.forEach(book => {
                html += createBookCard(book);
            });
            
            if (index === 0 && StoreState.currentPage === 1) {
                grid.innerHTML = html;
            } else {
                grid.innerHTML = html;
            }
            
            StoreState.books = [...StoreState.books, ...books];
        }, 200 * (index + 1));
    });
}

function loadMoreBooks() {
    if (StoreState.isLoading) return;
    
    StoreState.isLoading = true;
    StoreState.currentPage++;
    
    // Update button state
    const btn = document.querySelector('.load-more-btn-modern');
    btn.querySelector('.btn-text').classList.add('hidden');
    btn.querySelector('.btn-loader').classList.remove('hidden');
    
    // Show loading message
    showToast(`Loading page ${StoreState.currentPage} of books...`, 'info');
    
    // Load more books based on current filter
    setTimeout(() => {
        const currentCategory = StoreState.filters.category;
        
        // Add more books to existing grids
        const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
        grids.forEach((gridId, index) => {
            const grid = document.getElementById(gridId);
            if (grid) {
                let newBooks;
                
                // Generate books based on current category
                if (currentCategory === 'trending') {
                    newBooks = generateSampleBooks(3, 'trending');
                } else if (currentCategory === 'new') {
                    newBooks = generateSampleBooks(3, 'new');
                } else if (currentCategory === 'bestseller') {
                    newBooks = generateSampleBooks(3, 'bestseller');
                } else if (currentCategory === 'fiction') {
                    newBooks = generateSampleBooks(3);
                    newBooks.forEach(book => {
                        book.category = ['Fantasy', 'Sci-Fi', 'Romance', 'Mystery'][Math.floor(Math.random() * 4)];
                        book.badge = '📚 FICTION';
                    });
                } else if (currentCategory === 'academics') {
                    newBooks = [];
                    for (let i = 0; i < 3; i++) {
                        newBooks.push({
                            id: Date.now() + i + index * 10,
                            title: ['Advanced Mathematics', 'Physics Fundamentals', 'Chemistry 101'][i] + ' - Edition ' + (Math.floor(Math.random() * 3) + 1),
                            author: 'Dr. ' + sampleAuthors[Math.floor(Math.random() * sampleAuthors.length)].name,
                            price: (Math.random() * 50 + 30).toFixed(2),
                            cover: `https://picsum.photos/seed/academic${Date.now() + i}/280/400`,
                            rating: (Math.random() * 1 + 4).toFixed(1),
                            category: 'Academic',
                            badge: '🎓 ACADEMIC'
                        });
                    }
                } else {
                    newBooks = generateSampleBooks(3);
                }
                
                // Append new books
                let html = '';
                newBooks.forEach(book => {
                    html += createBookCard(book);
                });
                grid.insertAdjacentHTML('beforeend', html);
                
                StoreState.books = [...StoreState.books, ...newBooks];
            }
        });
        
        btn.querySelector('.btn-text').classList.remove('hidden');
        btn.querySelector('.btn-loader').classList.add('hidden');
        StoreState.isLoading = false;
        
        showToast(`Loaded ${grids.length * 3} more books!`, 'success');
    }, 1000);
}

// ============================================
// CAROUSEL CONTROLS
// ============================================
function carouselPrev() {
    const carousel = document.getElementById('featuredCarousel');
    carousel.scrollBy({ left: -300, behavior: 'smooth' });
}

function carouselNext() {
    const carousel = document.getElementById('featuredCarousel');
    carousel.scrollBy({ left: 300, behavior: 'smooth' });
}

// ============================================
// QUICK VIEW MODAL
// ============================================
function openQuickView(bookId) {
    const modal = document.getElementById('quickViewModal');
    const book = StoreState.books.find(b => b.id === bookId) || generateSampleBooks(1)[0];
    
    StoreState.currentBook = book;
    
    // Update modal content
    document.getElementById('quickViewCover').src = book.cover;
    document.getElementById('quickViewTitle').textContent = book.title;
    document.getElementById('quickViewAuthor').innerHTML = `by <a href="#" class="author-link" onclick="openAuthorModal(event)" data-author-name="${book.author}">${book.author}</a>`;
    document.getElementById('quickViewBookstore').innerHTML = `Posted by <a href="#" class="bookstore-link" onclick="openBookstoreModal(event)" data-store-name="${book.bookstore ? book.bookstore.name : 'Astegni Bookstore'}">${book.bookstore ? book.bookstore.name : 'Astegni Bookstore'}</a>`;
    document.getElementById('quickViewPrice').textContent = `$${book.price}`;
    document.getElementById('quickViewOriginalPrice').textContent = `$${book.originalPrice || (parseFloat(book.price) * 1.3).toFixed(2)}`;
    document.getElementById('quickViewRating').textContent = `${book.rating} (${Math.floor(Math.random() * 500)} reviews)`;
    document.getElementById('quickViewDescription').textContent = 'This is a captivating story that will keep you engaged from the first page to the last. A masterpiece of modern literature that explores themes of love, loss, and redemption.';
    
    if (book.badge) {
        document.getElementById('quickViewBadge').textContent = book.badge.replace(/[^A-Z]/g, '');
        document.getElementById('quickViewBadge').style.display = 'inline-block';
    } else {
        document.getElementById('quickViewBadge').style.display = 'none';
    }
    
    // Load reviews
    loadBookReviews();
    
    // Load similar books
    loadSimilarBooks();
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function loadBookReviews() {
    const reviewsContainer = document.getElementById('quickViewReviews');
    const reviews = [
        { author: 'John Doe', rating: 5, text: 'Amazing book! Couldn\'t put it down.' },
        { author: 'Jane Smith', rating: 4, text: 'Great story, well-written characters.' },
        { author: 'Mike Johnson', rating: 5, text: 'One of the best books I\'ve read this year!' }
    ];
    
    let html = '';
    reviews.forEach(review => {
        html += `
            <div class="review-item">
                <div class="review-header">
                    <span class="review-author">${review.author}</span>
                    <span class="review-rating">${'⭐'.repeat(review.rating)}</span>
                </div>
                <p class="review-text">${review.text}</p>
            </div>
        `;
    });
    
    reviewsContainer.innerHTML = html;
}

function loadSimilarBooks() {
    const container = document.getElementById('similarBooksGrid');
    const similarBooks = generateSampleBooks(3);
    
    let html = '';
    similarBooks.forEach(book => {
        html += `
            <div class="similar-book-item" onclick="openQuickView(${book.id})">
                <img src="${book.cover}" alt="${book.title}">
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function closeQuickView() {
    document.getElementById('quickViewModal').classList.remove('active');
    document.body.style.overflow = '';
    StoreState.currentBook = null;
}

function changePreviewImage(src) {
    document.getElementById('quickViewCover').src = src;
}

function addToCartFromQuickView() {
    if (StoreState.currentBook) {
        addToCart(StoreState.currentBook);
    }
}

function addToWishlistFromQuickView() {
    if (StoreState.currentBook) {
        addToWishlist(StoreState.currentBook.id);
    }
}

// ============================================
// CART FUNCTIONALITY
// ============================================
function openCartDrawer() {
    document.getElementById('cartDrawer').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
    document.getElementById('cartDrawer').classList.remove('active');
    document.body.style.overflow = '';
}

function quickAddToCart(bookId) {
    const book = StoreState.books.find(b => b.id === bookId) || {
        id: bookId,
        title: 'Sample Book',
        price: 24.99,
        quantity: 1
    };
    
    addToCart(book);
}

function addToCart(book) {
    const existingItem = StoreState.cart.find(item => item.id === book.id);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        StoreState.cart.push({ ...book, quantity: 1 });
    }
    
    updateCartUI();
    saveCart();
    showToast('Added to cart!', 'success');
    
    // Animate cart icon
    const cartBtn = document.querySelector('.cart-btn');
    cartBtn.classList.add('bounce');
    setTimeout(() => cartBtn.classList.remove('bounce'), 500);
}

function updateCartUI() {
    // Update cart count
    document.getElementById('cartCount').textContent = StoreState.cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Update cart content
    const cartContent = document.getElementById('cartContent');
    if (StoreState.cart.length === 0) {
        cartContent.innerHTML = `
            <div class="cart-empty">
                <svg class="w-24 h-24 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                </svg>
                <p class="text-center mt-4 text-gray-500">Your cart is empty</p>
            </div>
        `;
    } else {
        let html = '';
        let subtotal = 0;
        
        StoreState.cart.forEach(item => {
            const itemTotal = parseFloat(item.price) * item.quantity;
            subtotal += itemTotal;
            
            html += `
                <div class="cart-item">
                    <img src="${item.cover || 'https://picsum.photos/seed/book/80/100'}" alt="${item.title}" class="cart-item-image">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.title}</div>
                        <div class="cart-item-author">${item.author || 'Unknown Author'}</div>
                        <div class="cart-item-price">$${item.price}</div>
                        <div class="cart-item-actions">
                            <button onclick="updateCartItemQuantity(${item.id}, -1)" class="quantity-btn">-</button>
                            <span class="quantity-value">${item.quantity}</span>
                            <button onclick="updateCartItemQuantity(${item.id}, 1)" class="quantity-btn">+</button>
                            <button onclick="removeFromCart(${item.id})" class="remove-btn">Remove</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        cartContent.innerHTML = html;
        
        // Update totals
        document.getElementById('cartSubtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('cartTotal').textContent = `$${(subtotal + 5).toFixed(2)}`;
    }
}

function updateCartItemQuantity(bookId, change) {
    const item = StoreState.cart.find(item => item.id === bookId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(bookId);
        } else {
            updateCartUI();
            saveCart();
        }
    }
}

function removeFromCart(bookId) {
    StoreState.cart = StoreState.cart.filter(item => item.id !== bookId);
    updateCartUI();
    saveCart();
    showToast('Removed from cart', 'info');
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(StoreState.cart));
}

function proceedToCheckout() {
    if (StoreState.cart.length === 0) {
        showToast('Your cart is empty', 'warning');
        return;
    }
    showToast('Redirecting to checkout...', 'info');
    // In a real app, this would navigate to checkout page
}

// ============================================
// WISHLIST FUNCTIONALITY
// ============================================
function openWishlistDrawer() {
    document.getElementById('wishlistDrawer').classList.add('active');
    document.body.style.overflow = 'hidden';
    updateWishlistUI();
}

function closeWishlistDrawer() {
    document.getElementById('wishlistDrawer').classList.remove('active');
    document.body.style.overflow = '';
}

function quickAddToWishlist(bookId) {
    addToWishlist(bookId);
}

function addToWishlist(bookId) {
    const book = StoreState.books.find(b => b.id === bookId);
    
    if (!StoreState.wishlist.find(item => item.id === bookId)) {
        StoreState.wishlist.push(book || { id: bookId, title: 'Sample Book', price: 24.99 });
        updateWishlistUI();
        localStorage.setItem('wishlist', JSON.stringify(StoreState.wishlist));
        showToast('Added to wishlist!', 'success');
    } else {
        showToast('Already in wishlist', 'info');
    }
}

function updateWishlistUI() {
    document.getElementById('wishlistCount').textContent = StoreState.wishlist.length;
    
    const wishlistContent = document.getElementById('wishlistContent');
    if (StoreState.wishlist.length === 0) {
        wishlistContent.innerHTML = `
            <div class="wishlist-empty">
                <svg class="w-24 h-24 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                </svg>
                <p class="text-center mt-4 text-gray-500">Your wishlist is empty</p>
            </div>
        `;
    } else {
        let html = '';
        StoreState.wishlist.forEach(item => {
            html += `
                <div class="wishlist-item">
                    <img src="${item.cover || 'https://picsum.photos/seed/book/80/100'}" alt="${item.title}" class="cart-item-image">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.title}</div>
                        <div class="cart-item-author">${item.author || 'Unknown Author'}</div>
                        <div class="cart-item-price">$${item.price}</div>
                        <div class="cart-item-actions">
                            <button onclick="moveToCart(${item.id})" class="quantity-btn">Move to Cart</button>
                            <button onclick="removeFromWishlist(${item.id})" class="remove-btn">Remove</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        wishlistContent.innerHTML = html;
    }
}

function moveToCart(bookId) {
    const book = StoreState.wishlist.find(item => item.id === bookId);
    if (book) {
        addToCart(book);
        removeFromWishlist(bookId);
    }
}

function moveAllToCart() {
    if (StoreState.wishlist.length === 0) {
        showToast('Wishlist is empty', 'info');
        return;
    }
    
    StoreState.wishlist.forEach(book => {
        addToCart(book);
    });
    
    StoreState.wishlist = [];
    updateWishlistUI();
    localStorage.setItem('wishlist', JSON.stringify(StoreState.wishlist));
    showToast('All items moved to cart!', 'success');
}

function removeFromWishlist(bookId) {
    StoreState.wishlist = StoreState.wishlist.filter(item => item.id !== bookId);
    updateWishlistUI();
    localStorage.setItem('wishlist', JSON.stringify(StoreState.wishlist));
    showToast('Removed from wishlist', 'info');
}

// ============================================
// NOTIFICATIONS
// ============================================
function openNotificationPanel() {
    const modalHtml = `
        <div class="notification-modal active" id="notificationModal">
            <div class="notification-modal-content">
                <div class="notification-modal-header">
                    <h3>Notifications</h3>
                    <button onclick="closeNotificationModal()" class="modal-close">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="notification-modal-body">
                    <div class="notification-group">
                        <div class="notification-group-title">Today</div>
                        <div class="notification-item unread">
                            <div class="notification-icon">🎯</div>
                            <div class="notification-content">
                                <div class="notification-title">Special Weekend Deal!</div>
                                <div class="notification-text">Get 50% off on selected titles</div>
                                <div class="notification-time">2 hours ago</div>
                            </div>
                        </div>
                        <div class="notification-item">
                            <div class="notification-icon">📚</div>
                            <div class="notification-content">
                                <div class="notification-title">New Book Available</div>
                                <div class="notification-text">"The Midnight Library" is now in stock</div>
                                <div class="notification-time">5 hours ago</div>
                            </div>
                        </div>
                    </div>
                    <div class="notification-group">
                        <div class="notification-group-title">Yesterday</div>
                        <div class="notification-item">
                            <div class="notification-icon">⭐</div>
                            <div class="notification-content">
                                <div class="notification-title">Author Review</div>
                                <div class="notification-text">Sarah Johnson replied to your review</div>
                                <div class="notification-time">1 day ago</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeNotificationModal() {
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.remove();
    }
}

// ============================================
// READING LISTS
// ============================================
function openReadingList(listId) {
    const lists = {
        summer: {
            title: 'Summer Reading',
            icon: '☀️',
            description: 'Perfect books for your summer vacation',
            books: generateSampleBooks(12)
        },
        classics: {
            title: 'Must-Read Classics',
            icon: '📖',
            description: 'Timeless literature everyone should read',
            books: generateClassicBooks()
        },
        '2024': {
            title: 'Best of 2024',
            icon: '🆕',
            description: 'Top rated books from this year',
            books: generateSampleBooks(12, 'bestseller')
        }
    };
    
    const list = lists[listId];
    if (!list) return;
    
    const modalHtml = `
        <div class="modal-overlay active" id="readingListModal">
            <div class="modal-container" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <button onclick="closeReadingListModal()" class="modal-close">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <div style="padding: 2rem;">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <span style="font-size: 3rem;">${list.icon}</span>
                        <h2 style="font-size: 2rem; font-weight: 700; margin: 1rem 0 0.5rem;">${list.title}</h2>
                        <p style="color: var(--text-muted);">${list.description}</p>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem;">
                        ${list.books.map(book => `
                            <div class="book-card-modern" style="cursor: pointer;" onclick="closeReadingListModal(); openQuickView(${book.id})">
                                <div class="book-cover">
                                    <img src="${book.cover}" alt="${book.title}" style="width: 100%; height: 100%; object-fit: cover;">
                                </div>
                                <div class="book-info">
                                    <h3 class="book-title">${book.title}</h3>
                                    <p class="book-author">by ${book.author}</p>
                                    <div class="book-footer">
                                        <div class="book-price">$${book.price}</div>
                                        <div class="book-rating">⭐ ${book.rating}</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
}

function closeReadingListModal() {
    const modal = document.getElementById('readingListModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

function generateClassicBooks() {
    const classicTitles = [
        'Pride and Prejudice', '1984', 'To Kill a Mockingbird', 'The Great Gatsby',
        'Jane Eyre', 'Wuthering Heights', 'The Catcher in the Rye', 'Lord of the Flies',
        'Animal Farm', 'Brave New World', 'The Picture of Dorian Gray', 'Frankenstein'
    ];
    const classicAuthors = [
        'Jane Austen', 'George Orwell', 'Harper Lee', 'F. Scott Fitzgerald',
        'Charlotte Brontë', 'Emily Brontë', 'J.D. Salinger', 'William Golding',
        'George Orwell', 'Aldous Huxley', 'Oscar Wilde', 'Mary Shelley'
    ];
    
    const books = [];
    for (let i = 0; i < classicTitles.length; i++) {
        books.push({
            id: Date.now() + i,
            title: classicTitles[i],
            author: classicAuthors[i],
            price: (Math.random() * 10 + 5).toFixed(2),
            originalPrice: (Math.random() * 15 + 10).toFixed(2),
            cover: `https://picsum.photos/seed/classic${i}/280/400`,
            rating: (Math.random() * 0.5 + 4.5).toFixed(1),
            category: 'Classic Literature',
            badge: '📚 CLASSIC'
        });
    }
    return books;
}

function openAllAuthorsModal() {
    // Create modal with all authors
    const modalHtml = `
        <div class="modal-overlay active" id="allAuthorsModal">
            <div class="modal-container" style="max-width: 800px;">
                <button onclick="closeAllAuthorsModal()" class="modal-close">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <div style="padding: 2rem;">
                    <h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 2rem;">All Popular Authors</h2>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        ${sampleAuthors.map(author => `
                            <div class="author-item-modern" style="padding: 1rem; background: rgba(245, 158, 11, 0.05); border-radius: 12px; cursor: pointer;" onclick="closeAllAuthorsModal(); openAuthorModal(event)" data-author-name="${author.name}">
                                <img src="${author.avatar}" alt="${author.name}" class="author-avatar-modern">
                                <div class="author-info-modern">
                                    <div class="author-name-modern">${author.name}</div>
                                    <div class="author-meta-modern">${author.books} Books • ${author.followers} Followers</div>
                                </div>
                                <button class="follow-btn-small" onclick="event.stopPropagation(); followAuthor(${author.id})">
                                    Follow
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
}

function closeAllAuthorsModal() {
    const modal = document.getElementById('allAuthorsModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

function openAllBookstoresModal() {
    const modalHtml = `
        <div class="modal-overlay active" id="allBookstoresModal">
            <div class="modal-container" style="max-width: 800px;">
                <button onclick="closeAllBookstoresModal()" class="modal-close">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <div style="padding: 2rem;">
                    <h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 2rem;">All Bookstores</h2>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        ${sampleBookstores.map(store => `
                            <div class="bookstore-item-modern" style="padding: 1rem; background: rgba(245, 158, 11, 0.05); border-radius: 12px; cursor: pointer;" onclick="closeAllBookstoresModal(); openBookstoreModal(event)" data-store-name="${store.name}">
                                <img src="${store.logo}" alt="${store.name}" class="bookstore-logo">
                                <div class="bookstore-info-modern">
                                    <div class="bookstore-name-modern">${store.name}</div>
                                    <div class="bookstore-meta-modern">
                                        <div class="bookstore-rating">
                                            <span>⭐ ${store.rating}</span>
                                            <span>(${store.reviews})</span>
                                        </div>
                                        <span>• ${store.books} books</span>
                                    </div>
                                    <div style="margin-top: 0.25rem; font-size: 0.75rem; color: var(--text-muted);">📍 ${store.location}</div>
                                </div>
                                <button class="view-store-btn-small" onclick="event.stopPropagation(); closeAllBookstoresModal(); filterByBookstore(${store.id})">
                                    View
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
}

function closeAllBookstoresModal() {
    const modal = document.getElementById('allBookstoresModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}
// Add shadow when category buttons are stuck
document.addEventListener('DOMContentLoaded', function() {
    const categoryScroll = document.querySelector('.category-scroll');
    if (!categoryScroll) return;
    
    const observer = new IntersectionObserver(
        ([entry]) => {
            if (entry.intersectionRatio < 1) {
                categoryScroll.classList.add('stuck');
            } else {
                categoryScroll.classList.remove('stuck');
            }
        },
        { 
            rootMargin: '-74px 0px 0px 0px',
            threshold: [1]
        }
    );
    
    observer.observe(categoryScroll);
});
// ============================================
// MODALS - ENHANCED AUTHOR & BOOKSTORE
// ============================================
function openAuthorModal(event) {
    if (event) event.preventDefault();
    
    // Extract author name from the element
    let authorName;
    if (event && event.target) {
        authorName = event.target.dataset?.authorName || event.target.textContent;
    }
    
    const author = sampleAuthors.find(a => a.name === authorName) || sampleAuthors[0];
    
    // Open the enhanced author modal
    const modal = document.getElementById('authorModal');
    
    // Update modal content
    document.getElementById('authorName').textContent = author.name;
    document.getElementById('authorProfilePic').src = author.avatar;
    document.getElementById('authorBio').textContent = `${author.name} is a renowned author with over ${author.books} published works. Their writing spans multiple genres and has garnered a following of ${author.followers} dedicated readers worldwide.`;
    
    // Update author cover
    const coverEl = document.getElementById('authorCover');
    if (coverEl) {
        coverEl.style.background = `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`;
    }
    
    // Load author's books
    const authorBooksEl = document.getElementById('authorBooks');
    if (authorBooksEl) {
        let booksHtml = '';
        for (let i = 1; i <= 4; i++) {
            booksHtml += `
                <div class="book-card-mini" onclick="openQuickView(${Date.now() + i})">
                    <img src="https://picsum.photos/seed/authorbook${i}/150/200" alt="Book">
                </div>
            `;
        }
        authorBooksEl.innerHTML = booksHtml;
    }
    
    // Check if opening from book modal
    if (document.querySelector('.modal-overlay.active')) {
        modal.classList.add('from-book-modal');
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAuthorModal() {
    const modal = document.getElementById('authorModal');
    if (modal) {
        modal.classList.remove('active');
        modal.classList.remove('from-book-modal');
        document.body.style.overflow = '';
    }
}

function openBookstoreModal(event) {
    if (event && event.preventDefault) {
        event.preventDefault();
    }
    
    // Get bookstore data
    let store;
    if (event && event.target) {
        const storeName = event.target.dataset?.storeName || event.target.textContent;
        store = sampleBookstores.find(s => s.name === storeName) || sampleBookstores[0];
    } else {
        store = sampleBookstores[0];
    }
    
    // Open the enhanced bookstore modal
    const modal = document.getElementById('bookstoreModal');
    
    // Update modal content
    document.getElementById('bookstoreName').textContent = store.name;
    document.getElementById('bookstoreProfilePic').src = store.logo;
    document.getElementById('bookstoreBio').textContent = `${store.name} is one of Ethiopia's premier bookstores, offering a wide selection of local and international titles. Located in ${store.location}, we've been serving book lovers for over a decade with ${store.books} carefully curated titles.`;
    document.getElementById('bookstoreRatingText').textContent = `${store.rating} (${store.reviews} reviews)`;
    
    // Update bookstore cover
    const coverEl = document.getElementById('bookstoreCover');
    if (coverEl) {
        coverEl.style.background = `linear-gradient(135deg, #f093fb 0%, #f5576c 100%)`;
    }
    
    // Load bookstore's books
    const bookstoreBooksEl = document.getElementById('bookstoreBooks');
    if (bookstoreBooksEl) {
        let booksHtml = '';
        for (let i = 1; i <= 4; i++) {
            booksHtml += `
                <div class="book-card-mini" onclick="openQuickView(${Date.now() + i})">
                    <img src="https://picsum.photos/seed/storebook${i}/150/200" alt="Book">
                </div>
            `;
        }
        bookstoreBooksEl.innerHTML = booksHtml;
    }
    
    // Check if opening from book modal
    if (document.querySelector('.modal-overlay.active')) {
        modal.classList.add('from-book-modal');
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeBookstoreModal() {
    const modal = document.getElementById('bookstoreModal');
    if (modal) {
        modal.classList.remove('active');
        modal.classList.remove('from-book-modal');
        document.body.style.overflow = '';
    }
}

// Tab switching functions
function switchAuthorTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.author-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show/hide content
    if (tab === 'books') {
        document.getElementById('authorBooksTab').style.display = 'block';
        document.getElementById('authorVideosTab').style.display = 'none';
    } else {
        document.getElementById('authorBooksTab').style.display = 'none';
        document.getElementById('authorVideosTab').style.display = 'block';
    }
}

function switchVideoTab(tab) {
    // Update video tab buttons
    document.querySelectorAll('.video-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update content based on tab
    const videosGrid = document.getElementById('authorVideos');
    if (tab === 'shorts') {
        videosGrid.innerHTML = `
            <div class="video-card">
                <div class="video-thumbnail">▶️</div>
                <div class="video-info">
                    <div class="video-title">Quick Writing Tip</div>
                    <div class="video-meta">50K views • 1 day ago</div>
                </div>
            </div>
            <div class="video-card">
                <div class="video-thumbnail">▶️</div>
                <div class="video-info">
                    <div class="video-title">Book Review in 60s</div>
                    <div class="video-meta">25K views • 3 days ago</div>
                </div>
            </div>
        `;
    } else if (tab === 'playlists') {
        videosGrid.innerHTML = `
            <div class="video-card">
                <div class="video-thumbnail">📚</div>
                <div class="video-info">
                    <div class="video-title">Writing Masterclass</div>
                    <div class="video-meta">10 videos</div>
                </div>
            </div>
        `;
    } else {
        videosGrid.innerHTML = `
            <div class="video-card">
                <div class="video-thumbnail">▶️</div>
                <div class="video-info">
                    <div class="video-title">Writing Tips #1</div>
                    <div class="video-meta">10K views • 2 days ago</div>
                </div>
            </div>
            <div class="video-card">
                <div class="video-thumbnail">▶️</div>
                <div class="video-info">
                    <div class="video-title">Book Reading Session</div>
                    <div class="video-meta">5K views • 1 week ago</div>
                </div>
            </div>
        `;
    }
}

function switchBookstoreTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.bookstore-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show/hide content
    if (tab === 'books') {
        document.getElementById('bookstoreBooksTab').style.display = 'block';
        document.getElementById('bookstoreVideosTab').style.display = 'none';
    } else {
        document.getElementById('bookstoreBooksTab').style.display = 'none';
        document.getElementById('bookstoreVideosTab').style.display = 'block';
    }
}

// ============================================
// MISSING STORE.JS FUNCTIONS
// Add these to your existing store.js file
// ============================================

// ============================================
// ANIMATION INITIALIZATION
// ============================================
function initializeAnimations() {
    // Initialize AOS-like animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all animatable elements
    document.querySelectorAll('.book-card-modern, .widget-modern, .hero-content').forEach(el => {
        observer.observe(el);
    });
    
    // Initialize smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ============================================
// EVENT LISTENERS INITIALIZATION
// ============================================
function initializeEventListeners() {
    // Close modals on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close all active modals
            document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                modal.classList.remove('active');
            });
            document.querySelectorAll('.cart-drawer.active, .wishlist-drawer.active').forEach(drawer => {
                drawer.classList.remove('active');
            });
            document.body.style.overflow = '';
        }
    });
    
    // Click outside to close dropdowns
    document.addEventListener('click', (e) => {
        // Close search suggestions
        if (!e.target.closest('.search-container-enhanced')) {
            const suggestions = document.getElementById('searchSuggestions');
            if (suggestions) suggestions.classList.remove('active');
        }
        
        // Close profile dropdown
        if (!e.target.closest('.profile-menu-container')) {
            const dropdown = document.getElementById('profileDropdown');
            if (dropdown) dropdown.classList.remove('active');
        }
    });
    
    // Handle window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // Adjust particle canvas
            const canvas = document.getElementById('particleCanvas');
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        }, 250);
    });
    
    // Initialize lazy loading for images
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[loading="lazy"]').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================
function showToast(message, type = 'info') {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    
    // Set icon based on type
    let icon = '';
    switch(type) {
        case 'success': icon = '✅'; break;
        case 'error': icon = '❌'; break;
        case 'warning': icon = '⚠️'; break;
        case 'info': default: icon = 'ℹ️'; break;
    }
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Add styles if not already in CSS
    if (!document.querySelector('#toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast-notification {
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                background: white;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                display: flex;
                align-items: center;
                gap: 0.75rem;
                min-width: 250px;
                max-width: 400px;
                z-index: 10000;
                animation: slideInRight 0.3s ease-out;
            }
            
            [data-theme="dark"] .toast-notification {
                background: #333;
                color: white;
            }
            
            .toast-success { border-left: 4px solid #10B981; }
            .toast-error { border-left: 4px solid #EF4444; }
            .toast-warning { border-left: 4px solid #F59E0B; }
            .toast-info { border-left: 4px solid #3B82F6; }
            
            .toast-icon { font-size: 1.25rem; }
            .toast-message { flex: 1; }
            .toast-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                opacity: 0.5;
                transition: opacity 0.2s;
            }
            .toast-close:hover { opacity: 1; }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// AUTHOR MODAL FUNCTIONS
// ============================================
function followAuthor(authorId) {
    const author = sampleAuthors.find(a => a.id === authorId);
    if (author) {
        showToast(`Following ${author.name}`, 'success');
        // Update button text
        if (event && event.target) {
            event.target.textContent = 'Following';
            event.target.style.background = '#10B981';
        }
    }
}

function rateAuthor(rating) {
    if (typeof rating === 'number') {
        // Handle star rating
        const stars = document.querySelectorAll('.star-rating');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('filled');
            } else {
                star.classList.remove('filled');
            }
        });
        showToast(`You rated this author ${rating} stars!`, 'success');
    } else {
        // Handle general rating
        showToast('Rating feature coming soon!', 'info');
    }
}

function postAuthorComment() {
    const commentInput = document.querySelector('.author-comment-textarea');
    if (!commentInput) return;
    
    const comment = commentInput.value.trim();
    
    if (!comment) {
        showToast('Please write a comment', 'warning');
        return;
    }
    
    const commentsList = document.getElementById('authorCommentsList');
    if (!commentsList) {
        // Try the regular comments container
        const commentsContainer = document.getElementById('authorComments');
        if (commentsContainer) {
            const newComment = document.createElement('div');
            newComment.className = 'comment-item';
            newComment.innerHTML = `
                <img src="https://picsum.photos/seed/user${Date.now()}/40/40" alt="User" class="comment-avatar">
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">You</span>
                        <span class="comment-time">Just now</span>
                    </div>
                    <p class="comment-text">${comment}</p>
                    <div class="comment-actions">
                        <button class="comment-action">👍 Like</button>
                        <button class="comment-action">💬 Reply</button>
                    </div>
                </div>
            `;
            commentsContainer.appendChild(newComment);
        }
    } else {
        const newComment = `
            <div class="comment-item">
                <img src="https://picsum.photos/seed/user${Date.now()}/40/40" alt="You" class="comment-avatar">
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">You</span>
                        <span class="comment-time">Just now</span>
                    </div>
                    <p class="comment-text">${comment}</p>
                    <div class="comment-actions">
                        <button class="comment-action">👍 Like</button>
                        <button class="comment-action">💬 Reply</button>
                    </div>
                </div>
            </div>
        `;
        commentsList.insertAdjacentHTML('afterbegin', newComment);
    }
    
    commentInput.value = '';
    showToast('Comment posted!', 'success');
}

// ============================================
// BOOKSTORE MODAL FUNCTIONS
// ============================================
function followBookstore() {
    showToast('Following bookstore!', 'success');
    if (event && event.target) {
        event.target.textContent = 'Following';
        event.target.style.background = '#10B981';
    }
}

function viewFullBookstore() {
    closeBookstoreModal();
    showToast('Loading full bookstore...', 'info');
    // In a real app, this would navigate to the bookstore page
}

function rateBookstore() {
    showToast('Rating feature coming soon!', 'info');
}

function postBookstoreComment() {
    const commentInput = document.getElementById('bookstoreCommentInput');
    if (!commentInput) return;
    
    const comment = commentInput.value.trim();
    
    if (!comment) {
        showToast('Please write a comment', 'warning');
        return;
    }
    
    const commentsContainer = document.getElementById('bookstoreComments');
    if (!commentsContainer) return;
    
    const newComment = document.createElement('div');
    newComment.className = 'comment-item';
    newComment.innerHTML = `
        <img src="https://picsum.photos/seed/user${Date.now()}/40/40" alt="User" class="comment-avatar">
        <div class="comment-content">
            <div class="comment-header">
                <span class="comment-author">You</span>
                <span class="comment-time">Just now</span>
            </div>
            <p class="comment-text">${comment}</p>
            <div class="comment-actions">
                <button class="comment-action">👍 Like</button>
                <button class="comment-action">💬 Reply</button>
            </div>
        </div>
    `;
    
    // Insert after pinned comment if exists
    const pinnedComment = commentsContainer.querySelector('.pinned');
    if (pinnedComment && pinnedComment.nextSibling) {
        commentsContainer.insertBefore(newComment, pinnedComment.nextSibling);
    } else {
        commentsContainer.appendChild(newComment);
    }
    
    commentInput.value = '';
    showToast('Comment posted!', 'success');
}

function switchBookstoreVideoTab(tab) {
    // Update video tab buttons
    document.querySelectorAll('.bookstore-tabs .video-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // Update content based on tab
    const videosGrid = document.getElementById('bookstoreVideos');
    if (!videosGrid) return;
    
    if (tab === 'shorts') {
        videosGrid.innerHTML = `
            <div class="video-card">
                <div class="video-thumbnail">▶️</div>
                <div class="video-info">
                    <div class="video-title">New Book Alert!</div>
                    <div class="video-meta">30K views • 2 days ago</div>
                </div>
            </div>
            <div class="video-card">
                <div class="video-thumbnail">▶️</div>
                <div class="video-info">
                    <div class="video-title">Flash Sale!</div>
                    <div class="video-meta">20K views • 4 days ago</div>
                </div>
            </div>
        `;
    } else if (tab === 'playlists') {
        videosGrid.innerHTML = `
            <div class="video-card">
                <div class="video-thumbnail">📚</div>
                <div class="video-info">
                    <div class="video-title">Staff Picks</div>
                    <div class="video-meta">15 videos</div>
                </div>
            </div>
            <div class="video-card">
                <div class="video-thumbnail">📚</div>
                <div class="video-info">
                    <div class="video-title">Author Interviews</div>
                    <div class="video-meta">8 videos</div>
                </div>
            </div>
        `;
    } else {
        videosGrid.innerHTML = `
            <div class="video-card">
                <div class="video-thumbnail">▶️</div>
                <div class="video-info">
                    <div class="video-title">Store Tour</div>
                    <div class="video-meta">15K views • 3 days ago</div>
                </div>
            </div>
            <div class="video-card">
                <div class="video-thumbnail">▶️</div>
                <div class="video-info">
                    <div class="video-title">New Arrivals</div>
                    <div class="video-meta">8K views • 1 week ago</div>
                </div>
            </div>
        `;
    }
}

// ============================================
// ADDITIONAL MISSING FUNCTIONS FOR STORE.JS
// Add these to your existing store.js file
// ============================================

// ============================================
// FAB (FLOATING ACTION BUTTON) FUNCTIONS
// ============================================
function toggleFAB() {
    const fabMenu = document.getElementById('fabMenu');
    const fabMain = document.querySelector('.fab-main');
    
    fabMenu.classList.toggle('active');
    fabMain.classList.toggle('active');
    
    // Rotate the plus icon
    if (fabMain.classList.contains('active')) {
        fabMain.style.transform = 'rotate(45deg)';
    } else {
        fabMain.style.transform = 'rotate(0deg)';
    }
}

function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    toggleFAB(); // Close FAB menu after action
}

// ============================================
// SHARE FUNCTIONALITY
// ============================================
function shareBook() {
    const book = StoreState.currentBook;
    if (!book) {
        showToast('No book selected', 'warning');
        return;
    }
    
    if (navigator.share) {
        navigator.share({
            title: book.title,
            text: `Check out "${book.title}" by ${book.author}`,
            url: window.location.href
        }).then(() => {
            showToast('Book shared successfully!', 'success');
        }).catch((error) => {
            if (error.name !== 'AbortError') {
                showToast('Failed to share', 'error');
            }
        });
    } else {
        // Fallback: Copy link to clipboard
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            showToast('Link copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy link', 'error');
        });
    }
}

// ============================================
// SIMILAR BOOKS MODAL
// ============================================
function openSimilarBooksModal() {
    const modalHtml = `
        <div class="modal-overlay active" id="similarBooksModal">
            <div class="modal-container" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <button onclick="closeSimilarBooksModal()" class="modal-close">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <div style="padding: 2rem;">
                    <h2 style="font-size: 2rem; font-weight: 700; margin-bottom: 2rem; text-align: center;">Similar Books You May Like</h2>
                    <div id="similarBooksFullGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem;">
                        <!-- Similar books will be loaded here -->
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
    
    // Load similar books
    const grid = document.getElementById('similarBooksFullGrid');
    const similarBooks = generateSampleBooks(12);
    let html = '';
    similarBooks.forEach(book => {
        html += createBookCard(book);
    });
    grid.innerHTML = html;
}

function closeSimilarBooksModal() {
    const modal = document.getElementById('similarBooksModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

// ============================================
// AI CHAT FUNCTIONALITY
// ============================================
function openAIChat() {
    const modalHtml = `
        <div class="modal-overlay active" id="aiChatModal">
            <div class="modal-container" style="max-width: 500px; height: 600px;">
                <button onclick="closeAIChat()" class="modal-close">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <div style="height: 100%; display: flex; flex-direction: column;">
                    <div style="padding: 1.5rem; border-bottom: 1px solid rgba(0,0,0,0.1);">
                        <h2 style="font-size: 1.5rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
                            <span>🤖</span> AI Book Assistant
                        </h2>
                        <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">
                            Ask me anything about books or get personalized recommendations!
                        </p>
                    </div>
                    <div style="flex: 1; overflow-y: auto; padding: 1.5rem;" id="aiChatMessages">
                        <div class="ai-message">
                            <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.25rem;">
                                    🤖
                                </div>
                                <div style="flex: 1; background: rgba(139, 92, 246, 0.1); padding: 1rem; border-radius: 12px;">
                                    <p>Hello! I'm your AI book assistant. How can I help you today?</p>
                                    <p style="margin-top: 0.5rem;">I can:</p>
                                    <ul style="margin-left: 1rem; margin-top: 0.5rem;">
                                        <li>• Recommend books based on your preferences</li>
                                        <li>• Help you find specific genres or authors</li>
                                        <li>• Suggest books similar to ones you've enjoyed</li>
                                        <li>• Answer questions about books in our collection</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="padding: 1rem; border-top: 1px solid rgba(0,0,0,0.1);">
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" 
                                id="aiChatInput" 
                                placeholder="Ask me anything..." 
                                style="flex: 1; padding: 0.75rem; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px;"
                                onkeypress="if(event.key === 'Enter') sendAIMessage()">
                            <button onclick="sendAIMessage()" 
                                style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer;">
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
    
    // Focus on input
    setTimeout(() => {
        document.getElementById('aiChatInput').focus();
    }, 100);
}

function closeAIChat() {
    const modal = document.getElementById('aiChatModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

function sendAIMessage() {
    const input = document.getElementById('aiChatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    const messagesContainer = document.getElementById('aiChatMessages');
    
    // Add user message
    const userMessageHtml = `
        <div class="user-message" style="display: flex; gap: 1rem; margin-bottom: 1rem; justify-content: flex-end;">
            <div style="flex: 1; background: linear-gradient(135deg, #F59E0B, #F97316); color: white; padding: 1rem; border-radius: 12px; max-width: 80%;">
                <p>${message}</p>
            </div>
            <div style="width: 32px; height: 32px; background: #F59E0B; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                👤
            </div>
        </div>
    `;
    messagesContainer.insertAdjacentHTML('beforeend', userMessageHtml);
    
    // Clear input
    input.value = '';
    
    // Simulate AI response
    setTimeout(() => {
        const responses = [
            "Based on your interest, I recommend checking out our bestsellers section!",
            "I found several books that match your preferences. Would you like to see fiction or non-fiction?",
            "Great question! Let me help you find the perfect book.",
            "I've analyzed your reading preferences and have some excellent recommendations for you."
        ];
        
        const aiResponse = responses[Math.floor(Math.random() * responses.length)];
        
        const aiMessageHtml = `
            <div class="ai-message" style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.25rem;">
                    🤖
                </div>
                <div style="flex: 1; background: rgba(139, 92, 246, 0.1); padding: 1rem; border-radius: 12px; max-width: 80%;">
                    <p>${aiResponse}</p>
                </div>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', aiMessageHtml);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 1000);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ============================================
// AI MODAL (RECOMMENDATIONS)
// ============================================
function openAIModal() {
    const modalHtml = `
        <div class="modal-overlay active" id="aiRecommendModal">
            <div class="modal-container" style="max-width: 600px;">
                <button onclick="closeAIModal()" class="modal-close">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                <div style="padding: 2rem;">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <span style="font-size: 3rem;">🤖</span>
                        <h2 style="font-size: 2rem; font-weight: 700; margin: 1rem 0;">AI Book Recommendations</h2>
                        <p style="color: var(--text-muted);">Tell us what you like, and we'll find your perfect match!</p>
                    </div>
                    
                    <div style="space-y: 1.5rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">What genres do you enjoy?</label>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                <button class="genre-chip" onclick="toggleGenreChip(this)">Fiction</button>
                                <button class="genre-chip" onclick="toggleGenreChip(this)">Mystery</button>
                                <button class="genre-chip" onclick="toggleGenreChip(this)">Romance</button>
                                <button class="genre-chip" onclick="toggleGenreChip(this)">Sci-Fi</button>
                                <button class="genre-chip" onclick="toggleGenreChip(this)">Fantasy</button>
                                <button class="genre-chip" onclick="toggleGenreChip(this)">Thriller</button>
                                <button class="genre-chip" onclick="toggleGenreChip(this)">Biography</button>
                                <button class="genre-chip" onclick="toggleGenreChip(this)">History</button>
                            </div>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Favorite book or author</label>
                            <input type="text" 
                                placeholder="e.g., Harry Potter, Stephen King..." 
                                style="width: 100%; padding: 0.75rem; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px;">
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Reading mood</label>
                            <select style="width: 100%; padding: 0.75rem; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px;">
                                <option>Something light and fun</option>
                                <option>Deep and thought-provoking</option>
                                <option>Exciting and adventurous</option>
                                <option>Educational and informative</option>
                                <option>Emotional and moving</option>
                            </select>
                        </div>
                        
                        <button onclick="getAIRecommendations()" 
                            style="width: 100%; padding: 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">
                            Get My Recommendations
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.style.overflow = 'hidden';
    
    // Add styles for genre chips
    if (!document.querySelector('#genre-chip-styles')) {
        const styles = document.createElement('style');
        styles.id = 'genre-chip-styles';
        styles.textContent = `
            .genre-chip {
                padding: 0.5rem 1rem;
                background: white;
                border: 2px solid #e5e7eb;
                border-radius: 20px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .genre-chip:hover {
                border-color: #8B5CF6;
            }
            .genre-chip.active {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-color: transparent;
            }
        `;
        document.head.appendChild(styles);
    }
}

function closeAIModal() {
    const modal = document.getElementById('aiRecommendModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

function toggleGenreChip(chip) {
    chip.classList.toggle('active');
}

function getAIRecommendations() {
    closeAIModal();
    showToast('Analyzing your preferences...', 'info');
    
    setTimeout(() => {
        showToast('Found 15 perfect matches for you!', 'success');
        // Filter to show recommended books
        filterByGenre('all');
        // Scroll to books section
        document.getElementById('booksSection').scrollIntoView({ behavior: 'smooth' });
    }, 2000);
}

// ============================================
// THEME ICON UPDATE FIX
// ============================================
function toggleTheme() {
    StoreState.darkMode = !StoreState.darkMode;
    applyTheme();
    localStorage.setItem('darkMode', StoreState.darkMode);
    showToast(StoreState.darkMode ? 'Dark mode enabled' : 'Light mode enabled', 'info');
}

function applyTheme() {
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    
    if (StoreState.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        if (sunIcon) sunIcon.style.display = 'block';
        if (moonIcon) moonIcon.style.display = 'none';
    }
}

// ============================================
// HELPER FUNCTION FOR MOON ICON
// ============================================
// Add moon icon to the theme toggle button if not present
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle && !themeToggle.querySelector('.moon-icon')) {
        const moonIcon = `
            <svg class="moon-icon w-6 h-6" style="display: none;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
            </svg>
        `;
        themeToggle.insertAdjacentHTML('beforeend', moonIcon);
    }
});



// ============================================
// ENHANCED STORE.JS WITH ETHIOPIAN CONTENT
// Focus on Ethiopian Educational Materials
// ============================================

// Ethiopian Books, Authors, and Bookstores Database
const ethiopianContent = {
  authors: [
    // Ethiopian Authors
    { id: 1, name: "Haddis Alemayehu", bio: "Legendary Ethiopian author, best known for 'Fikir Eske Mekabir' (Love Unto Death), one of the most celebrated works in Ethiopian literature.", image: "haddis", books: 12, rating: 4.9, followers: 15000 },
    { id: 2, name: "Bealu Girma", bio: "Prominent Ethiopian journalist and author, known for 'Oromay' and 'Derasiw', critical works about Ethiopian society.", image: "bealu", books: 8, rating: 4.8, followers: 12000 },
    { id: 3, name: "Tsegaye Gabre-Medhin", bio: "Ethiopia's poet laureate and playwright, renowned for blending traditional Ethiopian narratives with modern literary forms.", image: "tsegaye", books: 15, rating: 4.9, followers: 18000 },
    { id: 4, name: "Maaza Mengiste", bio: "Contemporary Ethiopian-American author of 'The Shadow King', finalist for the Booker Prize 2020.", image: "maaza", books: 3, rating: 4.7, followers: 25000 },
    { id: 5, name: "Dinaw Mengestu", bio: "Ethiopian-American novelist, author of 'The Beautiful Things That Heaven Bears' and 'How to Read the Air'.", image: "dinaw", books: 4, rating: 4.6, followers: 20000 },
    { id: 6, name: "Nega Mezlekia", bio: "Award-winning author of 'Notes from the Hyena's Belly', an acclaimed memoir of growing up in Ethiopia.", image: "nega", books: 5, rating: 4.7, followers: 8000 },
    { id: 7, name: "Sebhat Gebre-Egziabher", bio: "Prolific Ethiopian writer known for children's literature and novels depicting Ethiopian rural life.", image: "sebhat", books: 20, rating: 4.8, followers: 10000 },
    { id: 8, name: "Extreme Series Authors", bio: "Team of Ethiopian educators and subject experts creating comprehensive exam preparation materials.", image: "extreme", books: 50, rating: 4.9, followers: 50000 },
    { id: 9, name: "Ministry of Education Ethiopia", bio: "Official educational content provider for Ethiopian schools.", image: "moe", books: 200, rating: 4.7, followers: 100000 },
    { id: 10, name: "Bewketu Seyoum", bio: "Contemporary Ethiopian poet and writer, voice of the new generation of Ethiopian literature.", image: "bewketu", books: 6, rating: 4.5, followers: 15000 },
    // International Authors (for diversity)
    { id: 11, name: "Chimamanda Ngozi Adichie", bio: "Nigerian author of 'Americanah' and 'Half of a Yellow Sun'.", image: "chimamanda", books: 7, rating: 4.9, followers: 50000 },
    { id: 12, name: "Ngugi wa Thiong'o", bio: "Kenyan writer and academic, considered East Africa's leading novelist.", image: "ngugi", books: 25, rating: 4.8, followers: 30000 }
  ],
  
  bookstores: [
    { id: 1, name: "BookWorld Ethiopia", location: "Bole, Addis Ababa", rating: 4.8, books: 5000, description: "Ethiopia's largest bookstore chain with extensive collection of local and international titles." },
    { id: 2, name: "Mega Book Store", location: "Piazza, Addis Ababa", rating: 4.7, books: 3500, description: "Historic bookstore serving readers since 1960, specializing in Ethiopian literature and educational materials." },
    { id: 3, name: "Unity Books & Café", location: "Kazanchis, Addis Ababa", rating: 4.9, books: 2800, description: "Modern bookstore with integrated café, perfect for book clubs and literary events." },
    { id: 4, name: "Shama Books", location: "Mexico Square, Addis Ababa", rating: 4.6, books: 4200, description: "Publisher and bookstore focusing on Ethiopian authors and educational materials." },
    { id: 5, name: "Addis Book Centre", location: "Churchill Avenue, Addis Ababa", rating: 4.7, books: 3800, description: "Academic and professional books specialist, serving universities and professionals." },
    { id: 6, name: "Alpha Book Store", location: "Arat Kilo, Addis Ababa", rating: 4.5, books: 2200, description: "Specializing in school textbooks and Extreme series for all grades." },
    { id: 7, name: "Ethiopia Reads Bookstore", location: "Gerji, Addis Ababa", rating: 4.8, books: 3000, description: "Non-profit bookstore promoting literacy and Ethiopian literature." },
    { id: 8, name: "Academic Book Center", location: "6 Kilo, Addis Ababa", rating: 4.9, books: 4500, description: "Complete collection of Ethiopian school textbooks and exam preparation materials." }
  ],
  
  books: [
    // EXTREME SERIES BOOKS
    { id: 1, title: "Extreme Mathematics Grade 12", author: "Extreme Series Authors", authorId: 8, price: 450, originalPrice: 550, category: "academics", genre: "Educational", rating: 4.9, reviews: 3250, image: "extreme-math-12", bookstore: "Academic Book Center", bookstoreId: 8, badge: "BESTSELLER", description: "Comprehensive mathematics preparation for Ethiopian University Entrance Exam." },
    { id: 2, title: "Extreme Physics Grade 12", author: "Extreme Series Authors", authorId: 8, price: 420, originalPrice: 520, category: "academics", genre: "Educational", rating: 4.8, reviews: 2890, image: "extreme-physics-12", bookstore: "Academic Book Center", bookstoreId: 8, badge: "TOP RATED", description: "Complete physics review with solved problems for grade 12 students." },
    { id: 3, title: "Extreme Chemistry Grade 12", author: "Extreme Series Authors", authorId: 8, price: 430, originalPrice: 530, category: "academics", genre: "Educational", rating: 4.9, reviews: 2750, image: "extreme-chem-12", bookstore: "Alpha Book Store", bookstoreId: 6, badge: "ESSENTIAL", description: "In-depth chemistry preparation with lab experiments and exercises." },
    { id: 4, title: "Extreme Biology Grade 12", author: "Extreme Series Authors", authorId: 8, price: 440, originalPrice: 540, category: "academics", genre: "Educational", rating: 4.8, reviews: 2650, image: "extreme-bio-12", bookstore: "Academic Book Center", bookstoreId: 8, badge: "POPULAR", description: "Comprehensive biology guide for national exam preparation." },
    { id: 5, title: "Extreme English Grade 12", author: "Extreme Series Authors", authorId: 8, price: 380, originalPrice: 480, category: "academics", genre: "Educational", rating: 4.7, reviews: 2450, image: "extreme-eng-12", bookstore: "BookWorld Ethiopia", bookstoreId: 1, badge: "BESTSELLER", description: "Complete English language and literature preparation guide." },
    
    // GRADE 1-12 TEXTBOOKS
    { id: 6, title: "Mathematics Grade 11 Student Textbook", author: "Ministry of Education Ethiopia", authorId: 9, price: 280, originalPrice: 350, category: "academics", genre: "Textbook", rating: 4.6, reviews: 1850, image: "math-11", bookstore: "Mega Book Store", bookstoreId: 2, badge: "OFFICIAL", description: "Official Ethiopian curriculum mathematics textbook for grade 11." },
    { id: 7, title: "Physics Grade 11 Student Textbook", author: "Ministry of Education Ethiopia", authorId: 9, price: 270, originalPrice: 340, category: "academics", genre: "Textbook", rating: 4.5, reviews: 1650, image: "physics-11", bookstore: "Alpha Book Store", bookstoreId: 6, badge: "OFFICIAL", description: "Standard physics textbook following Ethiopian curriculum." },
    { id: 8, title: "Chemistry Grade 10 Student Textbook", author: "Ministry of Education Ethiopia", authorId: 9, price: 250, originalPrice: 320, category: "academics", genre: "Textbook", rating: 4.6, reviews: 1750, image: "chem-10", bookstore: "Academic Book Center", bookstoreId: 8, badge: "OFFICIAL", description: "Ethiopian curriculum chemistry textbook for grade 10 students." },
    { id: 9, title: "Biology Grade 10 Student Textbook", author: "Ministry of Education Ethiopia", authorId: 9, price: 260, originalPrice: 330, category: "academics", genre: "Textbook", rating: 4.5, reviews: 1550, image: "bio-10", bookstore: "Shama Books", bookstoreId: 4, badge: "OFFICIAL", description: "Complete biology textbook with illustrations and exercises." },
    { id: 10, title: "Amharic Grade 9 Student Textbook", author: "Ministry of Education Ethiopia", authorId: 9, price: 220, originalPrice: 280, category: "academics", genre: "Textbook", rating: 4.7, reviews: 1850, image: "amharic-9", bookstore: "BookWorld Ethiopia", bookstoreId: 1, badge: "OFFICIAL", description: "Native language textbook for Ethiopian grade 9 students." },
    
    // PRIMARY SCHOOL BOOKS
    { id: 11, title: "Mathematics Grade 1 Textbook", author: "Ministry of Education Ethiopia", authorId: 9, price: 120, originalPrice: 150, category: "academics", genre: "Primary", rating: 4.8, reviews: 950, image: "math-1", bookstore: "Alpha Book Store", bookstoreId: 6, badge: "PRIMARY", description: "Colorful mathematics introduction for grade 1 students." },
    { id: 12, title: "English Grade 3 Student Book", author: "Ministry of Education Ethiopia", authorId: 9, price: 140, originalPrice: 180, category: "academics", genre: "Primary", rating: 4.7, reviews: 850, image: "eng-3", bookstore: "Ethiopia Reads Bookstore", bookstoreId: 7, badge: "PRIMARY", description: "English language learning for grade 3 with activities." },
    { id: 13, title: "Environmental Science Grade 5", author: "Ministry of Education Ethiopia", authorId: 9, price: 160, originalPrice: 200, category: "academics", genre: "Primary", rating: 4.6, reviews: 750, image: "env-5", bookstore: "Academic Book Center", bookstoreId: 8, badge: "PRIMARY", description: "Introduction to environmental science for young learners." },
    { id: 14, title: "Social Studies Grade 6", author: "Ministry of Education Ethiopia", authorId: 9, price: 180, originalPrice: 230, category: "academics", genre: "Primary", rating: 4.5, reviews: 680, image: "social-6", bookstore: "Mega Book Store", bookstoreId: 2, badge: "PRIMARY", description: "Ethiopian history and geography for grade 6 students." },
    
    // MORE EXTREME SERIES
    { id: 15, title: "Extreme Mathematics Grade 10", author: "Extreme Series Authors", authorId: 8, price: 380, originalPrice: 480, category: "academics", genre: "Educational", rating: 4.8, reviews: 2150, image: "extreme-math-10", bookstore: "Academic Book Center", bookstoreId: 8, badge: "POPULAR", description: "Foundation mathematics concepts with extensive practice problems." },
    { id: 16, title: "Extreme General Business Grade 12", author: "Extreme Series Authors", authorId: 8, price: 350, originalPrice: 450, category: "academics", genre: "Educational", rating: 4.6, reviews: 1250, image: "extreme-business", bookstore: "Alpha Book Store", bookstoreId: 6, badge: "NEW", description: "Business studies preparation for commerce stream students." },
    { id: 17, title: "Extreme Economics Grade 12", author: "Extreme Series Authors", authorId: 8, price: 360, originalPrice: 460, category: "academics", genre: "Educational", rating: 4.7, reviews: 1150, image: "extreme-econ", bookstore: "BookWorld Ethiopia", bookstoreId: 1, badge: "TRENDING", description: "Comprehensive economics guide for social science students." },
    { id: 18, title: "Extreme Geography Grade 12", author: "Extreme Series Authors", authorId: 8, price: 340, originalPrice: 440, category: "academics", genre: "Educational", rating: 4.5, reviews: 980, image: "extreme-geo", bookstore: "Academic Book Center", bookstoreId: 8, badge: "ESSENTIAL", description: "Physical and human geography for entrance exam preparation." },
    
    // ETHIOPIAN FICTION (keeping some for diversity)
    { id: 19, title: "Fikir Eske Mekabir", author: "Haddis Alemayehu", authorId: 1, price: 350, originalPrice: 450, category: "fiction", genre: "Romance", rating: 4.9, reviews: 1250, image: "fikir", bookstore: "BookWorld Ethiopia", bookstoreId: 1, badge: "CLASSIC", description: "The most celebrated Ethiopian novel about tragic love, social class, and tradition." },
    { id: 20, title: "Oromay", author: "Bealu Girma", authorId: 2, price: 280, originalPrice: 380, category: "fiction", genre: "Political Fiction", rating: 4.8, reviews: 890, image: "oromay", bookstore: "Mega Book Store", bookstoreId: 2, badge: "BESTSELLER", description: "A powerful political novel set during the Ethiopian Red Terror period." },
    { id: 21, title: "The Shadow King", author: "Maaza Mengiste", authorId: 4, price: 450, originalPrice: 550, category: "fiction", genre: "Historical Fiction", rating: 4.7, reviews: 2100, image: "shadow", bookstore: "Unity Books & Café", bookstoreId: 3, badge: "AWARD WINNER", description: "Booker Prize finalist novel about Ethiopian women warriors during the Italian invasion." },
    
    // MORE TEXTBOOKS
    { id: 22, title: "ICT Grade 9 Student Textbook", author: "Ministry of Education Ethiopia", authorId: 9, price: 240, originalPrice: 300, category: "academics", genre: "Textbook", rating: 4.8, reviews: 1450, image: "ict-9", bookstore: "Academic Book Center", bookstoreId: 8, badge: "TRENDING", description: "Information and Communication Technology for modern students." },
    { id: 23, title: "Civics and Ethical Education Grade 8", author: "Ministry of Education Ethiopia", authorId: 9, price: 200, originalPrice: 250, category: "academics", genre: "Textbook", rating: 4.5, reviews: 920, image: "civics-8", bookstore: "Shama Books", bookstoreId: 4, badge: "OFFICIAL", description: "Building ethical citizens through civic education." },
    { id: 24, title: "History Grade 7 Student Textbook", author: "Ministry of Education Ethiopia", authorId: 9, price: 190, originalPrice: 240, category: "academics", genre: "Textbook", rating: 4.6, reviews: 870, image: "history-7", bookstore: "Mega Book Store", bookstoreId: 2, badge: "OFFICIAL", description: "Ethiopian and world history for grade 7 students." },
    
    // TEACHER GUIDES
    { id: 25, title: "Mathematics Grade 12 Teacher Guide", author: "Ministry of Education Ethiopia", authorId: 9, price: 380, originalPrice: 480, category: "academics", genre: "Teacher Guide", rating: 4.7, reviews: 450, image: "math-teacher-12", bookstore: "Academic Book Center", bookstoreId: 8, badge: "TEACHERS", description: "Comprehensive teaching guide with lesson plans and assessments." },
    { id: 26, title: "Physics Grade 11 Teacher Guide", author: "Ministry of Education Ethiopia", authorId: 9, price: 360, originalPrice: 460, category: "academics", genre: "Teacher Guide", rating: 4.6, reviews: 380, image: "physics-teacher-11", bookstore: "Alpha Book Store", bookstoreId: 6, badge: "TEACHERS", description: "Complete teaching resource with experiments and solutions." },
    
    // REFERENCE BOOKS
    { id: 27, title: "Complete Grade 12 Formula Book", author: "Extreme Series Authors", authorId: 8, price: 250, originalPrice: 320, category: "academics", genre: "Reference", rating: 4.9, reviews: 3450, image: "formula-book", bookstore: "Academic Book Center", bookstoreId: 8, badge: "ESSENTIAL", description: "All formulas for Math, Physics, and Chemistry in one book." },
    { id: 28, title: "Ethiopian University Entrance Exam Guide", author: "Extreme Series Authors", authorId: 8, price: 480, originalPrice: 580, category: "academics", genre: "Educational", rating: 4.9, reviews: 4250, image: "entrance-guide", bookstore: "BookWorld Ethiopia", bookstoreId: 1, badge: "BESTSELLER", description: "Complete preparation guide with past papers and solutions." },
    
    // INTERNATIONAL BOOKS (for diversity)
    { id: 29, title: "Things Fall Apart", author: "Chinua Achebe", authorId: 13, price: 320, originalPrice: 420, category: "fiction", genre: "Classic", rating: 4.8, reviews: 3200, image: "things", bookstore: "Unity Books & Café", bookstoreId: 3, badge: "CLASSIC", description: "African literary masterpiece about colonialism and tradition." },
    { id: 30, title: "Half of a Yellow Sun", author: "Chimamanda Ngozi Adichie", authorId: 11, price: 380, originalPrice: 480, category: "fiction", genre: "Historical Fiction", rating: 4.7, reviews: 2800, image: "half", bookstore: "BookWorld Ethiopia", bookstoreId: 1, badge: "INTERNATIONAL", description: "Powerful novel set during the Nigerian Civil War." }
  ]
};

// Initialize cart and wishlist
let cart = [];
let wishlist = [];
let currentView = 'grid';
let currentCategory = 'all';
let currentQuickViewBook = null;

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
  initializeStore();
  loadBooks();
  loadCategories();
  loadAuthors();
  loadBookstores();
  startDealTimer();
  initializeAnimations();
  initializeSearch();
  animateHeroStats();
  createFloatingBubbles();
  initializeParticles();
});

// Initialize store
function initializeStore() {
  // Load saved cart and wishlist
  const savedCart = localStorage.getItem('cart');
  const savedWishlist = localStorage.getItem('wishlist');
  
  if (savedCart) cart = JSON.parse(savedCart);
  if (savedWishlist) wishlist = JSON.parse(savedWishlist);
  
  updateCartCount();
  updateWishlistCount();
  
  // Set theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// Load books into grids
function loadBooks() {
  const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
  const featuredCarousel = document.getElementById('featuredCarousel');
  const trendingGrid = document.getElementById('trendingBooksGrid');
  const newArrivalsGrid = document.getElementById('newArrivalsGrid');
  const bestsellersGrid = document.getElementById('bestsellersGrid');
  
  // Featured carousel - Extreme series and top textbooks
  if (featuredCarousel) {
    const featuredBooks = ethiopianContent.books.filter(b => b.badge === 'BESTSELLER' || b.badge === 'ESSENTIAL').slice(0, 5);
    featuredCarousel.innerHTML = featuredBooks.map(book => createBookCard(book, true)).join('');
  }
  
  // Trending books - Popular Extreme series
  if (trendingGrid) {
    const trendingBooks = ethiopianContent.books.filter(b => b.author === "Extreme Series Authors").slice(0, 4);
    trendingGrid.innerHTML = trendingBooks.map(book => createBookCard(book)).join('');
  }
  
  // New arrivals - Latest textbooks
  if (newArrivalsGrid) {
    const newBooks = ethiopianContent.books.filter(b => ['NEW', 'TRENDING'].includes(b.badge)).slice(0, 4);
    newArrivalsGrid.innerHTML = newBooks.map(book => createBookCard(book)).join('');
  }
  
  // Bestsellers - Most reviewed books
  if (bestsellersGrid) {
    const bestsellerBooks = [...ethiopianContent.books].sort((a, b) => b.reviews - a.reviews).slice(0, 4);
    bestsellersGrid.innerHTML = bestsellerBooks.map(book => createBookCard(book)).join('');
  }
  
  // Main grids - Mix of all books
  grids.forEach((gridId, index) => {
    const grid = document.getElementById(gridId);
    if (grid) {
      const startIdx = index * 3;
      const endIdx = startIdx + 3;
      const booksToShow = ethiopianContent.books.slice(startIdx, endIdx);
      grid.innerHTML = booksToShow.map(book => createBookCard(book)).join('');
    }
  });
}

// Create book card HTML
function createBookCard(book, isFeatured = false) {
  const author = ethiopianContent.authors.find(a => a.id === book.authorId);
  const bookstore = ethiopianContent.bookstores.find(b => b.id === book.bookstoreId);
  
  return `
    <div class="book-card-modern ${isFeatured ? 'featured' : ''}" data-book-id="${book.id}">
      <div class="book-cover">
        ${book.badge ? `<div class="book-badge">${book.badge}</div>` : ''}
        <img src="https://picsum.photos/seed/${book.image}/300/400" alt="${book.title}" loading="lazy">
        <div class="book-actions-quick">
          <button class="btn-quick-add" onclick="quickAddToCart(${book.id})" title="Add to Cart">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </button>
          <button class="btn-quick-wishlist" onclick="quickAddToWishlist(${book.id})" title="Add to Wishlist">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          </button>
          <button class="btn-quick-view" onclick="openQuickView(${book.id})" title="Quick View">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="book-info">
        <div class="book-category">${book.genre}</div>
        <h3 class="book-title">${book.title}</h3>
        <div class="book-author">
          by <a href="#" class="author-link" onclick="openAuthorModal(event, ${book.authorId})">${book.author}</a>
        </div>
        <div class="bookstore-info">
          <a href="#" class="bookstore-link" onclick="openBookstoreModal(event, ${book.bookstoreId})">${book.bookstore}</a>
        </div>
        <div class="book-footer">
          <div class="book-price">ETB ${book.price}</div>
          <div class="book-rating">
            ${'⭐'.repeat(Math.floor(book.rating))}
            <span>(${book.reviews})</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Load categories into sidebar
function loadCategories() {
  const sidebarContent = document.getElementById('sidebarContent');
  if (!sidebarContent) return;
  
  const categories = [
    {
      name: 'Educational Materials',
      icon: '📚',
      items: [
        { name: 'Extreme Series', icon: '🎯', count: 15, badge: 'hot' },
        { name: 'Grade 1-6 Textbooks', icon: '📖', count: 45 },
        { name: 'Grade 7-8 Textbooks', icon: '📘', count: 30 },
        { name: 'Grade 9-10 Textbooks', icon: '📙', count: 35 },
        { name: 'Grade 11-12 Textbooks', icon: '📕', count: 40, badge: 'new' },
        { name: 'Teacher Guides', icon: '👨‍🏫', count: 25 },
        { name: 'Reference Books', icon: '📑', count: 18 }
      ]
    },
    {
      name: 'Ethiopian Literature',
      icon: '🇪🇹',
      items: [
        { name: 'Classic Fiction', icon: '📚', count: 25 },
        { name: 'Contemporary Fiction', icon: '✨', count: 18 },
        { name: 'Poetry', icon: '🎭', count: 12 },
        { name: 'Drama', icon: '🎪', count: 8 },
        { name: 'Children\'s Books', icon: '🧸', count: 35 }
      ]
    },
    {
      name: 'By Subject',
      icon: '📐',
      items: [
        { name: 'Mathematics', icon: '🔢', count: 85, badge: 'hot' },
        { name: 'Physics', icon: '⚛️', count: 65 },
        { name: 'Chemistry', icon: '🧪', count: 60 },
        { name: 'Biology', icon: '🧬', count: 55 },
        { name: 'English', icon: '🔤', count: 70 },
        { name: 'Amharic', icon: '🇪🇹', count: 45 },
        { name: 'History', icon: '📜', count: 35 },
        { name: 'Geography', icon: '🌍', count: 30 }
      ]
    }
  ];
  
  let html = '';
  categories.forEach((category, idx) => {
    html += `
      <div class="category-group ${idx === 0 ? 'active' : ''}" data-category="${category.name}">
        <button class="category-header" onclick="toggleCategory(this)">
          <span class="category-icon">${category.icon}</span>
          <span>${category.name}</span>
          <svg class="category-arrow w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
        <div class="category-items">
          ${category.items.map(item => `
            <a href="#" class="category-item" onclick="filterBySubCategory('${item.name}')">
              <span class="item-icon">${item.icon}</span>
              <span>${item.name}</span>
              ${item.badge ? `<span class="item-badge ${item.badge}">${item.badge.toUpperCase()}</span>` : ''}
              <span class="item-count">${item.count}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  });
  
  sidebarContent.innerHTML = html;
}

// Load popular authors
function loadAuthors() {
  const authorsContainer = document.getElementById('popularAuthors');
  if (!authorsContainer) return;
  
  const popularAuthors = ethiopianContent.authors.slice(0, 5);
  
  authorsContainer.innerHTML = popularAuthors.map(author => `
    <div class="author-item-modern" onclick="openAuthorModal(event, ${author.id})">
      <img src="https://picsum.photos/seed/${author.image}/48/48" alt="${author.name}" class="author-avatar-modern">
      <div class="author-info-modern">
        <div class="author-name-modern">${author.name}</div>
        <div class="author-meta-modern">${author.books} books • ${author.followers.toLocaleString()} followers</div>
      </div>
      <button class="follow-btn-small" onclick="followAuthor(event, ${author.id})">Follow</button>
    </div>
  `).join('');
}

// Load popular bookstores
function loadBookstores() {
  const bookstoresContainer = document.getElementById('popularBookstores');
  if (!bookstoresContainer) return;
  
  const popularBookstores = ethiopianContent.bookstores.slice(0, 4);
  
  bookstoresContainer.innerHTML = popularBookstores.map(store => `
    <div class="bookstore-item-modern" onclick="openBookstoreModal(event, ${store.id})">
      <img src="https://picsum.photos/seed/store${store.id}/60/60" alt="${store.name}" class="bookstore-logo">
      <div class="bookstore-info-modern">
        <div class="bookstore-name-modern">${store.name}</div>
        <div class="bookstore-meta-modern">
          <div class="bookstore-rating">
            ${'⭐'.repeat(Math.floor(store.rating))}
            <span>${store.rating}</span>
          </div>
          <span>• ${store.books.toLocaleString()} books</span>
        </div>
      </div>
      <button class="view-store-btn-small" onclick="viewStore(event, ${store.id})">View</button>
    </div>
  `).join('');
}

// Quick View Modal
function openQuickView(bookId) {
  const book = ethiopianContent.books.find(b => b.id === bookId);
  if (!book) return;
  
  currentQuickViewBook = book;
  const modal = document.getElementById('quickViewModal');
  const author = ethiopianContent.authors.find(a => a.id === book.authorId);
  const bookstore = ethiopianContent.bookstores.find(b => b.id === book.bookstoreId);
  
  // Update modal content
  document.getElementById('quickViewCover').src = `https://picsum.photos/seed/${book.image}/400/600`;
  document.getElementById('quickViewTitle').textContent = book.title;
  document.getElementById('quickViewAuthor').textContent = book.author;
  document.getElementById('quickViewAuthor').setAttribute('onclick', `openAuthorModal(event, ${book.authorId})`);
  document.getElementById('quickViewBookstore').textContent = book.bookstore;
  document.getElementById('quickViewBookstore').setAttribute('onclick', `openBookstoreModal(event, ${book.bookstoreId})`);
  document.getElementById('quickViewPrice').textContent = `ETB ${book.price}`;
  document.getElementById('quickViewOriginalPrice').textContent = `ETB ${book.originalPrice}`;
  document.getElementById('quickViewDescription').textContent = book.description;
  document.getElementById('quickViewRating').textContent = `${book.rating} (${book.reviews} reviews)`;
  
  if (book.badge) {
    document.getElementById('quickViewBadge').textContent = book.badge;
    document.getElementById('quickViewBadge').style.display = 'inline-block';
  } else {
    document.getElementById('quickViewBadge').style.display = 'none';
  }
  
  // Load reviews
  loadReviews(bookId);
  
  // Load similar books
  loadSimilarBooks(book.category);
  
  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close Quick View Modal
function closeQuickView() {
  const modal = document.getElementById('quickViewModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
  currentQuickViewBook = null;
}

// Author Modal
function openAuthorModal(event, authorId) {
  event.preventDefault();
  event.stopPropagation();
  
  const author = ethiopianContent.authors.find(a => a.id === authorId);
  if (!author) return;
  
  const modal = document.getElementById('authorModal');
  
  // Update modal content
  document.getElementById('authorProfilePic').src = `https://picsum.photos/seed/${author.image}/120/120`;
  document.getElementById('authorName').textContent = author.name;
  document.getElementById('authorBio').textContent = author.bio;
  document.getElementById('authorRatingText').textContent = `${author.rating} out of 5`;
  
  // Load author's books
  const authorBooks = ethiopianContent.books.filter(b => b.authorId === authorId);
  const authorBooksGrid = document.getElementById('authorBooks');
  authorBooksGrid.innerHTML = authorBooks.slice(0, 6).map(book => `
    <div class="book-card-mini" onclick="openQuickView(${book.id})">
      <img src="https://picsum.photos/seed/${book.image}/150/200" alt="${book.title}">
    </div>
  `).join('');
  
  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close Author Modal
function closeAuthorModal() {
  const modal = document.getElementById('authorModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Bookstore Modal
function openBookstoreModal(event, bookstoreId) {
  event.preventDefault();
  event.stopPropagation();
  
  const bookstore = ethiopianContent.bookstores.find(b => b.id === bookstoreId);
  if (!bookstore) return;
  
  const modal = document.getElementById('bookstoreModal');
  
  // Update modal content
  document.getElementById('bookstoreProfilePic').src = `https://picsum.photos/seed/store${bookstore.id}/150/150`;
  document.getElementById('bookstoreName').textContent = bookstore.name;
  document.getElementById('bookstoreBio').textContent = bookstore.description;
  document.getElementById('bookstoreRatingText').textContent = `${bookstore.rating} (${bookstore.books}+ books)`;
  
  // Load bookstore's books
  const bookstoreBooks = ethiopianContent.books.filter(b => b.bookstoreId === bookstoreId);
  const bookstoreBooksGrid = document.getElementById('bookstoreBooks');
  bookstoreBooksGrid.innerHTML = bookstoreBooks.slice(0, 6).map(book => `
    <div class="book-card-mini" onclick="openQuickView(${book.id})">
      <img src="https://picsum.photos/seed/${book.image}/150/200" alt="${book.title}">
    </div>
  `).join('');
  
  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close Bookstore Modal
function closeBookstoreModal() {
  const modal = document.getElementById('bookstoreModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Other essential functions...
// (The rest of the functions remain the same as in the original store.js)

// Cart functions
function quickAddToCart(bookId) {
  const book = ethiopianContent.books.find(b => b.id === bookId);
  if (!book) return;
  
  const existingItem = cart.find(item => item.id === bookId);
  
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({ ...book, quantity: 1 });
  }
  
  updateCartCount();
  saveCart();
  showToast('Added to cart!', 'success');
}

function updateCartCount() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const cartCount = document.getElementById('cartCount');
  if (cartCount) cartCount.textContent = count;
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// Wishlist functions
function quickAddToWishlist(bookId) {
  const book = ethiopianContent.books.find(b => b.id === bookId);
  if (!book) return;
  
  const exists = wishlist.find(item => item.id === bookId);
  
  if (!exists) {
    wishlist.push(book);
    updateWishlistCount();
    saveWishlist();
    showToast('Added to wishlist!', 'success');
  } else {
    showToast('Already in wishlist', 'info');
  }
}

function updateWishlistCount() {
  const wishlistCount = document.getElementById('wishlistCount');
  if (wishlistCount) wishlistCount.textContent = wishlist.length;
}

function saveWishlist() {
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

// Toast notification
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
    warning: '⚠'
  }[type];
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// Other UI functions
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

function sidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const menuTrigger = document.querySelector('.menu-trigger');
  
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
  menuTrigger.classList.toggle('active');
}

function toggleCategory(button) {
  const group = button.parentElement;
  group.classList.toggle('active');
}

function filterByGenre(genre) {
  currentCategory = genre;
  
  // Update active button
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-category') === genre) {
      btn.classList.add('active');
    }
  });
  
  // Filter books
  loadFilteredBooks(genre);
}

function loadFilteredBooks(genre) {
  let filteredBooks = ethiopianContent.books;
  
  if (genre !== 'all') {
    if (genre === 'trending') {
      filteredBooks = ethiopianContent.books.filter(b => b.badge === 'TRENDING' || b.badge === 'POPULAR');
    } else if (genre === 'new') {
      filteredBooks = ethiopianContent.books.filter(b => b.badge === 'NEW' || b.badge === 'NEW ARRIVAL');
    } else if (genre === 'bestseller') {
      filteredBooks = ethiopianContent.books.filter(b => b.badge === 'BESTSELLER');
    } else if (genre === 'deals') {
      filteredBooks = ethiopianContent.books.filter(b => b.originalPrice > b.price);
    } else if (genre === 'local') {
      filteredBooks = ethiopianContent.books.filter(b => b.authorId <= 10);
    } else {
      filteredBooks = ethiopianContent.books.filter(b => b.category === genre);
    }
  }
  
  // Update main grid
  const mainGrid = document.getElementById('booksGrid');
  if (mainGrid) {
    mainGrid.innerHTML = filteredBooks.slice(0, 6).map(book => createBookCard(book)).join('');
  }
}

// Deal timer
function startDealTimer() {
  const endTime = new Date();
  endTime.setHours(endTime.getHours() + 48);
  
  setInterval(() => {
    const now = new Date();
    const timeLeft = endTime - now;
    
    if (timeLeft > 0) {
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      const hoursEl = document.getElementById('dealHours');
      const minutesEl = document.getElementById('dealMinutes');
      const secondsEl = document.getElementById('dealSeconds');
      
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
      if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
      if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }
  }, 1000);
}

// Initialize animations
function initializeAnimations() {
  // Scroll animations
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('mainNav');
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
}

// Search functionality
function initializeSearch() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(performSearch, 300));
  }
}

function performSearch(query) {
  if (!query || query.length < 2) {
    hideSuggestions();
    return;
  }
  
  // Search in books
  const results = ethiopianContent.books.filter(book => 
    book.title.toLowerCase().includes(query.toLowerCase()) ||
    book.author.toLowerCase().includes(query.toLowerCase()) ||
    book.genre.toLowerCase().includes(query.toLowerCase())
  );
  
  showSuggestions(results);
}

function showSuggestions(results) {
  const suggestionsEl = document.getElementById('searchSuggestions');
  if (!suggestionsEl) return;
  
  if (results.length === 0) {
    suggestionsEl.innerHTML = '<div class="suggestion-item">No results found</div>';
  } else {
    suggestionsEl.innerHTML = results.slice(0, 5).map(book => `
      <div class="suggestion-item" onclick="openQuickView(${book.id})">
        <div class="suggestion-icon">📚</div>
        <div class="suggestion-content">
          <div class="suggestion-title">${book.title}</div>
          <div class="suggestion-meta">${book.author} • ${book.genre}</div>
        </div>
        <div class="suggestion-badge">ETB ${book.price}</div>
      </div>
    `).join('');
  }
  
  suggestionsEl.classList.add('active');
}

function hideSuggestions() {
  const suggestionsEl = document.getElementById('searchSuggestions');
  if (suggestionsEl) {
    suggestionsEl.classList.remove('active');
  }
}

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Hero animations
function animateHeroStats() {
  const stats = document.querySelectorAll('.stat-number-modern');
  stats.forEach(stat => {
    const target = parseInt(stat.getAttribute('data-count'));
    let current = 0;
    const increment = target / 100;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      stat.textContent = Math.floor(current).toLocaleString();
    }, 20);
  });
}

// Background animations
function createFloatingBubbles() {
  const container = document.getElementById('bubbleContainer');
  if (!container) return;
  
  for (let i = 0; i < 10; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'floating-bubble';
    bubble.style.width = Math.random() * 100 + 50 + 'px';
    bubble.style.height = bubble.style.width;
    bubble.style.left = Math.random() * 100 + '%';
    bubble.style.animationDelay = Math.random() * 15 + 's';
    bubble.style.animationDuration = Math.random() * 10 + 15 + 's';
    container.appendChild(bubble);
  }
}

function initializeParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const particles = [];
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 1,
      speedX: Math.random() * 2 - 1,
      speedY: Math.random() * 2 - 1
    });
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(particle => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      
      if (particle.x > canvas.width) particle.x = 0;
      if (particle.x < 0) particle.x = canvas.width;
      if (particle.y > canvas.height) particle.y = 0;
      if (particle.y < 0) particle.y = canvas.height;
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.fill();
    });
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

// Additional UI functions
function toggleProfileMenu() {
  const dropdown = document.getElementById('profileDropdown');
  dropdown.classList.toggle('active');
}

function openCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  drawer.classList.add('active');
  loadCartItems();
}

function closeCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  drawer.classList.remove('active');
}

function openWishlistDrawer() {
  const drawer = document.getElementById('wishlistDrawer');
  drawer.classList.add('active');
  loadWishlistItems();
}

function closeWishlistDrawer() {
  const drawer = document.getElementById('wishlistDrawer');
  drawer.classList.remove('active');
}

function loadCartItems() {
  const cartContent = document.getElementById('cartContent');
  if (cart.length === 0) {
    cartContent.innerHTML = `
      <div class="cart-empty">
        <svg class="w-24 h-24 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
        </svg>
        <p class="text-center mt-4 text-gray-500">Your cart is empty</p>
      </div>
    `;
  } else {
    cartContent.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="https://picsum.photos/seed/${item.image}/80/100" alt="${item.title}" class="cart-item-image">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-author">${item.author}</div>
          <div class="cart-item-price">ETB ${item.price}</div>
          <div class="cart-item-actions">
            <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
            <span class="quantity-value">${item.quantity}</span>
            <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
            <button class="remove-btn" onclick="removeFromCart(${item.id})">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
  }
  
  updateCartSummary();
}

function updateCartSummary() {
  const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const shipping = subtotal > 0 ? 50 : 0;
  const total = subtotal + shipping;
  
  document.getElementById('cartSubtotal').textContent = `ETB ${subtotal}`;
  document.getElementById('cartShipping').textContent = `ETB ${shipping}`;
  document.getElementById('cartTotal').textContent = `ETB ${total}`;
}

function loadWishlistItems() {
  const wishlistContent = document.getElementById('wishlistContent');
  if (wishlist.length === 0) {
    wishlistContent.innerHTML = `
      <div class="wishlist-empty">
        <svg class="w-24 h-24 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
        </svg>
        <p class="text-center mt-4 text-gray-500">Your wishlist is empty</p>
      </div>
    `;
  } else {
    wishlistContent.innerHTML = wishlist.map(item => `
      <div class="wishlist-item">
        <img src="https://picsum.photos/seed/${item.image}/80/100" alt="${item.title}" class="cart-item-image">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-author">${item.author}</div>
          <div class="cart-item-price">ETB ${item.price}</div>
          <div class="cart-item-actions">
            <button class="btn-add-cart" onclick="moveToCart(${item.id})">Move to Cart</button>
            <button class="remove-btn" onclick="removeFromWishlist(${item.id})">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
  }
}

// FAB functions
function toggleFAB() {
  const fabMenu = document.getElementById('fabMenu');
  const fabMain = document.querySelector('.fab-main');
  fabMenu.classList.toggle('active');
  fabMain.classList.toggle('active');
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toggleFAB();
}

// Initialize everything
window.addEventListener('click', (e) => {
  // Close dropdowns when clicking outside
  if (!e.target.closest('.profile-menu-container')) {
    document.getElementById('profileDropdown')?.classList.remove('active');
  }
  
  if (!e.target.closest('.search-container-enhanced')) {
    hideSuggestions();
  }
});

// Export functions for HTML onclick handlers
window.sidebarToggle = sidebarToggle;
window.toggleTheme = toggleTheme;
window.openQuickView = openQuickView;
window.closeQuickView = closeQuickView;
window.openAuthorModal = openAuthorModal;
window.closeAuthorModal = closeAuthorModal;
window.openBookstoreModal = openBookstoreModal;
window.closeBookstoreModal = closeBookstoreModal;
window.quickAddToCart = quickAddToCart;
window.quickAddToWishlist = quickAddToWishlist;
window.filterByGenre = filterByGenre;
window.toggleCategory = toggleCategory;
window.toggleProfileMenu = toggleProfileMenu;
window.openCartDrawer = openCartDrawer;
window.closeCartDrawer = closeCartDrawer;
window.openWishlistDrawer = openWishlistDrawer;
window.closeWishlistDrawer = closeWishlistDrawer;
window.toggleFAB = toggleFAB;
window.scrollToTop = scrollToTop;


 
// ============================================
// ENHANCED STORE.JS WITH ETHIOPIAN CONTENT
// Focus on Ethiopian Educational Materials
// ============================================

// ============================================
// BOOK COVER HELPER FUNCTIONS
// ============================================

// Function to get book cover URL
function getBookCoverUrl(book) {
  // Priority order for cover images:
  
  // 1. If book has a direct coverUrl, use it
  if (book.coverUrl) {
    return book.coverUrl;
  }
  
  // 2. Try Open Library API if ISBN is available
  if (book.isbn) {
    // Open Library Cover API - Size options: S (small), M (medium), L (large)
    return `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`;
  }
  
  // 3. Generate a beautiful placeholder with book details
  return generateBookCoverPlaceholder(book);
}

// Generate custom placeholder covers
function generateBookCoverPlaceholder(book) {
  const bgColor = book.coverColor || getColorForGenre(book.genre);
  const textColor = isColorDark(bgColor) ? 'FFFFFF' : '000000';
  
  // Create multi-line text for the cover
  const lines = book.title.split(' ');
  const titleText = lines.length > 3 
    ? lines.slice(0, 3).join('+') + '...' 
    : lines.join('+');
  
  return `https://via.placeholder.com/300x400/${bgColor.replace('#', '')}/${textColor}?text=${titleText}`;
}

// Helper function to determine genre color
function getColorForGenre(genre) {
  const genreColors = {
    'Educational': '#FF6B35',
    'Mathematics': '#FF6B35',
    'Physics': '#4ECDC4',
    'Chemistry': '#95E1D3',
    'Biology': '#A8E6CF',
    'English': '#6C5CE7',
    'Textbook': '#3498DB',
    'Primary': '#FFD93D',
    'Teacher Guide': '#2ECC71',
    'Reference': '#E74C3C',
    'Fiction': '#9B59B6',
    'Romance': '#E84545',
    'Political Fiction': '#34495E',
    'Historical Fiction': '#8B4513',
    'Classic': '#2C3E50',
    'Contemporary': '#16A085',
    'Poetry': '#E056FD',
    'Drama': '#F39C12',
    'Children': '#FFC312'
  };
  
  return genreColors[genre] || '#7F8C8D';
}

// Helper function to check if color is dark
function isColorDark(hexColor) {
  const rgb = parseInt(hexColor.replace('#', ''), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >>  8) & 0xff;
  const b = (rgb >>  0) & 0xff;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 128;
}

// Generate fallback cover if image fails to load
function generateFallbackCover(book) {
  // Create a data URI SVG as fallback
  const svg = `
    <svg width="300" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="400" fill="${book.coverColor || getColorForGenre(book.genre) || '#E0E0E0'}"/>
      <text x="150" y="180" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="${isColorDark(book.coverColor || getColorForGenre(book.genre)) ? '#FFF' : '#000'}">
        ${book.title.substring(0, 20)}
      </text>
      <text x="150" y="220" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="${isColorDark(book.coverColor || getColorForGenre(book.genre)) ? '#FFF' : '#000'}">
        ${book.author}
      </text>
      <text x="150" y="360" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="${isColorDark(book.coverColor || getColorForGenre(book.genre)) ? '#FFF' : '#000'}">
        ${book.genre}
      </text>
    </svg>
  `;
  
  // Convert to base64 data URI
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
  initializeStore();
  loadBooks();
  loadCategories();
  loadAuthors();
  loadBookstores();
  startDealTimer();
  initializeAnimations();
  initializeSearch();
  animateHeroStats();
  createFloatingBubbles();
  initializeParticles();
});

// Initialize store
function initializeStore() {
  // Load saved cart and wishlist
  const savedCart = localStorage.getItem('cart');
  const savedWishlist = localStorage.getItem('wishlist');
  
  if (savedCart) cart = JSON.parse(savedCart);
  if (savedWishlist) wishlist = JSON.parse(savedWishlist);
  
  updateCartCount();
  updateWishlistCount();
  
  // Set theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// Load books into grids
function loadBooks() {
  const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
  const featuredCarousel = document.getElementById('featuredCarousel');
  const trendingGrid = document.getElementById('trendingBooksGrid');
  const newArrivalsGrid = document.getElementById('newArrivalsGrid');
  const bestsellersGrid = document.getElementById('bestsellersGrid');
  
  // Featured carousel - Extreme series and top textbooks
  if (featuredCarousel) {
    const featuredBooks = ethiopianContent.books.filter(b => b.badge === 'BESTSELLER' || b.badge === 'ESSENTIAL').slice(0, 5);
    featuredCarousel.innerHTML = featuredBooks.map(book => createBookCard(book, true)).join('');
  }
  
  // Trending books - Popular Extreme series
  if (trendingGrid) {
    const trendingBooks = ethiopianContent.books.filter(b => b.author === "Extreme Series Authors").slice(0, 4);
    trendingGrid.innerHTML = trendingBooks.map(book => createBookCard(book)).join('');
  }
  
  // New arrivals - Latest textbooks
  if (newArrivalsGrid) {
    const newBooks = ethiopianContent.books.filter(b => ['NEW', 'TRENDING'].includes(b.badge)).slice(0, 4);
    newArrivalsGrid.innerHTML = newBooks.map(book => createBookCard(book)).join('');
  }
  
  // Bestsellers - Most reviewed books
  if (bestsellersGrid) {
    const bestsellerBooks = [...ethiopianContent.books].sort((a, b) => b.reviews - a.reviews).slice(0, 4);
    bestsellersGrid.innerHTML = bestsellerBooks.map(book => createBookCard(book)).join('');
  }
  
  // Main grids - Mix of all books
  grids.forEach((gridId, index) => {
    const grid = document.getElementById(gridId);
    if (grid) {
      const startIdx = index * 3;
      const endIdx = startIdx + 3;
      const booksToShow = ethiopianContent.books.slice(startIdx, endIdx);
      grid.innerHTML = booksToShow.map(book => createBookCard(book)).join('');
    }
  });
}

// Create book card HTML
function createBookCard(book, isFeatured = false) {
  const author = ethiopianContent.authors.find(a => a.id === book.authorId);
  const bookstore = ethiopianContent.bookstores.find(b => b.id === book.bookstoreId);
  const coverUrl = getBookCoverUrl(book);
  
  return `
    <div class="book-card-modern ${isFeatured ? 'featured' : ''}" data-book-id="${book.id}">
      <div class="book-cover">
        ${book.badge ? `<div class="book-badge">${book.badge}</div>` : ''}
        <img src="${coverUrl}" alt="${book.title}" loading="lazy" onerror="this.src='${generateFallbackCover(book)}'">
        <div class="book-actions-quick">
          <button class="btn-quick-add" onclick="quickAddToCart(${book.id})" title="Add to Cart">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </button>
          <button class="btn-quick-wishlist" onclick="quickAddToWishlist(${book.id})" title="Add to Wishlist">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          </button>
          <button class="btn-quick-view" onclick="openQuickView(${book.id})" title="Quick View">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </button>
        </div>
      </div>
      <div class="book-info">
        <div class="book-category">${book.genre}</div>
        <h3 class="book-title">${book.title}</h3>
        <div class="book-author">
          by <a href="#" class="author-link" onclick="openAuthorModal(event, ${book.authorId})">${book.author}</a>
        </div>
        <div class="bookstore-info">
          <a href="#" class="bookstore-link" onclick="openBookstoreModal(event, ${book.bookstoreId})">${book.bookstore}</a>
        </div>
        <div class="book-footer">
          <div class="book-price">ETB ${book.price}</div>
          <div class="book-rating">
            ${'⭐'.repeat(Math.floor(book.rating))}
            <span>(${book.reviews})</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Load categories into sidebar
function loadCategories() {
  const sidebarContent = document.getElementById('sidebarContent');
  if (!sidebarContent) return;
  
  const categories = [
    {
      name: 'Educational Materials',
      icon: '📚',
      items: [
        { name: 'Extreme Series', icon: '🎯', count: 15, badge: 'hot' },
        { name: 'Grade 1-6 Textbooks', icon: '📖', count: 45 },
        { name: 'Grade 7-8 Textbooks', icon: '📘', count: 30 },
        { name: 'Grade 9-10 Textbooks', icon: '📙', count: 35 },
        { name: 'Grade 11-12 Textbooks', icon: '📕', count: 40, badge: 'new' },
        { name: 'Teacher Guides', icon: '👨‍🏫', count: 25 },
        { name: 'Reference Books', icon: '📑', count: 18 }
      ]
    },
    {
      name: 'Ethiopian Literature',
      icon: '🇪🇹',
      items: [
        { name: 'Classic Fiction', icon: '📚', count: 25 },
        { name: 'Contemporary Fiction', icon: '✨', count: 18 },
        { name: 'Poetry', icon: '🎭', count: 12 },
        { name: 'Drama', icon: '🎪', count: 8 },
        { name: 'Children\'s Books', icon: '🧸', count: 35 }
      ]
    },
    {
      name: 'By Subject',
      icon: '📐',
      items: [
        { name: 'Mathematics', icon: '🔢', count: 85, badge: 'hot' },
        { name: 'Physics', icon: '⚛️', count: 65 },
        { name: 'Chemistry', icon: '🧪', count: 60 },
        { name: 'Biology', icon: '🧬', count: 55 },
        { name: 'English', icon: '🔤', count: 70 },
        { name: 'Amharic', icon: '🇪🇹', count: 45 },
        { name: 'History', icon: '📜', count: 35 },
        { name: 'Geography', icon: '🌍', count: 30 }
      ]
    }
  ];
  
  let html = '';
  categories.forEach((category, idx) => {
    html += `
      <div class="category-group ${idx === 0 ? 'active' : ''}" data-category="${category.name}">
        <button class="category-header" onclick="toggleCategory(this)">
          <span class="category-icon">${category.icon}</span>
          <span>${category.name}</span>
          <svg class="category-arrow w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
        <div class="category-items">
          ${category.items.map(item => `
            <a href="#" class="category-item" onclick="filterBySubCategory('${item.name}')">
              <span class="item-icon">${item.icon}</span>
              <span>${item.name}</span>
              ${item.badge ? `<span class="item-badge ${item.badge}">${item.badge.toUpperCase()}</span>` : ''}
              <span class="item-count">${item.count}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  });
  
  sidebarContent.innerHTML = html;
}

// Load popular authors
function loadAuthors() {
  const authorsContainer = document.getElementById('popularAuthors');
  if (!authorsContainer) return;
  
  const popularAuthors = ethiopianContent.authors.slice(0, 5);
  
  authorsContainer.innerHTML = popularAuthors.map(author => `
    <div class="author-item-modern" onclick="openAuthorModal(event, ${author.id})">
      <img src="https://picsum.photos/seed/${author.image}/48/48" alt="${author.name}" class="author-avatar-modern">
      <div class="author-info-modern">
        <div class="author-name-modern">${author.name}</div>
        <div class="author-meta-modern">${author.books} books • ${author.followers.toLocaleString()} followers</div>
      </div>
      <button class="follow-btn-small" onclick="followAuthor(event, ${author.id})">Follow</button>
    </div>
  `).join('');
}

// Load popular bookstores
function loadBookstores() {
  const bookstoresContainer = document.getElementById('popularBookstores');
  if (!bookstoresContainer) return;
  
  const popularBookstores = ethiopianContent.bookstores.slice(0, 4);
  
  bookstoresContainer.innerHTML = popularBookstores.map(store => `
    <div class="bookstore-item-modern" onclick="openBookstoreModal(event, ${store.id})">
      <img src="https://picsum.photos/seed/store${store.id}/60/60" alt="${store.name}" class="bookstore-logo">
      <div class="bookstore-info-modern">
        <div class="bookstore-name-modern">${store.name}</div>
        <div class="bookstore-meta-modern">
          <div class="bookstore-rating">
            ${'⭐'.repeat(Math.floor(store.rating))}
            <span>${store.rating}</span>
          </div>
          <span>• ${store.books.toLocaleString()} books</span>
        </div>
      </div>
      <button class="view-store-btn-small" onclick="viewStore(event, ${store.id})">View</button>
    </div>
  `).join('');
}

// Quick View Modal
function openQuickView(bookId) {
  const book = ethiopianContent.books.find(b => b.id === bookId);
  if (!book) return;
  
  currentQuickViewBook = book;
  const modal = document.getElementById('quickViewModal');
  const author = ethiopianContent.authors.find(a => a.id === book.authorId);
  const bookstore = ethiopianContent.bookstores.find(b => b.id === book.bookstoreId);
  const coverUrl = getBookCoverUrl(book);
  
  // Update modal content
  const quickViewCover = document.getElementById('quickViewCover');
  quickViewCover.src = coverUrl;
  quickViewCover.onerror = function() { this.src = generateFallbackCover(book); };
  
  document.getElementById('quickViewTitle').textContent = book.title;
  document.getElementById('quickViewAuthor').textContent = book.author;
  document.getElementById('quickViewAuthor').setAttribute('onclick', `openAuthorModal(event, ${book.authorId})`);
  document.getElementById('quickViewBookstore').textContent = book.bookstore;
  document.getElementById('quickViewBookstore').setAttribute('onclick', `openBookstoreModal(event, ${book.bookstoreId})`);
  document.getElementById('quickViewPrice').textContent = `ETB ${book.price}`;
  document.getElementById('quickViewOriginalPrice').textContent = `ETB ${book.originalPrice}`;
  document.getElementById('quickViewDescription').textContent = book.description;
  document.getElementById('quickViewRating').textContent = `${book.rating} (${book.reviews} reviews)`;
  
  if (book.badge) {
    document.getElementById('quickViewBadge').textContent = book.badge;
    document.getElementById('quickViewBadge').style.display = 'inline-block';
  } else {
    document.getElementById('quickViewBadge').style.display = 'none';
  }
  
  // Load reviews
  loadReviews(bookId);
  
  // Load similar books
  loadSimilarBooks(book.category);
  
  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close Quick View Modal
function closeQuickView() {
  const modal = document.getElementById('quickViewModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
  currentQuickViewBook = null;
}

// Author Modal
function openAuthorModal(event, authorId) {
  event.preventDefault();
  event.stopPropagation();
  
  const author = ethiopianContent.authors.find(a => a.id === authorId);
  if (!author) return;
  
  const modal = document.getElementById('authorModal');
  
  // Update modal content
  document.getElementById('authorProfilePic').src = `https://picsum.photos/seed/${author.image}/120/120`;
  document.getElementById('authorName').textContent = author.name;
  document.getElementById('authorBio').textContent = author.bio;
  document.getElementById('authorRatingText').textContent = `${author.rating} out of 5`;
  
  // Load author's books
  const authorBooks = ethiopianContent.books.filter(b => b.authorId === authorId);
  const authorBooksGrid = document.getElementById('authorBooks');
  authorBooksGrid.innerHTML = authorBooks.slice(0, 6).map(book => `
    <div class="book-card-mini" onclick="openQuickView(${book.id})">
      <img src="https://picsum.photos/seed/${book.image}/150/200" alt="${book.title}">
    </div>
  `).join('');
  
  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close Author Modal
function closeAuthorModal() {
  const modal = document.getElementById('authorModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Bookstore Modal
function openBookstoreModal(event, bookstoreId) {
  event.preventDefault();
  event.stopPropagation();
  
  const bookstore = ethiopianContent.bookstores.find(b => b.id === bookstoreId);
  if (!bookstore) return;
  
  const modal = document.getElementById('bookstoreModal');
  
  // Update modal content
  document.getElementById('bookstoreProfilePic').src = `https://picsum.photos/seed/store${bookstore.id}/150/150`;
  document.getElementById('bookstoreName').textContent = bookstore.name;
  document.getElementById('bookstoreBio').textContent = bookstore.description;
  document.getElementById('bookstoreRatingText').textContent = `${bookstore.rating} (${bookstore.books}+ books)`;
  
  // Load bookstore's books
  const bookstoreBooks = ethiopianContent.books.filter(b => b.bookstoreId === bookstoreId);
  const bookstoreBooksGrid = document.getElementById('bookstoreBooks');
  bookstoreBooksGrid.innerHTML = bookstoreBooks.slice(0, 6).map(book => `
    <div class="book-card-mini" onclick="openQuickView(${book.id})">
      <img src="https://picsum.photos/seed/${book.image}/150/200" alt="${book.title}">
    </div>
  `).join('');
  
  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Close Bookstore Modal
function closeBookstoreModal() {
  const modal = document.getElementById('bookstoreModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Other essential functions...
// (The rest of the functions remain the same as in the original store.js)

// Cart functions
function quickAddToCart(bookId) {
  const book = ethiopianContent.books.find(b => b.id === bookId);
  if (!book) return;
  
  const existingItem = cart.find(item => item.id === bookId);
  
  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({ ...book, quantity: 1 });
  }
  
  updateCartCount();
  saveCart();
  showToast('Added to cart!', 'success');
}

function updateCartCount() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const cartCount = document.getElementById('cartCount');
  if (cartCount) cartCount.textContent = count;
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

// Wishlist functions
function quickAddToWishlist(bookId) {
  const book = ethiopianContent.books.find(b => b.id === bookId);
  if (!book) return;
  
  const exists = wishlist.find(item => item.id === bookId);
  
  if (!exists) {
    wishlist.push(book);
    updateWishlistCount();
    saveWishlist();
    showToast('Added to wishlist!', 'success');
  } else {
    showToast('Already in wishlist', 'info');
  }
}

function updateWishlistCount() {
  const wishlistCount = document.getElementById('wishlistCount');
  if (wishlistCount) wishlistCount.textContent = wishlist.length;
}

function saveWishlist() {
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

// Toast notification
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
    warning: '⚠'
  }[type];
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// Other UI functions
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

function sidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const menuTrigger = document.querySelector('.menu-trigger');
  
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
  menuTrigger.classList.toggle('active');
}

function toggleCategory(button) {
  const group = button.parentElement;
  group.classList.toggle('active');
}

function filterByGenre(genre) {
  currentCategory = genre;
  
  // Update active button
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-category') === genre) {
      btn.classList.add('active');
    }
  });
  
  // Filter books
  loadFilteredBooks(genre);
}

function loadFilteredBooks(genre) {
  let filteredBooks = ethiopianContent.books;
  
  if (genre !== 'all') {
    if (genre === 'trending') {
      filteredBooks = ethiopianContent.books.filter(b => b.badge === 'TRENDING' || b.badge === 'POPULAR');
    } else if (genre === 'new') {
      filteredBooks = ethiopianContent.books.filter(b => b.badge === 'NEW' || b.badge === 'NEW ARRIVAL');
    } else if (genre === 'bestseller') {
      filteredBooks = ethiopianContent.books.filter(b => b.badge === 'BESTSELLER');
    } else if (genre === 'deals') {
      filteredBooks = ethiopianContent.books.filter(b => b.originalPrice > b.price);
    } else if (genre === 'local') {
      filteredBooks = ethiopianContent.books.filter(b => b.authorId <= 10);
    } else {
      filteredBooks = ethiopianContent.books.filter(b => b.category === genre);
    }
  }
  
  // Update main grid
  const mainGrid = document.getElementById('booksGrid');
  if (mainGrid) {
    mainGrid.innerHTML = filteredBooks.slice(0, 6).map(book => createBookCard(book)).join('');
  }
}

// Deal timer
function startDealTimer() {
  const endTime = new Date();
  endTime.setHours(endTime.getHours() + 48);
  
  setInterval(() => {
    const now = new Date();
    const timeLeft = endTime - now;
    
    if (timeLeft > 0) {
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
      
      const hoursEl = document.getElementById('dealHours');
      const minutesEl = document.getElementById('dealMinutes');
      const secondsEl = document.getElementById('dealSeconds');
      
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
      if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
      if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }
  }, 1000);
}

// Initialize animations
function initializeAnimations() {
  // Scroll animations
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('mainNav');
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
}

// Search functionality
function initializeSearch() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(performSearch, 300));
  }
}

function performSearch(query) {
  if (!query || query.length < 2) {
    hideSuggestions();
    return;
  }
  
  // Search in books
  const results = ethiopianContent.books.filter(book => 
    book.title.toLowerCase().includes(query.toLowerCase()) ||
    book.author.toLowerCase().includes(query.toLowerCase()) ||
    book.genre.toLowerCase().includes(query.toLowerCase())
  );
  
  showSuggestions(results);
}

function showSuggestions(results) {
  const suggestionsEl = document.getElementById('searchSuggestions');
  if (!suggestionsEl) return;
  
  if (results.length === 0) {
    suggestionsEl.innerHTML = '<div class="suggestion-item">No results found</div>';
  } else {
    suggestionsEl.innerHTML = results.slice(0, 5).map(book => `
      <div class="suggestion-item" onclick="openQuickView(${book.id})">
        <div class="suggestion-icon">📚</div>
        <div class="suggestion-content">
          <div class="suggestion-title">${book.title}</div>
          <div class="suggestion-meta">${book.author} • ${book.genre}</div>
        </div>
        <div class="suggestion-badge">ETB ${book.price}</div>
      </div>
    `).join('');
  }
  
  suggestionsEl.classList.add('active');
}

function hideSuggestions() {
  const suggestionsEl = document.getElementById('searchSuggestions');
  if (suggestionsEl) {
    suggestionsEl.classList.remove('active');
  }
}

// Utility functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Hero animations
function animateHeroStats() {
  const stats = document.querySelectorAll('.stat-number-modern');
  stats.forEach(stat => {
    const target = parseInt(stat.getAttribute('data-count'));
    let current = 0;
    const increment = target / 100;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      stat.textContent = Math.floor(current).toLocaleString();
    }, 20);
  });
}

// Background animations
function createFloatingBubbles() {
  const container = document.getElementById('bubbleContainer');
  if (!container) return;
  
  for (let i = 0; i < 10; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'floating-bubble';
    bubble.style.width = Math.random() * 100 + 50 + 'px';
    bubble.style.height = bubble.style.width;
    bubble.style.left = Math.random() * 100 + '%';
    bubble.style.animationDelay = Math.random() * 15 + 's';
    bubble.style.animationDuration = Math.random() * 10 + 15 + 's';
    container.appendChild(bubble);
  }
}

function initializeParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const particles = [];
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 1,
      speedX: Math.random() * 2 - 1,
      speedY: Math.random() * 2 - 1
    });
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(particle => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      
      if (particle.x > canvas.width) particle.x = 0;
      if (particle.x < 0) particle.x = canvas.width;
      if (particle.y > canvas.height) particle.y = 0;
      if (particle.y < 0) particle.y = canvas.height;
      
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.5)';
      ctx.fill();
    });
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

// Additional UI functions
function toggleProfileMenu() {
  const dropdown = document.getElementById('profileDropdown');
  dropdown.classList.toggle('active');
}

function openCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  drawer.classList.add('active');
  loadCartItems();
}

function closeCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  drawer.classList.remove('active');
}

function openWishlistDrawer() {
  const drawer = document.getElementById('wishlistDrawer');
  drawer.classList.add('active');
  loadWishlistItems();
}

function closeWishlistDrawer() {
  const drawer = document.getElementById('wishlistDrawer');
  drawer.classList.remove('active');
}

function loadCartItems() {
  const cartContent = document.getElementById('cartContent');
  if (cart.length === 0) {
    cartContent.innerHTML = `
      <div class="cart-empty">
        <svg class="w-24 h-24 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
        </svg>
        <p class="text-center mt-4 text-gray-500">Your cart is empty</p>
      </div>
    `;
  } else {
    cartContent.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="https://picsum.photos/seed/${item.image}/80/100" alt="${item.title}" class="cart-item-image">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-author">${item.author}</div>
          <div class="cart-item-price">ETB ${item.price}</div>
          <div class="cart-item-actions">
            <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
            <span class="quantity-value">${item.quantity}</span>
            <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
            <button class="remove-btn" onclick="removeFromCart(${item.id})">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
  }
  
  updateCartSummary();
}

function updateCartSummary() {
  const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const shipping = subtotal > 0 ? 50 : 0;
  const total = subtotal + shipping;
  
  document.getElementById('cartSubtotal').textContent = `ETB ${subtotal}`;
  document.getElementById('cartShipping').textContent = `ETB ${shipping}`;
  document.getElementById('cartTotal').textContent = `ETB ${total}`;
}

function loadWishlistItems() {
  const wishlistContent = document.getElementById('wishlistContent');
  if (wishlist.length === 0) {
    wishlistContent.innerHTML = `
      <div class="wishlist-empty">
        <svg class="w-24 h-24 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
        </svg>
        <p class="text-center mt-4 text-gray-500">Your wishlist is empty</p>
      </div>
    `;
  } else {
    wishlistContent.innerHTML = wishlist.map(item => `
      <div class="wishlist-item">
        <img src="https://picsum.photos/seed/${item.image}/80/100" alt="${item.title}" class="cart-item-image">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-author">${item.author}</div>
          <div class="cart-item-price">ETB ${item.price}</div>
          <div class="cart-item-actions">
            <button class="btn-add-cart" onclick="moveToCart(${item.id})">Move to Cart</button>
            <button class="remove-btn" onclick="removeFromWishlist(${item.id})">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
  }
}

// FAB functions
function toggleFAB() {
  const fabMenu = document.getElementById('fabMenu');
  const fabMain = document.querySelector('.fab-main');
  fabMenu.classList.toggle('active');
  fabMain.classList.toggle('active');
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toggleFAB();
}

// Initialize everything
window.addEventListener('click', (e) => {
  // Close dropdowns when clicking outside
  if (!e.target.closest('.profile-menu-container')) {
    document.getElementById('profileDropdown')?.classList.remove('active');
  }
  
  if (!e.target.closest('.search-container-enhanced')) {
    hideSuggestions();
  }
});
