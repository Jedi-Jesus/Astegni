// ============================================
// ASTEGNI BOOKSTORE - CLEANED JAVASCRIPT
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
  currentPage: 1,
  itemsPerPage: 12,
  isLoading: false,
  currentBook: null,
  viewMode: 'grid'
};

// ============================================
// ETHIOPIAN CONTENT DATABASE
// ============================================
const ethiopianContent = {
  authors: [
    { id: 1, name: "Haddis Alemayehu", bio: "Legendary Ethiopian author, best known for 'Fikir Eske Mekabir'", image: "haddis", books: 12, rating: 4.9, followers: 15000 },
    { id: 2, name: "Bealu Girma", bio: "Prominent Ethiopian journalist and author", image: "bealu", books: 8, rating: 4.8, followers: 12000 },
    { id: 3, name: "Tsegaye Gabre-Medhin", bio: "Ethiopia's poet laureate and playwright", image: "tsegaye", books: 15, rating: 4.9, followers: 18000 },
    { id: 4, name: "Maaza Mengiste", bio: "Contemporary Ethiopian-American author", image: "maaza", books: 3, rating: 4.7, followers: 25000 },
    { id: 5, name: "Dinaw Mengestu", bio: "Ethiopian-American novelist", image: "dinaw", books: 4, rating: 4.6, followers: 20000 },
    { id: 6, name: "Extreme Series Authors", bio: "Team of Ethiopian educators", image: "extreme", books: 50, rating: 4.9, followers: 50000 },
    { id: 7, name: "Ministry of Education Ethiopia", bio: "Official educational content provider", image: "moe", books: 200, rating: 4.7, followers: 100000 }
  ],
  
  bookstores: [
    { id: 1, name: "BookWorld Ethiopia", location: "Bole, Addis Ababa", rating: 4.8, reviews: 523, books: 5000, logo: "store1", description: "Ethiopia's largest bookstore chain" },
    { id: 2, name: "Mega Books Store", location: "Piazza, Addis Ababa", rating: 4.7, reviews: 312, books: 3500, logo: "store2", description: "Historic bookstore since 1960" },
    { id: 3, name: "Unity Books & Café", location: "Kazanchis, Addis Ababa", rating: 4.9, reviews: 678, books: 2800, logo: "store3", description: "Modern bookstore with café" },
    { id: 4, name: "Academic Book Center", location: "6 Kilo, Addis Ababa", rating: 4.9, reviews: 445, books: 4500, logo: "store4", description: "Complete educational materials" },
    { id: 5, name: "Shama Books", location: "Mexico Square, Addis Ababa", rating: 4.6, reviews: 289, books: 4200, logo: "store5", description: "Publisher and bookstore" }
  ],
  
  books: [
    // Extreme Series
    { id: 1, title: "Extreme Mathematics Grade 12", author: "Extreme Series Authors", authorId: 6, price: 450, originalPrice: 550, category: "academics", genre: "Educational", rating: 4.9, reviews: 3250, image: "extreme-math-12", bookstoreId: 4, badge: "BESTSELLER", description: "Comprehensive mathematics preparation for Ethiopian University Entrance Exam." },
    { id: 2, title: "Extreme Physics Grade 12", author: "Extreme Series Authors", authorId: 6, price: 420, originalPrice: 520, category: "academics", genre: "Educational", rating: 4.8, reviews: 2890, image: "extreme-physics-12", bookstoreId: 4, badge: "TOP RATED", description: "Complete physics review with solved problems." },
    { id: 3, title: "Extreme Chemistry Grade 12", author: "Extreme Series Authors", authorId: 6, price: 430, originalPrice: 530, category: "academics", genre: "Educational", rating: 4.9, reviews: 2750, image: "extreme-chem-12", bookstoreId: 1, badge: "ESSENTIAL", description: "In-depth chemistry preparation." },
    // Add more books as needed
  ],
  
  categories: [
    {
      id: 'educational',
      name: 'Educational Materials',
      icon: '📚',
      subcategories: [
        { id: 'extreme', name: 'Extreme Series', icon: '🎯', count: 15, badge: 'hot' },
        { id: 'textbooks', name: 'Textbooks', icon: '📖', count: 200 },
        { id: 'teacher-guides', name: 'Teacher Guides', icon: '👨‍🏫', count: 25 }
      ]
    },
    {
      id: 'fiction',
      name: 'Fiction',
      icon: '📚',
      subcategories: [
        { id: 'ethiopian', name: 'Ethiopian Literature', icon: '🇪🇹', count: 45 },
        { id: 'international', name: 'International', icon: '🌍', count: 120 }
      ]
    }
  ]
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initializeStore();
  loadInitialContent();
  initializeEventListeners();
  initializeAnimations();
  initializeSearch();
});

