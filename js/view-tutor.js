let gk_fileData = {};
        let gk_xlsxFileLookup = {};
        let gk_isXlsx = false;
        // Track following status for tutors
let followingStatus = {};

        function loadFileData(fileName) {
            if (!gk_xlsxFileLookup[fileName]) return '';
            const workbook = XLSX.read(gk_fileData[fileName], { type: 'base64' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            return XLSX.utils.sheet_to_csv(firstSheet);
        }

        const tutors = [
            {
                id: 1,
                name: "John Doe",
                profilePicture: "pictures/profile_picture.png",
                coverPhoto: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=150&q=80",
                rating: 4.5,
                gender: "Male",
                subjects: ["Algebra", "Geometry", "Physics"],
                school: "Springfield High School",
                location: "Springfield, USA",
                bio: "Experienced tutor with 5 years of teaching high school math and physics.",
                paymentMethod: "Hourly",
                socialLinks: {
                    facebook: "https://facebook.com/johndoe",
                    linkedin: "https://linkedin.com/in/johndoe",
                    x: "https://x.com/johndoe"
                },
                introVideo: "https://via.placeholder.com/640x360.mp4",
                clips: [
                    "https://via.placeholder.com/320x180.mp4",
                    "https://via.placeholder.com/320x180.mp4"
                ],
                followers: 0,
                comments: [
                    { author: "Jane Smith", text: "Great tutor, very patient!", date: "2025-06-20" },
                    { author: "Mike Johnson", text: "Helped my son ace his exams.", date: "2025-06-15" }
                ]
            }
        ];

        let currentTutor = null;
        let isLoggedIn = false;
        let currentVideoId = null;
        const notifications = {
            1: { message: "New session request received!", date: "2025-06-23" },
            2: { message: "John Doe posted a new clip.", date: "2025-06-22" }
        };


// Notification Modal Functions
function openNotificationModal() {
    const notificationContent = document.getElementById('notification-content');
    const notificationList = Object.values(notifications); // Assuming 'notifications' is defined
    notificationContent.innerHTML = notificationList.length ? notificationList.map(n => `
        <div class="mb-2">
            <p class="text-[var(--text)]">${n.message}</p>
            <p class="text-sm text-gray-500">${n.date}</p>
        </div>
    `).join('') : '<p class="text-[var(--text)]">You have no notifications.</p>';
    document.getElementById('notification-modal').style.display = 'flex';
}

function closeNotificationModal() {
    document.getElementById('notification-modal').style.display = 'none';
}

// Comments Modal Functions
function openCommentsModal() {
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = currentTutor.comments?.length ? currentTutor.comments.map(comment => `
        <div class="mb-2">
            <p class="font-semibold text-[var(--text)]">${comment.author}</p>
            <p class="text-[var(--text)]">${comment.text}</p>
            <p class="text-sm text-gray-500">${comment.date}</p>
        </div>
    `).join('') : '<p class="text-[var(--text)]">No comments yet. Be the first to leave a review!</p>';
    document.getElementById('comments-modal').style.display = 'flex';
}

function closeCommentsModal() {
    document.getElementById('comments-modal').style.display = 'none';
}

        function openShareModal(videoId) {
            currentVideoId = videoId;
            document.getElementById('share-modal').classList.remove('hidden');
            // trapFocus(document.getElementById('share-modal'));
        }

        function closeShareModal() {
            document.getElementById('share-modal').classList.add('hidden');
            // restoreFocus();
        }

        function openCommentModal(videoId) {
            currentVideoId = videoId;
            document.getElementById('comment-modal').classList.remove('hidden');
            // trapFocus(document.getElementById('comment-modal'));
        }

        function closeCommentModal() {
            document.getElementById('comment-modal').classList.add('hidden');
            // restoreFocus();
        }

// Request Session Modal Functions
function openRequestSessionModal() {
    document.getElementById('request-session-modal').style.display = 'flex';
}

function closeRequestSessionModal() {
    document.getElementById('request-session-modal').style.display = 'none';
}

// Chat Modal Functions
function openChatModal() {
    document.getElementById('chat-modal').style.display = 'flex';
}

function closeChatModal() {
    document.getElementById('chat-modal').style.display = 'none';
}


// Function to update the theme icon
function updateThemeIcon(theme) {
    const sunPath = "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z";
    const moonPath = "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z";
    const desktopPath = document.getElementById('desktop-theme-path');
    const mobilePath = document.getElementById('mobile-theme-path'); // Optional, if using mobile icon

    if (desktopPath) {
        desktopPath.setAttribute('d', theme === 'dark' ? moonPath : sunPath);
    }
    if (mobilePath) {
        mobilePath.setAttribute('d', theme === 'dark' ? moonPath : sunPath);
    }
}

// Theme toggle function
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}
        // Load Theme
        document.addEventListener('DOMContentLoaded', () => {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            updateThemeIcon(savedTheme);
            loadTutorProfile();
            checkLoginStatus();
            checkNotifications();
        });

 

        // Check Login Status
        function checkLoginStatus() {
            isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            if (isLoggedIn) {
                document.getElementById('profile-name').textContent = localStorage.getItem('userName') || 'User';
                document.getElementById('mobile-my-profile-link').classList.remove('hidden');
                document.getElementById('profile-pic').src = tutors[0].profilePicture;
            } else {
                document.getElementById('profile-container').innerHTML = `
                    <button onclick="openLoginRegisterModal()" class="cta-button px-4 py-2 rounded-lg">Login</button>
                `;
            }
        }


        function loadTutorProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const tutorId = parseInt(urlParams.get('id'));
    currentTutor = tutors.find(t => t.id === tutorId) || tutors[0];

    if (currentTutor) {
        document.getElementById('cover-photo').style.backgroundImage = `url('${currentTutor.coverPhoto}')`;
        document.getElementById('profile-picture').src = currentTutor.profilePicture;
        document.getElementById('tutor-name').firstChild.textContent = currentTutor.name || 'Tutor Name';

        const rating = currentTutor.rating || 0;
        const ratingArc = document.getElementById('rating-arc');
        const radius = 45;
        const circumference = 2 * Math.PI * radius; // Approx. 282.74
        const percentage = rating > 0 ? (rating / 5) * 100 : 0;
        const dashOffset = circumference * (1 - percentage / 100);

        ratingArc.setAttribute('stroke-dasharray', circumference);
        ratingArc.setAttribute('stroke-dashoffset', dashOffset);

        // Set stroke color based on rating
        let color;
        if (rating > 4) {
            color = '#10B981'; // Green
        } else if (rating > 3) {
            color = '#FBBF24'; // Yellow
        } else if (rating > 2) {
            color = '#EF4444'; // Red
        } else if (rating > 1) {
            color = '#3B82F6'; // Blue
        } else {
            color = '#6B7280'; // Gray
        }
        ratingArc.setAttribute('stroke', color);

        document.getElementById('rating-label').textContent = rating > 0 ? `${rating.toFixed(1)}/5` : 'N/A';

        const stars = rating > 0 ? '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating)) : 'No rating';
        document.getElementById('tutor-rating-stars').textContent = stars;

        document.getElementById('tutor-gender').textContent = `Gender: ${currentTutor.gender || 'Not specified'}`;
        document.getElementById('tutor-subjects').textContent = `Subjects: ${currentTutor.subjects?.join(', ') || 'None listed'}`;
        document.getElementById('tutor-school').textContent = `School: ${currentTutor.school || 'Not specified'}`;
        document.getElementById('tutor-location').textContent = `Location: ${currentTutor.location || 'Not specified'}`;
        document.getElementById('tutor-bio').textContent = `Bio: ${currentTutor.bio || 'No bio provided'}`;
        document.getElementById('tutor-payment-method').textContent = `Payment Method: ${currentTutor.paymentMethod || 'Not specified'}`;

        const socialLinks = currentTutor.socialLinks || {};
        const facebookLink = document.querySelector('a[href="https://facebook.com"]');
        const linkedinLink = document.querySelector('a[href="https://linkedin.com"]');
        const xLink = document.querySelector('a[href="https://x.com"]');
        facebookLink.href = socialLinks.facebook || 'https://facebook.com';
        linkedinLink.href = socialLinks.linkedin || 'https://linkedin.com';
        xLink.href = socialLinks.x || 'https://x.com';

        document.getElementById('follower-number').textContent = currentTutor.followers || 0;

        document.getElementById('intro-video').src = currentTutor.introVideo || 'https://via.placeholder.com/640x360.mp4';
        const clip1 = document.getElementById('clip-1');
        const clip2 = document.getElementById('clip-2');
        clip1.src = currentTutor.clips?.[0] || 'https://via.placeholder.com/320x180.mp4';
        clip2.src = currentTutor.clips?.[1] || 'https://via.placeholder.com/320x180.mp4';

        const followButton = document.getElementById('follow-button');
        if (followingStatus[currentTutor.id]) {
            followButton.textContent = 'Unfollow';
        } else {
            followButton.textContent = 'Follow';
        }
        document.getElementById('follower-number').textContent = currentTutor.followers;
    }
}

