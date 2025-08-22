// ============================================
// TRAINING CENTER PROFILE - PART 2
// ============================================

// ============================================
// VIDEOS MANAGER - FIXED
// ============================================
class VideosManager {
    constructor() {
        this.currentFilter = "all";
    }

    uploadVideo() {
        const form = document.getElementById("uploadVideoForm");
        if (!form) return;

        // Get form data
        const title = form.querySelector(
            'input[placeholder="Enter video title"]'
        )?.value;
        const description = form.querySelector("textarea")?.value;
        const category = form.querySelector("select")?.value;
        const tags = form.querySelector(
            'input[placeholder="Add tags separated by commas"]'
        )?.value;

        if (!title) {
            Utils.showToast("⚠️ Please enter a video title", "error");
            return;
        }

        // Simulate upload
        Utils.showToast("📹 Uploading video...", "info");

        // Show progress
        setTimeout(() => {
            Utils.showToast("✅ Video uploaded successfully!", "success");
            this.closeUploadModal();

            // Add to videos list
            const newVideo = {
                id: `video-${Date.now()}`,
                title,
                description,
                category,
                tags: tags?.split(",").map((t) => t.trim()),
                views: 0,
                duration: "0:00",
                thumbnail: "https://picsum.photos/400/225?random=new",
                uploadDate: new Date(),
            };

            STATE.videos.unshift(newVideo);
            this.refreshVideosList();
        }, 2000);
    }

    closeUploadModal() {
        const modal = document.getElementById("uploadVideoModal");
        if (modal) modal.classList.remove("show");
    }

    refreshVideosList() {
        window.contentLoader.loadVideos();
    }

    filterVideos(filter) {
        this.currentFilter = filter;

        // Update tab states
        document.querySelectorAll(".video-tab").forEach((tab) => {
            tab.classList.toggle("active", tab.dataset.filter === filter);
        });

        // Filter videos display
        const videosGrid = document.querySelector(".videos-grid");
        if (!videosGrid) return;

        if (filter === "shorts") {
            // Show shorts videos
            this.showShorts();
        } else if (filter === "playlists") {
            // Show playlists
            this.showPlaylists();
        } else {
            // Show all or regular videos
            window.contentLoader.loadVideos();
        }
    }

