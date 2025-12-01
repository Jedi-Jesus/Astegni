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
