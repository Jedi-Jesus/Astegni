// ============================================
// CONTENT LOADER - ENHANCED
// ============================================
class ContentLoader {
    constructor() {
        this.attachCommunityEvents();
    }

    attachCommunityEvents() {
        // Attach events after DOM is loaded
        setTimeout(() => {
            document.querySelectorAll(".community-tab").forEach((tab) => {
                tab.addEventListener("click", () => {
                    this.switchCommunityTab(tab);
                });
            });
        }, 100);
    }

    switchCommunityTab(tab) {
        // Remove active from all tabs
        document.querySelectorAll(".community-tab").forEach((t) => {
            t.classList.remove("active");
        });
        
        // Add active to clicked tab
        tab.classList.add("active");
        
        const tabType = tab.textContent.toLowerCase();
        Utils.showToast(`👥 Loading ${tab.textContent}...`, "info");
        
        // Load appropriate content
        if (tabType.includes("student")) {
            this.loadCommunityGroups("student");
        } else if (tabType.includes("teacher")) {
            this.loadCommunityGroups("teacher");
        } else if (tabType.includes("alumni")) {
            this.loadCommunityGroups("alumni");
        }
    }

    joinGroup(groupId) {
        Utils.showToast("✅ Joined group successfully!", "success");
        
        // Store joined state
        STATE.joinedGroups.add(groupId);
        localStorage.setItem("joinedGroups", JSON.stringify(Array.from(STATE.joinedGroups)));
        
        // Update UI
        const btn = event.target;
        const groupCard = btn.closest('.group-card');
        
        // Hide join button and show connect button
        btn.style.display = 'none';
        
        // Create and add connect button
        const connectBtn = document.createElement('button');
        connectBtn.className = 'btn-connect';
        connectBtn.textContent = 'Connect';
        connectBtn.onclick = () => this.connectWithGroup(groupId);
        btn.parentElement.appendChild(connectBtn);
    }

    connectWithGroup(groupId) {
        Utils.showToast("🔗 Connecting with group members...", "info");
        // Could open a group chat or member list modal
    }

    load(contentType) {
        const loaders = {
            classes: () => this.loadClasses(),
            community: () => this.loadCommunityGroups(),
            podcasts: () => this.loadPodcasts(),
            videos: () => this.loadVideos(),
            blog: () => this.loadBlogPosts(),
            comments: () => this.loadComments(),
            jobs: () => this.loadJobs(),
        };

        const loader = loaders[contentType];
        if (loader) {
            loader.call(this);
        }
    }

    loadCommunityGroups(type = "student") {
        const grid = document.querySelector(".groups-grid");
        if (!grid) return;

        const groups = this.getGroupsByType(type);
        grid.innerHTML = this.renderGroups(groups);
    }

    getGroupsByType(type) {
        const groupTypes = {
            student: [
                {
                    id: "group-student-1",
                    name: "Film Makers United",
                    members: 1234,
                    description: "A community for aspiring and professional filmmakers",
                    icon: "🎬",
                    active: true,
                },
                {
                    id: "group-student-2",
                    name: "Photography Masters",
                    members: 892,
                    description: "Share and learn photography techniques",
                    icon: "📸",
                    active: false,
                },
            ],
            teacher: [
                {
                    id: "group-teacher-1",
                    name: "Instructors Network",
                    members: 456,
                    description: "Connect with fellow instructors and share resources",
                    icon: "👨‍🏫",
                    active: true,
                },
                {
                    id: "group-teacher-2",
                    name: "Curriculum Development",
                    members: 234,
                    description: "Collaborate on course materials and teaching methods",
                    icon: "📚",
                    active: true,
                },
            ],
            alumni: [
                {
                    id: "group-alumni-1",
                    name: "Alumni Success Stories",
                    members: 3456,
                    description: "Share your journey and inspire current students",
                    icon: "🎓",
                    active: true,
                },
                {
                    id: "group-alumni-2",
                    name: "Career Network",
                    members: 2890,
                    description: "Job opportunities and professional networking",
                    icon: "💼",
                    active: true,
                },
            ],
        };

        return groupTypes[type] || groupTypes.student;
    }