    showShorts() {
        const grid = document.querySelector(".videos-grid");
        if (!grid) return;

        Utils.showToast("🎬 Loading Shorts...", "info");
        
        // Filter for short videos (under 60 seconds)
        const shorts = STATE.videos.filter(video => {
            const duration = video.duration.split(':');
            const minutes = parseInt(duration[0]);
            return minutes < 1;
        });

        if (shorts.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📱</span>
                    <h3>No Shorts Yet</h3>
                    <p>Create your first short video (under 60 seconds)</p>
                    <button class="btn-primary" onclick="window.videosManager.createShort()">
                        Create Short
                    </button>
                </div>
            `;
        } else {
            grid.innerHTML = shorts.map((video, index) => `
                <div class="video-card shorts-card animated-entry" style="animation: zoomIn ${0.2 * (index + 1)}s ease-out;">
                    <div class="video-thumbnail shorts-thumbnail">
                        <img src="${video.thumbnail}" alt="${video.title}">
                        <span class="shorts-badge">⚡ SHORT</span>
                        <span class="video-duration">${video.duration}</span>
                        <div class="video-play-overlay">
                            <button class="play-btn" onclick="Utils.showToast('▶️ Playing short...', 'info')">▶</button>
                        </div>
                    </div>
                    <div class="video-info">
                        <h3>${video.title}</h3>
                        <div class="video-stats">
                            <span>👁️ ${video.views}</span>
                        </div>
                    </div>
                </div>
            `).join("");
        }
    }

    createShort() {
        Utils.showToast("📱 Opening short video creator...", "info");
        // Could open a short video creation modal
    }

    showPlaylists() {
        const grid = document.querySelector(".videos-grid");
        if (!grid) return;

        const videoPlaylists = STATE.playlists.filter(p => p.type === 'video');
        
        grid.innerHTML = videoPlaylists
            .map(
                (playlist) => `
            <div class="playlist-card">
                <div class="playlist-thumbnail">
                    <img src="${playlist.thumbnail}" alt="${playlist.name}">
                    <div class="playlist-overlay">
                        <span class="playlist-count">${playlist.videoCount} videos</span>
                    </div>
                </div>
                <div class="playlist-info">
                    <h3>${playlist.name}</h3>
                    <p>Duration: ${playlist.duration}</p>
                    <button class="btn-play-playlist" onclick="window.videosManager.playPlaylist('${playlist.id}')">
                        Play All
                    </button>
                </div>
            </div>
        `
            )
            .join("");
    }

    playPlaylist(playlistId) {
        Utils.showToast("▶️ Playing playlist...", "info");
    }

    goLive() {
        Utils.showToast("🔴 Preparing live stream...", "info");

        // Could open a live streaming setup modal
        setTimeout(() => {
            if (confirm("Start live streaming now?")) {
                Utils.showToast("🔴 You are now LIVE!", "success");

                // Update UI to show live status
                const liveBtn = document.querySelector(".live-btn");
                if (liveBtn) {
                    liveBtn.innerHTML = "<span>🔴 End Live</span>";
                    liveBtn.classList.add("is-live");
                }
            }
        }, 1000);
    }
}

// ============================================
// PLAYLISTS MANAGER - ENHANCED FOR BOTH VIDEO AND PODCAST
// ============================================
class PlaylistsManager {
    openModal(type = 'video') {
        // Create playlist modal
        const modal = this.createPlaylistModal(type);
        document.body.appendChild(modal);
        modal.classList.add("show");
        modal.style.display = "flex";
    }

    createPlaylistModal(type = 'video') {
        const existingId = type === 'podcast' ? 'podcastPlaylistModal' : 'playlistModal';
        const existing = document.getElementById(existingId);
        if (existing) {
            return existing;
        }

        const modal = document.createElement("div");
        modal.id = existingId;
        modal.className = "modal";
        
        const items = type === 'podcast' 
            ? STATE.podcastPlaylists 
            : STATE.videos;
            
        const itemsHTML = type === 'podcast'
            ? items.slice(0, 5).map(podcast => `
                <label class="video-option">
                    <input type="checkbox" value="${podcast.id}">
                    <span>${podcast.name}</span>
                </label>
            `).join("")
            : items.slice(0, 5).map(video => `
                <label class="video-option">
                    <input type="checkbox" value="${video.id}">
                    <span>${video.title}</span>
                </label>
            `).join("");

        modal.innerHTML = `
            <div class="modal-overlay" onclick="window.playlistsManager.closeModal('${type}')"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Create New ${type === 'podcast' ? 'Podcast' : 'Video'} Playlist</h2>
                    <button class="modal-close" onclick="window.playlistsManager.closeModal('${type}')">×</button>
                </div>
                <div class="modal-body">
                    <form id="create${type === 'podcast' ? 'Podcast' : ''}PlaylistForm">
                        <div class="form-section">
                            <label class="form-label required">Playlist Name</label>
                            <input type="text" class="form-input" placeholder="Enter playlist name" required>
                        </div>
                        <div class="form-section">
                            <label class="form-label">Description</label>
                            <textarea class="form-textarea" placeholder="Describe your playlist..." rows="3"></textarea>
                        </div>
                        <div class="form-section">
                            <label class="form-label">Privacy</label>
                            <select class="form-select">
                                <option value="public">Public</option>
                                <option value="unlisted">Unlisted</option>
                                <option value="private">Private</option>
                            </select>
                        </div>
                        <div class="form-section">
                            <label class="form-label">Add ${type === 'podcast' ? 'Episodes' : 'Videos'}</label>
                            <div class="video-selector">
                                ${itemsHTML}
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="window.playlistsManager.closeModal('${type}')">Cancel</button>
                    <button class="btn-primary" onclick="window.playlistsManager.createPlaylist('${type}')">Create Playlist</button>
                </div>
            </div>
        `;
        return modal;
    }

    closeModal(type = 'video') {
        const modalId = type === 'podcast' ? 'podcastPlaylistModal' : 'playlistModal';
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove("show");
            modal.style.display = "none";
            setTimeout(() => modal.remove(), 300);
        }
    }

    createPlaylist(type = 'video') {
        const formId = type === 'podcast' ? 'createPodcastPlaylistForm' : 'createPlaylistForm';
        const form = document.getElementById(formId);
        if (!form) return;

        const name = form.querySelector('input[type="text"]')?.value;
        const description = form.querySelector("textarea")?.value;
        const privacy = form.querySelector("select")?.value;

        if (!name) {
            Utils.showToast("⚠️ Please enter a playlist name", "error");
            return;
        }

        const newPlaylist = {
            id: `${type}-playlist-${Date.now()}`,
            name,
            description,
            privacy,
            type: type,
            videoCount: type === 'podcast' ? 0 : 0,
            episodeCount: type === 'podcast' ? 0 : undefined,
            thumbnail: `https://picsum.photos/400/225?random=${type}-playlist-new`,
            duration: type === 'podcast' ? "0h" : "0h 0m",
            totalDuration: type === 'podcast' ? "0h" : undefined,
            createdAt: new Date(),
        };

        if (type === 'podcast') {
            STATE.podcastPlaylists.push(newPlaylist);
        } else {
            STATE.playlists.push(newPlaylist);
        }
        
        Utils.showToast(`✅ ${type === 'podcast' ? 'Podcast' : 'Video'} playlist created successfully!`, "success");
        this.closeModal(type);

        // Refresh appropriate view
        if (type === 'podcast') {
            window.podcastsManager.refreshPlaylists();
        } else if (window.videosManager.currentFilter === "playlists") {
            window.videosManager.showPlaylists();
        }
    }
}

