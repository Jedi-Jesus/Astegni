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