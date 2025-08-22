// ============================================
// ENHANCED NEWS PLATFORM JAVASCRIPT
// Modern, Interactive, Feature-Rich
// ============================================

// Global State Management
const NewsApp = {
    currentCategory: 'all',
    currentView: 'grid',
    articles: [],
    trendingTopics: [],
    liveUpdates: [],
    authors: [],
    savedArticles: new Set(),
    likedArticles: new Set(),
    theme: localStorage.getItem('theme') || 'light'
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadInitialContent();
    setupEventListeners();
    startLiveFeatures();
});

// ============================================
// INITIALIZATION
// ============================================

function initializeApp() {
    // Apply saved theme
    applyTheme(NewsApp.theme);
    
    // Initialize smooth scroll
    initSmoothScroll();
    
    // Setup intersection observers
    setupIntersectionObservers();
    
    // Initialize tooltips
    initTooltips();
    
    // Check for saved preferences
    loadUserPreferences();
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    NewsApp.theme = theme;
    
    // Update theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const sunIcon = themeToggle.querySelector('.sun-icon');
        const moonIcon = themeToggle.querySelector('.moon-icon');
        
        if (theme === 'dark') {
            sunIcon?.classList.add('hidden');
            moonIcon?.classList.remove('hidden');
        } else {
            sunIcon?.classList.remove('hidden');
            moonIcon?.classList.add('hidden');
        }
    }
}

function loadUserPreferences() {
    // Load saved articles
    const saved = localStorage.getItem('savedArticles');
    if (saved) {
        NewsApp.savedArticles = new Set(JSON.parse(saved));
    }
    
    // Load liked articles
    const liked = localStorage.getItem('likedArticles');
    if (liked) {
        NewsApp.likedArticles = new Set(JSON.parse(liked));
    }
}

// ============================================
// CONTENT LOADING
// ============================================

function loadInitialContent() {
    generateMockArticles();
    generateTrendingTopics();
    generateAuthors();
    generateLiveUpdates();
    
    renderNewsGrid();
    renderTrendingGrid();
    renderAuthors();
    renderLiveUpdates();
}

function generateMockArticles() {
    const categories = ['Education', 'Technology', 'Business', 'Science', 'Culture', 'Sports'];
    const titles = [
        'Breaking: Major Educational Reform Announced',
        'Tech Giants Invest in Ethiopian Startups',
        'New Study Reveals Learning Patterns in Digital Age',
        'Local Students Win International Competition',
        'Government Launches Digital Literacy Program',
        'University Partnership Creates Job Opportunities',
        'AI Revolution Transforms Traditional Teaching',
        'Record Number of Scholarships Awarded This Year'
    ];
    
    NewsApp.articles = Array.from({ length: 20 }, (_, i) => ({
        id: `article-${i}`,
        title: titles[i % titles.length],
        category: categories[i % categories.length],
        excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        author: {
            name: `Author ${i % 5 + 1}`,
            avatar: `https://i.pravatar.cc/150?img=${i % 5 + 1}`
        },
        image: `https://picsum.photos/400/250?random=${i}`,
        time: `${Math.floor(Math.random() * 12) + 1} hours ago`,
        reads: `${(Math.random() * 20).toFixed(1)}k`,
        content: generateArticleContent()
    }));
}

function generateArticleContent() {
    return `
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        
        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
        
        <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
        
        <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>
    `;
}

function generateTrendingTopics() {
    const topics = [
        { title: 'Digital Education Summit 2025', reads: '45.2k', trend: 'up' },
        { title: 'New Curriculum Standards', reads: '38.7k', trend: 'up' },
        { title: 'Student Mental Health Initiative', reads: '31.5k', trend: 'stable' },
        { title: 'Tech Skills for Tomorrow', reads: '28.9k', trend: 'up' },
        { title: 'Education Budget Analysis', reads: '24.3k', trend: 'down' },
        { title: 'Remote Learning Evolution', reads: '22.1k', trend: 'up' }
    ];
    
    NewsApp.trendingTopics = topics.map((topic, i) => ({
        ...topic,
        id: `trending-${i}`,
        number: i + 1
    }));
}

