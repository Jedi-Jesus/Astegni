// ============================================
// TRAINING CENTER PROFILE - PART 3
// ============================================

// ============================================
// EVENTS MANAGER - FIXED
// ============================================
class EventsManager {
    constructor() {
        this.events = [];
        this.loadEvents();
        this.init();
    }

    init() {
        this.attachEventHandlers();
        this.updateWidget();
    }

    attachEventHandlers() {
        // Join Event button handlers
        document.addEventListener("click", (e) => {
            if (
                e.target.classList.contains("btn-join-inline") ||
                e.target.closest(".btn-join-inline")
            ) {
                this.joinEvent();
            }
        });
    }

joinEvent(event) {  // Add event parameter
    Utils.showToast("🎬 Joining the event...", "info");

    setTimeout(() => {
        Utils.showToast("✅ Successfully joined the event!", "success");

        // Update button - fix the event reference
        const btn = event && event.target ? event.target : document.querySelector('.btn-join-inline');
        if (btn) {
            btn.textContent = "Joined";
            btn.disabled = true;
            btn.style.background = "#10b981";
        }
    }, 1000);
}

    createEvent(eventData) {
        const event = {
            id: Date.now(),
            title: eventData.title || "New Event",
            type: eventData.type || "event",
            date: eventData.date || new Date(),
            time: eventData.time || "10:00 AM",
            location: eventData.location || "Online",
            description: eventData.description || "",
            attendees: eventData.attendees || 0,
            status: "upcoming",
            color: this.getEventTypeColor(eventData.type),
            icon: this.getEventTypeIcon(eventData.type),
            createdAt: new Date(),
        };

        this.events.push(event);
        this.saveEvents();
        this.updateWidget();
        this.updateNextSession();
        Utils.showToast("✅ Event created successfully!", "success");
        return event;
    }

    updateNextSession() {
        const nextEvent = this.getNextEvent();
        if (nextEvent) {
            const sessionElement = document.getElementById("nextSessionText");
            if (sessionElement) {
                const timeUntil = this.getTimeUntilEvent(nextEvent);
                sessionElement.innerHTML = `<strong class="gradient-text">Next Event:</strong> ${nextEvent.title} - ${this.formatEventDate(nextEvent)} (${timeUntil}) - ${nextEvent.attendees || 0} attending`;
            }
        }
    }

    getNextEvent() {
        const now = new Date();
        const upcomingEvents = this.events
            .filter(event => new Date(event.date) >= now)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
        return upcomingEvents[0];
    }

