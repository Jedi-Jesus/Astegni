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
      this.community = new CommunityManager();
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
    // REMOVED: Mock followers and following data - now loaded from database via CommunityManager
    // STATE.followers and STATE.following are now fetched from /api/connections

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

  // REMOVED: generateMockFollowers and generateMockFollowing
  // These are now loaded dynamically from database via /api/connections
  // See js/page-structure/communityManager.js for implementation

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