function generateAuthors() {
    NewsApp.authors = [
        { id: 1, name: 'Sarah Ahmed', articles: 142, avatar: 'https://i.pravatar.cc/150?img=1' },
        { id: 2, name: 'John Tadesse', articles: 98, avatar: 'https://i.pravatar.cc/150?img=2' },
        { id: 3, name: 'Maria Bekele', articles: 87, avatar: 'https://i.pravatar.cc/150?img=3' },
        { id: 4, name: 'Daniel Haile', articles: 76, avatar: 'https://i.pravatar.cc/150?img=4' },
        { id: 5, name: 'Ruth Mekonnen', articles: 65, avatar: 'https://i.pravatar.cc/150?img=5' }
    ];
}

function generateLiveUpdates() {
    const updates = [
        'Breaking: Minister announces new education policy',
        'Update: Tech conference registration now open',
        'Flash: Student protests peaceful in capital',
        'Alert: Scholarship deadline extended to next week',
        'News: International delegation visits local schools'
    ];
    
    NewsApp.liveUpdates = updates.map((text, i) => ({
        id: `live-${i}`,
        text,
        time: `${Math.floor(Math.random() * 59) + 1} min ago`
    }));
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

function renderNewsGrid() {
    const grid = document.getElementById('news-grid');
    if (!grid) return;
    
    const filteredArticles = NewsApp.currentCategory === 'all' 
        ? NewsApp.articles 
        : NewsApp.articles.filter(a => a.category.toLowerCase() === NewsApp.currentCategory);
    
    grid.innerHTML = filteredArticles.map(article => createNewsCard(article)).join('');
    
    // Add animation delay
    grid.querySelectorAll('.news-card').forEach((card, i) => {
        card.style.animationDelay = `${i * 0.1}s`;
    });
}

function createNewsCard(article) {
    const isSaved = NewsApp.savedArticles.has(article.id);
    const isLiked = NewsApp.likedArticles.has(article.id);
    
    return `
        <div class="news-card" data-id="${article.id}">
            <img src="${article.image}" alt="${article.title}" class="news-image" loading="lazy">
            <div class="news-body">
                <span class="news-category">${article.category}</span>
                <h3 class="news-title">${article.title}</h3>
                <p class="news-excerpt">${article.excerpt}</p>
                <div class="news-footer">
                    <div class="news-author">
                        <img src="${article.author.avatar}" alt="${article.author.name}" class="author-avatar">
                        <span class="author-name">${article.author.name}</span>
                    </div>
                    <span class="news-time">${article.time}</span>
                </div>
            </div>
        </div>
    `;
}

function renderTrendingGrid() {
    const grid = document.getElementById('trending-grid');
    if (!grid) return;
    
    grid.innerHTML = NewsApp.trendingTopics.map(topic => `
        <div class="trending-card" data-id="${topic.id}">
            <div class="trending-number">#${topic.number}</div>
            <h4 class="trending-title">${topic.title}</h4>
            <div class="trending-meta">
                <span>${topic.reads} reads</span>
                <span class="trend-indicator ${topic.trend}">
                    ${topic.trend === 'up' ? '↑' : topic.trend === 'down' ? '↓' : '→'}
                </span>
            </div>
        </div>
    `).join('');
}

function renderAuthors() {
    const list = document.getElementById('authors-list');
    if (!list) return;
    
    list.innerHTML = NewsApp.authors.map(author => `
        <div class="author-item" data-id="${author.id}">
            <img src="${author.avatar}" alt="${author.name}" class="author-avatar-lg">
            <div class="author-info">
                <div class="author-name-full">${author.name}</div>
                <div class="author-articles">${author.articles} articles</div>
            </div>
            <button class="author-follow" data-id="${author.id}">Follow</button>
        </div>
    `).join('');
}

function renderLiveUpdates() {
    const feed = document.getElementById('live-feed');
    if (!feed) return;
    
    feed.innerHTML = NewsApp.liveUpdates.map(update => `
        <div class="live-item">
            <div class="live-time">${update.time}</div>
            <div class="live-text">${update.text}</div>
        </div>
    `).join('');
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Theme Toggle
    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
    
    // Menu Toggle for Sidebar
    document.getElementById('menu-toggle')?.addEventListener('click', openSidebar);
    
    // Sidebar Controls
    document.getElementById('sidebar-overlay')?.addEventListener('click', closeSidebar);
    document.getElementById('sidebar-close')?.addEventListener('click', closeSidebar);
    
    // Notification Button
    document.getElementById('notification-btn')?.addEventListener('click', openNotificationModal);
    
    // Notification Modal Controls
    document.getElementById('notification-backdrop')?.addEventListener('click', closeNotificationModal);
    document.getElementById('notification-close')?.addEventListener('click', closeNotificationModal);
    
    // Notification Tabs
    document.querySelectorAll('.notification-tab').forEach(tab => {
        tab.addEventListener('click', handleNotificationTab);
    });
    
    // Mark All Read
    document.querySelector('.mark-all-read')?.addEventListener('click', markAllNotificationsRead);
    
    // Category Navigation
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', handleCategoryChange);
    });
    
    // View Options
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', handleViewChange);
    });
    
    // News Card Clicks
    document.getElementById('news-grid')?.addEventListener('click', handleNewsCardClick);
    
    // Load More
    document.getElementById('load-more')?.addEventListener('click', handleLoadMore);
    
    // Newsletter Form
    document.getElementById('newsletter-form')?.addEventListener('submit', handleNewsletterSubmit);
    
    // Modal Controls
    document.getElementById('modal-backdrop')?.addEventListener('click', closeArticleModal);
    document.getElementById('modal-close')?.addEventListener('click', closeArticleModal);
    
    // Article Actions
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', handleArticleAction);
    });
    
    // Scroll to Top
    document.getElementById('scroll-top')?.addEventListener('click', scrollToTop);
    
    // Window Events
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    
    // Search
    setupSearch();
    
    // Poll Options
    document.querySelectorAll('.poll-option').forEach(btn => {
        btn.addEventListener('click', handlePollVote);
    });
    
    // Main Navigation Links
    setupMainNavigation();
}

