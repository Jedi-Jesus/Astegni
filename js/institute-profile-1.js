// ============================================
// TRAINING CENTER PROFILE - PART 1
// ============================================

// Global configuration
const CONFIG = {
  animation: {
    duration: 300,
    easing: "ease-out",
    stagger: 100,
  },
  realtime: {
    updateInterval: 3000,
    chartUpdateInterval: 5000,
  },
};

// State management
const STATE = {
  currentTheme: localStorage.getItem("theme") || "light",
  currentMetric: "views",
  scheduledEvents: [],
  analyticsChart: null,
  animationFrame: null,
  notifications: [],
  followers: [],
  following: [],
  videos: [],
  playlists: [],
  blogPosts: [],
  comments: [],
  joinedGroups: new Set(),
  podcastPlaylists: [],
};

// ============================================
// MAIN APPLICATION CLASS
// ============================================
class TrainingCenterProfile {
  constructor() {
    this.initializeModules();
    this.attachEventListeners();
    this.loadSavedData();
    this.initializeData();
    this.initializeFooterObserver();
  }

  initializeModules() {
    this.theme = new ThemeManager();
    this.sidebar = new SidebarContentManager();
    this.fab = new FABManager();
    this.notifications = new NotificationsManager();
    this.analytics = new AnalyticsManager();
    this.events = new EventsManager();
    this.modals = new ModalsManager();
    this.content = new ContentLoader();
    this.animations = new AnimationsManager();
    this.widgets = new WidgetsManager();
    this.weather = new WeatherManager();
    this.followers = new FollowersManager();
    this.videos = new VideosManager();
    this.playlists = new PlaylistsManager();
    this.blog = new BlogManager();
    this.comments = new CommentsManager();
    this.podcasts = new PodcastsManager();
  }

  initializeFooterObserver() {
    const footer = document.querySelector(".footer-section");
    const sidebar = document.querySelector(".left-sidebar");

    if (!footer || !sidebar) {
      console.warn("Footer or sidebar not found");
      return;
    }

    // Function to update sidebar position
    const updateSidebarPosition = () => {
      const footerRect = footer.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Check if footer is visible
      if (footerRect.top < windowHeight) {
        // Calculate how much of the footer is visible
        const visibleHeight = windowHeight - footerRect.top;
        const liftAmount = Math.min(Math.max(0, visibleHeight * 0.8), 300); // Max 300px

        // Apply the lift
        if (liftAmount > 20) {
          sidebar.style.setProperty("--footer-offset", `${liftAmount}px`);
          sidebar.classList.add("footer-visible");

          // Only add animation class once
          if (!sidebar.dataset.animated) {
            sidebar.classList.add("footer-animating");
            sidebar.dataset.animated = "true";
            setTimeout(() => {
              sidebar.classList.remove("footer-animating");
            }, 800);
          }

          console.log(`✅ Sidebar lifted by ${liftAmount}px`);
        }
      } else {
        // Footer not visible - reset
        sidebar.style.setProperty("--footer-offset", "0px");
        sidebar.classList.remove("footer-visible");
        sidebar.classList.remove("footer-animating");
        delete sidebar.dataset.animated;
      }
    };

    // Update on scroll with requestAnimationFrame for smoothness
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateSidebarPosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    // Attach scroll listener
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Initial check
    updateSidebarPosition();

    // Also check on window resize
    window.addEventListener("resize", updateSidebarPosition);

    console.log("✅ Footer observer initialized");
  }

  // Add this test method to the class
  testFooterAnimation() {
    console.log("🧪 Testing footer animation...");
    const sidebar = document.querySelector(".left-sidebar");

    if (sidebar) {
      // Temporarily add classes to test
      setTimeout(() => {
        console.log("🎯 Test: Adding footer-visible class");
        sidebar.style.setProperty("--footer-offset", "200px");
        sidebar.classList.add("footer-visible");
        sidebar.classList.add("footer-animating");

        setTimeout(() => {
          sidebar.classList.remove("footer-animating");
          console.log("🎯 Test: Animation should be visible now");

          // Reset after 3 seconds
          setTimeout(() => {
            sidebar.style.setProperty("--footer-offset", "0px");
            sidebar.classList.remove("footer-visible");
            console.log("🎯 Test: Reset to normal");
          }, 3000);
        }, 800);
      }, 1000);
    }
  }

  // Enhanced updateSidebarPosition method
  updateSidebarPosition() {
    const footer = document.querySelector(".footer-section");
    const sidebar = document.querySelector(".left-sidebar");

    if (!footer || !sidebar) return;

    const footerRect = footer.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    if (footerRect.top < windowHeight) {
      // Calculate visible footer height with easing
      const visibleFooterHeight = Math.min(
        footerRect.height,
        windowHeight - footerRect.top
      );

      // Apply easing function for smooth transition
      const easedOffset =
        this.easeInOutCubic(visibleFooterHeight / footerRect.height) *
        visibleFooterHeight;

      // Add padding for better visual separation
      const finalOffset = Math.max(0, easedOffset + 20);

      requestAnimationFrame(() => {
        sidebar.style.setProperty("--footer-offset", `${finalOffset}px`);

        if (visibleFooterHeight > 10) {
          sidebar.classList.add("footer-visible");
        } else {
          sidebar.classList.remove("footer-visible");
        }
      });
    } else {
      requestAnimationFrame(() => {
        sidebar.style.setProperty("--footer-offset", "0px");
        sidebar.classList.remove("footer-visible");
      });
    }
  }