    getTimeUntilEvent(event) {
        const now = new Date();
        const eventDate = new Date(event.date);
        const diff = eventDate - now;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours < 24) {
            return `Live in ${hours}h ${minutes}m`;
        } else {
            const days = Math.floor(hours / 24);
            return `In ${days} day${days > 1 ? 's' : ''}`;
        }
    }

    formatEventDate(event) {
        const date = new Date(event.date);
        const today = new Date();
        
        if (date.toDateString() === today.toDateString()) {
            return `Today at ${event.time}`;
        }
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === tomorrow.toDateString()) {
            return `Tomorrow at ${event.time}`;
        }
        
        return `${date.toLocaleDateString()} at ${event.time}`;
    }

    updateWidget() {
        const eventsList = document.querySelector(".events-list");
        if (!eventsList) return;

        const upcomingEvents = this.events
            .filter((event) => new Date(event.date) >= new Date())
            .slice(0, 3);

        if (upcomingEvents.length === 0) {
            eventsList.innerHTML = `
                <div class="no-events-placeholder">
                    <span class="placeholder-icon">📅</span>
                    <p>No upcoming events</p>
                    <button class="btn-create-event-small" onclick="window.eventsManager.showCreateEventModal()">
                        Create Event
                    </button>
                </div>
            `;
            return;
        }

        eventsList.innerHTML = upcomingEvents
            .map((event, index) => {
                const eventDate = new Date(event.date);
                const isToday = this.isToday(eventDate);
                const isLive = this.isEventLive(event);

                return `
                <div class="event-item animated-entry" style="animation: slideInLeft ${0.2 * (index + 1)}s ease-out;">
                    <div class="event-date ${isToday ? "today" : ""} ${isLive ? "live" : ""}">
                        <span class="date-day">${eventDate.getDate()}</span>
                        <span class="date-month">${eventDate
                        .toLocaleString("default", { month: "short" })
                        .toUpperCase()}</span>
                        ${isLive ? '<span class="live-indicator">LIVE</span>' : ""}
                    </div>
                    <div class="event-details">
                        <h4>${event.title}</h4>
                        <p>${event.description || event.type}</p>
                        <div class="event-meta">
                            <span class="event-time">🕐 ${event.time}</span>
                            ${event.location ? `<span class="event-location">📍 ${event.location}</span>` : ""}
                            ${event.attendees > 0 ? `<span class="event-attendees">👥 ${event.attendees} attending</span>` : ""}
                        </div>
                    </div>
                </div>
            `;
            })
            .join("");
        
        // Also update the next session display
        this.updateNextSession();
    }

    saveEvents() {
        localStorage.setItem("zenithEvents", JSON.stringify(this.events));
    }

    loadEvents() {
        const saved = localStorage.getItem("zenithEvents");
        if (saved) {
            this.events = JSON.parse(saved);
        } else {
            this.events = this.getDefaultEvents();
        }
    }

    getDefaultEvents() {
        const today = new Date();
        return [
            {
                id: "default1",
                title: "Film Production Masterclass",
                type: "class",
                date: new Date(today.getTime() + 86400000 * 2),
                time: "2:00 PM",
                location: "Online - Zoom",
                description: "Advanced techniques in film production",
                attendees: 156,
                icon: "🎬",
            },
            {
                id: "default2",
                title: "Industry Networking Event",
                type: "networking",
                date: new Date(today.getTime() + 86400000 * 5),
                time: "6:00 PM",
                location: "Conference Hall",
                description: "Meet industry professionals",
                attendees: 89,
                icon: "🤝",
            },
        ];
    }

    getEventTypeColor(type) {
        const colors = {
            class: "#10b981",
            workshop: "#f59e0b",
            webinar: "#3b82f6",
            meeting: "#8b5cf6",
            conference: "#ef4444",
            screening: "#ec4899",
            networking: "#14b8a6",
        };
        return colors[type] || "#6b7280";
    }

    getEventTypeIcon(type) {
        const icons = {
            class: "📚",
            workshop: "🔧",
            webinar: "💻",
            meeting: "👥",
            conference: "🎤",
            screening: "🎬",
            networking: "🤝",
        };
        return icons[type] || "📅";
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    isEventLive(event) {
        const now = new Date();
        const eventStart = new Date(event.date + " " + event.time);
        const eventEnd = new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);
        return now >= eventStart && now <= eventEnd;
    }
}