function initializeStore() {
  // Load saved data
  const savedCart = localStorage.getItem('cart');
  const savedWishlist = localStorage.getItem('wishlist');
  
  if (savedCart) StoreState.cart = JSON.parse(savedCart);
  if (savedWishlist) StoreState.wishlist = JSON.parse(savedWishlist);
  
  updateCartUI();
  updateWishlistUI();
  applyTheme();
  handleNavScroll();
}

function loadInitialContent() {
  loadBooks();
  loadCategories();
  loadAuthors();
  loadBookstores();
  loadFeaturedCarousel();
  startDealTimer();
  animateHeroStats();
}

// ============================================
// BOOK DISPLAY FUNCTIONS
// ============================================
function loadBooks() {
  const grids = ['booksGrid', 'booksGrid2', 'booksGrid3', 'booksGrid4'];
  const sections = {
    trending: document.getElementById('trendingBooksGrid'),
    newArrivals: document.getElementById('newArrivalsGrid'),
    bestsellers: document.getElementById('bestsellersGrid')
  };
  
  // Load special sections
  if (sections.trending) {
    const trendingBooks = ethiopianContent.books.filter(b => 
      b.author === "Extreme Series Authors").slice(0, 4);
    sections.trending.innerHTML = trendingBooks.map(book => createBookCard(book)).join('');
  }
  
  if (sections.newArrivals) {
    const newBooks = ethiopianContent.books.filter(b => 
      ['NEW', 'TRENDING'].includes(b.badge)).slice(0, 4);
    sections.newArrivals.innerHTML = newBooks.map(book => createBookCard(book)).join('');
  }
  
  if (sections.bestsellers) {
    const bestBooks = [...ethiopianContent.books]
      .sort((a, b) => b.reviews - a.reviews).slice(0, 4);
    sections.bestsellers.innerHTML = bestBooks.map(book => createBookCard(book)).join('');
  }
  
  // Load main grids
  grids.forEach((gridId, index) => {
    const grid = document.getElementById(gridId);
    if (grid) {
      const startIdx = index * 3;
      const books = ethiopianContent.books.slice(startIdx, startIdx + 3);
      grid.innerHTML = books.map(book => createBookCard(book)).join('');
    }
  });
}

function createBookCard(book, isFeatured = false) {
  const bookstore = ethiopianContent.bookstores.find(b => b.id === book.bookstoreId);
  const bookstoreName = bookstore ? bookstore.name : 'Astegni Bookstore';
  
  return `
    <div class="book-card-modern ${isFeatured ? 'featured' : ''}" data-book-id="${book.id}">
      <div class="book-cover" onclick="openQuickView(${book.id})">
        ${book.badge ? `<div class="book-badge">${book.badge}</div>` : ''}
        <img src="https://picsum.photos/seed/${book.image}/300/400" alt="${book.title}" loading="lazy">
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
        </div>
      </div>
      <div class="book-info">
        <div class="book-category">${book.genre}</div>
        <h3 class="book-title">${book.title}</h3>
        <p class="book-author">by ${book.author}</p>
        <div class="bookstore-info">
          <a href="#" onclick="event.preventDefault(); openBookstoreModal(event, ${book.bookstoreId})">${bookstoreName}</a>
        </div>
        <div class="book-footer">
          <div class="book-price">ETB ${book.price}</div>
          <div class="book-rating">⭐ ${book.rating}</div>
        </div>
      </div>
    </div>
  `;
}