  // Easing function for smooth animation
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  attachEventListeners() {
    // Global keyboard events
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.modals.closeAll();
        this.fab.close();
      }
    });

    // Window resize handler
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this.handleResize(), 250);
    });
  }

  loadSavedData() {
    // Load theme
    const savedTheme = localStorage.getItem("theme") || "light";
    this.theme.apply(savedTheme);

    // Load events
    const savedEvents = localStorage.getItem("scheduledEvents");
    if (savedEvents) {
      STATE.scheduledEvents = JSON.parse(savedEvents);
      this.events.updateWidget();
    }

    // Load joined groups
    const savedGroups = localStorage.getItem("joinedGroups");
    if (savedGroups) {
      STATE.joinedGroups = new Set(JSON.parse(savedGroups));
    }

    // Load profile data
    const savedProfile = localStorage.getItem("profileData");
    if (savedProfile) {
      const profileData = JSON.parse(savedProfile);
      this.applyProfileData(profileData);
    }
  }

  applyProfileData(data) {
    if (data.companyName) {
      const nameElement = document.getElementById("centerName");
      if (nameElement) nameElement.textContent = data.companyName;
    }
    if (data.quote) {
      const quoteElement = document.getElementById("profileQuote");
      if (quoteElement) quoteElement.textContent = data.quote;
    }
    if (data.about) {
      const aboutElement = document.getElementById("aboutText");
      if (aboutElement) aboutElement.textContent = data.about;
    }
    if (data.location) {
      const locationElement = document.getElementById("locationText");
      if (locationElement) locationElement.textContent = data.location;
    }
  }

  initializeData() {
    // Initialize mock data
    this.initializeMockData();
  }

  initializeMockData() {
    // Mock followers data
    STATE.followers = this.generateMockFollowers(45200);
    STATE.following = this.generateMockFollowing(892);

    // Mock videos
    STATE.videos = this.generateMockVideos(50);

    // Mock playlists
    STATE.playlists = this.generateMockPlaylists(10);

    // Mock podcast playlists
    STATE.podcastPlaylists = this.generateMockPodcastPlaylists(5);

    // Mock blog posts with full content
    STATE.blogPosts = this.generateMockBlogPosts(25);

    // Mock comments
    STATE.comments = this.generateMockComments(100);
  }

  generateMockFollowers(count) {
    const followers = [];
    const names = [
      "John Smith",
      "Sarah Johnson",
      "Mike Davis",
      "Emma Wilson",
      "Chris Brown",
      "Lisa Anderson",
      "Tom Miller",
      "Amy Garcia",
    ];
    const professions = [
      "Film Director",
      "Video Editor",
      "Cinematographer",
      "Producer",
      "Screenwriter",
      "Actor",
      "Sound Designer",
      "VFX Artist",
    ];

    for (let i = 0; i < Math.min(count, 100); i++) {
      followers.push({
        id: `follower-${i}`,
        name: names[Math.floor(Math.random() * names.length)] + ` ${i}`,
        profession: professions[Math.floor(Math.random() * professions.length)],
        avatar: `https://i.pravatar.cc/150?img=${i + 1}`,
        isOnline: Math.random() > 0.7,
        isLive: Math.random() > 0.95,
        isConnected: Math.random() > 0.8,
        isFollowing: Math.random() > 0.5,
      });
    }
    return followers;
  }

  generateMockFollowing(count) {
    return this.generateMockFollowers(count).map((f) => ({
      ...f,
      id: `following-${f.id}`,
      isFollowing: true,
    }));
  }

  generateMockVideos(count) {
    const videos = [];
    const titles = [
      "Introduction to Cinematography",
      "Advanced Editing Techniques",
      "Color Grading Masterclass",
      "Sound Design Basics",
    ];

    for (let i = 0; i < count; i++) {
      videos.push({
        id: `video-${i}`,
        title:
          titles[i % titles.length] +
          ` Part ${Math.floor(i / titles.length) + 1}`,
        views: Math.floor(Math.random() * 100000),
        duration: `${Math.floor(Math.random() * 30 + 5)}:${Math.floor(
          Math.random() * 60
        )
          .toString()
          .padStart(2, "0")}`,
        thumbnail: `https://picsum.photos/400/225?random=${i}`,
        uploadDate: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        ),
        isLive: Math.random() > 0.95,
      });
    }
    return videos;
  }

  generateMockPlaylists(count) {
    const playlists = [];
    const names = [
      "Beginner Course",
      "Advanced Techniques",
      "Professional Tips",
      "Student Projects",
    ];

    for (let i = 0; i < count; i++) {
      playlists.push({
        id: `playlist-${i}`,
        name: names[i % names.length],
        videoCount: Math.floor(Math.random() * 20 + 5),
        thumbnail: `https://picsum.photos/400/225?random=playlist${i}`,
        duration: `${Math.floor(Math.random() * 10 + 2)}h ${Math.floor(
          Math.random() * 60
        )}m`,
        type: "video",
      });
    }
    return playlists;
  }

  generateMockPodcastPlaylists(count) {
    const playlists = [];
    const names = [
      "Industry Insights",
      "Student Success Stories",
      "Technical Tutorials",
      "Creative Process",
    ];

    for (let i = 0; i < count; i++) {
      playlists.push({
        id: `podcast-playlist-${i}`,
        name: names[i % names.length],
        episodeCount: Math.floor(Math.random() * 15 + 5),
        thumbnail: `https://picsum.photos/400/400?random=podcast${i}`,
        totalDuration: `${Math.floor(Math.random() * 20 + 5)}h`,
        type: "podcast",
      });
    }
    return playlists;
  }

  generateMockBlogPosts(count) {
    const posts = [];
    const titles = [
      "10 Tips for Better Film Making",
      "Understanding Camera Settings",
      "The Art of Storytelling",
      "Post-Production Workflow",
    ];

    const fullContent = `
            <h2>Introduction</h2>
            <p>Welcome to this comprehensive guide on film making. In this article, we'll explore the essential techniques and strategies that will help you create compelling visual narratives.</p>
            
            <h3>Key Concepts</h3>
            <p>Film making is an art form that combines technical expertise with creative vision. Whether you're a beginner or an experienced filmmaker, understanding the fundamentals is crucial for success.</p>
            
            <h3>Technical Aspects</h3>
            <ul>
                <li>Camera Settings and Configurations</li>
                <li>Lighting Techniques</li>
                <li>Sound Recording Best Practices</li>
                <li>Post-Production Workflow</li>
            </ul>
            
            <h3>Creative Considerations</h3>
            <p>Beyond the technical aspects, successful film making requires a deep understanding of storytelling, composition, and emotional impact. Each frame should serve a purpose in advancing your narrative.</p>
            
            <h3>Conclusion</h3>
            <p>By mastering both the technical and creative aspects of film making, you'll be well-equipped to bring your vision to life. Remember, practice and experimentation are key to developing your unique style.</p>
        `;

    for (let i = 0; i < count; i++) {
      posts.push({
        id: `blog-${i}`,
        title: titles[i % titles.length],
        excerpt: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
        content: fullContent,
        author: "Zenith Academy",
        date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        image: `https://picsum.photos/600/400?random=blog${i}`,
        readTime: `${Math.floor(Math.random() * 10 + 3)} min read`,
        likes: Math.floor(Math.random() * 500),
        comments: Math.floor(Math.random() * 50),
      });
    }
    return posts;
  }

  generateMockComments(count) {
    const comments = [];
    const authors = [
      "Student User",
      "Professional Editor",
      "Film Enthusiast",
      "Industry Expert",
    ];

    for (let i = 0; i < count; i++) {
      comments.push({
        id: `comment-${i}`,
        author: authors[i % authors.length] + ` ${i}`,
        avatar: `https://i.pravatar.cc/150?img=${i + 20}`,
        text: "This is an amazing course! I learned so much from it.",
        rating: Math.floor(Math.random() * 2 + 4),
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        likes: Math.floor(Math.random() * 100),
        replies: [],
      });
    }
    return comments;
  }

  handleResize() {
    const width = window.innerWidth;
    const isMobile = width <= 768;
    const isTablet = width <= 1024;

    document.body.classList.toggle("mobile", isMobile);
    document.body.classList.toggle("tablet", isTablet && !isMobile);
    document.body.classList.toggle("desktop", !isTablet);
  }
}