// Follow/Unfollow Toggle Function
function followTutor() {
    if (!isLoggedIn) { // Assuming 'isLoggedIn' is defined
        alert('Please log in to follow this tutor.');
        return;
    }
    const tutorId = currentTutor.id; // Assuming 'currentTutor' is defined
    if (followingStatus[tutorId]) {
        // Unfollow
        currentTutor.followers -= 1;
        followingStatus[tutorId] = false;
        document.getElementById('follow-button').textContent = 'Follow';
    } else {
        // Follow
        currentTutor.followers += 1;
        followingStatus[tutorId] = true;
        document.getElementById('follow-button').textContent = 'Unfollow';
    }
    document.getElementById('follower-number').textContent = currentTutor.followers;
}


        // Notification Bell
        function checkNotifications() {
            const hasNotifications = Object.values(notifications).length > 0;
            document.getElementById('notification-dot').classList.toggle('hidden', !hasNotifications);
            document.getElementById('mobile-notification-dot').classList.toggle('hidden', !hasNotifications);
        }

        // Toggle Admin Section
        function toggleAdminSection() {
            const adminSection = document.getElementById('admin-section');
            adminSection.classList.toggle('hidden');
        }

        // Load Tutor File
        function loadTutorFile() {
            const fileInput = document.getElementById('tutor-file');
            const file = fileInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const data = e.target.result;
                    gk_fileData[file.name] = data.split(',')[1];
                    gk_xlsxFileLookup[file.name] = true;
                    gk_isXlsx = true;
                    const csv = loadFileData(file.name);
                    console.log('Parsed CSV:', csv);
                };
                reader.readAsDataURL(file);
            }
        }

        // Mobile Menu Toggle
        document.getElementById('menu-btn').addEventListener('click', () => {
            const mobileMenu = document.getElementById('mobile-menu');
            mobileMenu.classList.toggle('hidden');
        });

        // Profile Dropdown Toggle
        function toggleProfileDropdown() {
            // Implement dropdown if needed
        }

        // Video Interactions
        function likeVideo(videoId) {
            const likeCount = document.getElementById(`likes-${videoId}`);
            likeCount.textContent = parseInt(likeCount.textContent) + 1;
        }

        function dislikeVideo(videoId) {
            const dislikeCount = document.getElementById(`dislikes-${videoId}`);
            dislikeCount.textContent = parseInt(dislikeCount.textContent) + 1;
        }

        function submitComment() {
            const commentText = document.getElementById('comment-text').value;
            if (commentText && currentVideoId) {
                const commentList = document.getElementById(`comments-${currentVideoId}`);
                const comment = document.createElement('p');
                comment.textContent = commentText;
                commentList.appendChild(comment);
                document.getElementById(`comment-input-${currentVideoId}`).value = '';
                document.getElementById('comment-text').value = '';
                closeCommentModal();
            }
        }

        // Session Request
        function submitSessionRequest() {
            const course = document.getElementById('session-course').value;
            const date = document.getElementById('session-date').value;
            const time = document.getElementById('session-time').value;
            const duration = document.getElementById('session-duration').value;
            const mode = document.getElementById('session-mode').value;

            if (course && date && time && duration && mode) {
                alert('Session request submitted successfully!');
                closeRequestSessionModal();
            } else {
                alert('Please fill in all fields.');
            }
        }

        // Chat
        function sendMessage() {
            const message = document.getElementById('chat-input').value;
            if (message) {
                const chatMessages = document.getElementById('chat-messages');
                const messageElement = document.createElement('p');
                messageElement.textContent = `You: ${message}`;
                chatMessages.appendChild(messageElement);
                document.getElementById('chat-input').value = '';
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