// Additional content and utility managers continue...

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
        STATE.clubs = this.generateMockClubs();
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
                currency: 'ETB',
                cover: 'https://picsum.photos/200/300?random=book1',
                sales: 234,
                rating: 4.8
            }
        ];
        */
    }

    generateMockClubs() {
        return [
            {
                id: 'club-1',
                name: 'Film Makers Society',
                category: 'arts',
                members: 456,
                description: 'A club for passionate filmmakers',
                icon: '🎬',
                active: true
            },
            {
                id: 'club-2',
                name: 'Tech Innovators',
                category: 'technology',
                members: 234,
                description: 'Exploring cutting-edge technology',
                icon: '💻',
                active: true
            },
            {
                id: 'club-3',
                name: 'Photography Club',
                category: 'arts',
                members: 189,
                description: 'Capturing moments, creating art',
                icon: '📸',
                active: false
            },
            {
                id: 'club-4',
                name: 'Debate Society',
                category: 'academic',
                members: 167,
                description: 'Sharpen your argumentation skills',
                icon: '🎤',
                active: true
            }
        ];
    }

    generateMockPurchasedProducts() {
        return [
            {
                id: 'product-1',
                name: 'Adobe Creative Suite License',
                type: 'software',
                purchaseDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                price: 2499,
                currency: 'ETB',
                status: 'active',
                expiryDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000)
            },
            {
                id: 'product-2',
                name: 'Advanced Cinematography Course',
                type: 'courses',
                purchaseDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                price: 1299,
                currency: 'ETB',
                status: 'active',
                progress: 65
            },
            {
                id: 'product-3',
                name: 'Film Production Handbook',
                type: 'books',
                purchaseDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
                price: 599,
                currency: 'ETB',
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

    loadClubs(filter = 'all') {
        const grid = document.getElementById('clubsGrid');
        if (!grid) return;

        let clubs = STATE.clubs;
        
        if (filter !== 'all') {
            clubs = clubs.filter(club => club.category === filter);
        }

        if (clubs.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🎭</span>
                    <h3>No clubs in this category</h3>
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
                    <div class="club-icon">${club.icon}</div>
                    <h3>${club.name}</h3>
                    ${club.active ? '<span class="active-badge">Active</span>' : ''}
                </div>
                <p>${club.description}</p>
                <div class="club-stats">
                    <div class="member-count">👥 ${club.members} members</div>
                    ${club.active ? '<div class="club-activity"><span class="online-indicator"></span> 23 online</div>' : ''}
                </div>
                <div class="club-actions">
                    <button class="btn-view" onclick="viewClubDetails('${club.id}')">View Club</button>
                    <button class="btn-secondary" onclick="manageClub('${club.id}')">Manage</button>
                </div>
            </div>
        `).join('');
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


// Additional managers would continue here...
// (AnalyticsManager, WeatherManager, ModalsManager, AnimationsManager, WidgetsManager, Utils)

// ============================================
// UTILITIES
// ============================================
class Utils {
    static showToast(message, type = "info") {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;

        const backgrounds = {
            success: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            error: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            info: "var(--primary-gradient, linear-gradient(135deg, #F59E0B 0%, #D97706 100%))",
        };

        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${backgrounds[type] || backgrounds.info};
            color: white;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInUp 0.3s ease, slideOutDown 0.3s ease 2.7s;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 500;
        `;

        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 3000);
    }
}

// ============================================
// GLOBAL FUNCTIONS FOR HTML HANDLERS
// ============================================

// Schedule functions - ENHANCED
window.saveSchedule = function () {
    const form = document.getElementById("scheduleForm");
    if (!form) return;

    const eventTitle = form.querySelector("#eventTitle")?.value;
    const eventType = form.querySelector("#eventType")?.value;
    const startDateTime = form.querySelector("#startDateTime")?.value;
    const endDateTime = form.querySelector("#endDateTime")?.value;
    const repeatOption = form.querySelector("#repeatOption")?.value;
    const eventLocation = form.querySelector("#eventLocation")?.value;
    const eventDescription = form.querySelector("#eventDescription")?.value;

    if (!eventTitle || !startDateTime) {
        Utils.showToast("⚠️ Please fill in required fields", "error");
        return;
    }

    // Parse date and time
    const startDate = new Date(startDateTime);
    const timeStr = startDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
    });

    // Create new event
    const newEvent = {
        title: eventTitle,
        type: eventType,
        date: startDate,
        time: timeStr,
        location: eventLocation,
        description: eventDescription,
        attendees: 0,
    };

    // Add event through events manager
    window.eventsManager.createEvent(newEvent);

    // Update profile next session
    window.eventsManager.updateNextSession();

    Utils.showToast("✅ Schedule saved successfully!", "success");

    const modal = document.getElementById("scheduleModal");
    if (modal) modal.classList.remove("show");
};

// Profile functions - ENHANCED
window.saveProfile = function () {
    const form = document.getElementById("editProfileForm");
    if (!form) return;

    const companyName = form.querySelector("#companyName")?.value;
    const centerQuote = form.querySelector("#centerQuote")?.value;
    const aboutUs = form.querySelector("#aboutUs")?.value;

    // Get locations
    const locationInputs = form.querySelectorAll("#locationsContainer input");
    const locations = Array.from(locationInputs)
        .map(input => input.value)
        .filter(value => value.trim() !== "")
        .join(" | ");

    if (!companyName) {
        Utils.showToast("⚠️ Company name is required", "error");
        return;
    }

    // Update UI
    const nameElement = document.getElementById("centerName");
    if (nameElement) nameElement.textContent = companyName;

    const quoteElement = document.getElementById("profileQuote");
    if (quoteElement) quoteElement.textContent = centerQuote;

    const aboutElement = document.getElementById("aboutText");
    if (aboutElement) aboutElement.textContent = aboutUs;

    const locationElement = document.getElementById("locationText");
    if (locationElement) locationElement.textContent = locations;

    // Save to localStorage
    const profileData = {
        companyName,
        quote: centerQuote,
        about: aboutUs,
        location: locations
    };
    localStorage.setItem("profileData", JSON.stringify(profileData));

    Utils.showToast("✅ Profile updated successfully!", "success");

    const modal = document.getElementById("editProfileModal");
    if (modal) modal.classList.remove("show");
};