// ============================================
// THEME MANAGER - ENHANCED
// ============================================
class ThemeManager {
  constructor() {
    this.root = document.documentElement;
    this.toggleBtn = document.querySelector(".theme-toggle");
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener("click", () => this.toggle());
    }
    // Apply saved theme on initialization
    this.apply(STATE.currentTheme);
  }

  apply(theme) {
    STATE.currentTheme = theme;

    // Update attributes
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);

    // Update toggle button
    if (this.toggleBtn) {
      this.toggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
    }

    localStorage.setItem("theme", theme);

    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent("themeChanged", { detail: theme }));
  }

  toggle() {
    const newTheme = STATE.currentTheme === "dark" ? "light" : "dark";
    this.apply(newTheme);
    Utils.showToast(`Theme changed to ${newTheme} mode`, "success");
  }
}

// ============================================
// SIDEBAR MANAGER - ENHANCED
// ============================================
// ============================================
// SIDEBAR CONTENT MANAGER - RENAMED TO AVOID CONFLICT
// ============================================
class SidebarContentManager {
  constructor() {
    this.sidebar = document.querySelector(".left-sidebar");
    this.toggleBtn = document.querySelector(".sidebar-toggle");
    this.buttons = document.querySelectorAll(".sidebar-btn");
    this.panels = document.querySelectorAll(".sidebar-content-panel");
    this.mainContainer = document.querySelector(".main-container");

    this.init();
  }