function toggleTheme() {
    const newTheme = NewsApp.theme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    showToast('Theme changed', 'info');
}

function handleCategoryChange(e) {
    // Update active state
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Update category
    NewsApp.currentCategory = e.target.dataset.category;
    
    // Re-render news grid
    renderNewsGrid();
    
    // Smooth scroll to news section
    document.querySelector('.latest-section')?.scrollIntoView({ behavior: 'smooth' });
}

function handleViewChange(e) {
    // Update active state
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.closest('.view-btn').classList.add('active');
    
    // Update view
    NewsApp.currentView = e.target.closest('.view-btn').dataset.view;
    
    // Update grid class
    const grid = document.getElementById('news-grid');
    if (grid) {
        grid.className = NewsApp.currentView === 'list' ? 'news-list' : 'news-grid';
    }
}

function handleNewsCardClick(e) {
    const card = e.target.closest('.news-card');
    if (!card) return;
    
    const articleId = card.dataset.id;
    const article = NewsApp.articles.find(a => a.id === articleId);
    
    if (article) {
        openArticleModal(article);
    }
}

function handleLoadMore() {
    const btn = document.getElementById('load-more');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    
    // Show loader
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    
    // Simulate loading
    setTimeout(() => {
        // Generate more articles
        const newArticles = generateMoreArticles();
        NewsApp.articles.push(...newArticles);
        
        // Render new articles
        const grid = document.getElementById('news-grid');
        const newCards = newArticles.map(article => createNewsCard(article)).join('');
        grid.insertAdjacentHTML('beforeend', newCards);
        
        // Reset button
        btnText.classList.remove('hidden');
        btnLoader.classList.add('hidden');
        
        showToast('More articles loaded', 'success');
    }, 1500);
}