    renderGroups(groups) {
        return groups
            .map(
                (group, index) => {
                    const isJoined = STATE.joinedGroups.has(group.id);
                    return `
                    <div class="group-card animated-entry" style="animation: slideInUp ${0.2 * (index + 1)}s ease-out;">
                        <div class="group-header">
                            <div class="group-icon">${group.icon}</div>
                            <h3>${group.name}</h3>
                            ${group.active ? '<span class="active-badge">Active</span>' : ""}
                        </div>
                        <p>${group.description}</p>
                        <div class="group-stats">
                            <div class="member-count">👥 ${group.members} members</div>
                            ${group.active ? '<div class="group-activity"><span class="online-indicator"></span> 23 online</div>' : ""}
                        </div>
                        ${isJoined 
                            ? `<button class="btn-connect" onclick="window.contentLoader.connectWithGroup('${group.id}')">Connect</button>`
                            : `<button class="btn-primary" onclick="window.contentLoader.joinGroup('${group.id}')">Join Group</button>`
                        }
                    </div>
                `;
                }
            )
            .join("");
    }

    loadPodcasts() {
        const grid = document.querySelector(".podcast-grid");
        if (!grid) return;

        const podcasts = [
            {
                id: "podcast-1",
                title: "The Film Making Journey",
                author: "Zenith Academy",
                duration: "45:23",
                image:
                    "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=200",
                plays: "2.3K",
            },
        ];

        grid.innerHTML = `
            <div class="podcast-header-actions">
                <button class="btn-primary" onclick="window.podcastsManager.createPlaylist()">
                    + Create Podcast Playlist
                </button>
            </div>
            ${this.renderPodcasts(podcasts)}
        `;
    }

    renderPodcasts(podcasts) {
        return podcasts
            .map(
                (podcast, index) => `
            <div class="podcast-card animated-entry" style="animation: fadeIn ${0.3 * (index + 1)}s ease-out;">
                <div class="podcast-cover">
                    <img src="${podcast.image}" alt="${podcast.title}">
                    <div class="podcast-play-overlay">
                        <button class="play-btn" onclick="Utils.showToast('▶️ Playing podcast...', 'info')">▶</button>
                    </div>
                </div>
                <div class="podcast-info">
                    <h3>${podcast.title}</h3>
                    <p class="podcast-author">${podcast.author}</p>
                    <div class="podcast-meta">
                        <span>🎧 ${podcast.duration}</span>
                        <span>▶️ ${podcast.plays} plays</span>
                    </div>
                </div>
            </div>
        `
            )
            .join("");
    }

    loadVideos() {
        const grid = document.querySelector(".videos-grid");
        if (!grid) return;

        grid.innerHTML = STATE.videos
            .slice(0, 6)
            .map(
                (video, index) => `
            <div class="video-card animated-entry" style="animation: zoomIn ${0.2 * (index + 1)}s ease-out;">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}">
                    ${video.isLive
                        ? '<span class="video-live-badge">🔴 LIVE</span>'
                        : `<span class="video-duration">${video.duration}</span>`
                    }
                    <div class="video-play-overlay">
                        <button class="play-btn" onclick="Utils.showToast('▶️ Playing video...', 'info')">▶</button>
                    </div>
                </div>
                <div class="video-info">
                    <h3>${video.title}</h3>
                    <div class="video-stats">
                        <span>👁️ ${video.views > 1000
                        ? (video.views / 1000).toFixed(1) + "K"
                        : video.views
                    }</span>
                        ${video.isLive
                        ? '<span class="live-indicator">● Live Now</span>'
                        : ""
                    }
                    </div>
                </div>
            </div>
        `
            )
            .join("");
    }

    loadBlogPosts() {
        const grid = document.querySelector(".blog-grid");
        if (!grid) return;

        grid.innerHTML = STATE.blogPosts
            .slice(0, 4)
            .map(
                (post, index) => `
            <div class="blog-card animated-entry" style="animation: slideInRight ${0.2 * (index + 1)}s ease-out;">
                <div class="blog-image">
                    <img src="${post.image}" alt="${post.title}">
                    <span class="blog-category">Tutorial</span>
                </div>
                <div class="blog-content">
                    <h3>${post.title}</h3>
                    <p class="blog-excerpt">${post.excerpt}</p>
                    <div class="blog-meta">
                        <div class="blog-author">
                            <img src="https://via.placeholder.com/30" alt="${post.author}">
                            <span>${post.author}</span>
                        </div>
                        <span class="blog-date">${this.formatDate(post.date)}</span>
                    </div>
                    <div class="blog-stats">
                        <span>📖 ${post.readTime}</span>
                        <span>💬 ${post.comments} comments</span>
                        <span>❤️ ${post.likes} likes</span>
                    </div>
                    <button class="btn-view" onclick="window.blogManager.viewBlogPost('${post.id}')">
                        View Article
                    </button>
                </div>
            </div>
        `
            )
            .join("");
    }