  init() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener("click", () => this.toggle());
    }

    this.buttons.forEach((btn) => {
      btn.addEventListener("click", () => this.switchContent(btn));
    });

    // Initialize sidebar state
    const savedState = localStorage.getItem("sidebarState");
    if (savedState === "closed") {
      this.sidebar?.classList.add("closed");
      this.mainContainer?.classList.add("sidebar-closed");
    }
  }

  toggle() {
    this.sidebar?.classList.toggle("closed");
    this.mainContainer?.classList.toggle("sidebar-closed");

    const isClosed = this.sidebar?.classList.contains("closed");

    if (this.toggleBtn) {
      this.toggleBtn.style.transform = isClosed
        ? "rotate(180deg)"
        : "rotate(0)";
    }

    // Save state
    localStorage.setItem("sidebarState", isClosed ? "closed" : "open");
  }

  switchContent(button) {
    // Remove active from all buttons
    this.buttons.forEach((btn) => btn.classList.remove("active"));

    // Add active to clicked button
    button.classList.add("active");

    // Hide all panels with fade out
    this.panels.forEach((panel) => {
      if (panel.classList.contains("active")) {
        panel.style.animation = "fadeOut 0.3s ease";
        setTimeout(() => {
          panel.classList.remove("active");
          panel.style.display = "none";
        }, 300);
      }
    });

    // Show target panel with fade in
    const contentType = button.dataset.content;
    setTimeout(() => {
      const targetPanel = document.getElementById(`${contentType}-content`);
      if (targetPanel) {
        targetPanel.style.display = "block";
        targetPanel.classList.add("active");
        targetPanel.style.animation = "fadeIn 0.5s ease";

        // Load content for the panel
        if (window.contentLoader) {
          window.contentLoader.load(contentType);
        }
      }
    }, 350);
  }
}
// Add this after your sidebar navigation handler
function checkActiveDelivery() {
    // Mock a booked delivery for testing
    const hasActiveDelivery = true; // Set to true for mock scenario
    
    const noDeliveryDiv = document.querySelector('.no-active-delivery');
    const activeDeliveryDiv = document.querySelector('.active-delivery-content');
    
    if (hasActiveDelivery) {
        if (noDeliveryDiv) noDeliveryDiv.style.display = 'none';
        if (activeDeliveryDiv) activeDeliveryDiv.style.display = 'block';
        // Load mock delivery data
        loadMockDeliveryData();
    } else {
        if (noDeliveryDiv) noDeliveryDiv.style.display = 'block';
        if (activeDeliveryDiv) activeDeliveryDiv.style.display = 'none';
    }
}

function loadMockDeliveryData() {
    // Update order details with mock data
    const orderElements = {
        '#YOUR-ORDER-ID': '#DLV-2024-ET-1234',
        'Your items': 'Books (3 items)',
        '15 minutes': '25 minutes',
        'Your Address': 'Bole, Near Edna Mall'
    };
    
    Object.keys(orderElements).forEach(oldText => {
        const elements = document.querySelectorAll('.info-value');
        elements.forEach(el => {
            if (el.textContent === oldText) {
                el.textContent = orderElements[oldText];
            }
        });
    });
}

// ============================================
// FAB MANAGER
// ============================================
class FABManager {
  constructor() {
    this.container = document.querySelector(".fab-container");
    this.mainBtn = document.getElementById("main-fab");
    this.init();
  }

  init() {
    if (!this.mainBtn || !this.container) return;

    this.mainBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (!this.container.contains(e.target)) {
        this.close();
      }
    });
  }

  toggle() {
    this.container.classList.toggle("active");
    this.mainBtn.classList.toggle("active");

    const icon = this.mainBtn.querySelector(".fab-icon");
    if (icon) {
      icon.style.transform = this.container.classList.contains("active")
        ? "rotate(45deg)"
        : "rotate(0)";
    }
  }

  close() {
    this.container.classList.remove("active");
    this.mainBtn.classList.remove("active");
    const icon = this.mainBtn.querySelector(".fab-icon");
    if (icon) {
      icon.style.transform = "rotate(0)";
    }
  }
}

// ============================================
// NOTIFICATIONS MANAGER - FIXED
// ============================================
class NotificationsManager {
  constructor() {
    this.btn = document.querySelector(".notification-btn");
    this.modal = null;
    this.notifications = this.generateNotifications();
    this.init();
  }

  init() {
    if (this.btn) {
      this.btn.addEventListener("click", (e) => {
        e.preventDefault();
        this.open();
      });
    }
    this.createModal();
    this.updateBadge();
  }

  generateNotifications() {
    return [
      {
        id: 1,
        type: "event",
        icon: "🎬",
        title: "Live Event Starting Soon",
        message:
          "Film Production Masterclass starts in 2 hours. 156 students attending.",
        time: "2 hours ago",
        unread: true,
        action: "Join Event",
      },
      {
        id: 2,
        type: "mention",
        icon: "💬",
        title: "New Comment on Your Course",
        message:
          'John Smith: "This course is amazing! The content quality is exceptional."',
        time: "3 hours ago",
        unread: true,
        action: "View Comment",
      },
      {
        id: 3,
        type: "courses",
        icon: "📚",
        title: "Course Update Available",
        message:
          "New materials added to Advanced Cinematography - Chapter 5: Lighting Techniques",
        time: "5 hours ago",
        unread: true,
        action: "View Course",
      },
      {
        id: 4,
        type: "system",
        icon: "🔔",
        title: "New Feature Available",
        message: "Check out the new analytics dashboard for better insights",
        time: "1 day ago",
        unread: false,
        action: "Learn More",
      },
      {
        id: 5,
        type: "social",
        icon: "👥",
        title: "New Followers",
        message: "You have 25 new followers this week",
        time: "2 days ago",
        unread: false,
        action: "View Followers",
      },
    ];
  }

