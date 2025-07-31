 // XLSX File Handling
        var gk_isXlsx = false;
        var gk_xlsxFileLookup = {};
        var gk_fileData = {};
        function filledCell(cell) {
            return cell !== '' && cell != null;
        }
        function loadFileData(filename) {
            if (gk_isXlsx && gk_xlsxFileLookup[filename]) {
                try {
                    var workbook = XLSX.read(gk_fileData[filename], { type: 'base64' });
                    var firstSheetName = workbook.SheetNames[0];
                    var worksheet = workbook.Sheets[firstSheetName];
                    var jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
                    var filteredData = jsonData.filter(row => row.some(filledCell));
                    var headerRowIndex = filteredData.findIndex((row, index) =>
                        row.filter(filledCell).length >= filteredData[index + 1]?.filter(filledCell).length
                    );
                    if (headerRowIndex === -1 || headerRowIndex > 25) {
                        headerRowIndex = 0;
                    }
                    var csv = XLSX.utils.aoa_to_sheet(filteredData.slice(headerRowIndex));
                    csv = XLSX.utils.sheet_to_csv(csv, { header: 1 });
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
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeToggleIcon(newTheme);
        }

        function updateThemeToggleIcon(theme) {
            const icon = theme === 'light' ?
                `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>` :
                `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>`;
            const themeToggle = document.getElementById('theme-toggle-btn');
            themeToggle.querySelector('svg').innerHTML = icon;
            const mobileThemeToggle = document.getElementById('mobile-theme-toggle-btn');
            mobileThemeToggle.innerHTML = `Toggle Theme <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${icon}</svg>`;
        }

        // Data Objects
        const currentUser = { id: 1, email: 'user@astegni.et', role: 'User' };
        const tutors = {
            1: { id: 1, name: 'Abebe Kebede', email: 'abebe@tutor.et', subject: 'Mathematics' },
            2: { id: 2, name: 'Mulu Alem', email: 'mulu@tutor.et', subject: 'Science' }
        };
        const reels = {
            1: { id: 1, tutorId: 1, videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', description: 'Fun math tricks!', date: '2025-05-20' },
            2: { id: 2, tutorId: 2, videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', description: 'Science experiments!', date: '2025-05-21' }
        };
        const likes = {
            1: { reelId: 1, userIds: [] },
            2: { reelId: 2, userIds: [] }
        };
        const dislikes = {
            1: { reelId: 1, userIds: [] },
            2: { reelId: 2, userIds: [] }
        };
        const comments = {
            1: { reelId: 1, comments: [{ userId: 1, text: 'Great video!', date: '2025-05-20' }] },
            2: { reelId: 2, comments: [] }
        };
        const follows = {
            1: { tutorId: 1, userIds: [] },
            2: { tutorId: 2, userIds: [] }
        };
        const notifications = {};
        const logs = {};

        // Initialize Reels
        function initReels() {
            if (currentUser) {
                document.getElementById('new-comment').disabled = false;
                document.getElementById('submit-comment').disabled = false;
            }
            updateReels();
            checkNotifications();
        }

        // Update Reels Grid
        function updateReels() {
            const reelsGrid = document.getElementById('reels-grid');
            reelsGrid.innerHTML = '';
            Object.values(reels).forEach(reel => {
                const tutor = tutors[reel.tutorId];
                const likeCount = likes[reel.id]?.userIds.length || 0;
                const dislikeCount = dislikes[reel.id]?.userIds.length || 0;
                const commentCount = comments[reel.id]?.comments.length || 0;
                const isLiked = likes[reel.id]?.userIds.includes(currentUser?.id);
                const isDisliked = dislikes[reel.id]?.userIds.includes(currentUser?.id);
                const isFollowed = follows[reel.tutorId]?.userIds.includes(currentUser?.id);
                const div = document.createElement('div');
                div.className = 'reel-card p-4 rounded-lg shadow-lg transition-colors';
                div.style.backgroundColor = 'var(--highlight-bg)';
                div.innerHTML = `
                    <video class="w-full h-48 object-cover rounded-lg mb-4" controls>
                        <source src="${reel.videoUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                    <h3 class="text-lg font-semibold">${tutor.name} (${tutor.subject})</h3>
                    <p class="mb-4">${reel.description}</p>
                    <p class="text-sm mb-4 opacity-70">${reel.date}</p>
                    <div class="flex flex-wrap gap-2">
                        <button id="like-btn-${reel.id}" class="flex items-center hover:text-[var(--button-bg)] ${isLiked ? 'text-[var(--button-bg)]' : ''}" 
                            onclick="toggleLike(${reel.id})" ${!currentUser ? 'disabled' : ''} aria-label="${isLiked ? 'Unlike' : 'Like'} reel">
                            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                            </svg>
                            ${likeCount}
                        </button>
                        <button id="dislike-btn-${reel.id}" class="flex items-center hover:text-red-600 ${isDisliked ? 'text-red-600' : ''}" 
                            onclick="toggleDislike(${reel.id})" ${!currentUser ? 'disabled' : ''} aria-label="${isDisliked ? 'Undislike' : 'Dislike'} reel">
                            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                            ${dislikeCount}
                        </button>
                        <button class="flex items-center hover:text-[var(--nav-link-hover)]" 
                            onclick="openCommentModal(${reel.id})" aria-label="View comments">
                            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                            </svg>
                            ${commentCount}
                        </button>
                        <button class="flex items-center hover:text-[var(--nav-link-hover)]" 
                            onclick="shareReel(${reel.id})" aria-label="Share reel">
                            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                            </svg>
                            Share
                        </button>
                        <button id="follow-btn-${reel.tutorId}" class="flex items-center px-3 py-1 rounded-lg ${isFollowed ? 'bg-gray-600 text-white' : 'cta-button'}"
                            onclick="toggleFollow(${reel.tutorId})" ${!currentUser ? 'disabled' : ''} aria-label="${isFollowed ? 'Unfollow' : 'Follow'} tutor">
                            ${isFollowed ? 'Unfollow' : 'Follow'}
                        </button>
                    </div>
                `;
                reelsGrid.appendChild(div);
            });
        }

        // Like/Dislike
        function toggleLike(reelId) {
            if (!likes[reelId]) likes[reelId] = { reelId, userIds: [] };
            if (!dislikes[reelId]) dislikes[reelId] = { reelId, userIds: [] };
            const userId = currentUser.id;
            const isLiked = likes[reelId].userIds.includes(userId);
            if (isLiked) {
                likes[reelId].userIds = likes[reelId].userIds.filter(id => id !== userId);
            } else {
                likes[reelId].userIds.push(userId);
                dislikes[reelId].userIds = dislikes[reelId].userIds.filter(id => id !== userId);
            }
            logAction(`${isLiked ? 'Unliked' : 'Liked'} reel ${reelId}`);
            updateReels();
        }
        function toggleDislike(reelId) {
            if (!likes[reelId]) likes[reelId] = { reelId, userIds: [] };
            if (!dislikes[reelId]) dislikes[reelId] = { reelId, userIds: [] };
            const userId = currentUser.id;
            const isDisliked = dislikes[reelId].userIds.includes(userId);
            if (isDisliked) {
                dislikes[reelId].userIds = dislikes[reelId].userIds.filter(id => id !== userId);
            } else {
                dislikes[reelId].userIds.push(userId);
                likes[reelId].userIds = likes[reelId].userIds.filter(id => id !== userId);
            }
            logAction(`${isDisliked ? 'Undisliked' : 'Disliked'} reel ${reelId}`);
            updateReels();
        }

        // Comments
        let selectedReelId = null;
        function openCommentModal(reelId) {
            selectedReelId = reelId;
            updateCommentList();
            document.getElementById('new-comment').value = '';
            document.getElementById('comment-modal').classList.remove('hidden');
            trapFocus(document.getElementById('comment-modal'));
        }
        function closeCommentModal() {
            document.getElementById('comment-modal').classList.add('hidden');
            selectedReelId = null;
            restoreFocus();
        }
        function updateCommentList() {
            const commentList = document.getElementById('comment-list');
            commentList.innerHTML = '';
            const reelComments = comments[selectedReelId]?.comments || [];
            if (reelComments.length === 0) {
                commentList.innerHTML = '<p>No comments yet.</p>';
            } else {
                reelComments.forEach(comment => {
                    const div = document.createElement('div');
                    div.className = 'mb-2';
                    div.innerHTML = `
                        <p>${comment.text}</p>
                        <p class="text-sm opacity-70">By User ${comment.userId} on ${comment.date}</p>
                    `;
                    commentList.appendChild(div);
                });
            }
        }
        function addComment() {
            const text = document.getElementById('new-comment').value.trim();
            if (!text) {
                alert('Please enter a comment');
                return;
            }
            if (!comments[selectedReelId]) comments[selectedReelId] = { reelId: selectedReelId, comments: [] };
            comments[selectedReelId].comments.push({
                userId: currentUser.id,
                text,
                date: new Date().toISOString().split('T')[0]
            });
            logAction(`Commented on reel ${selectedReelId}: ${text}`);
            updateCommentList();
            document.getElementById('new-comment').value = '';
            updateReels();
        }

        // Share
        function shareReel(reelId) {
            const url = `https://astegni.et/reels/${reelId}`;
            navigator.clipboard.writeText(url).then(() => {
                alert('Reel link copied to clipboard!');
                logAction(`Shared reel ${reelId}`);
            });
        }

        // Follow
        function toggleFollow(tutorId) {
            if (!follows[tutorId]) follows[tutorId] = { tutorId, userIds: [] };
            const userId = currentUser.id;
            const isFollowed = follows[tutorId].userIds.includes(userId);
            if (isFollowed) {
                follows[tutorId].userIds = follows[tutorId].userIds.filter(id => id !== userId);
            } else {
                follows[tutorId].userIds.push(userId);
            }
            logAction(`${isFollowed ? 'Unfollowed' : 'Followed'} tutor ${tutorId}`);
            updateReels();
        }

        // Logging
        function logAction(action) {
            const newId = Object.keys(logs).length + 1;
            logs[newId] = {
                id: newId,
                action,
                user: currentUser.email,
                date: new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0]
            };
        }

        // Notification Bell
        function checkNotifications() {
            const hasNotifications = Object.values(notifications).length > 0;
            document.getElementById('notification-dot').classList.toggle('hidden', !hasNotifications);
            document.getElementById('mobile-notification-dot').classList.toggle('hidden', !hasNotifications);
        }
        function openNotificationModal() {
            const notificationContent = document.getElementById('notification-content');
            const notificationList = Object.values(notifications);
            if (notificationList.length === 0) {
                notificationContent.innerHTML = 'You have no notifications.';
            } else {
                notificationContent.innerHTML = notificationList.map(n => `
                    <div class="mb-2">
                        <p>${n.message}</p>
                        <p class="text-sm opacity-70">${n.date}</p>
                    </div>
                `).join('');
            }
            document.getElementById('notification-modal').classList.remove('hidden');
            trapFocus(document.getElementById('notification-modal'));
        }
        function closeNotificationModal() {
            document.getElementById('notification-modal').classList.add('hidden');
            restoreFocus();
        }

        // Focus Management for Accessibility
        let focusBeforeModal = null;
        function trapFocus(modal) {
            focusBeforeModal = document.activeElement;
            const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstFocusable = focusableElements[0];
            const lastFocusable = focusableElements[focusableElements.length - 1];
            firstFocusable.focus();
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey && document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                } else if (e.key === 'Escape') {
                    closeModal(modal.id);
                }
            });
        }
        function restoreFocus() {
            if (focusBeforeModal) focusBeforeModal.focus();
            focusBeforeModal = null;
        }
        function closeModal(modalId) {
            const closeFunction = {
                'comment-modal': closeCommentModal,
                'notification-modal': closeNotificationModal
            }[modalId];
            if (closeFunction) closeFunction();
        }

        // Mobile Menu Toggle
        document.getElementById('menu-btn').addEventListener('click', () => {
            const mobileMenu = document.getElementById('mobile-menu');
            const isOpen = mobileMenu.classList.contains('open');
            mobileMenu.classList.toggle('open');
            document.getElementById('menu-btn').setAttribute('aria-expanded', !isOpen);
        });

        // Theme Toggle Event Listeners
        document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
        document.getElementById('mobile-theme-toggle-btn').addEventListener('click', toggleTheme);

        // Initialize Theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeToggleIcon(savedTheme);

        // Initialize
        initReels();