    loadComments() {
        window.commentsManager.renderFilteredComments(STATE.comments);
    }

    loadClasses() {
        const grid = document.querySelector(".classes-grid");
        if (!grid) return;

        const classes = [
            {
                title: "Film Production Masterclass",
                instructor: "John Smith",
                students: 234,
                rating: 4.8,
                image:
                    "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400",
                price: "$99",
                level: "Advanced",
            },
            {
                title: "Advanced Cinematography",
                instructor: "Sarah Johnson",
                students: 189,
                rating: 4.9,
                image:
                    "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400",
                price: "$129",
                level: "Professional",
            },
        ];

        grid.innerHTML = this.renderClasses(classes);
    }

    renderClasses(classes) {
        return classes
            .map(
                (cls, index) => `
            <div class="class-card animated-entry" style="animation: fadeInUp ${0.2 * (index + 1)}s ease-out;">
                <div class="class-banner">
                    <img src="${cls.image}" alt="${cls.title}">
                    <span class="class-category">${cls.level}</span>
                </div>
                <div class="class-content">
                    <h3>${cls.title}</h3>
                    <div class="instructor-info">
                        <img src="https://via.placeholder.com/30" alt="${cls.instructor}" class="instructor-avatar">
                        <span>${cls.instructor}</span>
                    </div>
                    <div class="class-meta">
                        <span>👥 ${cls.students} students</span>
                        <span>⭐ ${cls.rating}</span>
                        <span class="class-price">${cls.price}</span>
                    </div>
                    <button class="btn-primary" onclick="Utils.showToast('📚 Enrolling in course...', 'info')">Enroll Now</button>
                </div>
            </div>
        `
            )
            .join("");
    }

    formatDate(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return "Today";
        if (days === 1) return "Yesterday";
        if (days < 7) return `${days} days ago`;
        if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
        return `${Math.floor(days / 30)} months ago`;
    }
}


// ============================================
// UPDATED CONTENT LOADER FOR INSTITUTE PROFILE
// ============================================

class UpdatedContentLoader extends ContentLoader {
    constructor() {
        super();
        this.initializeInstituteData();
    }

    initializeInstituteData() {
        // Initialize institute-specific data
        STATE.jobPosts = this.generateMockJobPosts();
        STATE.books = this.generateMockBooks();
        // REMOVED: STATE.clubs - now loaded from database via /api/clubs
        STATE.purchasedProducts = this.generateMockPurchasedProducts();
    }