  createModal() {
    if (!document.getElementById("notificationsModal")) {
      const modal = document.createElement("div");
      modal.id = "notificationsModal";
      modal.className = "modal";
      modal.innerHTML = this.getModalHTML();
      document.body.appendChild(modal);
      this.modal = modal;
      this.attachModalEvents();
    }
  }

  getModalHTML() {
    return `
            <div class="modal-overlay" onclick="window.notificationsManager.close()"></div>
            <div class="modal-content notifications-modal">
                <div class="modal-header">
                    <h2>
                        <span style="font-size: 1.5rem;">🔔</span>
                        Notifications
                        <span class="notification-count">${
                          this.notifications.filter((n) => n.unread).length
                        } new</span>
                    </h2>
                    <button class="modal-close" onclick="window.notificationsManager.close()">×</button>
                </div>
                <div class="modal-body">
                    <div class="notifications-tabs">
                        <button class="notification-tab active" data-filter="all">All</button>
                        <button class="notification-tab" data-filter="unread">Unread</button>
                        <button class="notification-tab" data-filter="mentions">Mentions</button>
                        <button class="notification-tab" data-filter="events">Events</button>
                    </div>
                    <div class="notifications-list">
                        ${this.renderNotifications()}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="window.notificationsManager.markAllRead()">Mark All as Read</button>
                    <button class="btn-primary" onclick="window.notificationsManager.openSettings()">
                        <span>⚙️</span> Settings
                    </button>
                </div>
            </div>
        `;
  }

  renderNotifications() {
    return this.notifications
      .map(
        (notif, index) => `
            <div class="notification-item ${
              notif.unread ? "unread" : ""
            }" data-type="${notif.type}" data-id="${notif.id}">
                <div class="notification-icon">${notif.icon}</div>
                <div class="notification-content">
                    <h4>${notif.title}</h4>
                    <p>${notif.message}</p>
                    <div class="notification-footer">
                        <span class="notification-time">⏰ ${notif.time}</span>
                        ${
                          notif.action
                            ? `<button class="notification-action-link" onclick="window.notificationsManager.handleAction(${notif.id}, '${notif.action}')">${notif.action}</button>`
                            : ""
                        }
                    </div>
                </div>
                <div class="notification-actions">
                    ${notif.unread ? '<span class="unread-dot"></span>' : ""}
                    <button class="notification-action-btn" onclick="window.notificationsManager.dismiss(${
                      notif.id
                    })">×</button>
                </div>
            </div>
        `
      )
      .join("");
  }

  attachModalEvents() {
    if (!this.modal) return;

    this.modal.querySelectorAll(".notification-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        this.filterNotifications(e.target.dataset.filter);
        this.modal
          .querySelectorAll(".notification-tab")
          .forEach((t) => t.classList.remove("active"));
        e.target.classList.add("active");
      });
    });
  }

  filterNotifications(filter) {
    const items = this.modal.querySelectorAll(".notification-item");
    items.forEach((item) => {
      if (filter === "all") {
        item.style.display = "flex";
      } else if (filter === "unread") {
        item.style.display = item.classList.contains("unread")
          ? "flex"
          : "none";
      } else {
        item.style.display = item.dataset.type === filter ? "flex" : "none";
      }
    });
  }

  handleAction(notifId, action) {
    const notification = this.notifications.find((n) => n.id === notifId);

    switch (action) {
      case "Join Event":
        this.close();
        Utils.showToast("🎬 Joining the live event...", "success");
        setTimeout(() => {
          window.location.href = "#live-event";
        }, 1000);
        break;
      case "View Comment":
        this.close();
        window.commentsManager.open();
        break;
      case "View Course":
        this.close();
        Utils.showToast("📚 Opening course materials...", "info");
        break;
      case "Learn More":
        this.close();
        window.analyticsManager.openModal();
        break;
      case "View Followers":
        this.close();
        window.followersManager.open("followers");
        break;
    }

    // Mark as read
    this.markAsRead(notifId);
  }

  markAsRead(notifId) {
    const notification = this.notifications.find((n) => n.id === notifId);
    if (notification) {
      notification.unread = false;
      this.updateNotificationItem(notifId);
      this.updateBadge();
    }
  }

  updateNotificationItem(notifId) {
    const item = this.modal?.querySelector(
      `.notification-item[data-id="${notifId}"]`
    );
    if (item) {
      item.classList.remove("unread");
      const dot = item.querySelector(".unread-dot");
      if (dot) dot.remove();
    }
  }

  updateBadge() {
    const badge = document.querySelector(".notification-badge");
    const unreadCount = this.notifications.filter((n) => n.unread).length;

    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    }

    // Update modal count
    const modalCount = this.modal?.querySelector(".notification-count");
    if (modalCount) {
      modalCount.textContent = `${unreadCount} new`;
    }
  }

  dismiss(notifId) {
    const index = this.notifications.findIndex((n) => n.id === notifId);
    if (index !== -1) {
      this.notifications.splice(index, 1);

      const item = this.modal?.querySelector(
        `.notification-item[data-id="${notifId}"]`
      );
      if (item) {
        item.style.animation = "slideOutRight 0.3s ease";
        setTimeout(() => item.remove(), 300);
      }

      this.updateBadge();
      Utils.showToast("Notification dismissed", "info");
    }
  }

  markAllRead() {
    this.notifications.forEach((n) => (n.unread = false));
    this.modal.querySelectorAll(".notification-item.unread").forEach((item) => {
      item.classList.remove("unread");
      const dot = item.querySelector(".unread-dot");
      if (dot) dot.remove();
    });
    this.updateBadge();
    Utils.showToast("✅ All notifications marked as read", "success");
  }

  openSettings() {
    this.close();
    Utils.showToast("⚙️ Opening notification settings...", "info");
  }

  open() {
    if (this.modal) {
      this.modal.classList.add("show");
      this.modal.style.display = "flex";
      // Remove pulse from badge
      const badge = document.querySelector(".notification-badge");
      if (badge) badge.classList.remove("pulse");
    }
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove("show");
      setTimeout(() => {
        this.modal.style.display = "none";
      }, 300);
    }
  }
}