function generateMoreArticles() {
    const startIndex = NewsApp.articles.length;
    return Array.from({ length: 8 }, (_, i) => ({
        id: `article-${startIndex + i}`,
        title: `New Article ${startIndex + i + 1}`,
        category: ['Education', 'Technology', 'Business'][i % 3],
        excerpt: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        author: {
            name: `Author ${(startIndex + i) % 5 + 1}`,
            avatar: `https://i.pravatar.cc/150?img=${(startIndex + i) % 5 + 1}`
        },
        image: `https://picsum.photos/400/250?random=${startIndex + i}`,
        time: `${Math.floor(Math.random() * 24) + 1} hours ago`,
        reads: `${(Math.random() * 10).toFixed(1)}k`,
        content: generateArticleContent()
    }));
}

function handleNewsletterSubmit(e) {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    
    // Simulate subscription
    setTimeout(() => {
        showToast('Successfully subscribed to newsletter!', 'success');
        e.target.reset();
    }, 500);
}

function handleArticleAction(e) {
    const btn = e.currentTarget;
    const action = btn.classList[1].replace('-btn', '');
    
    switch(action) {
        case 'like':
            toggleLike(btn);
            break;
        case 'share':
            shareArticle();
            break;
        case 'bookmark':
            toggleBookmark(btn);
            break;
        case 'comment':
            openComments();
            break;
    }
}

function toggleLike(btn) {
    btn.classList.toggle('active');
    const isLiked = btn.classList.contains('active');
    showToast(isLiked ? 'Article liked!' : 'Like removed', 'info');
}

function toggleBookmark(btn) {
    btn.classList.toggle('active');
    const isSaved = btn.classList.contains('active');
    showToast(isSaved ? 'Article saved!' : 'Article removed from saved', 'info');
}

function shareArticle() {
    if (navigator.share) {
        navigator.share({
            title: 'Check out this article',
            text: 'Interesting article from ASTEGNI News',
            url: window.location.href
        });
    } else {
        // Copy to clipboard
        navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!', 'success');
    }
}

function openComments() {
    showToast('Comments feature coming soon!', 'info');
}

function handlePollVote(e) {
    const option = e.currentTarget;
    const vote = option.dataset.vote;
    
    // Update UI
    document.querySelectorAll('.poll-option').forEach(opt => {
        opt.style.pointerEvents = 'none';
        opt.style.opacity = '0.7';
    });
    
    option.style.opacity = '1';
    showToast('Vote recorded!', 'success');
}

// ============================================
// SIDEBAR FUNCTIONS
// ============================================

function openSidebar() {
    const sidebar = document.getElementById('sidebar-menu');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Animate sidebar links
    const links = sidebar.querySelectorAll('.sidebar-link');
    links.forEach((link, i) => {
        link.style.animation = 'none';
        setTimeout(() => {
            link.style.animation = `slideInLeft 0.5s ease backwards`;
            link.style.animationDelay = `${i * 0.05}s`;
        }, 10);
    });
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar-menu');
    const overlay = document.getElementById('sidebar-overlay');
    
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// MAIN NAVIGATION SETUP
// ============================================

function setupMainNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const linkText = link.querySelector('span').textContent;
            
            switch(linkText) {
                case 'Home':
                    // Scroll to top or navigate to home
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    showToast('Welcome to ASTEGNI News!', 'info');
                    break;
                    
                case 'Find Tutors':
                    e.preventDefault();
                    showToast('Find Tutors feature coming soon!', 'info');
                    openFindTutorsModal();
                    break;
                    
                case 'Reels':
                    e.preventDefault();
                    showToast('Reels section launching soon!', 'info');
                    openReelsSection();
                    break;
                    
                case 'Store':
                    e.preventDefault();
                    showToast('Store opening soon!', 'info');
                    openStoreModal();
                    break;
                    
                case 'Find Jobs':
                    e.preventDefault();
                    showToast('Job portal launching soon!', 'info');
                    openJobsModal();
                    break;
            }
        });
    });
}

// Placeholder functions for future features
function openFindTutorsModal() {
    // Future implementation for Find Tutors
    console.log('Opening Find Tutors modal...');
}

function openReelsSection() {
    // Future implementation for Reels
    console.log('Opening Reels section...');
}

function openStoreModal() {
    // Future implementation for Store
    console.log('Opening Store modal...');
}