window.addLocation = function () {
    const container = document.getElementById("locationsContainer");
    if (container) {
        const locationItem = document.createElement("div");
        locationItem.className = "location-item";
        locationItem.innerHTML = `
            <input type="text" class="form-input" placeholder="Enter location">
            <button type="button" class="btn-remove" onclick="removeLocation(this)">×</button>
        `;
        container.appendChild(locationItem);
    }
};

window.removeLocation = function (btn) {
    btn.parentElement.remove();
};

window.addSocialMedia = function () {
    const container = document.getElementById("socialMediaContainer");
    if (container) {
        const socialItem = document.createElement("div");
        socialItem.className = "social-item";
        socialItem.innerHTML = `
            <select class="form-select">
                <option value="facebook">Facebook</option>
                <option value="twitter">Twitter/X</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
                <option value="telegram">Telegram</option>
                <option value="website">Website</option>
            </select>
            <input type="text" class="form-input" placeholder="URL or username">
            <button type="button" class="btn-remove" onclick="removeSocial(this)">×</button>
        `;
        container.appendChild(socialItem);
    }
};

window.removeSocial = function (btn) {
    btn.parentElement.remove();
};









// ============================================
// FILTER FUNCTIONS WITH DRAFT SUPPORT
// ============================================

// Jobs filter
window.filterJobs = function(filter) {
    document.querySelectorAll('#jobs-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    window.contentLoader.loadJobs(filter);
};

// Podcasts filter with draft
window.filterPodcasts = function(filter) {
    document.querySelectorAll('#podcasts-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter podcasts based on status
    let podcasts = STATE.podcastPlaylists;
    if (filter === 'published') {
        podcasts = podcasts.filter(p => p.status !== 'draft');
    } else if (filter === 'draft') {
        podcasts = podcasts.filter(p => p.status === 'draft');
    }
    
    // Re-render podcasts
    Utils.showToast(`📻 Showing ${filter} podcasts`, "info");
};

// Videos filter with draft
window.filterVideos = function(filter) {
    document.querySelectorAll('#videos-content .video-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.filter === filter) {
            tab.classList.add('active');
        }
    });
    
    if (filter === 'draft') {
        // Show draft videos
        const drafts = STATE.videos.filter(v => v.status === 'draft');
        window.videosManager.showDrafts(drafts);
    } else if (filter === 'published') {
        // Show published videos
        const published = STATE.videos.filter(v => v.status !== 'draft');
        window.videosManager.showPublished(published);
    } else {
        // Use existing filter logic
        window.videosManager.filterVideos(filter);
    }
};