// AI Insights Management System
const AIInsights = {
  currentTab: "suggestions",

  // Initialize AI Insights
  init() {
    this.bindEvents();
    this.loadInsights();
    this.startRealTimeUpdates();
  },

  // Bind UI events
  bindEvents() {
    // Handle sidebar button click
    document.querySelectorAll(".sidebar-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const content = btn.getAttribute("data-content");
        if (content === "ai-insights") {
          this.showAIInsights();
        }
      });
    });
  },

  // Show AI Insights panel
  showAIInsights() {
    // Hide all panels
    document.querySelectorAll(".sidebar-content-panel").forEach((panel) => {
      panel.classList.remove("active");
    });

    // Show AI Insights panel
    const aiPanel = document.getElementById("ai-insights-content");
    if (aiPanel) {
      aiPanel.classList.add("active");
      this.loadInsights();
    }

    // Update sidebar button state
    document.querySelectorAll(".sidebar-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document
      .querySelector('.sidebar-btn[data-content="ai-insights"]')
      .classList.add("active");
  },

  // Load AI insights data
  loadInsights() {
    // Simulate loading AI-generated insights
    console.log("Loading AI insights...");
    this.updateSuggestions();
    this.updatePredictions();
    this.updateTrends();
  },

  // Update suggestions
  updateSuggestions() {
    // This would fetch real AI suggestions from your backend
    const suggestions = this.generateSuggestions();
    // Update UI with suggestions
  },

  // Generate sample suggestions
  generateSuggestions() {
    return [
      {
        type: "trending",
        priority: "high",
        title: "Climate Tech Coverage",
        description: "Rising interest in climate technology",
        metrics: {
          trendGrowth: 340,
          estimatedViews: 50000,
          peakTime: "4 hours",
        },
      },
      {
        type: "timing",
        priority: "medium",
        title: "Optimal Publishing Window",
        description: "Best time for audience engagement",
        metrics: {
          audienceOnline: 89,
          engagementMultiplier: 3,
        },
      },
    ];
  },

  // Update predictions
  updatePredictions() {
    // Update performance prediction chart
    if (document.getElementById("performancePredictionChart")) {
      this.renderPredictionChart();
    }
  },

  // Update trends
  updateTrends() {
    // Fetch and display trending topics
    console.log("Updating trends...");
  },

  // Start real-time updates
  startRealTimeUpdates() {
    setInterval(() => {
      this.refreshMetrics();
    }, 30000); // Update every 30 seconds
  },

  // Refresh metrics
  refreshMetrics() {
    console.log("Refreshing AI metrics...");
    // Update live metrics
  },

  // Render prediction chart
  renderPredictionChart() {
    const canvas = document.getElementById("performancePredictionChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    // Render chart using Chart.js or similar library
    console.log("Rendering prediction chart...");
  },
};

// Tab switching function
function switchAITab(tabName) {
  // Hide all sections
  document.querySelectorAll(".ai-section").forEach((section) => {
    section.style.display = "none";
  });

  // Remove active class from all tabs
  document.querySelectorAll(".ai-tab").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Show selected section
  const sectionId = `ai-${tabName}`;
  const section = document.getElementById(sectionId);
  if (section) {
    section.style.display = "block";
  }

  // Add active class to selected tab
  event.target.classList.add("active");

  // Load content for the selected tab
  switch (tabName) {
    case "analytics":
      loadPredictiveAnalytics();
      break;
    case "optimization":
      loadOptimizationTools();
      break;
    case "trends":
      loadTrendAnalysis();
      break;
    case "audience":
      loadAudienceInsights();
      break;
  }
}

// Refresh AI Insights
function refreshAIInsights() {
  const refreshBtn = event.target;
  refreshBtn.classList.add("spinning");

  // Simulate refresh
  setTimeout(() => {
    AIInsights.loadInsights();
    refreshBtn.classList.remove("spinning");
    showNotification("AI Insights refreshed successfully", "success");
  }, 1500);
}

// Open AI Settings Modal
function openAISettingsModal() {
  // Create and show AI settings modal
  console.log("Opening AI settings...");
}

// Content creation functions
function startArticleWithTopic(topic) {
  console.log(`Starting article with topic: ${topic}`);
  // Open article editor with pre-filled topic
}

function viewTopicResearch(topic) {
  console.log(`Viewing research for topic: ${topic}`);
  // Open research panel for the topic
}

function schedulePost(time) {
  console.log(`Scheduling post for: ${time}`);
  // Open scheduling modal
}

function viewTimingAnalytics() {
  console.log("Viewing timing analytics...");
  // Show detailed timing analytics
}

function createContentPlan(category) {
  console.log(`Creating content plan for: ${category}`);
  // Open content planning tool
}

function viewAudienceAnalytics() {
  console.log("Viewing audience analytics...");
  // Show detailed audience analytics
}

function linkRelatedStories() {
  console.log("Linking related stories...");
  // Open story linking interface
}

// Optimization tools
function openHeadlineOptimizer() {
  console.log("Opening headline optimizer...");
  // Launch headline optimization tool
}

function openSEOAnalyzer() {
  console.log("Opening SEO analyzer...");
  // Launch SEO analysis tool
}

function checkReadability() {
  console.log("Checking readability...");
  // Launch readability checker
}

// Analytics loading functions
function loadPredictiveAnalytics() {
  console.log("Loading predictive analytics...");
  // Fetch and display predictive analytics
}

function loadOptimizationTools() {
  console.log("Loading optimization tools...");
  // Initialize optimization tools
}

function loadTrendAnalysis() {
  console.log("Loading trend analysis...");
  // Fetch and display trends
}

function loadAudienceInsights() {
  console.log("Loading audience insights...");
  // Fetch and display audience data
  renderDemographicsChart();
}

// Render demographics chart
function renderDemographicsChart() {
  const canvas = document.getElementById("demographicsChart");
  if (!canvas) return;

  // Render demographics chart
  console.log("Rendering demographics chart...");
}

// AI Tool functions
function openAIWriter() {
  console.log("Opening AI Writer...");
  // Open AI writing assistant
}

function openAIResearch() {
  console.log("Opening AI Research...");
  // Open AI research assistant
}

function openAIFactChecker() {
  console.log("Opening AI Fact Checker...");
  // Open fact checking tool
}

function openAITranslator() {
  console.log("Opening AI Translator...");
  // Open translation tool
}

function openAISummarizer() {
  console.log("Opening AI Summarizer...");
  // Open summarization tool
}

function openAIImageGen() {
  console.log("Opening AI Image Generator...");
  // Open image generation tool
}

// Notification helper
function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  // Add to page
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  // Remove after delay
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Add spinning animation CSS for refresh button
const style = document.createElement("style");
style.textContent = `
    .spinning {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transform: translateX(400px);
        transition: transform 0.3s ease;
        z-index: 9999;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification-success {
        background: #10b981;
        color: white;
    }
    
    .notification-error {
        background: #ef4444;
        color: white;
    }
    
    .notification-info {
        background: #3b82f6;
        color: white;
    }
`;
document.head.appendChild(style);

// ============================================
// COMMUNITY MANAGER (Renamed from FollowersManager)
// ============================================
class CommunityManager {
  constructor() {
    this.modal = null;
    this.currentTab = "followers";
    this.initModal();
  }

  initModal() {
    this.modal = document.getElementById("communityModal");
    if (this.modal) {
      this.attachEvents();
    }
  }

  attachEvents() {
    // Tab switching
    document.querySelectorAll(".community-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabType = tab.dataset.tab;
        this.switchTab(tabType);
      });
    });

    // Search functionality
    const searchInput = document.querySelector(
      ".community-modal .search-input"
    );
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.filterCommunity(e.target.value);
      });
    }

    // Close button
    const closeBtn = this.modal?.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.close());
    }

    // Overlay close
    const overlay = this.modal?.querySelector(".modal-overlay");
    if (overlay) {
      overlay.addEventListener("click", () => this.close());
    }
  }

  open(type = "followers") {
    this.currentTab = type;
    const modal = document.getElementById("communityModal");
    if (modal) {
      modal.classList.add("show");
      modal.style.display = "flex";
      this.loadContent(type);
      this.updateModalTitle(type);

      // Set active tab
      document.querySelectorAll(".community-tab").forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.tab === type);
      });
    }
  }

  close() {
    const modal = document.getElementById("communityModal");
    if (modal) {
      modal.classList.remove("show");
      setTimeout(() => {
        modal.style.display = "none";
      }, 300);
    }
  }

  switchTab(type) {
    this.currentTab = type;
    document.querySelectorAll(".community-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === type);
    });
    this.loadContent(type);
    this.updateModalTitle(type);
  }

  updateModalTitle(type) {
    const title = document.getElementById("communityModalTitle");
    if (title) {
      const titles = {
        followers: "Followers",
        following: "Following",
        groups: "Community Groups",
        clubs: "Institute Clubs",
      };
      title.textContent = titles[type] || "Community";
    }
  }

  loadContent(type) {
    const communityList = document.getElementById("communityList");
    if (!communityList) return;

    switch (type) {
      case "followers":
        this.loadFollowers(communityList);
        break;
      case "following":
        this.loadFollowing(communityList);
        break;
      case "groups":
        this.loadGroups(communityList);
        break;
      case "clubs":
        this.loadClubs(communityList);
        break;
    }
  }

  loadFollowers(container) {
    const followers = STATE.followers;
    container.innerHTML = followers
      .map(
        (user, index) => `
            <div class="follower-card animated-entry" style="animation-delay: ${
              index * 0.05
            }s">
                <div class="follower-header">
                    <img src="${user.avatar}" alt="${
          user.name
        }" class="follower-avatar">
                    ${user.isLive ? '<span class="live-badge">LIVE</span>' : ""}
                    ${user.isOnline ? '<span class="online-badge"></span>' : ""}
                </div>
                <div class="follower-info">
                    <h4>${user.name}</h4>
                    <p>${user.profession}</p>
                </div>
                <div class="follower-actions">
                    ${
                      !user.isFollowing
                        ? `<button class="btn-follow-back" onclick="window.communityManager.followBack('${user.id}')">Follow Back</button>`
                        : ""
                    }
                    <button class="btn-connect" onclick="window.communityManager.connect('${
                      user.id
                    }')">Connect</button>
                </div>
            </div>
        `
      )
      .join("");
  }

  loadFollowing(container) {
    const following = STATE.following;
    container.innerHTML = following
      .map(
        (user, index) => `
            <div class="follower-card animated-entry" style="animation-delay: ${
              index * 0.05
            }s">
                <div class="follower-header">
                    <img src="${user.avatar}" alt="${
          user.name
        }" class="follower-avatar">
                    ${user.isOnline ? '<span class="online-badge"></span>' : ""}
                </div>
                <div class="follower-info">
                    <h4>${user.name}</h4>
                    <p>${user.profession}</p>
                </div>
                <div class="follower-actions">
                    <button class="btn-unfollow" onclick="window.communityManager.unfollow('${
                      user.id
                    }')">Unfollow</button>
                    <button class="btn-connect" onclick="window.communityManager.connect('${
                      user.id
                    }')">Message</button>
                </div>
            </div>
        `
      )
      .join("");
  }

  loadGroups(container) {
    const groups = window.contentLoader
      ? window.contentLoader.getGroupsByType("all")
      : [];
    container.innerHTML = groups
      .map(
        (group, index) => `
            <div class="group-card animated-entry" style="animation-delay: ${
              index * 0.05
            }s">
                <div class="group-header">
                    <div class="group-icon">${group.icon}</div>
                    <h3>${group.name}</h3>
                    ${
                      group.active
                        ? '<span class="active-badge">Active</span>'
                        : ""
                    }
                </div>
                <p>${group.description}</p>
                <div class="group-stats">
                    <div class="member-count">👥 ${group.members} members</div>
                </div>
                <button class="btn-primary" onclick="window.communityManager.joinGroup('${
                  group.id
                }')">Join Group</button>
            </div>
        `
      )
      .join("");
  }

  loadClubs(container) {
    const clubs = STATE.clubs;
    container.innerHTML = clubs
      .map(
        (club, index) => `
            <div class="club-card animated-entry" style="animation-delay: ${
              index * 0.05
            }s">
                <div class="club-header">
                    <div class="club-icon">${club.icon}</div>
                    <h3>${club.name}</h3>
                    ${
                      club.active
                        ? '<span class="active-badge">Active</span>'
                        : ""
                    }
                </div>
                <p>${club.description}</p>
                <div class="club-stats">
                    <div class="member-count">👥 ${club.members} members</div>
                </div>
                <button class="btn-view" onclick="viewClubDetails('${
                  club.id
                }')">View Club</button>
            </div>
        `
      )
      .join("");
  }

  followBack(userId) {
    Utils.showToast("✅ Following user back!", "success");
    const btn = event.target;
    btn.textContent = "Following";
    btn.disabled = true;
  }

  unfollow(userId) {
    if (confirm("Are you sure you want to unfollow this user?")) {
      Utils.showToast("👋 Unfollowed user", "info");
      const btn = event.target;
      btn.textContent = "Follow";
      btn.classList.remove("btn-unfollow");
      btn.classList.add("btn-follow");
    }
  }

  connect(userId) {
    Utils.showToast("🔗 Opening chat...", "success");
    // Could open chat modal or redirect to chat
  }

  joinGroup(groupId) {
    Utils.showToast("✅ Joined group successfully!", "success");
    const btn = event.target;
    btn.textContent = "Joined";
    btn.disabled = true;
  }
}
