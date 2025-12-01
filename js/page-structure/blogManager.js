// ============================================
// BLOG MANAGER - ENHANCED WITH VIEW ARTICLE
// ============================================
class BlogManager {
    constructor() {
        this.currentFilter = "all";
        this.attachFilterEvents();
    }

    attachFilterEvents() {
        // Attach events after DOM is loaded
        setTimeout(() => {
            document.querySelectorAll("#blog-content .filter-chip").forEach((chip) => {
                chip.addEventListener("click", () => {
                    this.filterPosts(chip);
                });
            });
        }, 100);
    }

    filterPosts(chipElement) {
        // Remove active from all chips
        document.querySelectorAll("#blog-content .filter-chip").forEach((chip) => {
            chip.classList.remove("active");
        });
        
        // Add active to clicked chip
        chipElement.classList.add("active");
        
        const filter = chipElement.textContent.toLowerCase();
        this.currentFilter = filter;
        
        Utils.showToast(`🔍 Filtering: ${chipElement.textContent}`, "info");
        
        // Filter blog posts
        if (filter === "all posts") {
            window.contentLoader.loadBlogPosts();
        } else {
            this.loadFilteredPosts(filter);
        }
    }

    loadFilteredPosts(filter) {
        const grid = document.querySelector(".blog-grid");
        if (!grid) return;

        // Filter posts based on category
        const filteredPosts = STATE.blogPosts.filter(post => {
            if (filter.includes("industry")) return true;
            if (filter.includes("tutorial")) return true;
            if (filter.includes("student")) return Math.random() > 0.5;
            if (filter.includes("tips")) return Math.random() > 0.5;
            return false;
        });

        if (filteredPosts.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📝</span>
                    <h3>No posts in this category</h3>
                    <p>Be the first to create a post!</p>
                    <button class="btn-primary" onclick="openCreateBlogModal()">
                        Create Post
                    </button>
                </div>
            `;
        } else {
            grid.innerHTML = filteredPosts
                .slice(0, 4)
                .map(
                    (post, index) => `
                <div class="blog-card animated-entry" style="animation: slideInRight ${0.2 * (index + 1)}s ease-out;">
                    <div class="blog-image">
                        <img src="${post.image}" alt="${post.title}">
                        <span class="blog-category">${this.getCategoryFromFilter(filter)}</span>
                    </div>
                    <div class="blog-content">
                        <h3>${post.title}</h3>
                        <p class="blog-excerpt">${post.excerpt}</p>
                        <div class="blog-meta">
                            <div class="blog-author">
                                <img src="https://via.placeholder.com/30" alt="${post.author}">
                                <span>${post.author}</span>
                            </div>
                            <span class="blog-date">${window.contentLoader.formatDate(post.date)}</span>
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
    }

    getCategoryFromFilter(filter) {
        if (filter.includes("industry")) return "Industry News";
        if (filter.includes("tutorial")) return "Tutorial";
        if (filter.includes("student")) return "Student Stories";
        if (filter.includes("tips")) return "Tips & Tricks";
        return "General";
    }

    viewBlogPost(postId) {
        const post = STATE.blogPosts.find(p => p.id === postId);
        if (!post) {
            Utils.showToast("⚠️ Article not found", "error");
            return;
        }

        // Create and show article reader modal
        const modal = this.createArticleModal(post);
        document.body.appendChild(modal);
        modal.classList.add("show");
        modal.style.display = "flex";
        
        Utils.showToast(`📖 Opening: ${post.title}`, "success");
    }

    createArticleModal(post) {
        const existing = document.getElementById("articleReaderModal");
        if (existing) existing.remove();

        const modal = document.createElement("div");
        modal.id = "articleReaderModal";
        modal.className = "modal";
        modal.innerHTML = `
            <div class="modal-overlay" onclick="window.blogManager.closeArticle()"></div>
            <div class="modal-content article-modal">
                <div class="modal-header">
                    <h2>${post.title}</h2>
                    <button class="modal-close" onclick="window.blogManager.closeArticle()">×</button>
                </div>
                <div class="modal-body article-body">
                    <div class="article-meta">
                        <div class="article-author">
                            <img src="https://via.placeholder.com/40" alt="${post.author}">
                            <div>
                                <h4>${post.author}</h4>
                                <span>${window.contentLoader.formatDate(post.date)} · ${post.readTime}</span>
                            </div>
                        </div>
                        <div class="article-stats">
                            <button class="stat-btn" onclick="window.blogManager.likeArticle('${post.id}')">
                                ❤️ ${post.likes}
                            </button>
                            <button class="stat-btn" onclick="window.blogManager.shareArticle('${post.id}')">
                                🔗 Share
                            </button>
                        </div>
                    </div>
                    <div class="article-image">
                        <img src="${post.image}" alt="${post.title}">
                    </div>
                    <div class="article-content">
                        ${post.content}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="window.blogManager.closeArticle()">Close</button>
                    <button class="btn-primary" onclick="window.commentsManager.openForPost('${post.id}')">
                        💬 View Comments (${post.comments})
                    </button>
                </div>
            </div>
        `;
        return modal;
    }

    closeArticle() {
        const modal = document.getElementById("articleReaderModal");
        if (modal) {
            modal.classList.remove("show");
            modal.style.display = "none";
            setTimeout(() => modal.remove(), 300);
        }
    }

    likeArticle(postId) {
        const post = STATE.blogPosts.find(p => p.id === postId);
        if (post) {
            post.likes++;
            Utils.showToast("❤️ Liked article!", "success");
            // Update UI
            const btn = event.target;
            btn.innerHTML = `❤️ ${post.likes}`;
        }
    }

    shareArticle(postId) {
        const post = STATE.blogPosts.find(p => p.id === postId);
        if (post) {
            if (navigator.share) {
                navigator.share({
                    title: post.title,
                    text: post.excerpt,
                    url: window.location.href + '#' + postId
                });
            } else {
                // Fallback: Copy link to clipboard
                navigator.clipboard.writeText(window.location.href + '#' + postId);
                Utils.showToast("🔗 Link copied to clipboard!", "success");
            }
        }
    }

    publishBlog() {
        const form = document.getElementById("createBlogForm");
        if (!form) return;

        const title = form.querySelector(
            'input[placeholder="Enter blog title"]'
        )?.value;
        const content = form.querySelector("textarea")?.value;
        const category = form.querySelector("select")?.value;
        const tags = form.querySelector(
            'input[placeholder="Add tags separated by commas"]'
        )?.value;

        if (!title || !content) {
            Utils.showToast("⚠️ Please fill in all required fields", "error");
            return;
        }

        // Create new blog post
        const newPost = {
            id: `blog-${Date.now()}`,
            title,
            content,
            category,
            tags: tags?.split(",").map((t) => t.trim()),
            author: "Zenith Academy",
            date: new Date(),
            image: "https://picsum.photos/600/400?random=blog-new",
            readTime: `${Math.ceil(content.split(" ").length / 200)} min read`,
            likes: 0,
            comments: 0,
        };

        STATE.blogPosts.unshift(newPost);
        Utils.showToast("✅ Blog post published successfully!", "success");

        // Close modal
        const modal = document.getElementById("createBlogModal");
        if (modal) modal.classList.remove("show");

        // Refresh blog grid
        window.contentLoader.loadBlogPosts();
    }
}