// Blogs filter with draft
window.filterBlogs = function(filter) {
    document.querySelectorAll('#blog-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    
    if (filter === 'draft') {
        // Show draft blogs
        const drafts = STATE.blogPosts.filter(b => b.status === 'draft');
        window.blogManager.showDrafts(drafts);
    } else if (filter === 'published') {
        // Show published blogs
        const published = STATE.blogPosts.filter(b => b.status !== 'draft');
        window.blogManager.showPublished(published);
    } else {
        window.blogManager.loadFilteredPosts(filter);
    }
};

// Clubs filter
window.filterClubs = function(filter) {
    document.querySelectorAll('#clubs-content .clubs-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    window.contentLoader.loadClubs(filter);
};

// My Products filter
window.filterMyProducts = function(filter) {
    document.querySelectorAll('#my-products-content .filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');
    window.contentLoader.loadMyProducts(filter);
};

// ============================================
// NEW MODAL AND ACTION FUNCTIONS
// ============================================

window.openCreateJobModal = function() {
    Utils.showToast("💼 Opening job creation form...", "info");
};

window.openStoreSetup = function() {
    Utils.showToast("🏪 Opening store setup wizard...", "info");
    // Could redirect to store setup page
    setTimeout(() => {
        window.location.href = "../branch/store-setup.html";
    }, 1000);
};

window.uploadBook = function() {
    Utils.showToast("📚 Opening book upload form...", "info");
};

window.openCreateClubModal = function() {
    Utils.showToast("🎭 Opening club creation form...", "info");
};

window.editJob = function(jobId) {
    Utils.showToast(`✏️ Editing job #${jobId}...`, "info");
};

window.publishJob = function(jobId) {
    if (confirm("Are you sure you want to publish this job post?")) {
        Utils.showToast("✅ Job post published successfully!", "success");
        // Update job status
        const job = STATE.jobPosts.find(j => j.id === jobId);
        if (job) {
            job.status = 'posted';
            job.postedDate = new Date();
            job.deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            job.applicants = 0;
        }
        window.contentLoader.loadJobs();
    }
};

window.viewApplicants = function(jobId) {
    Utils.showToast(`👥 Opening applicants for job #${jobId}...`, "info");
};

window.viewClubDetails = function(clubId) {
    Utils.showToast(`🎭 Opening club details...`, "info");
};

window.manageClub = function(clubId) {
    Utils.showToast(`⚙️ Opening club management...`, "info");
};

window.navigateToStore = function() {
    window.location.href = "../branch/store.html";
};

window.continueProduct = function(productId) {
    Utils.showToast("📚 Continuing course...", "info");
};

window.launchProduct = function(productId) {
    Utils.showToast("🚀 Launching software...", "info");
};

window.viewProduct = function(productId) {
    Utils.showToast("📦 Opening product details...", "info");
};



window.debugFooterLift = function() {
    const footer = document.querySelector('.footer-section');
    const sidebar = document.querySelector('.left-sidebar');
    
    if (footer && sidebar) {
        const footerRect = footer.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const footerVisible = footerRect.top < windowHeight;
        const visibleHeight = footerVisible ? windowHeight - footerRect.top : 0;
        
        console.log('Debug Info:');
        console.log('Footer top:', footerRect.top);
        console.log('Footer height:', footerRect.height);
        console.log('Window height:', windowHeight);
        console.log('Footer visible:', footerVisible);
        console.log('Visible height:', visibleHeight);
        console.log('Current offset:', sidebar.style.getPropertyValue('--footer-offset'));
        console.log('Has footer-visible class:', sidebar.classList.contains('footer-visible'));
        console.log('Sidebar element exists:', !!sidebar);
        
        // Try to apply lift manually for testing
        if (footerVisible && visibleHeight > 20) {
            const testLift = Math.min(visibleHeight * 0.8, 300);
            console.log('🔧 TEST: Should lift by', testLift + 'px');
        }
    }
};



// ============================================
// INITIALIZATION ON DOM READY - MERGED
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    // Initialize main app
    const app = new TrainingCenterProfile();

    // Replace content loader with updated version for institute profile
    window.contentLoader = new UpdatedContentLoader();
    
    // Initialize community manager
    window.communityManager = new CommunityManager();

    // Make managers globally available
    window.trainingCenterProfile = app;
    window.notificationsManager = app.notifications;
    window.modalsManager = app.modals;
    window.eventsManager = app.events;
    window.analyticsManager = app.analytics;
    window.weatherManager = app.weather;
    window.videosManager = app.videos;
    window.playlistsManager = app.playlists;
    window.blogManager = app.blog;
    window.commentsManager = app.comments;
    window.podcastsManager = app.podcasts;
    
    // Update app references with new managers
    app.content = window.contentLoader;
    app.community = window.communityManager;
    delete app.followers; // Remove old followers reference

    // Expose utility functions
    window.Utils = Utils;

    // Expose individual functions for HTML onclick handlers
    window.toggleTheme = () => app.theme.toggle();
    window.toggleSidebar = () => app.sidebar.toggle();

    // Modal functions
window.openScheduleModal = () => app.modals.open("create-session-modal");  // FIXED
window.closeScheduleModal = () => app.modals.close("create-session-modal"); // FIXED
window.openEditProfileModal = () => app.modals.open("edit-profile-modal");  // FIXED
window.closeEditProfileModal = () => app.modals.close("edit-profile-modal"); // FIXED
    window.openFollowersModal = (type) => window.communityManager.open(type); // Updated
    window.closeCommunityModal = () => window.communityManager.close(); // Updated
    window.openUploadVideoModal = () => app.modals.open("uploadVideoModal");
    window.closeUploadVideoModal = () => app.modals.close("uploadVideoModal");
    window.openCreateBlogModal = () => app.modals.open("createBlogModal");
    window.closeCreateBlogModal = () => app.modals.close("createBlogModal");
    window.publishBlog = () => app.blog.publishBlog();
    window.openCommentsModal = () => app.comments.open();
    window.closeCommentsModal = () => app.comments.close();
    window.openAdAnalyticsModal = () => app.modals.open("adAnalyticsModal");
    window.closeAdAnalyticsModal = () => app.modals.close("adAnalyticsModal");
    window.openAllEventsModal = () => app.events.viewAllEvents();
    window.openAnalyticsModal = () => app.analytics.openModal();

    // Podcast functions
    window.createPodcast = () => Utils.showToast("🎙️ Opening podcast recorder...", "info");

    // Navigation functions
    window.navigateToNews = (category = "all") => {
        window.location.href = `../branch/news.html?category=${category}`;
    };

    window.navigateToMarket = () => {
        window.location.href = "../branch/yeneta-exchange.html";
    };

    // Video functions
    window.goLive = () => app.videos.goLive();

    // Additional helper functions
    window.syncGoogleCalendar = function() {
        Utils.showToast('📅 Connecting to Google Calendar...', 'info');
        setTimeout(() => {
            Utils.showToast('✅ Google Calendar connected!', 'success');
        }, 2000);
    };

    window.syncOutlookCalendar = function() {
        Utils.showToast('📆 Connecting to Outlook Calendar...', 'info');
        setTimeout(() => {
            Utils.showToast('✅ Outlook Calendar connected!', 'success');
        }, 2000);
    };

    window.openJobDetailModal = function(jobId) {
        Utils.showToast(`💼 Opening job details #${jobId}...`, 'info');
    };


    // Add missing global functions
window.shareProfile = function() {
    const profileUrl = window.location.href;
    if (navigator.share) {
        navigator.share({
            title: 'Check out my tutor profile',
            url: profileUrl
        }).catch(err => console.log('Share failed:', err));
    } else {
        // Fallback - copy to clipboard
        navigator.clipboard.writeText(profileUrl);
        Utils.showToast('📋 Profile link copied to clipboard!', 'success');
    }
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('leftSidebar');
    const mainContainer = document.querySelector('.main-container');
    
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        if (mainContainer) {
            mainContainer.classList.toggle('sidebar-collapsed');
        }
    }
};

    window.openMyClassesModal = function() {
        Utils.showToast('📚 Opening your classes...', 'info');
    };

    window.openConnectModal = function() {
        Utils.showToast("🔗 Opening connection options...", "info");
    };

    window.openClassModal = function() {
        Utils.showToast("📚 Opening class creation...", "info");
    };

    window.openJobModal = function() {
        Utils.showToast("💼 Opening job posting...", "info");
    };

    window.createGroup = function() {
        Utils.showToast("👥 Opening group creation...", "info");
    };

    window.previewThumbnail = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById("thumbnailPreview");
                const img = preview.querySelector("img");
                const placeholder = preview.querySelector(".upload-placeholder");

                if (img) {
                    img.src = e.target.result;
                    img.style.display = "block";
                }
                if (placeholder) {
                    placeholder.style.display = "none";
                }
            };
            reader.readAsDataURL(file);
        }
    };

    window.uploadVideo = function() {
        window.videosManager?.uploadVideo();
    };

    window.startAdvertising = function() {
        Utils.showToast("📧 Opening advertising registration...", "info");
        setTimeout(() => {
            window.location.href = "#advertising-signup";
        }, 1000);
    };

    console.log("✅ Training Center Profile fully initialized!");
    console.log("✅ Institute Profile Updates Loaded!");
});

// Ensure modal styles
function ensureModalStyles() {
    document.querySelectorAll(".modal").forEach((modal) => {
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100%";
        modal.style.height = "100%";
        modal.style.zIndex = "10000";
        modal.style.display = "none";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
    });
}

// Call to ensure styles on load
ensureModalStyles();
