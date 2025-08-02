
        // XLSX File Handling
        var gk_isXlsx = false;
        var gk_xlsxFileLookup = {};
        var gk_fileData = {};
        function filledCell(cell) {
            return cell !== "" && cell != null;
        }
        function loadFileData(filename) {
            if (gk_isXlsx && gk_xlsxFileLookup[filename]) {
                try {
                    var workbook = XLSX.read(gk_fileData[filename], {
                        type: "base64",
                    });
                    var firstSheetName = workbook.SheetNames[0];
                    var worksheet = workbook.Sheets[firstSheetName];
                    var jsonData = XLSX.utils.sheet_to_json(worksheet, {
                        header: 1,
                        blankrows: false,
                        commentId: "",
                    });
                    var filteredData = jsonData.filter(row =>
                        row.some(filledCell)
                    );
                    var headerRowIndex = filteredData.findIndex(
                        (row, index) =>
                            row.filter(filledCell).length >=
                            filteredData[index + 1]?.filter(filledCell).length
                    );
                    if (headerRowIndex === -1 || headerRowIndex >= 25) {
                        headerRowIndex = 0;
                    }
                    var csv = XLSX.utils.sheet_to_csv(
                        filteredData.slice(headerRowIndex),
                        { header: 1 }
                    );
                    return csv;
                } catch (e) {
                    console.error(e);
                    return "";
                }
            }
            return gk_fileData[filename] || "";
        }

        // Theme Toggle
        function toggleTheme() {
            const html = document.documentElement;
            const currentTheme = html.getAttribute("data-theme");
            const newTheme = currentTheme === "light" ? "dark" : "light";
            html.setAttribute("data-theme", newTheme);
            localStorage.setItem("theme", newTheme);
            updateThemeToggleIcon(newTheme);
        }

        function updateThemeToggleIcon(theme) {
            const icon =
                theme === "light"
                    ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>`
                    : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>`;
            const themeToggle = document.getElementById("theme-toggle-btn");
            themeToggle.querySelector("svg").innerHTML = icon;
            const mobileThemeToggle = document.getElementById(
                "mobile-theme-toggle-btn"
            );
            mobileThemeToggle.innerHTML = `Toggle Theme <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${icon}</svg>`;
        }

        // Data Objects
        const currentUser = {
            id: 1,
            email: "user@astegni.et",
            role: window.location.pathname.includes("tutor-profile.html")
                ? "Tutor"
                : window.location.pathname.includes("student-profile.html")
                    ? "Student"
                    : "User",
        };
        const tutors = {
            1: {
                id: 1,
                name: "Abebe Kebede",
                email: "abebe@tutor.et",
                subject: "Mathematics",
            },
            2: {
                id: 2,
                name: "Mulu Alem",
                email: "mulu@tutor.et",
                subject: "Science",
            },
        };
        const reels = {
            1: {
                id: 1,
                tutorId: 1,
                videoUrl:
                    "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
                title: "Math Tricks",
                videoNumber: "#001",
                description: "Fun math tricks!",
                date: "2025-05-20",
            },
            2: {
                id: 2,
                tutorId: 2,
                videoUrl:
                    "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
                title: "Science Experiments",
                videoNumber: "#002",
                description: "Science experiments!",
                date: "2025-05-21",
            },
        };
        const likes = {
            1: { reelId: 1, userIds: [] },
            2: { reelId: 2, userIds: [] },
        };
        const dislikes = {
            1: { reelId: 1, userIds: [] },
            2: { reelId: 2, userIds: [] },
        };
        const comments = {
            1: {
                reelId: 1,
                comments: [
                    { userId: 1, text: "Great video!", date: "2025-05-20" },
                ],
            },
            2: { reelId: 2, comments: [] },
        };
        const follows = {
            1: { tutorId: 1, userIds: [] },
            2: { tutorId: 2, userIds: [] },
        };
        const savedVideos = {
            1: { reelId: 1, userIds: [], playlists: {} },
            2: { reelId: 2, userIds: [], playlists: {} },
        };
        const history = {
            1: { reelId: 1, userIds: [] },
            2: { reelId: 2, userIds: [] },
        };
        const playlists = {};
        const notifications = {};
        const logs = {};

        // Video Navigation State
        let currentVideoIndex = 0;
        let currentFilter = "all";
        let filteredReelIds = Object.keys(reels).map(Number);
        let searchQuery = "";
        let selectedReelId = null;
        let focusBeforeModal = null;

        // Ad Rotation
        function rotateAds() {
            const adContainer = document.getElementById("ad-placeholder");
            const ads = adContainer.querySelectorAll(".ad-image");
            let currentAdIndex = 0;

            function showNextAd() {
                ads[currentAdIndex].classList.remove("active");
                currentAdIndex = (currentAdIndex + 1) % ads.length;
                ads[currentAdIndex].classList.add("active");
            }

            ads[currentAdIndex].classList.add("active");
            setInterval(showNextAd, 7000);
        }

        // Initialize
        function init() {
            if (currentUser) {
                document.getElementById("new-comment").disabled = false;
                document.getElementById("submit-comment").disabled = false;
            }
            updateProfileDropdown();
            updateReels("all");
            checkNotifications();
            document
                .getElementById("nav-search-input")
                .addEventListener("input", handleSearch);
            document
                .getElementById("mobile-search-input")
                .addEventListener("input", handleSearch);
            rotateAds();
        }

        // Search Handler
        function handleSearch(e) {
            searchQuery = e.target.value.trim().toLowerCase();
            updateReels(currentFilter);
            document.getElementById("nav-search-input").value = searchQuery;
            document.getElementById("mobile-search-input").value = searchQuery;
        }

        // Profile Dropdown
        function updateProfileDropdown() {
            const dropdown = document.getElementById("profile-dropdown");
            let extraItems = "";
            if (currentUser.role === "Tutor") {
                extraItems = `
                    <a href="quiz.html" class="block px-4 py-2 hover:bg-[var(--highlight-bg)]">Take a Quiz</a>
                    <a href="tools.html" class="block px-4 py-2 hover:bg-[var(--highlight-bg)]">Tools</a>
                `;
            } else if (currentUser.role === "Student") {
                extraItems = `
                    <a href="tools.html" class="block px-2 py-4 hover:bg-[var(--highlight-bg)]">Tools</a>
                    <a href="become-tutor.html" class="block px-2 py-4 hover:bg-[var(--highlight-bg)]">Become a Tutor</a>
                    <a href="wishlist.html" class="block px-2 py-2 hover:bg-[var(--highlight-bg)]">Wishlist</a>
                    <a href="favorites.html" class="block px-4 py-2 hover:bg-[var(--highlight-bg)]">Favorites</a>
                    <a href="requested-courses.html" class="block px-2 py-4 hover:bg-[var(--highlight-bg)]">Requested Courses</a>
                `;
            }
            dropdown.innerHTML = `
                <a href="profile.html" class="block px-4 py-2 hover:bg-[var(--highlight-bg)]">View Profile</a>
                <a href="notes.html" class="block px-4 py-2 hover:bg-[var(--highlight-bg)]">Notes</a>
                <a href="finances.html" class="block px-4 py-2 hover:bg-[var(--highlight-bg)]">Manage Finances</a>
                <a href="comment-rate.html" class="block px-4 py-2 hover:bg-[var(--highlight-bg)]">Comment and Rate</a>
                <button onclick="shareProfile()" class="block px-4 py-2 hover:bg-[var(--highlight-bg)] w-full text-left">Share</button>
                ${extraItems}
            `;
        }

        function toggleProfileDropdown() {
            const dropdown = document.getElementById("profile-dropdown");
            const isOpen = dropdown.classList.contains("open");
            dropdown.classList.toggle("open");
            document
                .querySelector("#profile-container button")
                .setAttribute("aria-expanded", !isOpen);
        }

        function shareProfile() {
            const url = `https://astegni.netlify.app/profile/${currentUser.id}`;
            navigator.clipboard.writeText(url).then(() => {
                alert("Profile link copied to clipboard!");
                logAction('Shared profile ${currentUser.id}');
            });
        }

        // Filter Reels
        function filterReels(filter) {
            currentFilter = filter;
            const buttons = document.querySelectorAll(".filter-button");
            buttons.forEach(btn => {
                btn.classList.toggle("active", btn.dataset.filter === filter);
            });
            updateReels(filter);
        }

        // Update Reels Grid
        function updateReels(filter) {
            const reelsGrid = document.getElementById("reels-grid");
            reelsGrid.innerHTML = "";
            let filteredReels = Object.values(reels);
            filteredReelIds = Object.keys(reels).map(Number);
            if (filter === "saved") {
                filteredReels = filteredReels.filter(reel =>
                    savedVideos[reel.id]?.userIds?.includes(currentUser?.id)
                );
                filteredReelIds = filteredReels.map(reel => reel.id);
            } else if (filter === "liked") {
                filteredReels = filteredReels.filter(reel =>
                    likes[reel.id]?.userIds?.includes(currentUser?.id)
                );
                filteredReelIds = filteredReels.map(reel => reel.id);
            } else if (filter === "history") {
                filteredReels = filteredReels.filter(reel =>
                    history[reel.id]?.userIds?.includes(currentUser?.id)
                );
                filteredReelIds = filteredReels.map(reel => reel.id);
            }
            if (searchQuery) {
                filteredReels = filteredReels.filter(reel => {
                    const tutor = tutors[reel.tutorId];
                    return (
                        tutor?.name?.toLowerCase().includes(searchQuery) ||
                        reel?.title?.toLowerCase().includes(searchQuery) ||
                        reel?.description?.toLowerCase().includes(searchQuery) ||
                        tutor?.subject?.toLowerCase().includes(searchQuery) ||
                        reel?.date?.toLowerCase().includes(searchQuery) ||
                        reel?.videoNumber?.toLowerCase().includes(searchQuery)
                    );
                });
                filteredReelIds = filteredReels.map(reel => reel.id);
            }
            if (filteredReels.length === 0) {
                reelsGrid.innerHTML =
                    '<p class="col-span-full text-center">No videos found.</p>';
                return;
            }
            filteredReels.forEach(reel => {
                const tutor = tutors[reel.tutorId];
                const likeCount = likes[reel.id]?.userIds?.length || 0;
                const dislikeCount = dislikes[reel.id]?.userIds?.length || 0;
                const commentCount = comments[reel.id]?.comments?.length || 0;
                const isLike = likes[reel.id]?.userIds?.includes(currentUser?.id);
                const isDislike = dislikes[reel.id]?.userIds?.includes(currentUser?.id);
                const isSaved = savedVideos[reel.id]?.userIds?.includes(currentUser?.id);
                const isFollowed = follows[reel.tutorId]?.userIds?.includes(currentUser?.id);
                const div = document.createElement("div");
                div.className = "reel-card p-4 rounded-lg shadow-lg";
                div.style.backgroundColor = "var(--highlight-bg)";
                div.innerHTML = `
                    <video class="w-full h-48 object-cover rounded-full cursor-pointer" onclick="openVideoModal(${reel.id})" style="aspect-ratio: 1;">
                        <source src="${reel.videoUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                    <h3 class="text-lg font-semibold">${reel.title} ${reel.videoNumber}</h3>
                    <p class="text-sm"><a href="view-tutor.html?tutorId=${tutor.id}" class="hover:text-[var(--nav-link-hover)]">${tutor.name}</a> (${tutor.subject})</p>
                    <p class="mb-4">${reel.description}</p>
                    <p class="text-sm mb-4 opacity-70">${reel.date}</p>
                    <div class="flex flex-wrap gap-2">
                        <button id="like-btn-${reel.id}" class="like-button flex items-center ${isLike ? "liked" : ""}" 
                            onclick="toggleLike(${reel.id})" ${!currentUser ? "disabled" : ""} data-tooltip="${isLike ? "Unlike" : "Like"}">
                            <svg class="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                            </svg>
                            ${likeCount}
                        </button>
                        <button id="dislike-btn-${reel.id}" class="dislike-button flex items-center ${isDislike ? "disliked" : ""}" 
                            onclick="toggleDislike(${reel.id})" ${!currentUser ? "disabled" : ""} data-tooltip="${isDislike ? "Undislike" : "Dislike"}">
                            <svg class="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                            ${dislikeCount}
                        </button>
                        <button class="flex items-center hover:text-[var(--nav-link-hover)]" 
                            onclick="openCommentModal(${reel.id})" aria-label="View comments">
                            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.05M12 10h.05M16 10h.05M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                            </svg>
                            ${commentCount}
                        </button>
                        <button class="flex items-center hover:text-[var(--nav-link-hover)]" 
                            onclick="shareReel(${reel.id})" aria-label="Share reel">
                            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                            </svg>
                            Share
                        </button>
                        <button id="save-btn-${reel.id}" class="flex items-center hover:text-[var(--nav-link-hover)] ${isSaved ? "text-[var(--button-bg)]" : ""}" 
                            onclick="openPlaylistModal(${reel.id})" ${!currentUser ? "disabled" : ""} aria-label="${isSaved ? "Unsave" : "Save"} reel">
                            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                            </svg>
                            Save
                        </button>
                        <button id="follow-btn-${reel.tutorId}" class="flex items-center px-3 py-1 rounded-lg ${isFollowed ? "bg-gray-600 text-white" : "cta-button"}" 
                            onclick="toggleFollow(${reel.tutorId})" ${!currentUser ? "disabled" : ""} aria-label="${isFollowed ? "Unfollow" : "Follow"}">
                            ${isFollowed ? "Unfollow" : "Follow"}
                        </button>
                    </div>
                `;
                reelsGrid.appendChild(div);
            });
            updateVideoNavigation();
        }

        // Toggle Like
        function toggleLike(reelId) {
            if (!likes[reelId]) likes[reelId] = { reelId, userIds: [] };
            const userId = currentUser.id;
            const isLiked = likes[reelId].userIds.includes(userId);
            if (isLiked) {
                likes[reelId].userIds = likes[reelId].userIds.filter(
                    id => id !== userId
                );
            } else {
                likes[reelId].userIds.push(userId);
                if (dislikes[reelId]?.userIds.includes(userId)) {
                    dislikes[reelId].userIds = dislikes[reelId].userIds.filter(
                        id => id !== userId
                    );
                }
            }
            logAction(`${isLiked ? "Unliked" : "Liked"} reel ${reelId}`);
            updateReels(currentFilter);
            if (
                !document.getElementById("video-modal").classList.contains("hidden")
            ) {
                updateVideoModal(filteredReelIds[currentVideoIndex]);
            }
        }

        // Toggle Dislike
        function toggleDislike(reelId) {
            if (!dislikes[reelId])
                dislikes[reelId] = { reelId, userIds: [] };
            const userId = currentUser.id;
            const isDisliked = dislikes[reelId].userIds.includes(userId);
            if (isDisliked) {
                dislikes[reelId].userIds = dislikes[reelId].userIds.filter(
                    id => id !== userId
                );
            } else {
                dislikes[reelId].userIds.push(userId);
                if (likes[reelId]?.userIds.includes(userId)) {
                    likes[reelId].userIds = likes[reelId].userIds.filter(
                        id => id !== userId
                    );
                }
            }
            logAction(`${isDisliked ? "Undisliked" : "Disliked"} reel ${reelId}`);
            updateReels(currentFilter);
            if (
                !document.getElementById("video-modal").classList.contains("hidden")
            ) {
                updateVideoModal(filteredReelIds[currentVideoIndex]);
            }
        }

        // Open Comment Modal
        function openCommentModal(reelId) {
            selectedReelId = reelId;
            updateCommentList();
            document.getElementById("comment-modal").classList.remove("hidden");
            document
                .querySelector("#comment-modal .modal-content")
                .classList.add("open");
            trapFocus(document.getElementById("comment-modal"));
        }

        // Close Comment Modal
        function closeCommentModal() {
            document.getElementById("comment-modal").classList.add("hidden");
            document
                .querySelector("#comment-modal .modal-content")
                .classList.remove("open");
            restoreFocus();
            selectedReelId = null;
        }

        // Share Reel
        function shareReel(reelId) {
            const reel = reels[reelId];
            const url = `https://astegni.netlify.app/reel/${reelId}`;
            navigator.clipboard.writeText(url).then(() => {
                alert(`Reel "${reel.title}" link copied to clipboard!`);
                logAction(`Shared reel ${reelId}`);
            });
        }

        // Open Playlist Modal
        function openPlaylistModal(reelId) {
            selectedReelId = reelId;
            updatePlaylistList();
            document.getElementById("playlist-modal").classList.remove("hidden");
            document
                .querySelector("#playlist-modal .modal-content")
                .classList.add("open");
            trapFocus(document.getElementById("playlist-modal"));
        }

        // Close Playlist Modal
        function closePlaylistModal() {
            document.getElementById("playlist-modal").classList.add("hidden");
            document
                .querySelector("#playlist-modal .modal-content")
                .classList.remove("open");
            restoreFocus();
            selectedReelId = null;
        }

        // Create Playlist
        function createPlaylist() {
            const playlistName = document
                .getElementById("new-playlist-name")
                .value.trim();
            if (!playlistName) {
                alert("Please enter a playlist name");
                return;
            }
            const playlistId = Object.keys(playlists).length + 1;
            playlists[playlistId] = {
                id: playlistId,
                name: playlistName,
                reelIds: [selectedReelId],
            };
            savedVideos[selectedReelId].playlists[playlistId] = true;
            savedVideos[selectedReelId].userIds.push(currentUser.id);
            logAction(`Created playlist ${playlistName} with reel ${selectedReelId}`);
            updatePlaylistList();
            document.getElementById("new-playlist-name").value = "";
            updateReels(currentFilter);
        }

        // Update Playlist List
        function updatePlaylistList() {
            const playlistList = document.getElementById("existing-playlists");
            playlistList.innerHTML = "";
            Object.values(playlists).forEach(playlist => {
                const isInPlaylist =
                    playlist.reelIds.includes(selectedReelId);
                const div = document.createElement("div");
                div.className = "flex items-center mb-2";
                div.innerHTML = `
                    <input type="checkbox" id="playlist-${playlist.id}" ${
                        isInPlaylist ? "checked" : ""
                    } class="mr-2" onchange="togglePlaylist(${playlist.id}, ${selectedReelId})">
                    <label for="playlist-${playlist.id}">${playlist.name}</label>
                `;
                playlistList.appendChild(div);
            });
        }

        // Toggle Playlist
        function togglePlaylist(playlistId, reelId) {
            const playlist = playlists[playlistId];
            const isInPlaylist = playlist.reelIds.includes(reelId);
            if (isInPlaylist) {
                playlist.reelIds = playlist.reelIds.filter(id => id !== reelId);
                delete savedVideos[reelId].playlists[playlistId];
                if (!Object.keys(savedVideos[reelId].playlists).length) {
                    savedVideos[reelId].userIds = savedVideos[
                        reelId
                    ].userIds.filter(id => id !== currentUser.id);
                }
            } else {
                playlist.reelIds.push(reelId);
                savedVideos[reelId].playlists[playlistId] = true;
                if (!savedVideos[reelId].userIds.includes(currentUser.id)) {
                    savedVideos[reelId].userIds.push(currentUser.id);
                }
            }
            logAction(
                `${isInPlaylist ? "Removed" : "Added"} reel ${reelId} ${
                    isInPlaylist ? "from" : "to"
                } playlist ${playlist.name}`
            );
            updateReels(currentFilter);
        }

        // Open Video Modal
        function openVideoModal(reelId) {
            currentVideoIndex = filteredReelIds.indexOf(reelId);
            updateVideoModal(reelId);
            document.getElementById("video-modal").classList.remove("hidden");
            document
                .querySelector("#video-modal .modal-content")
                .classList.add("open");
            trapFocus(document.getElementById("video-modal"));
            if (!history[reelId]) history[reelId] = { reelId, userIds: [] };
            if (!history[reelId].userIds.includes(currentUser.id)) {
                history[reelId].userIds.push(currentUser.id);
                logAction(`Viewed reel ${reelId}`);
            }
        }

        // Update Video Modal
        function updateVideoModal(reelId) {
            const reel = reels[reelId];
            const tutor = tutors[reel.tutorId];
            const likeCount = likes[reelId]?.userIds?.length || 0;
            const dislikeCount = dislikes[reelId]?.userIds?.length || 0;
            const commentCount = comments[reelId]?.comments?.length || 0;
            const isLiked = likes[reelId]?.userIds?.includes(currentUser?.id);
            const isDisliked = dislikes[reelId]?.userIds?.includes(
                currentUser?.id
            );
            const isSaved = savedVideos[reelId]?.userIds?.includes(
                currentUser?.id
            );
            const isFollowed = follows[reel.tutorId]?.userIds?.includes(
                currentUser?.id
            );
            const videoContent = document.getElementById("video-content");
            videoContent.innerHTML = `
                <video class="w-full h-auto rounded-lg" controls autoplay>
                    <source src="${reel.videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <h3 class="text-xl font-bold mt-4">${reel.title} ${reel.videoNumber}</h3>
                <p class="text-sm"><a href="view-tutor.html?tutorId=${tutor.id}" class="hover:text-[var(--nav-link-hover)]">${tutor.name}</a> (${tutor.subject})</p>
                <p class="mt-2">${reel.description}</p>
                <p class="text-sm mt-2 opacity-70">${reel.date}</p>
                <div class="flex flex-wrap gap-2 mt-4">
                    <button id="like-btn-modal-${reelId}" class="like-button flex items-center ${isLiked ? "liked" : ""}" 
                        onclick="toggleLike(${reelId})" ${!currentUser ? "disabled" : ""} data-tooltip="${isLiked ? "Unlike" : "Like"}">
                        <svg class="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                        </svg>
                        ${likeCount}
                    </button>
                    <button id="dislike-btn-modal-${reelId}" class="dislike-button flex items-center ${isDisliked ? "disliked" : ""}" 
                        onclick="toggleDislike(${reelId})" ${!currentUser ? "disabled" : ""} data-tooltip="${isDisliked ? "Undislike" : "Dislike"}">
                        <svg class="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                        ${dislikeCount}
                    </button>
                    <button class="flex items-center hover:text-[var(--nav-link-hover)]" 
                        onclick="openCommentModal(${reelId})" aria-label="View comments">
                        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.05M12 10h.05M16 10h.05M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                        </svg>
                        ${commentCount}
                    </button>
                    <button class="flex items-center hover:text-[var(--nav-link-hover)]" 
                        onclick="shareReel(${reelId})" aria-label="Share reel">
                        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                        </svg>
                        Share
                    </button>
                    <button id="save-btn-modal-${reelId}" class="flex items-center hover:text-[var(--nav-link-hover)] ${isSaved ? "text-[var(--button-bg)]" : ""}" 
                        onclick="openPlaylistModal(${reelId})" ${!currentUser ? "disabled" : ""} aria-label="${isSaved ? "Unsave" : "Save"} reel">
                        <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                        </svg>
                        Save
                    </button>
                    <button id="follow-btn-modal-${reel.tutorId}" class="flex items-center px-3 py-1 rounded-lg ${isFollowed ? "bg-gray-600 text-white" : "cta-button"}" 
                        onclick="toggleFollow(${reel.tutorId})" ${!currentUser ? "disabled" : ""} aria-label="${isFollowed ? "Unfollow" : "Follow"}">
                        ${isFollowed ? "Unfollow" : "Follow"}
                    </button>
                </div>
            `;
            updateVideoNavigation();
        }

        // Close Video Modal
        function closeVideoModal() {
            document.getElementById("video-modal").classList.add("hidden");
            document
                .querySelector("#video-modal .modal-content")
                .classList.remove("open");
            restoreFocus();
        }

        // Update Video Navigation
        function updateVideoNavigation() {
            const prevBtn = document.getElementById("prev-video-btn");
            const nextBtn = document.getElementById("next-video-btn");
            prevBtn.disabled = currentVideoIndex === 0;
            nextBtn.disabled = currentVideoIndex === filteredReelIds.length - 1;
        }

        // Navigate Video
        function navigateVideo(direction) {
            if (direction === "prev" && currentVideoIndex > 0) {
                currentVideoIndex--;
            } else if (
                direction === "next" &&
                currentVideoIndex < filteredReelIds.length - 1
            ) {
                currentVideoIndex++;
            }
            const newReelId = filteredReelIds[currentVideoIndex];
            updateVideoModal(newReelId);
            if (!history[newReelId])
                history[newReelId] = { reelId: newReelId, userIds: [] };
            if (!history[newReelId].userIds.includes(currentUser?.id)) {
                history[newReelId].userIds.push(currentUser?.id);
                logAction(`viewed reel ${newReelId}`);
            }
        }

        // Update Comment List
        function updateCommentList() {
            const commentList = document.getElementById("comment-list");
            commentList.innerHTML = "";
            const reelComments = comments[selectedReelId]?.comments || [];
            if (reelComments.length === 0) {
                commentList.innerHTML = "<p>No comments yet.</p>";
                return;
            }
            reelComments.forEach(comment => {
                const div = document.createElement("div");
                div.className = "mb-2";
                div.innerHTML = `
                    <p class="comment-text">${comment.text}</p>
                    <p class="text-sm opacity-70">By User ${comment.userId} on ${comment.date}</p>
                `;
                commentList.appendChild(div);
            });
        }

        // Add Comment
        function addComment() {
            const text = document.getElementById("new-comment").value.trim();
            if (!text) {
                alert("Please enter a comment");
                return;
            }
            if (!comments[selectedReelId])
                comments[selectedReelId] = { reelId: selectedReelId, comments: [] };
            comments[selectedReelId].comments.push({
                userId: currentUser.id,
                text: text,
                date: new Date().toISOString().split("T")[0],
            });
            logAction(`Commented on reel ${selectedReelId}: ${text}`);
            updateCommentList();
            document.getElementById("new-comment").value = "";
            updateReels(currentFilter);
            if (
                !document.getElementById("video-modal").classList.contains("hidden")
            ) {
                updateVideoModal(selectedReelId);
            }
        }

        // Toggle Follow
        function toggleFollow(tutorId) {
            if (!follows[tutorId])
                follows[tutorId] = { tutorId, userIds: [] };
            const userId = currentUser.id;
            const isFollowed = follows[tutorId].userIds.includes(userId);
            if (isFollowed) {
                follows[tutorId].userIds = follows[tutorId].userIds.filter(
                    id => id !== userId
                );
            } else {
                follows[tutorId].userIds.push(userId);
            }
            logAction(
                `${isFollowed ? "Unfollowed" : "Followed"} tutor ${tutorId}`
            );
            updateReels(currentFilter);
            if (
                !document.getElementById("video-modal").classList.contains("hidden")
            ) {
                updateVideoModal(filteredReelIds[currentVideoIndex]);
            }
        }

        // Logging
        function logAction(action) {
            const logId = Object.keys(logs).length + 1;
            logs[logId] = {
                id: logId,
                action,
                userId: currentUser.id,
                user: currentUser.email,
                date:
                    new Date().toISOString().split("T")[0] +
                    " " +
                    new Date().toTimeString().split(" ")[0],
            };
        }

        // Notification Bell
        function checkNotifications() {
            const hasNotifications = Object.values(notifications).length > 0;
            document
                .getElementById("notification-bell")
                .classList.toggle("hidden", !hasNotifications);
            document
                .getElementById("mobile-notification-bell")
                .classList.toggle("hidden", !hasNotifications);
            document
                .getElementById("notification-dot")
                .classList.toggle("hidden", !hasNotifications);
            document
                .getElementById("mobile-notification-dot")
                .classList.toggle("hidden", !hasNotifications);
        }

        // Open Notification Modal
        function openNotificationModal() {
            const notificationContent = document.getElementById(
                "notification-content"
            );
            const notificationList = Object.values(notifications);
            if (notificationList.length === 0) {
                notificationContent.innerHTML = "<p>You have no notifications.</p>";
            } else {
                notificationContent.innerHTML = notificationList
                    .map(
                        n => `
                    <div class="mb-2">
                        <p>${n.message}</p>
                        <p class="text-sm opacity-70// Continuation of openNotificationModal
            ${n.date}</p>
                    </div>
                `
                    )
                    .join("");
            }
            document.getElementById("notification-modal").classList.remove("hidden");
            document
                .querySelector("#notification-modal .modal-content")
                .classList.add("open");
            trapFocus(document.getElementById("notification-modal"));
        }

        // Close Notification Modal
        function closeNotificationModal() {
            document.getElementById("notification-modal").classList.add("hidden");
            document
                .querySelector("#notification-modal .modal-content")
                .classList.remove("open");
            restoreFocus();
        }

        // Close Modal (Fixed Typo)
        function closeModal(modalId) {
            const closeFunction = {
                "comment-modal": closeCommentModal,
                "notification-modal": closeNotificationModal,
                "video-modal": closeVideoModal, // Fixed from 'video-id' and 'closeModalModal'
                "playlist-modal": closePlaylistModal,
            }[modalId];
            if (closeFunction) closeFunction();
        }

        // Focus Management for Accessibility
        function restoreFocus() {
            if (focusBeforeModal) focusBeforeModal.focus();
            focusBeforeModal = null;
        }

        // Footer Button Functions
        function openLoginRegisterModal() {
            // Placeholder for login/register modal (not implemented in HTML)
            alert("Login/Register modal not implemented yet.");
            logAction("Opened login/register modal");
        }

        function openAdvertiseModal() {
            // Placeholder for advertise modal (not implemented in HTML)
            alert("Advertise modal not implemented yet.");
            logAction("Opened advertise modal");
        }

        // Mobile Menu Toggle
        document.getElementById("menu-btn").addEventListener("click", () => {
            const mobileMenu = document.getElementById("mobile-menu");
            const isOpen = mobileMenu.classList.contains("open");
            mobileMenu.classList.toggle("open");
            document.getElementById("menu-btn").setAttribute("aria-expanded", !isOpen);
        });

        // Theme Toggle Event Listeners
        document.getElementById("theme-toggle-btn").addEventListener("click", toggleTheme);
        document.getElementById("mobile-theme-toggle-btn").addEventListener("click", toggleTheme);

        // Initialize Theme
        const savedTheme = localStorage.getItem("theme") || "light";
        document.documentElement.setAttribute("data-theme", savedTheme);
        updateThemeToggleIcon(savedTheme);

        // Initialize
        init();
    