    generateMockJobPosts() {
        return [
            {
                id: 'job-1',
                title: 'Film Production Instructor',
                department: 'Media Arts',
                type: 'Full-time',
                location: 'Addis Ababa',
                salary: '15,000-25,000 ETB',
                status: 'posted',
                postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
                applicants: 45
            },
            {
                id: 'job-2',
                title: 'Digital Marketing Coordinator',
                department: 'Marketing',
                type: 'Part-time',
                location: 'Remote',
                salary: '10,000-15,000 ETB',
                status: 'posted',
                postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                deadline: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000),
                applicants: 23
            },
            {
                id: 'job-3',
                title: 'Video Editing Assistant',
                department: 'Production',
                type: 'Contract',
                location: 'Hybrid',
                salary: '8,000-12,000 ETB',
                status: 'draft',
                createdDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            },
            {
                id: 'job-4',
                title: 'Photography Instructor',
                department: 'Visual Arts',
                type: 'Full-time',
                location: 'Addis Ababa',
                salary: '18,000-28,000 ETB',
                status: 'draft',
                createdDate: new Date()
            }
        ];
    }

    generateMockBooks() {
        // Return empty array to show "Open a Store" button
        // Change this to return books array to show "Upload Book" button
        return [];
        
        /* Example with books:
        return [
            {
                id: 'book-1',
                title: 'Complete Guide to Film Production',
                author: 'Zenith Academy',
                price: 899,
                currency: CurrencyManager.getCurrency(),
                cover: 'https://picsum.photos/200/300?random=book1',
                sales: 234,
                rating: 4.8
            }
        ];
        */
    }

    // REMOVED: generateMockClubs()
    // Clubs are now loaded dynamically from database via /api/clubs
    // See js/page-structure/communityManager.js loadClubs() method

    generateMockPurchasedProducts() {
        return [
            {
                id: 'product-1',
                name: 'Adobe Creative Suite License',
                type: 'software',
                purchaseDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                price: 2499,
                currency: CurrencyManager.getCurrency(),
                status: 'active',
                expiryDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000)
            },
            {
                id: 'product-2',
                name: 'Advanced Cinematography Course',
                type: 'courses',
                purchaseDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                price: 1299,
                currency: CurrencyManager.getCurrency(),
                status: 'active',
                progress: 65
            },
            {
                id: 'product-3',
                name: 'Film Production Handbook',
                type: 'books',
                purchaseDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
                price: 599,
                currency: CurrencyManager.getCurrency(),
                status: 'delivered'
            }
        ];
    }

    load(contentType) {
        const loaders = {
            classes: () => this.loadClasses(),
            community: () => this.openCommunityModal(),
            clubs: () => this.loadClubs(),
            podcasts: () => this.loadPodcasts(),
            videos: () => this.loadVideos(),
            blog: () => this.loadBlogPosts(),
            comments: () => this.loadComments(),
            jobs: () => this.loadJobs(),
            books: () => this.loadBooks(),
            'my-products': () => this.loadMyProducts()
        };

        const loader = loaders[contentType];
        if (loader) {
            loader.call(this);
        }
    }

    openCommunityModal() {
        // Open community modal instead of loading content
        if (window.communityManager) {
            window.communityManager.open('followers');
        }
    }

    loadJobs(filter = 'all') {
        const grid = document.getElementById('jobsGrid');
        if (!grid) return;

        let jobs = STATE.jobPosts;
        
        if (filter === 'posted') {
            jobs = jobs.filter(job => job.status === 'posted');
        } else if (filter === 'draft') {
            jobs = jobs.filter(job => job.status === 'draft');
        }

        if (jobs.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">💼</span>
                    <h3>No ${filter === 'draft' ? 'draft' : filter === 'posted' ? 'posted' : ''} jobs</h3>
                    <p>Create your first job post to start hiring</p>
                    <button class="btn-primary" onclick="openCreateJobModal()">
                        Create Job Post
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = jobs.map(job => `
            <div class="job-card hover-lift ${job.status === 'draft' ? 'draft-card' : ''}">
                ${job.status === 'draft' ? '<span class="draft-badge">DRAFT</span>' : ''}
                <div class="job-header">
                    <div class="job-info">
                        <h3>${job.title}</h3>
                        <p>${job.department}</p>
                    </div>
                </div>
                <div class="job-details">
                    <span class="job-tag">${job.type}</span>
                    <span class="job-tag">${job.salary}</span>
                    <span class="job-tag">${job.location}</span>
                </div>
                ${job.status === 'posted' ? `
                    <div class="job-stats">
                        <span>📅 Posted: ${this.formatDate(job.postedDate)}</span>
                        <span>⏰ Deadline: ${this.formatDate(job.deadline)}</span>
                        <span>👥 ${job.applicants} applicants</span>
                    </div>
                ` : `
                    <div class="job-stats">
                        <span>📝 Created: ${this.formatDate(job.createdDate)}</span>
                    </div>
                `}
                <div class="job-actions">
                    ${job.status === 'draft' ? `
                        <button class="btn-secondary" onclick="editJob('${job.id}')">Edit</button>
                        <button class="btn-primary" onclick="publishJob('${job.id}')">Publish</button>
                    ` : `
                        <button class="btn-view" onclick="viewApplicants('${job.id}')">View Applicants</button>
                        <button class="btn-secondary" onclick="editJob('${job.id}')">Edit</button>
                    `}
                </div>
            </div>
        `).join('');
    }

    loadBooks() {
        const grid = document.getElementById('booksGrid');
        const headerButtons = document.getElementById('booksHeaderButtons');
        
        if (!grid || !headerButtons) return;

        const books = STATE.books;

        // Update header button based on books availability
        if (books.length === 0) {
            headerButtons.innerHTML = `
                <button class="btn-primary" onclick="openStoreSetup()">
                    <span>🏪</span> Open a Store
                </button>
            `;
            
            grid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📚</span>
                    <h3>No Books Yet</h3>
                    <p>Start selling your educational books and materials</p>
                    <button class="btn-primary" onclick="openStoreSetup()">
                        Open Your Book Store
                    </button>
                </div>
            `;
        } else {
            headerButtons.innerHTML = `
                <button class="btn-primary" onclick="uploadBook()">
                    <span>📖</span> Upload Book
                </button>
            `;
            
            grid.innerHTML = books.map(book => `
                <div class="book-card hover-lift">
                    <div class="book-cover">
                        <img src="${book.cover}" alt="${book.title}">
                        <div class="book-badge">${book.sales} sold</div>
                    </div>
                    <div class="book-info">
                        <h3>${book.title}</h3>
                        <p class="book-author">by ${book.author}</p>
                        <div class="book-rating">
                            ${'⭐'.repeat(Math.floor(book.rating))}
                            <span>${book.rating}</span>
                        </div>
                        <div class="book-price">
                            <span class="price">${book.price} ${book.currency}</span>
                        </div>
                        <div class="book-actions">
                            <button class="btn-view" onclick="viewBookDetails('${book.id}')">View Details</button>
                            <button class="btn-secondary" onclick="editBook('${book.id}')">Edit</button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    async loadClubs(filter = 'all') {
        const grid = document.getElementById('clubsGrid');
        if (!grid) return;

        // Show loading state
        grid.innerHTML = '<div class="loading-state">Loading clubs...</div>';

        try {
            const token = localStorage.getItem('token');
            const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

            const response = await fetch(`${API_BASE_URL}/api/clubs`, {
                headers: token ? {
                    'Authorization': `Bearer ${token}`
                } : {}
            });

            if (!response.ok) {
                throw new Error('Failed to fetch clubs');
            }

            const data = await response.json();
            let clubs = data.clubs || [];

            // Apply category filter
            if (filter !== 'all') {
                clubs = clubs.filter(club => club.category === filter);
            }

            if (clubs.length === 0) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-icon">🎭</span>
                        <h3>No clubs ${filter !== 'all' ? 'in this category' : 'available'}</h3>
                        <p>Create a new club to build community</p>
                        <button class="btn-primary" onclick="openCreateClubModal()">
                            Create Club
                        </button>
                    </div>
                `;
                return;
            }

            grid.innerHTML = clubs.map((club, index) => `
                <div class="club-card animated-entry" style="animation: slideInUp ${0.2 * (index + 1)}s ease-out;">
                    <div class="club-header">
                        <img src="${club.club_picture || 'uploads/system_images/system_profile_pictures/bookstore-profile.jpg'}"
                             alt="${club.title}"
                             class="club-icon-img"
                             style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                        <h3>${club.title}</h3>
                        ${club.status === 'active' ? '<span class="active-badge">Active</span>' : ''}
                    </div>
                    <p>${club.description || 'No description'}</p>
                    <div class="club-stats">
                        <div class="member-count">👥 ${club.current_members || 0}/${club.member_limit || 'Unlimited'} members</div>
                        <div class="member-count">💰 ${club.is_paid ? `${club.membership_fee} ETB` : 'Free'}</div>
                    </div>
                    <div class="club-actions">
                        <button class="btn-view" onclick="viewClubDetails(${club.id})">View Club</button>
                        <button class="btn-secondary" onclick="manageClub(${club.id})">Manage</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading clubs:', error);
            grid.innerHTML = `
                <div class="error-state">
                    <p>Failed to load clubs. Please try again.</p>
                    <button class="btn-primary" onclick="contentLoader.loadClubs('${filter}')">Retry</button>
                </div>
            `;
        }
    }

    loadMyProducts(filter = 'all') {
        const grid = document.getElementById('myProductsGrid');
        if (!grid) return;

        let products = STATE.purchasedProducts;
        
        if (filter !== 'all') {
            products = products.filter(product => product.type === filter);
        }

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📦</span>
                    <h3>No purchased products</h3>
                    <p>Browse the store to find useful products</p>
                    <button class="btn-primary" onclick="navigateToStore()">
                        Browse Store
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = products.map(product => `
            <div class="product-card hover-lift">
                <div class="product-header">
                    <h3>${product.name}</h3>
                    <span class="product-type-badge">${product.type}</span>
                </div>
                <div class="product-details">
                    <p>Purchased: ${this.formatDate(product.purchaseDate)}</p>
                    <p>Price: ${product.price} ${product.currency}</p>
                    ${product.expiryDate ? `<p>Expires: ${this.formatDate(product.expiryDate)}</p>` : ''}
                    ${product.progress !== undefined ? `
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${product.progress}%"></div>
                            <span class="progress-text">${product.progress}% complete</span>
                        </div>
                    ` : ''}
                </div>
                <div class="product-status">
                    <span class="status-badge ${product.status}">${product.status}</span>
                </div>
                <div class="product-actions">
                    ${product.type === 'courses' ? `
                        <button class="btn-primary" onclick="continueProduct('${product.id}')">Continue</button>
                    ` : product.type === 'software' ? `
                        <button class="btn-primary" onclick="launchProduct('${product.id}')">Launch</button>
                    ` : `
                        <button class="btn-view" onclick="viewProduct('${product.id}')">View Details</button>
                    `}
                </div>
            </div>
        `).join('');
    }
}
