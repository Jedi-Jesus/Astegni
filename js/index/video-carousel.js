// ============================================
//   VIDEO CAROUSEL
// ============================================
function initializeVideoCarousel() {
    const carousel = document.getElementById("video-carousel");
    if (!carousel) return;

    carousel.innerHTML = "";

    VIDEO_DATA.forEach((video, index) => {
        const card = createVideoCard(video, index);
        carousel.appendChild(card);
    });

    VIDEO_DATA.forEach((video, index) => {
        const card = createVideoCard(video, index);
        carousel.appendChild(card);
    });

    let currentPosition = 0;
    const cardWidth = 320 + 24;
    const totalCards = VIDEO_DATA.length;

    window.navigateCarousel = function(direction) {
        if (!carousel) return;

        if (direction === "left") {
            currentPosition = Math.max(0, currentPosition - 1);
        } else {
            currentPosition = Math.min(totalCards - 1, currentPosition + 1);
        }

        const scrollAmount = currentPosition * cardWidth;
        carousel.style.transform = `translateX(-${scrollAmount}px)`;
    };

    setInterval(() => {
        currentPosition = (currentPosition + 1) % totalCards;
        if (currentPosition === 0) {
            carousel.style.transition = "none";
            carousel.style.transform = "translateX(0)";
            setTimeout(() => {
                carousel.style.transition = "transform 0.5s ease";
            }, 50);
        } else {
            carousel.style.transform = `translateX(-${currentPosition * cardWidth}px)`;
        }
    }, 5000);

    document.querySelectorAll(".category-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            document.querySelector(".category-btn.active")?.classList.remove("active");
            e.target.classList.add("active");
            filterVideos(e.target.dataset.category);
        });
    });
}

function createVideoCard(video, index) {
    const card = document.createElement("div");
    card.className = "video-card";
    card.dataset.category = video.category;
    card.innerHTML = `
        <div class="video-thumbnail">
            <div class="video-play-btn">
                <svg width="20" height="20" fill="var(--button-bg)" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </div>
        </div>
        <div class="video-info">
            <h4 class="video-title">${video.title}</h4>
            <p class="video-description">${video.description.substring(0, 100)}...</p>
            <div class="video-meta">
                <span class="video-views">${video.views} views</span>
                <span class="video-duration">${video.duration}</span>
            </div>
        </div>
    `;

    card.addEventListener("click", () => openVideoPlayer(video));
    return card;
}

function filterVideos(category) {
    const cards = document.querySelectorAll(".video-card");
    cards.forEach((card) => {
        if (category === "all" || card.dataset.category === category) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

// Video player functions
function openVideoPlayer(video) {
    APP_STATE.currentVideo = video;
    const titleEl = document.getElementById("video-title");
    const descEl = document.getElementById("video-description");
    if (titleEl) titleEl.textContent = video.title;
    if (descEl) descEl.textContent = video.description;
    loadVideoComments(video);
    openModal("video-player-modal");
    showToast("Loading video...", "info");
}

// Export to window for use in other scripts
window.openVideoPlayer = openVideoPlayer;

function loadVideoComments(video) {
    const commentsList = document.getElementById("comments-list");
    if (!commentsList) return;

    commentsList.innerHTML = "";

    if (video.comments && video.comments.length > 0) {
        video.comments.forEach((comment) => {
            const commentEl = createCommentElement(comment);
            commentsList.appendChild(commentEl);
        });
    } else {
        commentsList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No comments yet. Be the first to comment!</p>';
    }
}

function createCommentElement(comment) {
    const div = document.createElement("div");
    div.className = "comment-item";
    div.innerHTML = `
        <img src="${comment.avatar}" alt="${comment.author}" class="comment-avatar">
        <div class="comment-content">
            <div class="comment-header">
                <span class="comment-author">${comment.author}</span>
                <span class="comment-time">${comment.time}</span>
            </div>
            <p class="comment-text">${comment.text}</p>
            <div class="comment-footer">
                <button class="comment-like">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
                    </svg>
                    ${comment.likes || 0}
                </button>
                <button class="comment-dislike">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"></path>
                    </svg>
                </button>
                <button class="comment-reply">Reply</button>
            </div>
        </div>
    `;
    return div;
}