// ============================================
// PODCASTS MANAGER - NEW
// ============================================
class PodcastsManager {
    constructor() {
        this.currentFilter = "all";
    }

    createPlaylist() {
        window.playlistsManager.openModal('podcast');
    }

    refreshPlaylists() {
        window.contentLoader.loadPodcasts();
    }

    playPodcast(podcastId) {
        Utils.showToast("🎧 Playing podcast...", "info");
    }
}

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

// ============================================
// COMMENTS MANAGER - ENHANCED
// ============================================
class CommentsManager {
    constructor() {
        this.currentPostId = null;
        this.currentFilter = "all";
    }

    open() {
        const modal = document.getElementById("commentsModal");
        if (modal) {
            modal.classList.add("show");
            modal.style.display = "flex";
            this.loadComments();
        }
    }

    openForPost(postId) {
        this.currentPostId = postId;
        this.open();
    }

    close() {
        const modal = document.getElementById("commentsModal");
        if (modal) {
            modal.classList.remove("show");
            modal.style.display = "none";
        }
    }

    loadComments() {
        const commentsList = document.querySelector(".comments-list");
        if (!commentsList) return;

        commentsList.innerHTML = STATE.comments
            .slice(0, 10)
            .map(
                (comment) => `
            <div class="comment-item" data-id="${comment.id}">
                <div class="comment-header">
                    <img src="${comment.avatar}" alt="${comment.author}" class="comment-avatar">
                    <div class="comment-meta">
                        <h4>${comment.author}</h4>
                        <div class="comment-rating">
                            ${this.renderStars(comment.rating)}
                        </div>
                        <span class="comment-date">${this.formatDate(comment.date)}</span>
                    </div>
                </div>
                <div class="comment-content">
                    <p>${comment.text}</p>
                </div>
                <div class="comment-actions">
                    <button class="btn-like" onclick="window.commentsManager.likeComment('${comment.id}')">
                        👍 ${comment.likes}
                    </button>
                    <button class="btn-reply" onclick="window.commentsManager.replyToComment('${comment.id}')">
                        Reply
                    </button>
                    <button class="btn-share" onclick="window.commentsManager.shareComment('${comment.id}')">
                        🔗 Share
                    </button>
                </div>
                <div class="comment-replies" id="replies-${comment.id}">
                    ${this.renderReplies(comment.replies)}
                </div>
            </div>
        `
            )
            .join("");
    }

    renderStars(rating) {
        return Array(5)
            .fill(0)
            .map(
                (_, i) =>
                    `<svg class="star ${i < rating ? "filled" : ""}" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>`
            )
            .join("");
    }