function openJobsModal() {
    // Future implementation for Find Jobs
    console.log('Opening Jobs modal...');
}

// ============================================
// NOTIFICATION MODAL FUNCTIONS
// ============================================

function openNotificationModal() {
    const modal = document.getElementById('notification-modal');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Animate notification items
    const items = modal.querySelectorAll('.notification-item');
    items.forEach((item, i) => {
        item.style.animation = 'none';
        setTimeout(() => {
            item.style.animation = `notificationItemSlide 0.5s ease backwards`;
            item.style.animationDelay = `${i * 0.1}s`;
        }, 10);
    });
    
    // Update notification count
    updateNotificationCount();
}

function closeNotificationModal() {
    const modal = document.getElementById('notification-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

function handleNotificationTab(e) {
    // Update active tab
    document.querySelectorAll('.notification-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    e.target.classList.add('active');
    
    const tabType = e.target.dataset.tab;
    filterNotifications(tabType);
}

function filterNotifications(type) {
    const items = document.querySelectorAll('.notification-item');
    
    items.forEach(item => {
        if (type === 'all') {
            item.style.display = 'flex';
        } else if (type === 'unread') {
            item.style.display = item.classList.contains('unread') ? 'flex' : 'none';
        } else {
            // For other filters, show random items for demo
            item.style.display = Math.random() > 0.5 ? 'flex' : 'none';
        }
    });
}

function markAllNotificationsRead() {
    const items = document.querySelectorAll('.notification-item.unread');
    items.forEach(item => {
        item.classList.remove('unread');
        const dot = item.querySelector('.notification-dot');
        if (dot) {
            dot.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => dot.remove(), 300);
        }
    });
    
    // Update notification count
    document.querySelector('.notification-count').textContent = '0';
    showToast('All notifications marked as read', 'success');
}

function updateNotificationCount() {
    const unreadCount = document.querySelectorAll('.notification-item.unread').length;
    const countElement = document.querySelector('.notification-count');
    if (countElement) {
        countElement.textContent = unreadCount;
        if (unreadCount === 0) {
            countElement.style.display = 'none';
        } else {
            countElement.style.display = 'flex';
        }
    }
}

// ============================================
// MODAL FUNCTIONS WITH TYPEWRITER EFFECT
// ============================================

function openArticleModal(article) {
    const modal = document.getElementById('article-modal');
    const content = document.getElementById('modal-content');
    
    // Create content with typewriter effect
    content.innerHTML = `
        <img src="${article.image}" alt="${article.title}" class="article-hero">
        <div class="article-header">
            <span class="article-category">${article.category}</span>
            <h1 class="article-title article-title-animated">
                <span class="typewriter-text">${article.title}</span>
                <span class="cursor-blink"></span>
            </h1>
            <div class="article-meta">
                <div class="article-author">
                    <img src="${article.author.avatar}" alt="${article.author.name}" class="author-avatar">
                    <span>${article.author.name}</span>
                </div>
                <span>${article.time}</span>
                <span>${article.reads} reads</span>
            </div>
        </div>
        <div class="article-body typewriter-effect">
            ${article.content}
        </div>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Start typewriter animation
    startTypewriterAnimation(content);
}

function startTypewriterAnimation(container) {
    const title = container.querySelector('.typewriter-text');
    const cursor = container.querySelector('.cursor-blink');
    const paragraphs = container.querySelectorAll('.article-body p');
    
    if (title) {
        const text = title.textContent;
        title.textContent = '';
        title.style.display = 'inline-block';
        
        // Add cursor style
        if (cursor) {
            cursor.style.display = 'inline-block';
            cursor.style.width = '3px';
            cursor.style.height = '1.2em';
            cursor.style.backgroundColor = 'var(--button-bg)';
            cursor.style.animation = 'typewriterCursor 0.7s step-end infinite';
            cursor.style.marginLeft = '2px';
        }
        
        // Type out title character by character
        let charIndex = 0;
        const typeInterval = setInterval(() => {
            if (charIndex < text.length) {
                title.textContent += text[charIndex];
                charIndex++;
            } else {
                clearInterval(typeInterval);
                // Keep cursor blinking after typing is done
                setTimeout(() => {
                    if (cursor) {
                        cursor.style.animation = 'typewriterCursor 0.7s step-end infinite';
                    }
                }, 100);
            }
        }, 50); // Adjust speed here (lower = faster)
    }
    
    // Animate paragraphs
    paragraphs.forEach((p, index) => {
        p.style.opacity = '0';
        p.style.animation = `fadeInParagraph 0.5s ease forwards`;
        p.style.animationDelay = `${1.5 + (index * 0.3)}s`;
    });
}

// Add CSS for cursor
const style = document.createElement('style');
style.textContent = `
    .cursor-blink {
        display: inline-block;
        width: 3px;
        height: 1.2em;
        background-color: var(--button-bg);
        animation: typewriterCursor 0.7s step-end infinite;
        margin-left: 2px;
        vertical-align: text-bottom;
    }
    
    @keyframes typewriterCursor {
        0%, 50% {
            opacity: 1;
        }
        51%, 100% {
            opacity: 0;
        }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);

function closeArticleModal() {
    const modal = document.getElementById('article-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// SEARCH FUNCTIONALITY - LIVE SEARCH
// ============================================

function setupSearch() {
    const searchInput = document.getElementById('nav-search');
    const suggestions = document.getElementById('search-suggestions');
    
    if (!searchInput || !suggestions) return;
    
    let searchTimeout;
    let currentSearchTerm = '';
    
    // Sample search data (in real app, this would come from API)
    const searchDatabase = {
        articles: NewsApp.articles,
        authors: NewsApp.authors,
        categories: ['Education', 'Technology', 'Business', 'Science', 'Culture', 'Sports'],
        trending: NewsApp.trendingTopics
    };
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        currentSearchTerm = query;
        
        if (query.length > 0) {
            // Show loading state
            showSearchLoading(suggestions);
            
            // Simulate API delay
            searchTimeout = setTimeout(() => {
                performLiveSearch(query, suggestions, searchDatabase);
            }, 300);
        } else {
            hideSearchSuggestions(suggestions);
        }
    });
    
    searchInput.addEventListener('focus', (e) => {
        if (e.target.value.trim().length > 0) {
            suggestions.classList.add('active');
        }
    });
    
    searchInput.addEventListener('blur', () => {
        setTimeout(() => hideSearchSuggestions(suggestions), 200);
    });
    
    // Handle search on Enter key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = e.target.value.trim();
            if (query) {
                performFullSearch(query);
            }
        }
    });
    
    // Handle search button click
    document.querySelector('.search-btn')?.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (query) {
            performFullSearch(query);
        }
    });
}