function loadFeaturedCarousel() {
  const carousel = document.getElementById('featuredCarousel');
  if (!carousel) return;
  
  const featuredBooks = ethiopianContent.books
    .filter(b => b.badge === 'BESTSELLER' || b.badge === 'ESSENTIAL')
    .slice(0, 5);
  
  carousel.innerHTML = featuredBooks.map(book => createBookCard(book, true)).join('');
}

// ============================================
// SIDEBAR & CATEGORIES
// ============================================
function loadCategories() {
  const sidebarContent = document.getElementById('sidebarContent');
  if (!sidebarContent) return;
  
  sidebarContent.innerHTML = ethiopianContent.categories.map((category, idx) => `
    <div class="category-group ${idx === 0 ? 'active' : ''}" data-category="${category.id}">
      <button class="category-header" onclick="toggleCategory('${category.id}')">
        <span class="category-icon">${category.icon}</span>
        <span>${category.name}</span>
        <svg class="category-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </button>
      <div class="category-items" id="${category.id}-items">
        ${category.subcategories.map(sub => `
          <a href="#" class="category-item" onclick="filterBySubCategory('${sub.id}')">
            <span class="item-icon">${sub.icon}</span>
            <span>${sub.name}</span>
            ${sub.badge ? `<span class="item-badge ${sub.badge}">${sub.badge.toUpperCase()}</span>` : ''}
            <span class="item-count">${sub.count}</span>
          </a>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function loadAuthors() {
  const container = document.getElementById('popularAuthors');
  if (!container) return;
  
  const popularAuthors = ethiopianContent.authors.slice(0, 3);
  container.innerHTML = popularAuthors.map(author => `
    <div class="author-item-modern" onclick="openAuthorModal(event, ${author.id})">
      <img src="https://picsum.photos/seed/${author.image}/48/48" alt="${author.name}" class="author-avatar-modern">
      <div class="author-info-modern">
        <div class="author-name-modern">${author.name}</div>
        <div class="author-meta-modern">${author.books} books • ${author.followers.toLocaleString()} followers</div>
      </div>
      <button class="follow-btn-small" onclick="event.stopPropagation(); followAuthor(${author.id})">
        Follow
      </button>
    </div>
  `).join('');
}

function loadBookstores() {
  const container = document.getElementById('popularBookstores');
  if (!container) return;
  
  const popularStores = ethiopianContent.bookstores.slice(0, 3);
  container.innerHTML = popularStores.map(store => `
    <div class="bookstore-item-modern" onclick="openBookstoreModal(event, ${store.id})">
      <img src="https://picsum.photos/seed/${store.logo}/60/60" alt="${store.name}" class="bookstore-logo">
      <div class="bookstore-info-modern">
        <div class="bookstore-name-modern">${store.name}</div>
        <div class="bookstore-meta-modern">
          <span>⭐ ${store.rating}</span>
          <span>(${store.reviews})</span>
          <span>• ${store.books} books</span>
        </div>
      </div>
      <button class="view-store-btn-small" onclick="event.stopPropagation(); viewBookstore(${store.id})">
        View
      </button>
    </div>
  `).join('');
}

// ============================================
// MODAL FUNCTIONS
// ============================================
function openQuickView(bookId) {
  const book = ethiopianContent.books.find(b => b.id === bookId);
  if (!book) return;
  
  StoreState.currentBook = book;
  const modal = document.getElementById('quickViewModal');
  const bookstore = ethiopianContent.bookstores.find(b => b.id === book.bookstoreId);
  
  // Update modal content
  document.getElementById('quickViewCover').src = `https://picsum.photos/seed/${book.image}/400/600`;
  document.getElementById('quickViewTitle').textContent = book.title;
  document.getElementById('quickViewAuthor').textContent = book.author;
  document.getElementById('quickViewBookstore').textContent = bookstore ? bookstore.name : 'Astegni Bookstore';
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
  
  loadSimilarBooks(book.category);
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeQuickView() {
  const modal = document.getElementById('quickViewModal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
  StoreState.currentBook = null;
}

function openAuthorModal(event, authorId) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  const author = ethiopianContent.authors.find(a => a.id === authorId);
  if (!author) return;
  
  const modal = document.getElementById('authorModal');
  
  document.getElementById('authorName').textContent = author.name;
  document.getElementById('authorProfilePic').src = `https://picsum.photos/seed/${author.image}/120/120`;
  document.getElementById('authorBio').textContent = author.bio;
  document.getElementById('authorRatingText').textContent = `${author.rating} out of 5`;
  
  // Load author's books
  const authorBooks = ethiopianContent.books.filter(b => b.authorId === authorId);
  document.getElementById('authorBooks').innerHTML = authorBooks.slice(0, 4).map(book => `
    <div class="book-card-mini" onclick="openQuickView(${book.id})">
      <img src="https://picsum.photos/seed/${book.image}/150/200" alt="${book.title}">
    </div>
  `).join('');
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAuthorModal() {
  document.getElementById('authorModal').classList.remove('active');
  document.body.style.overflow = '';
}

function openBookstoreModal(event, bookstoreId) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  
  const bookstore = ethiopianContent.bookstores.find(b => b.id === bookstoreId);
  if (!bookstore) return;
  
  const modal = document.getElementById('bookstoreModal');
  
  document.getElementById('bookstoreName').textContent = bookstore.name;
  document.getElementById('bookstoreProfilePic').src = `https://picsum.photos/seed/${bookstore.logo}/150/150`;
  document.getElementById('bookstoreBio').textContent = bookstore.description;
  document.getElementById('bookstoreRatingText').textContent = `${bookstore.rating} (${bookstore.reviews} reviews)`;
  
  // Load bookstore's books
  const storeBooks = ethiopianContent.books.filter(b => b.bookstoreId === bookstoreId);
  document.getElementById('bookstoreBooks').innerHTML = storeBooks.slice(0, 4).map(book => `
    <div class="book-card-mini" onclick="openQuickView(${book.id})">
      <img src="https://picsum.photos/seed/${book.image}/150/200" alt="${book.title}">
    </div>
  `).join('');
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeBookstoreModal() {
  document.getElementById('bookstoreModal').classList.remove('active');
  document.body.style.overflow = '';
}

// Add to your initializeAnimations function
function initializeStickyNav() {
  const categoryNav = document.getElementById('categoryNav');
  if (!categoryNav) return;
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
      categoryNav.classList.add('scrolled');
    } else {
      categoryNav.classList.remove('scrolled');
    }
  });
}



// ============================================
// CART & WISHLIST FUNCTIONS
// ============================================
function quickAddToCart(bookId) {
  const book = ethiopianContent.books.find(b => b.id === bookId);
  if (!book) return;
  
  const existingItem = StoreState.cart.find(item => item.id === bookId);
  
  if (existingItem) {
    existingItem.quantity++;
  } else {
    StoreState.cart.push({ ...book, quantity: 1 });
  }
  
  updateCartUI();
  saveCart();
  showToast('Added to cart!', 'success');
}

function quickAddToWishlist(bookId) {
  const book = ethiopianContent.books.find(b => b.id === bookId);
  if (!book) return;
  
  if (!StoreState.wishlist.find(item => item.id === bookId)) {
    StoreState.wishlist.push(book);
    updateWishlistUI();
    saveWishlist();
    showToast('Added to wishlist!', 'success');
  } else {
    showToast('Already in wishlist', 'info');
  }
}

function updateCartUI() {
  const count = StoreState.cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCount = document.getElementById('cartCount');
  if (cartCount) cartCount.textContent = count;
  
  const cartContent = document.getElementById('cartContent');
  if (!cartContent) return;
  
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
    cartContent.innerHTML = StoreState.cart.map(item => `
      <div class="cart-item">
        <img src="https://picsum.photos/seed/${item.image}/80/100" alt="${item.title}" class="cart-item-image">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-author">${item.author}</div>
          <div class="cart-item-price">ETB ${item.price}</div>
          <div class="cart-item-actions">
            <button onclick="updateCartItemQuantity(${item.id}, -1)" class="quantity-btn">-</button>
            <span class="quantity-value">${item.quantity}</span>
            <button onclick="updateCartItemQuantity(${item.id}, 1)" class="quantity-btn">+</button>
            <button onclick="removeFromCart(${item.id})" class="remove-btn">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
  }
  
  // Update totals
  const subtotal = StoreState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 0 ? 50 : 0;
  
  const subtotalEl = document.getElementById('cartSubtotal');
  const shippingEl = document.getElementById('cartShipping');
  const totalEl = document.getElementById('cartTotal');
  
  if (subtotalEl) subtotalEl.textContent = `ETB ${subtotal}`;
  if (shippingEl) shippingEl.textContent = `ETB ${shipping}`;
  if (totalEl) totalEl.textContent = `ETB ${subtotal + shipping}`;
}

function updateWishlistUI() {
  const count = StoreState.wishlist.length;
  const wishlistCount = document.getElementById('wishlistCount');
  if (wishlistCount) wishlistCount.textContent = count;
  
  const wishlistContent = document.getElementById('wishlistContent');
  if (!wishlistContent) return;
  
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
    wishlistContent.innerHTML = StoreState.wishlist.map(item => `
      <div class="wishlist-item">
        <img src="https://picsum.photos/seed/${item.image}/80/100" alt="${item.title}" class="cart-item-image">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-author">${item.author}</div>
          <div class="cart-item-price">ETB ${item.price}</div>
          <div class="cart-item-actions">
            <button onclick="moveToCart(${item.id})" class="quantity-btn">Move to Cart</button>
            <button onclick="removeFromWishlist(${item.id})" class="remove-btn">Remove</button>
          </div>
        </div>
      </div>
    `).join('');
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

function removeFromWishlist(bookId) {
  StoreState.wishlist = StoreState.wishlist.filter(item => item.id !== bookId);
  updateWishlistUI();
  saveWishlist();
  showToast('Removed from wishlist', 'info');
}

function moveToCart(bookId) {
  const book = StoreState.wishlist.find(item => item.id === bookId);
  if (book) {
    quickAddToCart(bookId);
    removeFromWishlist(bookId);
  }
}

function moveAllToCart() {
  if (StoreState.wishlist.length === 0) {
    showToast('Wishlist is empty', 'info');
    return;
  }
  
  StoreState.wishlist.forEach(book => {
    const existingItem = StoreState.cart.find(item => item.id === book.id);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      StoreState.cart.push({ ...book, quantity: 1 });
    }
  });
  
  StoreState.wishlist = [];
  updateCartUI();
  updateWishlistUI();
  saveCart();
  saveWishlist();
  showToast('All items moved to cart!', 'success');
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(StoreState.cart));
}

function saveWishlist() {
  localStorage.setItem('wishlist', JSON.stringify(StoreState.wishlist));
}

// ============================================
// NAVIGATION & UI FUNCTIONS
// ============================================
function sidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const trigger = document.querySelector('.menu-trigger');
  
  sidebar.classList.toggle('active');
  overlay.classList.toggle('active');
  trigger.classList.toggle('active');
  
  document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
}

function toggleCategory(categoryId) {
  const categoryGroup = document.querySelector(`[data-category="${categoryId}"]`);
  if (categoryGroup) {
    categoryGroup.classList.toggle('active');
  }
}

function filterByGenre(genre) {
  StoreState.filters.category = genre;
  
  // Update active button
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.category === genre) {
      btn.classList.add('active');
    }
  });
  
  // Filter books
  let filteredBooks = ethiopianContent.books;
  
  if (genre !== 'all') {
    switch(genre) {
      case 'trending':
        filteredBooks = ethiopianContent.books.filter(b => b.reviews > 2000);
        break;
      case 'new':
        filteredBooks = ethiopianContent.books.filter(b => b.badge === 'NEW');
        break;
      case 'bestseller':
        filteredBooks = ethiopianContent.books.filter(b => b.badge === 'BESTSELLER');
        break;
      case 'deals':
        filteredBooks = ethiopianContent.books.filter(b => b.originalPrice > b.price);
        break;
      case 'local':
        filteredBooks = ethiopianContent.books.filter(b => b.authorId <= 5);
        break;
      case 'academics':
        filteredBooks = ethiopianContent.books.filter(b => b.category === 'academics');
        break;
      default:
        filteredBooks = ethiopianContent.books.filter(b => b.category === genre);
    }
  }
  
  // Update main grid
  const mainGrid = document.getElementById('booksGrid');
  if (mainGrid) {
    mainGrid.innerHTML = filteredBooks.slice(0, 6).map(book => createBookCard(book)).join('');
  }
  
  showToast(`Showing ${genre} books`, 'success');
}

function toggleTheme() {
  StoreState.darkMode = !StoreState.darkMode;
  applyTheme();
  localStorage.setItem('darkMode', StoreState.darkMode);
  showToast(StoreState.darkMode ? 'Dark mode enabled' : 'Light mode enabled', 'info');
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', StoreState.darkMode ? 'dark' : 'light');
  
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');
  
  if (sunIcon && moonIcon) {
    sunIcon.style.display = StoreState.darkMode ? 'none' : 'block';
    moonIcon.style.display = StoreState.darkMode ? 'block' : 'none';
  }
}

function toggleProfileMenu() {
  const dropdown = document.getElementById('profileDropdown');
  const button = document.querySelector('.profile-btn');
  
  dropdown.classList.toggle('active');
  button.classList.toggle('active');
}

function openCartDrawer() {
  document.getElementById('cartDrawer').classList.add('active');
  updateCartUI();
}

function closeCartDrawer() {
  document.getElementById('cartDrawer').classList.remove('active');
}

function openWishlistDrawer() {
  document.getElementById('wishlistDrawer').classList.add('active');
  updateWishlistUI();
}

function closeWishlistDrawer() {
  document.getElementById('wishlistDrawer').classList.remove('active');
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================
function initializeSearch() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => performLiveSearch(e.target.value), 300));
  }
}

function performLiveSearch(query) {
  const suggestionsContainer = document.getElementById('searchSuggestions');
  
  if (!query || query.length < 2) {
    suggestionsContainer.classList.remove('active');
    return;
  }
  
  const results = ethiopianContent.books.filter(book =>
    book.title.toLowerCase().includes(query.toLowerCase()) ||
    book.author.toLowerCase().includes(query.toLowerCase())
  );
  
  if (results.length === 0) {
    suggestionsContainer.innerHTML = '<div class="suggestion-item">No results found</div>';
  } else {
    suggestionsContainer.innerHTML = results.slice(0, 5).map(book => `
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
  
  suggestionsContainer.classList.add('active');
  
  // Save to search history
  if (!StoreState.searchHistory.includes(query)) {
    StoreState.searchHistory.unshift(query);
    StoreState.searchHistory = StoreState.searchHistory.slice(0, 10);
    localStorage.setItem('searchHistory', JSON.stringify(StoreState.searchHistory));
  }
}

function executeSearch() {
  const query = document.getElementById('search-input').value;
  if (query.trim()) {
    performLiveSearch(query);
  }
}

// ============================================
// ANIMATIONS & EFFECTS
// ============================================
function initializeAnimations() {
  initializeParticles();
  initializeBubbles();
  initializeStickyNav();
  initializeCategoryCarousel();
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
      speedX: Math.random() * 3 - 1.5,
      speedY: Math.random() * 3 - 1.5,
      opacity: Math.random() * 0.5 + 0.2
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
      
      ctx.fillStyle = StoreState.darkMode 
        ? `rgba(255, 255, 255, ${particle.opacity})`
        : `rgba(245, 158, 11, ${particle.opacity})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });
    
    requestAnimationFrame(animate);
  }
  
  animate();
  
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

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
    
    setTimeout(() => bubble.remove(), 25000);
  }
  
  // Create initial bubbles
  for (let i = 0; i < 5; i++) {
    setTimeout(() => createBubble(), i * 1000);
  }
  
  // Create new bubbles periodically
  setInterval(createBubble, 3000);
}

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
  scrollHandler();
}

function initializeStickyNav() {
  const categoryNav = document.getElementById('categoryNav');
  if (!categoryNav) return;
  
  const stickyTop = categoryNav.offsetTop;
  
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > stickyTop) {
      categoryNav.classList.add('sticky');
    } else {
      categoryNav.classList.remove('sticky');
    }
  });
}

function initializeCategoryCarousel() {
  const carousel = document.getElementById('categoryCarousel');
  if (!carousel) return;
  
  const carouselItems = [
    { title: 'Extreme Mathematics', price: 450 },
    { title: 'Physics Grade 12', price: 420 },
    { title: 'Chemistry Guide', price: 430 },
    { title: 'Biology Textbook', price: 440 },
    { title: 'English Grade 12', price: 380 },
    { title: 'Ethiopian History', price: 350 }
  ];
  
  const track = document.createElement('div');
  track.className = 'carousel-track';
  track.style.cssText = 'display: flex; gap: 1.5rem; animation: carousel-scroll 30s linear infinite;';
  
  // Double items for seamless loop
  [...carouselItems, ...carouselItems].forEach(item => {
    const div = document.createElement('div');
    div.className = 'carousel-book-item';
    div.style.cssText = 'flex-shrink: 0; width: 150px; cursor: pointer;';
    div.innerHTML = `
      <img src="https://picsum.photos/seed/${item.title}/150/200" alt="${item.title}" 
           style="width: 100%; height: 200px; object-fit: cover; border-radius: 12px;">
      <div style="font-size: 0.875rem; font-weight: 600; margin-top: 0.5rem;">${item.title}</div>
      <div style="color: var(--button-bg); font-weight: 700;">ETB ${item.price}</div>
    `;
    div.onclick = () => openQuickView(1);
    track.appendChild(div);
  });
  
  carousel.appendChild(track);
  
  track.addEventListener('mouseenter', () => {
    track.style.animationPlayState = 'paused';
  });
  
  track.addEventListener('mouseleave', () => {
    track.style.animationPlayState = 'running';
  });
}

function animateHeroStats() {
  const stats = document.querySelectorAll('.stat-number-modern');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.dataset.count);
        let current = 0;
        const increment = target / 100;
        
        const interval = setInterval(() => {
          current += increment;
          if (current >= target) {
            current = target;
            clearInterval(interval);
          }
          entry.target.textContent = Math.floor(current).toLocaleString();
          if (target === 98 && current === target) {
            entry.target.textContent = current + '%';
          }
        }, 16);
        
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  stats.forEach(stat => observer.observe(stat));
}

function startDealTimer() {
  const endTime = new Date();
  endTime.setHours(24, 0, 0, 0);
  
  function updateTimer() {
    const now = new Date();
    const timeLeft = endTime - now;
    
    if (timeLeft <= 0) {
      endTime.setDate(endTime.getDate() + 1);
      return;
    }
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    const updateElement = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(value).padStart(2, '0');
    };
    
    updateElement('dealHours', hours);
    updateElement('dealMinutes', minutes);
    updateElement('dealSeconds', seconds);
  }
  
  updateTimer();
  setInterval(updateTimer, 1000);
}

// ============================================
// EVENT LISTENERS
// ============================================
function initializeEventListeners() {
  // ESC key to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        modal.classList.remove('active');
      });
      document.querySelectorAll('.cart-drawer.active, .wishlist-drawer.active').forEach(drawer => {
        drawer.classList.remove('active');
      });
      document.body.style.overflow = '';
    }
  });
  
  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container-enhanced')) {
      const suggestions = document.getElementById('searchSuggestions');
      if (suggestions) suggestions.classList.remove('active');
    }
    
    if (!e.target.closest('.profile-menu-container')) {
      const dropdown = document.getElementById('profileDropdown');
      if (dropdown) dropdown.classList.remove('active');
    }
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toastContainer';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

function loadSimilarBooks(category) {
  const container = document.getElementById('similarBooksGrid');
  if (!container) return;
  
  const similarBooks = ethiopianContent.books
    .filter(b => b.category === category && b.id !== StoreState.currentBook?.id)
    .slice(0, 3);
  
  container.innerHTML = similarBooks.map(book => `
    <div class="similar-book-item" onclick="openQuickView(${book.id})">
      <img src="https://picsum.photos/seed/${book.image}/150/200" alt="${book.title}">
    </div>
  `).join('');
}

function scrollToBooks() {
  const booksSection = document.getElementById('booksSection');
  if (booksSection) {
    booksSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleFAB() {
  const fabMenu = document.getElementById('fabMenu');
  const fabMain = document.querySelector('.fab-main');
  if (fabMenu && fabMain) {
    fabMenu.classList.toggle('active');
    fabMain.classList.toggle('active');
  }
}

// Tab switching functions
function switchAuthorTab(tab) {
  document.querySelectorAll('.author-tabs .tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  if (event.target) event.target.classList.add('active');
  
  const booksTab = document.getElementById('authorBooksTab');
  const videosTab = document.getElementById('authorVideosTab');
  
  if (tab === 'books') {
    if (booksTab) booksTab.style.display = 'block';
    if (videosTab) videosTab.style.display = 'none';
  } else {
    if (booksTab) booksTab.style.display = 'none';
    if (videosTab) videosTab.style.display = 'block';
  }
}

function switchBookstoreTab(tab) {
  document.querySelectorAll('.bookstore-tabs .tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  if (event.target) event.target.classList.add('active');
  
  const booksTab = document.getElementById('bookstoreBooksTab');
  const videosTab = document.getElementById('bookstoreVideosTab');
  
  if (tab === 'books') {
    if (booksTab) booksTab.style.display = 'block';
    if (videosTab) videosTab.style.display = 'none';
  } else {
    if (booksTab) booksTab.style.display = 'none';
    if (videosTab) videosTab.style.display = 'block';
  }
}

// Additional modal functions
function followAuthor(authorId) {
  const author = ethiopianContent.authors.find(a => a.id === authorId);
  if (author) {
    showToast(`Following ${author.name}`, 'success');
    if (event.target) {
      event.target.textContent = 'Following';
      event.target.style.background = '#10B981';
    }
  }
}

function viewBookstore(bookstoreId) {
  const store = ethiopianContent.bookstores.find(s => s.id === bookstoreId);
  if (store) {
    showToast(`Viewing ${store.name}`, 'info');
    // In real app, would navigate to bookstore page
  }
}

function changeView(mode) {
  StoreState.viewMode = mode;
  
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.view === mode) {
      btn.classList.add('active');
    }
  });
  
  const grids = document.querySelectorAll('.books-grid-modern');
  grids.forEach(grid => {
    if (mode === 'list') {
      grid.classList.add('list-view');
    } else {
      grid.classList.remove('list-view');
    }
  });
}

function loadMoreBooks() {
  if (StoreState.isLoading) return;
  
  StoreState.isLoading = true;
  StoreState.currentPage++;
  
  const btn = document.querySelector('.load-more-btn-modern');
  if (btn) {
    btn.querySelector('.btn-text').classList.add('hidden');
    btn.querySelector('.btn-loader').classList.remove('hidden');
  }
  
  // Simulate loading
  setTimeout(() => {
    // In real app, would load more books from server
    showToast(`Loaded more books (page ${StoreState.currentPage})`, 'success');
    
    if (btn) {
      btn.querySelector('.btn-text').classList.remove('hidden');
      btn.querySelector('.btn-loader').classList.add('hidden');
    }
    
    StoreState.isLoading = false;
  }, 1000);
}

// Placeholder functions for features not yet implemented
function openAIModal() {
  showToast('AI Recommendations feature coming soon!', 'info');
}

function openNotificationPanel() {
  showToast('Notifications feature coming soon!', 'info');
}

function shareBook() {
  if (navigator.share && StoreState.currentBook) {
    navigator.share({
      title: StoreState.currentBook.title,
      text: `Check out "${StoreState.currentBook.title}" by ${StoreState.currentBook.author}`,
      url: window.location.href
    }).catch(() => {});
  } else {
    showToast('Share link copied to clipboard!', 'success');
  }
}

function addToCartFromQuickView() {
  if (StoreState.currentBook) {
    quickAddToCart(StoreState.currentBook.id);
  }
}

function addToWishlistFromQuickView() {
  if (StoreState.currentBook) {
    quickAddToWishlist(StoreState.currentBook.id);
  }
}