    renderReplies(replies) {
        if (!replies || replies.length === 0) return "";

        return replies
            .map(
                (reply) => `
            <div class="reply-item">
                <img src="${reply.avatar}" alt="${reply.author}" class="reply-avatar">
                <div class="reply-content">
                    <h5>${reply.author}</h5>
                    <p>${reply.text}</p>
                    <span class="reply-date">${this.formatDate(reply.date)}</span>
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

    likeComment(commentId) {
        const comment = STATE.comments.find((c) => c.id === commentId);
        if (comment) {
            comment.likes++;
            const btn = event.target;
            btn.innerHTML = `👍 ${comment.likes}`;
            btn.classList.add("liked");
            Utils.showToast("👍 Liked!", "success");
        }
    }

    replyToComment(commentId) {
        const repliesContainer = document.getElementById(`replies-${commentId}`);
        if (!repliesContainer) return;

        // Check if reply form already exists
        if (repliesContainer.querySelector(".reply-form")) {
            return;
        }

        // Add reply form
        const replyForm = document.createElement("div");
        replyForm.className = "reply-form";
        replyForm.innerHTML = `
            <textarea class="reply-input" placeholder="Write your reply..."></textarea>
            <div class="reply-actions">
                <button class="btn-cancel" onclick="window.commentsManager.cancelReply('${commentId}')">Cancel</button>
                <button class="btn-primary" onclick="window.commentsManager.submitReply('${commentId}')">Reply</button>
            </div>
        `;

        repliesContainer.appendChild(replyForm);
        replyForm.querySelector("textarea").focus();
    }

    cancelReply(commentId) {
        const repliesContainer = document.getElementById(`replies-${commentId}`);
        const replyForm = repliesContainer?.querySelector(".reply-form");
        if (replyForm) {
            replyForm.remove();
        }
    }

    submitReply(commentId) {
        const repliesContainer = document.getElementById(`replies-${commentId}`);
        const replyInput = repliesContainer?.querySelector(".reply-input");

        if (!replyInput || !replyInput.value.trim()) {
            Utils.showToast("⚠️ Please write a reply", "error");
            return;
        }

        const comment = STATE.comments.find((c) => c.id === commentId);
        if (comment) {
            if (!comment.replies) comment.replies = [];

            const newReply = {
                id: `reply-${Date.now()}`,
                author: "You",
                avatar: "https://i.pravatar.cc/150?img=0",
                text: replyInput.value,
                date: new Date(),
            };

            comment.replies.push(newReply);

            // Add reply to UI
            const replyHTML = `
                <div class="reply-item">
                    <img src="${newReply.avatar}" alt="${newReply.author}" class="reply-avatar">
                    <div class="reply-content">
                        <h5>${newReply.author}</h5>
                        <p>${newReply.text}</p>
                        <span class="reply-date">Just now</span>
                    </div>
                </div>
            `;

            const replyForm = repliesContainer.querySelector(".reply-form");
            replyForm.insertAdjacentHTML("beforebegin", replyHTML);
            replyForm.remove();

            Utils.showToast("✅ Reply posted!", "success");
        }
    }

    shareComment(commentId) {
        const comment = STATE.comments.find(c => c.id === commentId);
        if (comment) {
            if (navigator.share) {
                navigator.share({
                    title: 'Comment by ' + comment.author,
                    text: comment.text,
                    url: window.location.href + '#comment-' + commentId
                });
            } else {
                // Fallback: Copy link to clipboard
                navigator.clipboard.writeText(window.location.href + '#comment-' + commentId);
                Utils.showToast("🔗 Comment link copied to clipboard!", "success");
            }
        }
    }

    filterComments(filter) {
        this.currentFilter = filter;
        // Re-render comments based on filter
        const filteredComments = STATE.comments.filter(comment => {
            if (filter === 'all') return true;
            if (filter === '5' && comment.rating === 5) return true;
            if (filter === '4' && comment.rating === 4) return true;
            if (filter === '3' && comment.rating === 3) return true;
            if (filter === '2' && comment.rating === 2) return true;
            if (filter === '1' && comment.rating === 1) return true;
            return false;
        });

        // Update UI with filtered comments
        this.renderFilteredComments(filteredComments);
    }

    renderFilteredComments(comments) {
        const section = document.querySelector(".comments-section");
        if (!section) return;

        section.innerHTML = `
            <div class="comments-stats">
                <div class="comment-stat">
                    <span class="stat-number">${STATE.comments.length}</span>
                    <span class="stat-label">Total Reviews</span>
                </div>
                <div class="comment-stat">
                    <span class="stat-number">4.9</span>
                    <span class="stat-label">Average Rating</span>
                </div>
                <div class="comment-stat">
                    <span class="stat-number">96%</span>
                    <span class="stat-label">Satisfaction Rate</span>
                </div>
            </div>

            <div class="comments-filter">
                <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" onclick="window.commentsManager.filterComments('all')">All</button>
                <button class="filter-btn ${this.currentFilter === '5' ? 'active' : ''}" onclick="window.commentsManager.filterComments('5')">5 Stars</button>
                <button class="filter-btn ${this.currentFilter === '4' ? 'active' : ''}" onclick="window.commentsManager.filterComments('4')">4 Stars</button>
                <button class="filter-btn ${this.currentFilter === '3' ? 'active' : ''}" onclick="window.commentsManager.filterComments('3')">3 Stars</button>
                <button class="filter-btn ${this.currentFilter === '2' ? 'active' : ''}" onclick="window.commentsManager.filterComments('2')">2 Stars</button>
                <button class="filter-btn ${this.currentFilter === '1' ? 'active' : ''}" onclick="window.commentsManager.filterComments('1')">1 Star</button>
            </div>

            <div class="comments-list">
                ${comments.slice(0, 5).map(comment => `
                    <div class="comment-thread animated-entry">
                        <div class="comment-main">
                            <img src="${comment.avatar}" alt="${comment.author}" class="comment-avatar">
                            <div class="comment-body">
                                <div class="comment-header">
                                    <span class="comment-author">${comment.author}</span>
                                    <span class="comment-date">${this.formatDate(comment.date)}</span>
                                </div>
                                <div class="comment-rating">
                                    ${"⭐".repeat(comment.rating)}
                                </div>
                                <p class="comment-text">${comment.text}</p>
                                <div class="comment-actions">
                                    <button class="comment-action-btn" onclick="window.commentsManager.likeComment('${comment.id}')">👍 ${comment.likes}</button>
                                    <button class="comment-action-btn" onclick="window.commentsManager.replyToComment('${comment.id}')">💬 Reply</button>
                                    <button class="comment-action-btn" onclick="window.commentsManager.shareComment('${comment.id}')">🔗 Share</button>
                                </div>
                                <div class="comment-replies" id="replies-${comment.id}">
                                    ${this.renderReplies(comment.replies)}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join("")}
            </div>

            <div class="add-comment-section">
                <h3>Add Your Review</h3>
                <form class="comment-form" onsubmit="window.commentsManager.submitComment(event); return false;">
                    <div class="rating-input">
                        <label>Rating:</label>
                        <div class="star-rating">
                            <span class="star" data-rating="1" onclick="window.commentsManager.setRating(1)">⭐</span>
                            <span class="star" data-rating="2" onclick="window.commentsManager.setRating(2)">⭐</span>
                            <span class="star" data-rating="3" onclick="window.commentsManager.setRating(3)">⭐</span>
                            <span class="star" data-rating="4" onclick="window.commentsManager.setRating(4)">⭐</span>
                            <span class="star" data-rating="5" onclick="window.commentsManager.setRating(5)">⭐</span>
                        </div>
                    </div>
                    <textarea class="comment-textarea" id="newCommentText" placeholder="Share your experience..."></textarea>
                    <button type="submit" class="btn-primary">Post Review</button>
                </form>
            </div>
        `;
    }

    setRating(rating) {
        this.newCommentRating = rating;
        document.querySelectorAll('.star-rating .star').forEach((star, index) => {
            star.style.opacity = index < rating ? '1' : '0.3';
        });
    }

    submitComment(event) {
        event.preventDefault();
        
        const textarea = document.getElementById('newCommentText');
        const text = textarea?.value;
        const rating = this.newCommentRating || 5;

        if (!text || !text.trim()) {
            Utils.showToast("⚠️ Please write a review", "error");
            return;
        }

        const newComment = {
            id: `comment-${Date.now()}`,
            author: "You",
            avatar: "https://i.pravatar.cc/150?img=0",
            text: text,
            rating: rating,
            date: new Date(),
            likes: 0,
            replies: []
        };

        STATE.comments.unshift(newComment);
        Utils.showToast("✅ Review posted successfully!", "success");

        // Clear form
        textarea.value = '';
        this.newCommentRating = 0;

        // Refresh comments
        this.renderFilteredComments(STATE.comments);
    }
}