function showSearchLoading(container) {
    container.innerHTML = `
        <div class="search-loading">
            <div class="search-spinner"></div>
            <p>Searching...</p>
        </div>
    `;
    container.classList.add('active');
}

function performLiveSearch(query, container, database) {
    const results = {
        articles: [],
        authors: [],
        categories: [],
        trending: []
    };
    
    const queryLower = query.toLowerCase();
    
    // Search articles
    results.articles = database.articles.filter(article => 
        article.title.toLowerCase().includes(queryLower) ||
        article.category.toLowerCase().includes(queryLower) ||
        article.excerpt.toLowerCase().includes(queryLower)
    ).slice(0, 3);
    
    // Search authors
    results.authors = database.authors.filter(author =>
        author.name.toLowerCase().includes(queryLower)
    ).slice(0, 2);
    
    // Search categories
    results.categories = database.categories.filter(cat =>
        cat.toLowerCase().includes(queryLower)
    );
    
    // Search trending
    results.trending = database.trending.filter(topic =>
        topic.title.toLowerCase().includes(queryLower)
    ).slice(0, 2);
    
    displaySearchResults(results, container, query);
}

function displaySearchResults(results, container, query) {
    let html = '';
    const hasResults = results.articles.length > 0 || results.authors.length > 0 || 
                      results.categories.length > 0 || results.trending.length > 0;
    
    if (!hasResults) {
        html = `
            <div class="search-no-results">
                <div class="search-no-results-icon">🔍</div>
                <h3>No results found</h3>
                <p>Try searching for different keywords</p>
            </div>
        `;
    } else {
        // Articles section
        if (results.articles.length > 0) {
            html += `
                <div class="search-section">
                    <div class="search-section-title">Articles</div>
                    ${results.articles.map(article => `
                        <div class="suggestion-item" data-type="article" data-id="${article.id}">
                            <div class="suggestion-icon">
                                <img src="${article.image}" alt="${article.title}">
                            </div>
                            <div class="suggestion-content">
                                <div class="suggestion-title">${highlightMatch(article.title, query)}</div>
                                <div class="suggestion-meta">
                                    <span class="suggestion-category">${article.category}</span>
                                    <span>${article.time}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Authors section
        if (results.authors.length > 0) {
            html += `
                <div class="search-section">
                    <div class="search-section-title">Authors</div>
                    ${results.authors.map(author => `
                        <div class="suggestion-item" data-type="author" data-id="${author.id}">
                            <div class="suggestion-icon">
                                <img src="${author.avatar}" alt="${author.name}">
                            </div>
                            <div class="suggestion-content">
                                <div class="suggestion-title">${highlightMatch(author.name, query)}</div>
                                <div class="suggestion-meta">
                                    <span>${author.articles} articles</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Categories section
        if (results.categories.length > 0) {
            html += `
                <div class="search-section">
                    <div class="search-section-title">Categories</div>
                    ${results.categories.map(category => `
                        <div class="suggestion-item" data-type="category" data-id="${category}">
                            <div class="suggestion-icon">
                                <span style="font-size: 1.5rem;">📂</span>
                            </div>
                            <div class="suggestion-content">
                                <div class="suggestion-title">${highlightMatch(category, query)}</div>
                                <div class="suggestion-meta">
                                    <span>View all ${category} articles</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        // Trending section
        if (results.trending.length > 0) {
            html += `
                <div class="search-section">
                    <div class="search-section-title">Trending Topics</div>
                    ${results.trending.map(topic => `
                        <div class="suggestion-item" data-type="trending" data-id="${topic.id}">
                            <div class="suggestion-icon">
                                <span style="font-size: 1.5rem;">🔥</span>
                            </div>
                            <div class="suggestion-content">
                                <div class="suggestion-title">${highlightMatch(topic.title, query)}</div>
                                <div class="suggestion-meta">
                                    <span>${topic.reads} reads</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }
    
    container.innerHTML = html;
    container.classList.add('active');
    
    // Add click handlers to results
    container.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => handleSearchResultClick(item));
    });
}

function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function handleSearchResultClick(item) {
    const type = item.dataset.type;
    const id = item.dataset.id;
    
    switch(type) {
        case 'article':
            const article = NewsApp.articles.find(a => a.id === id);
            if (article) {
                openArticleModal(article);
            }
            break;
            
        case 'author':
            showToast(`Viewing author profile: ${id}`, 'info');
            break;
            
        case 'category':
            // Filter news by category
            NewsApp.currentCategory = id.toLowerCase();
            renderNewsGrid();
            document.querySelector('.latest-section')?.scrollIntoView({ behavior: 'smooth' });
            showToast(`Showing ${id} articles`, 'success');
            break;
            
        case 'trending':
            showToast(`Opening trending topic: ${id}`, 'info');
            break;
    }
    
    // Clear search and close suggestions
    document.getElementById('nav-search').value = '';
    hideSearchSuggestions(document.getElementById('search-suggestions'));
}

function performFullSearch(query) {
    showToast(`Searching for: "${query}"`, 'info');
    // In a real app, this would navigate to a search results page
    // For now, we'll filter the news grid
    const filteredArticles = NewsApp.articles.filter(article =>
        article.title.toLowerCase().includes(query.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(query.toLowerCase()) ||
        article.category.toLowerCase().includes(query.toLowerCase())
    );
    
    if (filteredArticles.length > 0) {
        // Update the news grid with search results
        const grid = document.getElementById('news-grid');
        if (grid) {
            grid.innerHTML = filteredArticles.map(article => createNewsCard(article)).join('');
            document.querySelector('.latest-section')?.scrollIntoView({ behavior: 'smooth' });
            showToast(`Found ${filteredArticles.length} results for "${query}"`, 'success');
        }
    } else {
        showToast('No results found. Try different keywords.', 'error');
    }
}

function hideSearchSuggestions(container) {
    container.classList.remove('active');
    setTimeout(() => {
        container.innerHTML = '';
    }, 300);
}

// ============================================
// LIVE FEATURES
// ============================================

function startLiveFeatures() {
    // Update live feed every 30 seconds
    setInterval(updateLiveFeed, 30000);
    
    // Update trending topics every minute
    setInterval(updateTrendingTopics, 60000);
    
    // Rotate ticker items
    startTickerAnimation();
}

function updateLiveFeed() {
    const updates = [
        'Latest: New research grant announced',
        'Update: Student enrollment hits record high',
        'Breaking: Tech company partners with local university',
        'Flash: Online course registrations now open'
    ];
    
    const newUpdate = {
        id: `live-${Date.now()}`,
        text: updates[Math.floor(Math.random() * updates.length)],
        time: 'Just now'
    };
    
    NewsApp.liveUpdates.unshift(newUpdate);
    NewsApp.liveUpdates = NewsApp.liveUpdates.slice(0, 5);
    
    renderLiveUpdates();
    
    // Animate new item
    const feed = document.getElementById('live-feed');
    if (feed) {
        const firstItem = feed.querySelector('.live-item');
        if (firstItem) {
            firstItem.style.animation = 'slideInLeft 0.5s ease';
        }
    }
}

function updateTrendingTopics() {
    // Simulate trending changes
    NewsApp.trendingTopics.forEach(topic => {
        const change = Math.random();
        if (change < 0.3) {
            topic.trend = 'up';
            topic.reads = `${(parseFloat(topic.reads) + Math.random() * 5).toFixed(1)}k`;
        } else if (change < 0.6) {
            topic.trend = 'stable';
        } else {
            topic.trend = 'down';
            topic.reads = `${Math.max(10, parseFloat(topic.reads) - Math.random() * 2).toFixed(1)}k`;
        }
    });
    
    renderTrendingGrid();
}

function startTickerAnimation() {
    const ticker = document.getElementById('ticker-items');
    if (!ticker) return;
    
    // Clone items for seamless loop
    const items = ticker.innerHTML;
    ticker.innerHTML = items + items;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function initSmoothScroll() {
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

function setupIntersectionObservers() {
    // Animate elements on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.news-card, .trending-card, .feature-card').forEach(el => {
        observer.observe(el);
    });
}

function initTooltips() {
    // Simple tooltip implementation
    document.querySelectorAll('[data-tooltip]').forEach(el => {
        el.addEventListener('mouseenter', showTooltip);
        el.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(e) {
    const text = e.target.dataset.tooltip;
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);
    
    const rect = e.target.getBoundingClientRect();
    tooltip.style.top = `${rect.top - 40}px`;
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
}

function hideTooltip() {
    document.querySelectorAll('.tooltip').forEach(t => t.remove());
}

function handleScroll() {
    // Show/hide scroll to top button
    const scrollBtn = document.getElementById('scroll-top');
    if (scrollBtn) {
        if (window.scrollY > 500) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    }
    
    // Parallax effect for hero
    const hero = document.querySelector('.featured-main');
    if (hero) {
        const scrolled = window.scrollY;
        hero.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
}

function handleResize() {
    // Adjust layout for mobile
    if (window.innerWidth < 768) {
        NewsApp.currentView = 'list';
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ============================================
// ADVANCED FEATURES
// ============================================

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Press '/' to focus search
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.getElementById('nav-search')?.focus();
    }
    
    // Press 'Escape' to close modal
    if (e.key === 'Escape') {
        closeArticleModal();
    }
    
    // Press 'T' to toggle theme
    if (e.key === 't' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
        toggleTheme();
    }
});

// PWA Support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Service worker registration failed
        });
    });
}

// Export for debugging
window.NewsApp = NewsApp;